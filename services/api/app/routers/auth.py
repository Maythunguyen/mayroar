from fastapi import APIRouter, Depends, Request
from ..gateway import User, current_user, supabase
from ..models import Credentials, Refresh, Signup

router = APIRouter(prefix="/auth", tags=["auth"])


def session(data):
    return {k: data[k] for k in ("access_token", "refresh_token", "expires_in")}


@router.post("/login")
async def login(body: Credentials, request: Request):
    data = await supabase(request, "POST", "/auth/v1/token", params={"grant_type": "password"}, body=body.model_dump())
    return session(data)


@router.post("/refresh")
async def refresh(body: Refresh, request: Request):
    data = await supabase(request, "POST", "/auth/v1/token", params={"grant_type": "refresh_token"}, body=body.model_dump())
    return session(data)


@router.post("/logout")
async def logout(request: Request, user: User = Depends(current_user)):
    await supabase(request, "POST", "/auth/v1/logout", params={"scope": "local"}, token=user.token)
    return {"ok": True}


@router.post("/signup")
async def signup(body: Signup, request: Request):
    data = await supabase(request, "POST", "/auth/v1/signup", body=body.model_dump())
    if data.get("access_token"):
        return {"requires_confirmation": False, "session": session(data)}
    # Supabase can intentionally obscure whether an account already exists.
    return {"requires_confirmation": True, "session": None}
