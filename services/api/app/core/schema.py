from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field

Meal = Literal["Breakfast", "Lunch", "Dinner", "Snacks"]
Amount = Annotated[float, Field(ge=0, allow_inf_nan=False)]
Weight = Annotated[float, Field(gt=0, le=10000, allow_inf_nan=False)]

class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
