from uuid import UUID

from fastapi import APIRouter, Depends

from ...core.database import Store
from ...core.dependencies import store

from . import service
from .schemas import (
    CalculationCreate,
    ConfirmationRequest,
    ConfirmationResult,
    GoalUpdate,
    TargetCalculation,
)


router = APIRouter(
    prefix="/target_calculation",
    tags=["target-calculation"],
)


@router.post(
    "",
    response_model=TargetCalculation,
    status_code=201,
)
async def create_calculation(
    body: CalculationCreate,
    db: Store = Depends(store),
):
    return await service.create(body, db)


@router.get(
    "/{calculation_id}",
    response_model=TargetCalculation,
)
async def get_calculation(
    calculation_id: UUID,
    db: Store = Depends(store),
):
    return await service.get(calculation_id, db)


@router.patch(
    "/{calculation_id}/goal",
    response_model=TargetCalculation,
)
async def update_goal(
    calculation_id: UUID,
    body: GoalUpdate,
    db: Store = Depends(store),
):
    return await service.update_goal(calculation_id, body, db)


@router.post(
    "/{calculation_id}/confirm",
    response_model=ConfirmationResult,
)
async def confirm_calculation(
    calculation_id: UUID,
    body: ConfirmationRequest,
    db: Store = Depends(store),
):
    return await service.confirm(calculation_id, body, db)