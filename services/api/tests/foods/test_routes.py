from uuid import uuid4
import pytest
from app.features.foods.schemas import Food
from app.features.foods.validation import validate_log_food
from app.features.foods.filters import search_params
from support import FOOD, AUTH

def test_missing_and_implausible_nutrition_rejected():
    for changes in [{"protein": None}, {"fat": 101}, {"calories": 0}]:
        food = Food.model_validate({**FOOD, "per100g": {**FOOD["per100g"], **changes}})
        with pytest.raises(ValueError):
            validate_log_food(food)

def test_catalogue_food_is_reloaded_before_saving(client):
    c, _ = client
    food = {**FOOD, "qualityTier": "reference", "sourceId": "fsanz"}
    response = c.post("/entries", headers=AUTH, json={"requestId": str(uuid4()), "day": "2026-10-07", "meal": "Lunch", "grams": 150, "food": food})
    assert response.status_code == 404

def test_search_escapes_filter_syntax_and_preserves_barcode():
    params = search_params('Brand,_(A)"', None)
    assert '\\_' in params["and"] and '\\"' in params["and"]
    assert search_params("", "0123456789012")["barcode"] == "in.(0123456789012,123456789012)"

@pytest.mark.parametrize("food_id", ["fsanz:123", 'source:item with "quotes"'])
def test_catalogue_lookup_uses_literal_id_and_authoritative_nutrients(food_id):
    import json
    import httpx
    from fastapi.testclient import TestClient
    from app.main import create_app
    from support import UID

    stored = []
    row = {
        "id": food_id, "name": "Cooked rice", "source_id": "fsanz",
        "source_food_id": "123", "source_name": "FSANZ", "source_version": "1",
        "source_attribution": "Reference data", "quality_tier": "reference",
        "energy_kcal": 130, "protein_g": 2.5, "carbs_available_g": 28,
        "carbs_basis": "available", "fat_g": 0.3,
    }

    def handler(request):
        if request.url.path == "/auth/v1/user":
            return httpx.Response(200, json={"id": UID})
        if request.url.path == "/rest/v1/food_search":
            assert request.url.params["id"] == f"eq.{food_id}"
            return httpx.Response(200, json=[row])
        if request.url.path == "/rest/v1/diary_entries":
            stored.append(json.loads(request.content))
            return httpx.Response(201)
        raise AssertionError(f"Unexpected request: {request.url.path}")

    mock = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with TestClient(create_app(mock)) as client:
        response = client.post("/entries", headers=AUTH, json={
            "requestId": str(uuid4()), "day": "2026-10-07", "meal": "Lunch",
            "grams": 150, "food": {**FOOD, "id": food_id, "qualityTier": "reference",
                                   "per100g": {"calories": 999, "protein": 0, "carbs": 0, "fat": 0}},
        })
        client.portal.call(mock.aclose)
    assert response.status_code == 200, response.text
    assert stored[0]["food"]["per100g"]["calories"] == 130
    assert stored[0]["user_id"] == UID
