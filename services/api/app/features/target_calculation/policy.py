from ...core.errors import ServiceError

from .schemas import CalculationInputs, Goal, GoalName


POLICY_VERSION = "mayroar-targets-v1"

# Product review bounds, not a declaration that every value within
# this interval is appropriate for every person.
MIN_ESTIMATED_CALORIES = 1200
MAX_ESTIMATED_CALORIES = 6000

# V1 heuristic for non-exercise activity.
WORK_ACTIVITY_BASE = {
    "sitting": 1.20,
    "mixed": 1.35,
    "on_feet": 1.50,
    "physical": 1.65,
}

# Conservative V1 starting values.
MUSCLE_GAIN_ADJUSTMENT = {
    "beginner": 0.10,
    "intermediate": 0.10,
    "advanced": 0.05,
    "detrained": 0.10,
}

DEFAULT_FAT_FRACTION = 0.25
UNKNOWN_BODY_FAT_PROTEIN_PER_KG = 2.0


def ensure_eligible(inputs: CalculationInputs) -> None:
    if inputs.calculation_context != "standard":
        raise ServiceError(
            422,
            "Automatic targets are not available for this context. "
            "You can enter appropriate targets manually or track without targets.",
        )

    bmi = inputs.weight_kg / (inputs.height_cm / 100) ** 2

    if bmi < 18.5:
        raise ServiceError(
            422,
            "These measurements are outside this calculator's supported scope. "
            "Use appropriate professional guidance for setting targets.",
        )


def usable_body_fat(inputs: CalculationInputs) -> float | None:
    # Visual selections are not treated as exact measurements.
    if inputs.body_fat_source == "visual":
        return None

    return inputs.body_fat_percent


def body_fat_band(inputs: CalculationInputs) -> str | None:
    body_fat = usable_body_fat(inputs)

    if body_fat is None:
        return None

    # Explicit product boundaries. The source book gives approximate,
    # overlapping categories rather than exact classification rules.
    low, high = (
        (22.0, 30.0)
        if inputs.equation_sex == "female"
        else (12.0, 20.0)
    )

    if body_fat < low:
        return "low"

    if body_fat > high:
        return "high"

    return "moderate"


def recommend_goal(inputs: CalculationInputs) -> Goal:
    band = body_fat_band(inputs)

    if band is None:
        return Goal(
            suggested_goal=None,
            recommendation_reason=(
                "There is not enough body-composition information "
                "to suggest a goal. Choose the goal that matches your priority."
            ),
        )

    if band == "high":
        return Goal(
            suggested_goal="lose_fat",
            recommendation_reason=(
                "Your reported body-fat estimate falls in this policy's "
                "higher band. Fat loss is one possible starting goal "
                "if reducing body fat is your priority."
            ),
        )

    if band == "low":
        if inputs.exercise_type in {"resistance", "mixed"}:
            return Goal(
                suggested_goal="build_muscle",
                recommendation_reason=(
                    "Your reported body-fat estimate falls in this policy's "
                    "lower band and you report resistance training. "
                    "Building muscle is one possible starting goal."
                ),
            )

        return Goal(
            suggested_goal="maintain",
            recommendation_reason=(
                "Your reported body-fat estimate is in the lower band. "
                "Maintenance is the suggested starting option while "
                "you decide your training and muscle-building priorities."
            ),
        )

    return Goal(
        suggested_goal="maintain",
        recommendation_reason=(
            "Your reported body-fat estimate falls in the middle band. "
            "Maintenance is a possible starting approach while working "
            "on strength and body composition."
        ),
    )


def activity_multiplier(inputs: CalculationInputs) -> float:
    weekly_minutes = (
        inputs.exercise_days_per_week
        * inputs.exercise_minutes_per_session
    )

    if weekly_minutes == 0:
        exercise_increment = 0.0
    elif weekly_minutes < 150:
        exercise_increment = 0.15
    elif weekly_minutes < 300:
        exercise_increment = 0.30
    elif weekly_minutes < 450:
        exercise_increment = 0.45
    else:
        exercise_increment = 0.60

    return round(
        min(
            WORK_ACTIVITY_BASE[inputs.work_activity] + exercise_increment,
            2.20,
        ),
        2,
    )


def default_adjustment(
    inputs: CalculationInputs,
    goal: GoalName,
) -> float:
    if goal == "lose_fat":
        return -0.10

    if goal == "build_muscle":
        return MUSCLE_GAIN_ADJUSTMENT[inputs.training_experience]

    return 0.0


def default_protein_coefficient(inputs: CalculationInputs) -> float:
    return {
        "low": 1.6,
        "moderate": 1.4,
        "high": 1.2,
    }[body_fat_band(inputs)]