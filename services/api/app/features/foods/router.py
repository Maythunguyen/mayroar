from fastapi import APIRouter, Depends, Query
from ...core.database import Store
from ...core.dependencies import store
from . import service
from .schemas import Food

router = APIRouter(tags=['foods'])

@router.get("/foods", response_model=list[Food])
async def foods(q: str = Query(default="", max_length=80), barcode: str | None = None, db: Store = Depends(store)):
    return await service.foods(q, barcode, db)

@router.get("/custom-foods", response_model=list[Food])
async def custom_foods(q: str = Query(default="", max_length=80), db: Store = Depends(store)):
    return await service.custom_foods(q, db)

@router.post("/custom-foods")
async def save_custom(body: Food, db: Store = Depends(store)):
    return await service.save_custom(body, db)

