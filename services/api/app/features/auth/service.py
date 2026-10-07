from ...integrations.supabase import SupabaseClient
from .schemas import Credentials, Refresh, Signup
from .types import User


def session(data):
    return {key: data[key] for key in ("access_token", "refresh_token", "expires_in")}


async def login(body: Credentials, client: SupabaseClient):
    data = await client.request("POST", "/auth/v1/token", params={"grant_type": "password"}, body=body.model_dump())
    return session(data)


async def refresh(body: Refresh, client: SupabaseClient):
    data = await client.request("POST", "/auth/v1/token", params={"grant_type": "refresh_token"}, body=body.model_dump())
    return session(data)


async def logout(client: SupabaseClient, user: User):
    await client.request("POST", "/auth/v1/logout", params={"scope": "local"}, token=user.token)
    return {"ok": True}


async def signup(body: Signup, client: SupabaseClient):
    data = await client.request("POST", "/auth/v1/signup", body=body.model_dump())
    if data.get("access_token"):
        return {"requires_confirmation": False, "session": session(data)}
    # Do not reveal whether this address already has an account.
    return {"requires_confirmation": True, "session": None}
