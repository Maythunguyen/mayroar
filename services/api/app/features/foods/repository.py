from ...core.database import Store
from .schemas import Food


async def search(db: Store, params: dict):
    return await db.call("GET", "food_search", params=params)


async def by_id(db: Store, food_id: str):
    # Top-level eq takes the literal value. HTTPX encodes it once.
    # Do not wrap the value in additional quotes.
    return await db.call("GET", "food_search", params={"select": "*", "id": f"eq.{food_id}", "limit": "1"})


async def custom_page(db: Store, offset: int):
    return await db.call("GET", "diary_custom_foods", params={
        "select": "food", "order": "created_at.desc,id.asc", "limit": "500", "offset": str(offset),
    })


async def save_custom(db: Store, food: Food):
    await db.call("POST", "diary_custom_foods", params={"on_conflict": "user_id,id"},
        body={"user_id": db.user.id, "id": food.id, "food": food.model_dump()},
        prefer="resolution=merge-duplicates,return=minimal")
