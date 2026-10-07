import os
import httpx
import pytest
from fastapi.testclient import TestClient
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "test-key")
from app.main import create_app

@pytest.mark.parametrize("confirmed", [False, True])
def test_signup_confirmation_modes(confirmed):
    calls = []
    def handler(request):
        calls.append(request)
        assert request.url.path == "/auth/v1/signup"
        assert "authorization" not in request.headers
        result = {"id": "user"}
        if confirmed:
            result.update(access_token="access", refresh_token="refresh", expires_in=3600)
        return httpx.Response(200, json=result)
    mock = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with TestClient(create_app(mock)) as client:
        response = client.post("/auth/signup", json={"email": "may@example.com", "password": "password123"})
        assert response.status_code == 200
        assert response.json()["requires_confirmation"] is (not confirmed)
        assert bool(response.json()["session"]) is confirmed
        assert len(calls) == 1
        client.portal.call(mock.aclose)

@pytest.mark.parametrize("email,password", [("bad", "password123"), ("may@example.com", "short")])
def test_signup_validates_before_calling_provider(email, password):
    def handler(request):
        raise AssertionError("Invalid input must not reach provider")
    mock = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    with TestClient(create_app(mock)) as client:
        assert client.post("/auth/signup", json={"email": email, "password": password}).status_code == 422
        client.portal.call(mock.aclose)

def test_signup_error_does_not_expose_provider_details():
    mock = httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(422, json={"msg": "private provider detail"})))
    with TestClient(create_app(mock)) as client:
        response = client.post("/auth/signup", json={"email": "may@example.com", "password": "password123"})
        assert response.status_code == 400
        assert "private provider detail" not in response.text
        client.portal.call(mock.aclose)
