from typing import Annotated
from pydantic import Field
from ...core.schema import Model

class Targets(Model):
    calories: Annotated[float, Field(gt=0, le=20000, allow_inf_nan=False)]
    protein: Annotated[float, Field(gt=0, le=2000, allow_inf_nan=False)]
    carbs: Annotated[float, Field(gt=0, le=3000, allow_inf_nan=False)]
    fat: Annotated[float, Field(gt=0, le=2000, allow_inf_nan=False)]
