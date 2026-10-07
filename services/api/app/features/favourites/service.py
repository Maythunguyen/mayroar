from ...core.database import Store
from ..foods.schemas import Food
from . import repository


async def favourites(db: Store):
    result, offset = [], 0
    while True:
        rows = await repository.page(db, offset)
        result.extend(row["food"] for row in rows)
        if len(rows) < 500:
            return result
        offset += len(rows)


async def toggle(body: Food, db: Store):
    return await repository.toggle(db, body)
