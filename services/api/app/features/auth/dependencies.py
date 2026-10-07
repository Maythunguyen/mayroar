from uuid import UUID
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from ...core.errors import ServiceError
from ...core.providers import supabase_client
from ...integrations.supabase import SupabaseClient
from .types import User

bearer = HTTPBearer(auto_error=False)


async def current_user(
    auth: HTTPAuthorizationCredentials | None = Depends(bearer),
    client: SupabaseClient = Depends(supabase_client),
) -> User:
    if auth is None:
        raise ServiceError(401, "Sign in to continue.")
    data = await client.request("GET", "/auth/v1/user", token=auth.credentials)
    try:
        uid = str(UUID(data["id"]))
    except (ValueError, KeyError, TypeError):
        raise ServiceError(401, "Invalid session.") from None
    return User(uid, auth.credentials)
