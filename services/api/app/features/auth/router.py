from fastapi import APIRouter, Depends
from ...core.providers import supabase_client
from ...integrations.supabase import SupabaseClient
from . import service
from .schemas import Credentials, Refresh, Signup
from .dependencies import current_user
from .types import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(body: Credentials, client: SupabaseClient = Depends(supabase_client)):
    return await service.login(body, client)


@router.post("/refresh")
async def refresh(body: Refresh, client: SupabaseClient = Depends(supabase_client)):
    return await service.refresh(body, client)


@router.post("/signup")
async def signup(body: Signup, client: SupabaseClient = Depends(supabase_client)):
    return await service.signup(body, client)


@router.post("/logout")
async def logout(user: User = Depends(current_user), client: SupabaseClient = Depends(supabase_client)):
    return await service.logout(client, user)
