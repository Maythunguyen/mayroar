from uuid import uuid4
from support import UID, FOOD, AUTH

def test_auth_required_and_verified(client):
    c, calls = client
    assert c.get("/diary?day=2026-10-07").status_code == 401
    assert c.get("/diary?day=2026-10-07", headers={"Authorization": "Bearer forged"}).status_code == 401
    assert not any(r.url.path.startswith("/rest/") for r in calls)

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

def test_oversized_requests_and_cors(client):
    c, _ = client
    assert c.post("/auth/login", content=b"x" * 140000).status_code == 413
    assert c.options("/diary", headers={"Origin": "http://localhost:8081", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization"}).status_code == 200
    assert c.options("/diary", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"}).status_code == 400
