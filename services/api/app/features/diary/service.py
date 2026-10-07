from datetime import date
from ...core.database import Store
from ...core.errors import ServiceError
from ..foods.service import resolve_food
from . import repository
from .schemas import EntryCreate, EntryUpdate
from .calculations import summary


async def diary(day: date, db: Store):
    return summary(await repository.for_day(db, day))


async def add_entry(body: EntryCreate, db: Store):
    food = await resolve_food(db, body.food)
    await repository.insert(db, body, food)
    return {"ok": True}


async def update_entry(entry_id: int, body: EntryUpdate, db: Store):
    rows = await repository.update(db, entry_id, body)
    if not rows:
        raise ServiceError(404, "Entry not found.")
    return {"ok": True}


async def delete_entry(entry_id: int, db: Store):
    await repository.delete(db, entry_id)
    return {"ok": True}


async def recent(db: Store):
    rows = await repository.recent(db)
    unique = {}
    for row in rows:
        unique.setdefault(row["food"]["id"], row["food"])
    return list(unique.values())[:10]
