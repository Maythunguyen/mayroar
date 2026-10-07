CORE = ("calories", "protein", "carbs", "fat")
MEALS = ("Breakfast", "Lunch", "Dinner", "Snacks")

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
