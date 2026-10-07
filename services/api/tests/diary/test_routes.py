from uuid import uuid4
from app.features.diary.calculations import summary
from support import FOOD, AUTH

def test_date_and_weight_validation(client):
    c, _ = client
    assert c.get("/diary?day=2026-02-30", headers=AUTH).status_code == 422
    for grams in [0, -1, 10001]:
        response = c.post("/entries", headers=AUTH, json={"requestId": str(uuid4()), "day": "2026-10-07", "meal": "Lunch", "grams": grams, "food": FOOD})
        assert response.status_code == 422

def test_summary_uses_whole_portions_and_preserves_unknown_extras():
    result = summary([{"food": FOOD, "grams": 200, "meal": "Lunch"}])
    assert result["totals"] == dict(calories=260, protein=5, carbs=56, fat=0.6)
    assert result["meals"]["Lunch"]["calories"] == 260
    assert result["extra"]["fibre"] == {"value": 0, "missing": 1}
