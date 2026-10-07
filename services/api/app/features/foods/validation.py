from .schemas import Food

def validate_log_food(food: Food) -> Food:
    values = food.per100g.model_dump()
    if any(value is None for value in values.values()):
        raise ValueError("This food is missing core nutrition. Create a complete custom food.")
    if values["calories"] > 1000 or any(values[k] > 100 for k in ("protein", "carbs", "fat")):
        raise ValueError("Nutrition exceeds the supported range per 100 g.")
    if values["calories"] == 0 and sum(values[k] for k in ("protein", "carbs", "fat")) > 1:
        raise ValueError("Zero calories conflicts with the supplied macros.")
    return food
