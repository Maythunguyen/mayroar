from pydantic import Field, model_validator
from ...core.schema import Model, Amount

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

ESTIMATE_OUTPUT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "isFood": {"type": "boolean"},
        "name": {"type": "string"},
        "assumptions": {"type": "string"},
        "grams": {"type": "number"},
        "calories": {"type": "number"},
        "protein": {"type": "number"},
        "carbs": {"type": "number"},
        "fat": {"type": "number"},
    },
    "required": [
        "isFood",
        "name",
        "assumptions",
        "grams",
        "calories",
        "protein",
        "carbs",
        "fat",
    ],
}