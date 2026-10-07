from datetime import date
from ...core.database import Store
from ..foods.schemas import Food
from .schemas import EntryCreate, EntryUpdate


async def for_day(db: Store, day: date):
    items, offset = [], 0
    while True:
        rows = await db.call("GET", "diary_entries", params={
            "select": "id,day,meal,grams,food", "day": f"eq.{day.isoformat()}",
            "order": "id.asc", "limit": "500", "offset": str(offset),
        })
        items.extend(rows)
        if len(rows) < 500:
            return items
        offset += len(rows)


async def insert(db: Store, body: EntryCreate, food: Food):
    await db.call("POST", "diary_entries", params={"on_conflict": "user_id,request_id"}, body={
        "user_id": db.user.id, "request_id": str(body.requestId), "day": body.day.isoformat(),
        "meal": body.meal, "grams": body.grams, "food": food.model_dump(),
    }, prefer="resolution=ignore-duplicates,return=minimal")


async def update(db: Store, entry_id: int, body: EntryUpdate):
    return await db.call("PATCH", "diary_entries", params={"id": f"eq.{entry_id}"},
                         body=body.model_dump(), prefer="return=representation")


async def delete(db: Store, entry_id: int):
    await db.call("DELETE", "diary_entries", params={"id": f"eq.{entry_id}"})


async def recent(db: Store):
    return await db.call("GET", "diary_entries", params={"select": "food", "order": "id.desc", "limit": "100"})
