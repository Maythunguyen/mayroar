from fastapi import APIRouter, Depends
from ...core.database import Store
from ...core.dependencies import store
from . import service
from .schemas import Targets

router = APIRouter(tags=['targets'])

@router.get("/targets", response_model=Targets | None)
async def targets(db: Store = Depends(store)):
    return await service.targets(db)

@router.put("/targets")
async def save_targets(body: Targets, db: Store = Depends(store)):
    return await service.save_targets(body, db)

