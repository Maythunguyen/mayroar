from fastapi import Request
from .config import settings
from ..integrations.supabase import SupabaseClient


def supabase_client(request: Request) -> SupabaseClient:
    return SupabaseClient(request.app.state.http, settings())
