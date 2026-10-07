from fastapi import APIRouter, Depends
from ...core.database import Store
from ...core.dependencies import store
from . import service
from ..foods.schemas import Food

router = APIRouter(tags=['favourites'])

@router.get("/favourites", response_model=list[Food])
async def favourites(db: Store = Depends(store)):
    return await service.favourites(db)

@router.post("/favourites/toggle")
async def toggle(body: Food, db: Store = Depends(store)):
    return await service.toggle(body, db)

