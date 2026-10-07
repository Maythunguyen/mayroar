from datetime import date
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator

Meal = Literal["Breakfast", "Lunch", "Dinner", "Snacks"]
Amount = Annotated[float, Field(ge=0, allow_inf_nan=False)]
Weight = Annotated[float, Field(gt=0, le=10000, allow_inf_nan=False)]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Nutrients(Model):
    calories: Amount | None
    protein: Amount | None
    carbs: Amount | None
    fat: Amount | None


class Extras(Model):
    fibre: Amount | None = None
    sugars: Amount | None = None


class Portion(Model):
    label: str = Field(min_length=1, max_length=200)
    grams: Weight


class Food(Model):
    id: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=200)
    brand: str | None = Field(default=None, max_length=200)
    barcode: str | None = Field(default=None, max_length=30)
    sourceId: str = Field(min_length=1, max_length=200)
    sourceFoodId: str = Field(min_length=1, max_length=200)
    sourceName: str = Field(min_length=1, max_length=200)
    sourceVersion: str = Field(max_length=100)
    attribution: str = Field(max_length=4000)
    qualityTier: Literal["reference", "label", "custom"]
    licence: str | None = Field(default=None, max_length=1000)
    sourceUrl: str | None = Field(default=None, max_length=2000)
    portions: list[Portion] = Field(default_factory=list, max_length=100)
    extra: Extras | None = None
    per100g: Nutrients


def validate_log_food(food: Food) -> Food:
    values = food.per100g.model_dump()
    if any(value is None for value in values.values()):
        raise ValueError("This food is missing core nutrition. Create a complete custom food.")
    if values["calories"] > 1000 or any(values[k] > 100 for k in ("protein", "carbs", "fat")):
        raise ValueError("Nutrition exceeds the supported range per 100 g.")
    if values["calories"] == 0 and sum(values[k] for k in ("protein", "carbs", "fat")) > 1:
        raise ValueError("Zero calories conflicts with the supplied macros.")
    return food


class EntryCreate(Model):
    requestId: UUID
    day: date
    meal: Meal
    grams: Weight
    food: Food


class EntryUpdate(Model):
    grams: Weight
    meal: Meal


class Targets(Model):
    calories: Annotated[float, Field(gt=0, le=20000, allow_inf_nan=False)]
    protein: Annotated[float, Field(gt=0, le=2000, allow_inf_nan=False)]
    carbs: Annotated[float, Field(gt=0, le=3000, allow_inf_nan=False)]
    fat: Annotated[float, Field(gt=0, le=2000, allow_inf_nan=False)]


class Credentials(Model):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=1024)


class Signup(Credentials):
    email: str = Field(min_length=3, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=8, max_length=1024)


class Refresh(Model):
    refresh_token: str = Field(min_length=1, max_length=4096)


class PhotoRequest(Model):
    image: str = Field(min_length=1, max_length=7 * 1024 * 1024)
    notes: str = Field(default="", max_length=500)


class Estimate(Model):
    isFood: bool
    name: str
    assumptions: str
    grams: Amount
    calories: Amount
    protein: Amount
    carbs: Amount
    fat: Amount

    @model_validator(mode="after")
    def valid_food(self):
        if self.isFood and (not self.name or not 0 < self.grams <= 10000):
            raise ValueError("Invalid food estimate")
        return self
