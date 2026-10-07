from ...core.database import Store
from . import repository


async def clear(db: Store):
    await repository.clear_diary_data(db)
    return {"ok": True}
