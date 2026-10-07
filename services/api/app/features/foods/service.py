from ...core.database import Store
from ...core.errors import ServiceError
from .schemas import Food
from . import repository
from .validation import validate_log_food
from .mapping import map_food
from .filters import search_params

async def resolve_food(db: Store, submitted: Food) -> Food:
    if submitted.qualityTier == "custom":
        # User reviewed manual/AI input is permitted, with honest attribution.
        submitted = submitted.model_copy(update={
            "sourceId": "ai-photo" if submitted.sourceId == "ai-photo" else "custom",
            "sourceName": "AI photo estimate" if submitted.sourceId == "ai-photo" else "Your custom food",
        })
        try:
            return validate_log_food(submitted)
        except ValueError as e:
            raise ServiceError(422, str(e)) from None
    # Never trust client-supplied reference nutrition when saving.
    rows = await repository.by_id(db, submitted.id)
    if not rows:
        raise ServiceError(404, "Food is no longer available. Search again.")
    try:
        return validate_log_food(Food.model_validate(map_food(rows[0])))
    except ValueError as e:
        raise ServiceError(422, str(e)) from None

async def foods(q: str, barcode: str | None, db: Store):
    rows = await repository.search(db, search_params(q, barcode))
    return [map_food(r) for r in rows]

async def custom_foods(q: str, db: Store):
    result, offset = ([], 0)
    while True:
        rows = await repository.custom_page(db, offset)
        result.extend((r['food'] for r in rows))
        if len(rows) < 500:
            break
        offset += len(rows)
    words = q.lower().split()
    return [f for f in result if all((w in (f['name'] + ' ' + (f.get('brand') or '')).lower() for w in words))]

async def save_custom(body: Food, db: Store):
    if body.qualityTier != 'custom':
        raise ServiceError(422, 'A custom food must have custom quality.')
    food = await resolve_food(db, body)
    await repository.save_custom(db, food)
    return {'ok': True}

