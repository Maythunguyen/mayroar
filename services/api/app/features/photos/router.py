from fastapi import APIRouter, Depends
from ...core.database import Store
from ...core.dependencies import store
from . import service
from .schemas import Estimate, PhotoRequest

router = APIRouter(tags=['photos'])

@router.post("/analyse-food", response_model=Estimate)
async def analyse(body: PhotoRequest, db: Store = Depends(store)):
    return await service.analyse(body, db)

