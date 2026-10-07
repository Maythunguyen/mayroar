from ...core.database import Store
from ..foods.schemas import Food


async def page(db: Store, offset: int):
    return await db.call("GET", "diary_favourites", params={
        "select": "food", "order": "created_at.desc,id.asc", "limit": "500", "offset": str(offset),
    })


async def toggle(db: Store, food: Food) -> bool:
    return await db.call("POST", "rpc/diary_toggle_favourite", body={"p_food": food.model_dump()})
