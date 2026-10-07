import os
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "test-key")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from support import UID, AUTH

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
