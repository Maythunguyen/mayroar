from fastapi import Depends
from .database import Store
from .providers import supabase_client
from ..features.auth.dependencies import current_user
from ..features.auth.types import User
from ..integrations.supabase import SupabaseClient


def store(
    client: SupabaseClient = Depends(supabase_client),
    user: User = Depends(current_user),
) -> Store:
    return Store(client, user)
