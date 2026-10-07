import re
from fastapi import APIRouter, Depends, HTTPException, Query
from ..gateway import Store, store
from ..models import Food, validate_log_food

router = APIRouter(tags=["foods"])


def pattern(term: str) -> str:
    escaped = re.sub(r'[\\%_*]', lambda m: '\\' + m[0], term).replace('"', '\\"')
    return '"*' + escaped + '*"'


def search_params(q: str, barcode: str | None):
    params = {"select": "*", "order": "name.asc,id.asc", "limit": "30"}
    if barcode is not None:
        if not re.fullmatch(r"[0-9]{8,14}", barcode):
            raise HTTPException(422, "Enter a barcode with 8 to 14 digits.")
        codes = [barcode]
        if len(barcode) == 12:
            codes.append("0" + barcode)
        elif len(barcode) == 13 and barcode.startswith("0"):
            codes.append(barcode[1:])
        params["barcode"] = "in.(" + ",".join(codes) + ")"
    else:
        words = q.strip().split()[:6]
        if not words:
            raise HTTPException(422, "Type a food or brand name.")
        params["and"] = "(" + ",".join(f"or(name.ilike.{pattern(w)},brand.ilike.{pattern(w)})" for w in words) + ")"
    return params


def map_food(row):
    return {
        "id": row["id"], "name": row["name"], "brand": row.get("brand"), "barcode": row.get("barcode"),
        "sourceId": row["source_id"], "sourceFoodId": row["source_food_id"],
        "sourceName": row["source_name"], "sourceVersion": row["source_version"],
        "attribution": row["source_attribution"], "qualityTier": row["quality_tier"],
        "licence": row.get("source_licence"), "sourceUrl": row.get("source_url"),
        "portions": row.get("portions") or [],
        "extra": {"fibre": row.get("fibre_g"), "sugars": row.get("sugars_g")},
        "per100g": {"calories": row.get("energy_kcal"), "protein": row.get("protein_g"),
                    "carbs": row.get("carbs_available_g") if row.get("carbs_basis") else None,
                    "fat": row.get("fat_g")},
    }


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
            raise HTTPException(422, str(e)) from None
    # Never trust client-supplied reference nutrition when saving.
    rows = await db.call(
        "GET",
        "food_search",
        params={
            "select": "*",
            "id": f"eq.{submitted.id}",
            "limit": "1",
        },
    )
    if not rows:
        raise HTTPException(404, "Food is no longer available. Search again.")
    try:
        return validate_log_food(Food.model_validate(map_food(rows[0])))
    except ValueError as e:
        raise HTTPException(422, str(e)) from None


@router.get("/foods", response_model=list[Food])
async def foods(q: str = Query(default="", max_length=80), barcode: str | None = None, db: Store = Depends(store)):
    rows = await db.call("GET", "food_search", params=search_params(q, barcode))
    return [map_food(r) for r in rows]


@router.get("/custom-foods", response_model=list[Food])
async def custom_foods(q: str = Query(default="", max_length=80), db: Store = Depends(store)):
    # Fetch all pages so a large collection doesn't silently disappear at the REST row cap.
    result, offset = [], 0
    while True:
        rows = await db.call("GET", "diary_custom_foods", params={"select": "food", "order": "created_at.desc,id.asc", "limit": "500", "offset": str(offset)})
        result.extend(r["food"] for r in rows)
        if len(rows) < 500:
            break
        offset += len(rows)
    words = q.lower().split()
    return [f for f in result if all(w in (f["name"] + " " + (f.get("brand") or "")).lower() for w in words)]


@router.post("/custom-foods")
async def save_custom(body: Food, db: Store = Depends(store)):
    if body.qualityTier != "custom":
        raise HTTPException(422, "A custom food must have custom quality.")
    food = await resolve_food(db, body)
    await db.call("POST", "diary_custom_foods", params={"on_conflict": "user_id,id"},
                  body={"user_id": db.user.id, "id": food.id, "food": food.model_dump()},
                  prefer="resolution=merge-duplicates,return=minimal")
    return {"ok": True}
