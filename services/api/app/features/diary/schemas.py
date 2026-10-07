from datetime import date
from uuid import UUID
from ...core.schema import Model, Meal, Weight
from ..foods.schemas import Food

class EntryCreate(Model):
    requestId: UUID
    day: date
    meal: Meal
    grams: Weight
    food: Food


class EntryUpdate(Model):
    grams: Weight
    meal: Meal
