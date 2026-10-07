from fastapi import APIRouter, Depends
from ...core.database import Store
from ...core.dependencies import store
from . import service

router = APIRouter(tags=['account'])

@router.delete("/diary-data")
async def clear(db: Store = Depends(store)):
    return await service.clear(db)

