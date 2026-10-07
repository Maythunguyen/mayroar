from typing import Literal
from pydantic import Field
from ...core.schema import Model, Amount, Weight

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
