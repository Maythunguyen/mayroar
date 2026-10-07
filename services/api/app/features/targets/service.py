from ...core.database import Store
from .schemas import Targets
from . import repository


async def targets(db: Store):
    rows = await repository.get(db)
    return rows[0]["targets"] if rows else None


async def save_targets(body: Targets, db: Store):
    await repository.save(db, body)
    return {"ok": True}
