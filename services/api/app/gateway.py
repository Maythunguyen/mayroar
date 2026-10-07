"""All database calls use the user's JWT, so Supabase RLS remains enforced."""
from dataclasses import dataclass
from uuid import UUID
import httpx
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .config import settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class User:
    id: str
    token: str


async def supabase(request: Request, method: str, path: str, *, token=None, params=None, body=None, prefer=None):
    cfg = settings()
    headers = {"apikey": cfg.supabase_publishable_key}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if prefer:
        headers["Prefer"] = prefer
    response = await request.app.state.http.request(
        method, cfg.supabase_url.rstrip("/") + path,
        headers=headers, params=params, json=body,
    )
    if response.is_error:
        if response.status_code == 429:
            raise HTTPException(429, "Too many requests. Please wait and try again.")
        if path == "/auth/v1/signup" and response.status_code in (400, 401, 403, 422):
            raise HTTPException(400, "Could not create an account. Check your email and password requirements, or sign in if you already registered.")
        if path.startswith("/auth/") and response.status_code in (400, 401, 403, 422):
            raise HTTPException(401, "Sign-in failed or session expired. Check your email and password.")
        if response.status_code in (401, 403):
            raise HTTPException(403, "You do not have access to this data.")
        # Do not return database internals or provider error bodies.
        raise HTTPException(502, "Database request failed. Check backend configuration and migrations.")
    return response.json() if response.content else None


async def current_user(request: Request, auth: HTTPAuthorizationCredentials | None = Depends(bearer)) -> User:
    if auth is None:
        raise HTTPException(401, "Sign in to continue.")
    data = await supabase(request, "GET", "/auth/v1/user", token=auth.credentials)
    try:
        uid = str(UUID(data["id"]))
    except (ValueError, KeyError, TypeError):
        raise HTTPException(401, "Invalid session.") from None
    return User(uid, auth.credentials)


class Store:
    def __init__(self, request: Request, user: User):
        self.request, self.user = request, user

    async def call(self, method, resource, *, params=None, body=None, prefer=None):
        return await supabase(self.request, method, f"/rest/v1/{resource}",
                              token=self.user.token, params=params, body=body, prefer=prefer)


def store(request: Request, user: User = Depends(current_user)) -> Store:
    return Store(request, user)
