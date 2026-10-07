from fastapi import APIRouter, Depends
from ...core.database import Store
from ...core.dependencies import store
from . import service
from datetime import date
from .schemas import EntryCreate, EntryUpdate

router = APIRouter(tags=['diary'])

@router.get("/diary")
async def diary(day: date, db: Store = Depends(store)):
    return await service.diary(day, db)

@router.post("/entries")
async def add_entry(body: EntryCreate, db: Store = Depends(store)):
    return await service.add_entry(body, db)

@router.patch("/entries/{entry_id}")
async def update_entry(entry_id: int, body: EntryUpdate, db: Store = Depends(store)):
    return await service.update_entry(entry_id, body, db)

@router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: int, db: Store = Depends(store)):
    return await service.delete_entry(entry_id, db)


from ..foods.schemas import Food

@router.get("/recent-foods", response_model=list[Food])
async def recent(db: Store = Depends(store)):
    return await service.recent(db)

