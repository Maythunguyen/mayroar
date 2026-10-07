"""Supabase transport: no service-role key, no provider error bodies in responses."""
import httpx
from ..core.config import Settings
from ..core.errors import ServiceError


class SupabaseClient:
    def __init__(self, http: httpx.AsyncClient, config: Settings):
        self.http = http
        self.config = config

    async def request(self, method: str, path: str, *, token=None, params=None, body=None, prefer=None):
        headers = {"apikey": self.config.supabase_publishable_key}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        if prefer:
            headers["Prefer"] = prefer
        response = await self.http.request(
            method, self.config.supabase_url.rstrip("/") + path,
            headers=headers, params=params, json=body,
        )
        if response.is_error:
            if response.status_code == 429:
                raise ServiceError(429, "Too many requests. Please wait and try again.")
            if path == "/auth/v1/signup" and response.status_code in (400, 401, 403, 422):
                raise ServiceError(400, "Could not create an account. Check your email and password requirements, or sign in if you already registered.")
            if path.startswith("/auth/") and response.status_code in (400, 401, 403, 422):
                raise ServiceError(401, "Sign-in failed or session expired. Check your email and password.")
            if response.status_code in (401, 403):
                raise ServiceError(403, "You do not have access to this data.")
            raise ServiceError(502, "Database request failed. Check backend configuration and migrations.")
        if not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            raise ServiceError(502, "The upstream service returned an unreadable response.") from None
