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
