from uuid import UUID

from ...core.database import Store
from ...core.errors import ServiceError

from . import policy, repository
from .calculator import calculate_plan
from .schemas import (
    CalculationCreate,
    ConfirmationRequest,
    ConfirmationResult,
    GoalUpdate,
    TargetCalculation,
)


def require_current_policy(calculation: TargetCalculation) -> None:
    if calculation.policy_version != policy.POLICY_VERSION:
        raise ServiceError(
            409,
            "The calculation policy has changed. "
            "Create a new assessment from your answers.",
        )


async def create(
    body: CalculationCreate,
    db: Store,
) -> TargetCalculation:
    policy.ensure_eligible(body.inputs)

    goal = policy.recommend_goal(body.inputs)
    target_revision = await repository.current_target_revision(db)

    row = await repository.create(
        db,
        {
            "request_id": str(body.request_id),
            "inputs": body.inputs.model_dump(mode="json"),
            "goal": goal.model_dump(mode="json"),
            "plan": None,
            "base_target_revision": target_revision,
            "policy_version": policy.POLICY_VERSION,
        },
    )

    return TargetCalculation.model_validate(row)


async def get(
    calculation_id: UUID,
    db: Store,
) -> TargetCalculation:
    row = await repository.get(db, calculation_id)
    return TargetCalculation.model_validate(row)


async def update_goal(
    calculation_id: UUID,
    body: GoalUpdate,
    db: Store,
) -> TargetCalculation:
    calculation = await get(calculation_id, db)
    require_current_policy(calculation)

    if calculation.revision != body.expected_revision:
        raise ServiceError(
            409,
            "This calculation changed. Reload it before updating the goal.",
        )

    plan = calculate_plan(
        calculation.inputs,
        body.selected_goal,
        body.options,
    )

    goal = calculation.goal.model_copy(
        update={"selected_goal": body.selected_goal},
    )

    # Capture the active-target revision the user is now reviewing.
    target_revision = await repository.current_target_revision(db)

    row = await repository.update_goal(
        db,
        calculation_id,
        body.expected_revision,
        {
            "goal": goal.model_dump(mode="json"),
            "plan": plan.model_dump(mode="json"),
            "base_target_revision": target_revision,
        },
    )

    return TargetCalculation.model_validate(row)


async def confirm(
    calculation_id: UUID,
    body: ConfirmationRequest,
    db: Store,
) -> ConfirmationResult:
    calculation = await get(calculation_id, db)
    require_current_policy(calculation)

    if calculation.goal.selected_goal is None or calculation.plan is None:
        raise ServiceError(422, "Choose a goal before confirming targets.")

    # Recalculate instead of trusting targets supplied by the client.
    plan = calculate_plan(
        calculation.inputs,
        calculation.goal.selected_goal,
        calculation.plan.options,
    )

    result = await repository.confirm(
        db,
        calculation_id=calculation_id,
        expected_revision=body.expected_revision,
        request_id=body.request_id,
        plan=plan.model_dump(mode="json"),
    )

    return ConfirmationResult.model_validate(result)