from ...core.errors import ServiceError
from ..targets.schemas import Targets

from . import policy
from .schemas import (
    CalculatedPlan,
    CalculationInputs,
    GoalName,
    PlanOptions,
    ValueRange,
)


def resting_calories(inputs: CalculationInputs) -> float:
    offset = 5 if inputs.equation_sex == "male" else -161

    return (
        10 * inputs.weight_kg
        + 6.25 * inputs.height_cm
        - 5 * inputs.age
        + offset
    )


def validate_adjustment(goal: GoalName, adjustment: float) -> None:
    if goal == "maintain" and adjustment != 0:
        raise ServiceError(
            422,
            "Maintenance requires a zero calorie adjustment.",
        )

    if goal == "lose_fat" and not -0.20 <= adjustment <= -0.10:
        raise ServiceError(
            422,
            "Choose a deficit between 10% and 20%.",
        )

    if goal == "build_muscle" and not 0.05 <= adjustment <= 0.20:
        raise ServiceError(
            422,
            "Choose a surplus between 5% and 20%.",
        )


def calculate_plan(
    inputs: CalculationInputs,
    goal: GoalName,
    options: PlanOptions,
) -> CalculatedPlan:
    policy.ensure_eligible(inputs)

    adjustment = options.calorie_adjustment

    if adjustment is None:
        adjustment = policy.default_adjustment(inputs, goal)

    validate_adjustment(goal, adjustment)

    resting = resting_calories(inputs)
    multiplier = policy.activity_multiplier(inputs)
    maintenance = resting * multiplier
    calories = round(maintenance * (1 + adjustment))

    if not (
        policy.MIN_ESTIMATED_CALORIES
        <= calories
        <= policy.MAX_ESTIMATED_CALORIES
    ):
        raise ServiceError(
            422,
            "The estimate is outside this calculator's supported range. "
            "Review your answers or use appropriately supplied manual targets.",
        )

    body_fat = policy.usable_body_fat(inputs)

    assumptions = [
        "This is a starting estimate, not a measured energy requirement.",
        "The activity multiplier already includes reported exercise.",
        "Protein, fat and carbohydrate amounts share one calorie budget.",
    ]

    if body_fat is not None:
        lean_mass_kg = inputs.weight_kg * (1 - body_fat / 100)
        lean_mass_lb = lean_mass_kg * 2.20462

        coefficient = options.protein_per_lb_lean_mass

        if coefficient is None:
            coefficient = policy.default_protein_coefficient(inputs)

        protein = round(lean_mass_lb * coefficient, 1)

        protein_range = ValueRange(
            minimum=round(lean_mass_lb * 1.2, 1),
            maximum=round(lean_mass_lb * 1.6, 1),
        )

        protein_method = "lean_mass"

        assumptions.append(
            "The lean-mass calculation uses your reported body-fat estimate."
        )
    else:
        if options.protein_per_lb_lean_mass is not None:
            raise ServiceError(
                422,
                "A lean-mass protein coefficient requires a "
                "non-visual body-fat estimate.",
            )

        coefficient = None
        protein_method = "body_weight"

        protein = round(
            inputs.weight_kg
            * policy.UNKNOWN_BODY_FAT_PROTEIN_PER_KG,
            1,
        )

        protein_range = ValueRange(
            minimum=round(inputs.weight_kg * 1.4, 1),
            maximum=round(inputs.weight_kg * 2.0, 1),
        )

        assumptions.append(
            "Body fat is unknown or visually estimated, so protein "
            "uses the separate body-weight fallback policy."
        )

    fat_fraction = options.fat_calorie_fraction

    if fat_fraction is None:
        fat_fraction = policy.DEFAULT_FAT_FRACTION

    fat = round(calories * fat_fraction / 9, 1)
    remaining_calories = calories - protein * 4 - fat * 9
    carbs = round(remaining_calories / 4, 1)

    if carbs <= 0:
        raise ServiceError(
            422,
            "These protein and fat amounts leave no carbohydrate budget. "
            "Review the calorie adjustment or macro settings.",
        )

    if goal == "build_muscle" and inputs.exercise_type not in {
        "resistance",
        "mixed",
    }:
        assumptions.append(
            "A calorie surplus alone does not ensure muscle gain. "
            "This estimate does not predict body-composition changes."
        )

    return CalculatedPlan(
        targets=Targets(
            calories=calories,
            protein=protein,
            carbs=carbs,
            fat=fat,
        ),
        options=options,
        resting_calories=round(resting, 2),
        activity_multiplier=multiplier,
        maintenance_calories=round(maintenance, 2),
        calorie_adjustment=adjustment,
        protein_method=protein_method,
        protein_coefficient=coefficient,
        fat_calorie_fraction=fat_fraction,
        protein_range_g=protein_range,
        fat_range_g=ValueRange(
            minimum=round(calories * 0.20 / 9, 1),
            maximum=round(calories * 0.35 / 9, 1),
        ),
        assumptions=assumptions,
    )