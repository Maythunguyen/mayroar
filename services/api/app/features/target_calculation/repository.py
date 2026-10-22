from uuid import UUID

from ...core.database import Store
from ...core.errors import ServiceError


TABLE = "target_calculations"

COLUMNS = (
    "id,request_id,inputs,goal,plan,revision,"
    "base_target_revision,policy_version,created_at,updated_at"
)


async def current_target_revision(db: Store) -> int:
    rows = await db.call(
        "GET",
        "diary_targets",
        params={
            "select": "revision",
            "user_id": f"eq.{db.user.id}",
            "limit": "1",
        },
    )

    return int(rows[0]["revision"]) if rows else 0


async def get(db: Store, calculation_id: UUID) -> dict:
    rows = await db.call(
        "GET",
        TABLE,
        params={
            "select": COLUMNS,
            "id": f"eq.{calculation_id}",
            "user_id": f"eq.{db.user.id}",
            "limit": "1",
        },
    )

    if not rows:
        raise ServiceError(404, "Calculation not found.")

    return rows[0]


async def create(db: Store, values: dict) -> dict:
    rows = await db.call(
        "POST",
        TABLE,
        params={
            "select": COLUMNS,
            "on_conflict": "user_id,request_id",
        },
        body={
            **values,
            "user_id": db.user.id,
        },
        prefer="resolution=ignore-duplicates,return=representation",
    )

    if rows:
        return rows[0]

    # A retry may find that the original request already succeeded.
    rows = await db.call(
        "GET",
        TABLE,
        params={
            "select": COLUMNS,
            "user_id": f"eq.{db.user.id}",
            "request_id": f"eq.{values['request_id']}",
            "limit": "1",
        },
    )

    if not rows:
        raise ServiceError(502, "Could not retrieve the saved calculation.")

    if rows[0]["inputs"] != values["inputs"]:
        raise ServiceError(
            409,
            "This request ID was already used for different answers. "
            "Use a new request ID.",
        )

    return rows[0]


async def update_goal(
    db: Store,
    calculation_id: UUID,
    expected_revision: int,
    values: dict,
) -> dict:
    rows = await db.call(
        "PATCH",
        TABLE,
        params={
            "select": COLUMNS,
            "id": f"eq.{calculation_id}",
            "user_id": f"eq.{db.user.id}",
            "revision": f"eq.{expected_revision}",
        },
        body=values,
        prefer="return=representation",
    )

    if not rows:
        raise ServiceError(
            409,
            "This calculation changed. Reload it before updating the goal.",
        )

    return rows[0]


async def confirm(
    db: Store,
    *,
    calculation_id: UUID,
    expected_revision: int,
    request_id: UUID,
    plan: dict,
) -> dict:
    result = await db.call(
        "POST",
        "rpc/confirm_target_calculation",
        body={
            "p_calculation_id": str(calculation_id),
            "p_expected_revision": expected_revision,
            "p_request_id": str(request_id),
            "p_plan": plan,
        },
    )

    if result["status"] == "not_found":
        raise ServiceError(404, "Calculation not found.")

    if result["status"] == "conflict":
        raise ServiceError(409, result["error"])

    if result["status"] == "invalid":
        raise ServiceError(422, result["error"])

    return result