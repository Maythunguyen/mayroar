import base64
import io
import httpx
from PIL import Image
from support import UID, AUTH
from app.features.photos.schemas import ESTIMATE_OUTPUT_SCHEMA as SCHEMA

def test_photo_rejects_bad_bytes_without_calling_provider(client):
    c, calls = client
    response = c.post("/analyse-food", headers=AUTH, json={"image": "data:image/png;base64," + base64.b64encode(b"not a png").decode()})
    assert response.status_code == 422
    assert not any("openai" in str(r.url) or "claim_photo" in str(r.url) for r in calls)

def test_photo_schema_roundtrip_and_quota(client):
    c, calls = client
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
