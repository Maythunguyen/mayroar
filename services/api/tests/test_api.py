import base64
import io
import os
from uuid import uuid4
import httpx
import pytest
from PIL import Image
from fastapi.testclient import TestClient

os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "test-key")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
from app.main import create_app
from app.models import Food, validate_log_food
from app.routers.diary import summary
from app.routers.foods import search_params

UID = "00000000-0000-0000-0000-000000000001"
FOOD = dict(id="custom:1", name="Rice", brand=None, barcode=None, sourceId="custom", sourceFoodId="1",
            sourceName="User", sourceVersion="", attribution="User entered", qualityTier="custom",
            per100g=dict(calories=130, protein=2.5, carbs=28, fat=0.3))
AUTH = {"Authorization": "Bearer test-user-token"}


@pytest.fixture
def client():
    calls = []
    def handler(request):
        calls.append(request)
        if request.url.path == "/auth/v1/user":
            if request.headers.get("authorization") != AUTH["Authorization"]:
                return httpx.Response(401, json={})
            return httpx.Response(200, json={"id": UID})
        if request.url.path.endswith("rpc/diary_claim_photo"):
            return httpx.Response(200, json=True)
        if request.url.path == "/rest/v1/diary_entries":
            return httpx.Response(200, json=[])
        if request.url.path == "/rest/v1/food_search":
            return httpx.Response(200, json=[])
        return httpx.Response(500, json={})
    mock = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with TestClient(create_app(mock)) as c:
        yield c, calls
        c.portal.call(c.app.state.http.aclose)


def test_auth_required_and_verified(client):
    c, calls = client
    assert c.get("/diary?day=2026-10-07").status_code == 401
    assert c.get("/diary?day=2026-10-07", headers={"Authorization": "Bearer forged"}).status_code == 401
    assert not any(r.url.path.startswith("/rest/") for r in calls)


def test_date_and_weight_validation(client):
    c, _ = client
    assert c.get("/diary?day=2026-02-30", headers=AUTH).status_code == 422
    for grams in [0, -1, 10001]:
        response = c.post("/entries", headers=AUTH, json={"requestId": str(uuid4()), "day": "2026-10-07", "meal": "Lunch", "grams": grams, "food": FOOD})
        assert response.status_code == 422


def test_missing_and_implausible_nutrition_rejected():
    for changes in [{"protein": None}, {"fat": 101}, {"calories": 0}]:
        food = Food.model_validate({**FOOD, "per100g": {**FOOD["per100g"], **changes}})
        with pytest.raises(ValueError):
            validate_log_food(food)


def test_server_owns_user_id_and_forwards_user_token(client):
    c, calls = client
    request_id = str(uuid4())
    body = {"requestId": request_id, "day": "2026-10-07", "meal": "Lunch", "grams": 150, "food": FOOD}
    assert c.post("/entries", headers=AUTH, json={**body, "user_id": "somebody-else"}).status_code == 422
    assert c.post("/entries", headers=AUTH, json=body).status_code == 200
    import json
    write = next(r for r in calls if r.method == "POST" and r.url.path.endswith("diary_entries"))
    assert json.loads(write.content)["user_id"] == UID
    assert json.loads(write.content)["request_id"] == request_id
    assert write.headers["authorization"] == AUTH["Authorization"]
    assert "ignore-duplicates" in write.headers["prefer"]


def test_catalogue_food_is_reloaded_before_saving(client):
    c, _ = client
    food = {**FOOD, "qualityTier": "reference", "sourceId": "fsanz"}
    response = c.post("/entries", headers=AUTH, json={"requestId": str(uuid4()), "day": "2026-10-07", "meal": "Lunch", "grams": 150, "food": food})
    assert response.status_code == 404


def test_summary_uses_whole_portions_and_preserves_unknown_extras():
    result = summary([{"food": FOOD, "grams": 200, "meal": "Lunch"}])
    assert result["totals"] == dict(calories=260, protein=5, carbs=56, fat=0.6)
    assert result["meals"]["Lunch"]["calories"] == 260
    assert result["extra"]["fibre"] == {"value": 0, "missing": 1}


def test_search_escapes_filter_syntax_and_preserves_barcode():
    params = search_params('Brand,_(A)"', None)
    assert '\\_' in params["and"] and '\\"' in params["and"]
    assert search_params("", "0123456789012")["barcode"] == "in.(0123456789012,123456789012)"


def test_photo_rejects_bad_bytes_without_calling_provider(client):
    c, calls = client
    response = c.post("/analyse-food", headers=AUTH, json={"image": "data:image/png;base64," + base64.b64encode(b"not a png").decode()})
    assert response.status_code == 422
    assert not any("openai" in str(r.url) or "claim_photo" in str(r.url) for r in calls)


def test_photo_schema_roundtrip_and_quota(client):
    c, calls = client
    from app.routers.photos import SCHEMA
    result = {"isFood": True, "name": "Rice", "assumptions": "Estimated serving", "grams": 200,
              "calories": 260, "protein": 5, "carbs": 56, "fat": 0.6}
    import json
    def handler(request):
        calls.append(request)
        if request.url.path == "/auth/v1/user":
            return httpx.Response(200, json={"id": UID})
        if request.url.path.endswith("diary_claim_photo"):
            return httpx.Response(200, json=True)
        if request.url.host == "api.openai.com":
            body = json.loads(request.content)
            assert body["text"]["format"]["schema"] == SCHEMA
            assert body["store"] is False
            return httpx.Response(200, json={"status": "completed", "output": [{"content": [{"type": "output_text", "text": json.dumps(result)}]}]})
        return httpx.Response(500)
    c.portal.call(c.app.state.http.aclose)
    c.app.state.http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    image = io.BytesIO()
    Image.new("RGB", (2, 2)).save(image, format="PNG")
    response = c.post("/analyse-food", headers=AUTH, json={"image": "data:image/png;base64," + base64.b64encode(image.getvalue()).decode()})
    assert response.status_code == 200
    assert response.json() == result


def test_oversized_requests_and_cors(client):
    c, _ = client
    assert c.post("/auth/login", content=b"x" * 140000).status_code == 413
    assert c.options("/diary", headers={"Origin": "http://localhost:8081", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization"}).status_code == 200
    assert c.options("/diary", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"}).status_code == 400
