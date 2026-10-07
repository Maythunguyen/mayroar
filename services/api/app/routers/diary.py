from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from ..gateway import Store, store
from ..models import EntryCreate, EntryUpdate, Food, Targets
from .foods import resolve_food

router = APIRouter(tags=["diary"])
CORE = ("calories", "protein", "carbs", "fat")
MEALS = ("Breakfast", "Lunch", "Dinner", "Snacks")


async def day_entries(db, day):
    items, offset = [], 0
    while True:
        rows = await db.call("GET", "diary_entries", params={
            "select": "id,day,meal,grams,food", "day": f"eq.{day.isoformat()}",
            "order": "id.asc", "limit": "500", "offset": str(offset),
        })
        items.extend(rows)
        if len(rows) < 500:
            return items
        offset += len(rows)


def summary(items):
    totals = {k: 0.0 for k in CORE}
    meals = {meal: {k: 0.0 for k in CORE} for meal in MEALS}
    extra = {k: {"value": 0.0, "missing": 0} for k in ("fibre", "sugars")}
    for entry in items:
        factor = entry["grams"] / 100
        for key in CORE:
            value = entry["food"]["per100g"][key] * factor
            totals[key] += value
            meals[entry["meal"]][key] += value
        for key in extra:
            value = (entry["food"].get("extra") or {}).get(key)
            if value is None:
                extra[key]["missing"] += 1
            else:
                extra[key]["value"] += value * factor
    return {"entries": items, "totals": totals, "meals": meals, "extra": extra}


@router.get("/diary")
async def diary(day: date, db: Store = Depends(store)):
    return summary(await day_entries(db, day))


@router.post("/entries")
async def add_entry(body: EntryCreate, db: Store = Depends(store)):
    food = await resolve_food(db, body.food)
    await db.call("POST", "diary_entries", params={"on_conflict": "user_id,request_id"}, body={
        "user_id": db.user.id, "request_id": str(body.requestId), "day": body.day.isoformat(),
        "meal": body.meal, "grams": body.grams, "food": food.model_dump(),
    }, prefer="resolution=ignore-duplicates,return=minimal")
    return {"ok": True}


@router.patch("/entries/{entry_id}")
async def update_entry(entry_id: int, body: EntryUpdate, db: Store = Depends(store)):
    rows = await db.call("PATCH", "diary_entries", params={"id": f"eq.{entry_id}"}, body=body.model_dump(), prefer="return=representation")
    if not rows:
        raise HTTPException(404, "Entry not found.")
    return {"ok": True}


@router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: int, db: Store = Depends(store)):
    await db.call("DELETE", "diary_entries", params={"id": f"eq.{entry_id}"})
    return {"ok": True}


@router.get("/recent-foods", response_model=list[Food])
async def recent(db: Store = Depends(store)):
    rows = await db.call("GET", "diary_entries", params={"select": "food", "order": "id.desc", "limit": "100"})
    unique = {}
    for row in rows:
        unique.setdefault(row["food"]["id"], row["food"])
    return list(unique.values())[:10]


@router.get("/favourites", response_model=list[Food])
async def favourites(db: Store = Depends(store)):
    result, offset = [], 0
    while True:
        rows = await db.call("GET", "diary_favourites", params={"select": "food", "order": "created_at.desc,id.asc", "limit": "500", "offset": str(offset)})
        result.extend(row["food"] for row in rows)
        if len(rows) < 500:
            return result
        offset += len(rows)


@router.post("/favourites/toggle")
async def toggle(body: Food, db: Store = Depends(store)):
    # Incomplete catalogue foods may still be favourites; logging validates separately.
    return await db.call("POST", "rpc/diary_toggle_favourite", body={"p_food": body.model_dump()})


@router.get("/targets", response_model=Targets | None)
async def targets(db: Store = Depends(store)):
    rows = await db.call("GET", "diary_targets", params={"select": "targets", "limit": "1"})
    return rows[0]["targets"] if rows else None


@router.put("/targets")
async def save_targets(body: Targets, db: Store = Depends(store)):
    await db.call("POST", "diary_targets", params={"on_conflict": "user_id"},
                  body={"user_id": db.user.id, "targets": body.model_dump()},
                  prefer="resolution=merge-duplicates,return=minimal")
    return {"ok": True}


@router.delete("/diary-data")
async def clear(db: Store = Depends(store)):
    await db.call("POST", "rpc/diary_clear_data", body={})
    return {"ok": True}
