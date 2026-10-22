from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from ...core.schema import Model
from ..targets.schemas import Targets


GoalName = Literal[
    "lose_fat",
    "maintain",
    "build_muscle",
]

Experience = Literal[
    "beginner",
    "intermediate",
    "advanced",
    "detrained",
]


class CalculationInputs(Model):
    age: Annotated[
        int,
        Field(ge=18, le=100, strict=True),
    ]

    # Optional profile information; not used as an equation coefficient.
    gender: Literal["woman", "man", "non_binary"] | None = None

    equation_sex: Literal["female", "male"]

    height_cm: Annotated[
        float,
        Field(ge=100, le=250, strict=True, allow_inf_nan=False),
    ]
    weight_kg: Annotated[
        float,
        Field(ge=30, le=300, strict=True, allow_inf_nan=False),
    ]

    work_activity: Literal[
        "sitting",
        "mixed",
        "on_feet",
        "physical",
    ]

    exercise_days_per_week: Annotated[
        int,
        Field(ge=0, le=7, strict=True),
    ]
    exercise_minutes_per_session: Annotated[
        int,
        Field(ge=0, le=240, strict=True),
    ]
    exercise_type: Literal[
        "none",
        "resistance",
        "cardio",
        "mixed",
    ]

    training_experience: Experience

    body_fat_percent: Annotated[
        float,
        Field(gt=0, lt=70, strict=True, allow_inf_nan=False),
    ] | None = None

    body_fat_source: Literal[
        "bia",
        "dxa",
        "calipers",
        "other",
        "visual",
    ] | None = None

    body_fat_measured_on: date | None = None

    # Explicitly answered in the assisted flow.
    calculation_context: Literal[
        "standard",
        "pregnant",
        "breastfeeding",
        "professional_guidance",
    ]

    @model_validator(mode="after")
    def validate_related_fields(self):
        if self.exercise_days_per_week == 0:
            if (
                self.exercise_minutes_per_session != 0
                or self.exercise_type != "none"
            ):
                raise ValueError(
                    "With zero exercise days, use zero minutes "
                    "and exercise_type='none'."
                )
        elif (
            self.exercise_minutes_per_session == 0
            or self.exercise_type == "none"
        ):
            raise ValueError(
                "Choose an exercise type and session duration."
            )

        if (
            self.body_fat_percent is not None
            and self.body_fat_source is None
        ):
            raise ValueError(
                "Provide the source of the body-fat estimate."
            )

        if (
            self.body_fat_measured_on is not None
            and self.body_fat_percent is None
        ):
            raise ValueError(
                "A measurement date requires a body-fat percentage."
            )

        return self


class CalculationCreate(Model):
    # Reuse this UUID when retrying the same submission.
    request_id: UUID
    inputs: CalculationInputs


class Goal(Model):
    suggested_goal: GoalName | None
    recommendation_reason: str
    selected_goal: GoalName | None = None


class PlanOptions(Model):
    # Signed fraction: -0.10 means a 10% deficit.
    calorie_adjustment: Annotated[
        float,
        Field(ge=-0.20, le=0.20, strict=True, allow_inf_nan=False),
    ] | None = None

    protein_per_lb_lean_mass: Annotated[
        float,
        Field(ge=1.2, le=1.6, strict=True, allow_inf_nan=False),
    ] | None = None

    fat_calorie_fraction: Annotated[
        float,
        Field(ge=0.20, le=0.35, strict=True, allow_inf_nan=False),
    ] | None = None


class GoalUpdate(Model):
    expected_revision: Annotated[int, Field(ge=1, strict=True)]
    selected_goal: GoalName

    # Defaults are recalculated when the user chooses a new goal.
    options: PlanOptions = Field(default_factory=PlanOptions)


class ValueRange(Model):
    minimum: float
    maximum: float


class CalculatedPlan(Model):
    targets: Targets
    options: PlanOptions

    resting_calories: float
    activity_multiplier: float
    maintenance_calories: float
    calorie_adjustment: float

    protein_method: Literal["lean_mass", "body_weight"]
    protein_coefficient: float | None
    fat_calorie_fraction: float

    protein_range_g: ValueRange
    fat_range_g: ValueRange

    assumptions: list[str]


class TargetCalculation(Model):
    id: UUID
    request_id: UUID

    inputs: CalculationInputs
    goal: Goal
    plan: CalculatedPlan | None

    revision: int
    base_target_revision: int
    policy_version: str

    created_at: datetime
    updated_at: datetime


class ConfirmationRequest(Model):
    request_id: UUID
    expected_revision: Annotated[int, Field(ge=1, strict=True)]


class ConfirmationResult(Model):
    status: Literal["saved", "replayed"]
    history_id: UUID
    target_revision: int
    targets: Targets