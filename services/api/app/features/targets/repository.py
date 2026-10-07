from ...core.database import Store
from .schemas import Targets


async def get(db: Store):
    return await db.call("GET", "diary_targets", params={"select": "targets", "limit": "1"})


async def save(db: Store, targets: Targets):
    await db.call("POST", "diary_targets", params={"on_conflict": "user_id"},
        body={"user_id": db.user.id, "targets": targets.model_dump()},
        prefer="resolution=merge-duplicates,return=minimal")
