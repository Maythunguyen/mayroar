"""An authenticated data session. Constructed by dependencies, used by repositories."""
from ..integrations.supabase import SupabaseClient
from ..features.auth.types import User


class Store:
    def __init__(self, client: SupabaseClient, user: User):
        self.client = client
        self.user = user

    async def call(self, method, resource, *, params=None, body=None, prefer=None):
        return await self.client.request(
            method, f"/rest/v1/{resource}", token=self.user.token,
            params=params, body=body, prefer=prefer,
        )
