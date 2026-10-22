import pytest
from pydantic import ValidationError

from app.core.errors import ServiceError
from app.features.target_calculation.calculator import calculate_plan
from app.features.target_calculation.policy import (
    activity_multiplier,
    recommend_goal,
)
from app.features.target_calculation.schemas import (
    CalculationInputs,
    PlanOptions,
)


def make_inputs(**changes):
    values = {
        "age": 30,
        "gender": "woman",
        "equation_sex": "female",
        "height_cm": 160,
        "weight_kg": 60,
        "work_activity": "sitting",
        "exercise_days_per_week": 3,
        "exercise_minutes_per_session": 60,
        "exercise_type": "resistance",
        "training_experience": "beginner",
        "body_fat_percent": 25,
        "body_fat_source": "bia",
        "calculation_context": "standard",
    }

    return CalculationInputs.model_validate({**values, **changes})


def test_known_maintenance_example():
    plan = calculate_plan(
        make_inputs(),
        "maintain",
        PlanOptions(),
    )

    assert plan.resting_calories == 1289
    assert plan.maintenance_calories == 1933.5

    assert plan.targets.model_dump() == {
        "calories": 1934,
        "protein": 138.9,
        "carbs": 223.8,
        "fat": 53.7,
    }


def test_selected_goal_changes_calories():
    inputs = make_inputs()

    loss = calculate_plan(inputs, "lose_fat", PlanOptions())
    maintain = calculate_plan(inputs, "maintain", PlanOptions())
    gain = calculate_plan(inputs, "build_muscle", PlanOptions())

    assert loss.targets.calories == 1740
    assert maintain.targets.calories == 1934
    assert gain.targets.calories == 2127


def test_unknown_body_fat_uses_fallback():
    inputs = make_inputs(
        body_fat_percent=None,
        body_fat_source=None,
    )

    plan = calculate_plan(inputs, "maintain", PlanOptions())

    assert plan.protein_method == "body_weight"
    assert plan.targets.protein == 120
    assert recommend_goal(inputs).suggested_goal is None


def test_visual_estimate_does_not_become_measured_lean_mass():
    inputs = make_inputs(body_fat_source="visual")
    plan = calculate_plan(inputs, "maintain", PlanOptions())

    assert plan.protein_method == "body_weight"
    assert recommend_goal(inputs).suggested_goal is None


@pytest.mark.parametrize(
    ("body_fat", "expected"),
    [
        (21.9, "build_muscle"),
        (22.0, "maintain"),
        (30.0, "maintain"),
        (30.1, "lose_fat"),
    ],
)
def test_explicit_female_policy_boundaries(body_fat, expected):
    goal = recommend_goal(make_inputs(body_fat_percent=body_fat))
    assert goal.suggested_goal == expected


def test_experience_does_not_change_activity_multiplier():
    beginner = make_inputs(training_experience="beginner")
    advanced = make_inputs(training_experience="advanced")

    assert activity_multiplier(beginner) == activity_multiplier(advanced)


def test_maintenance_rejects_surplus_option():
    with pytest.raises(ServiceError) as error:
        calculate_plan(
            make_inputs(),
            "maintain",
            PlanOptions(calorie_adjustment=0.10),
        )

    assert error.value.status_code == 422


def test_zero_exercise_requires_consistent_answers():
    with pytest.raises(ValidationError):
        make_inputs(exercise_days_per_week=0)


@pytest.mark.parametrize("weight", [0, -1, float("nan"), float("inf")])
def test_invalid_weight_rejected(weight):
    with pytest.raises(ValidationError):
        make_inputs(weight_kg=weight)


def test_macro_energy_matches_calories_with_rounding():
    for goal in ["lose_fat", "maintain", "build_muscle"]:
        targets = calculate_plan(
            make_inputs(),
            goal,
            PlanOptions(),
        ).targets

        macro_energy = (
            targets.protein * 4
            + targets.carbs * 4
            + targets.fat * 9
        )

        assert abs(targets.calories - macro_energy) <= 1


def test_nonstandard_context_cannot_use_automatic_calculation():
    with pytest.raises(ServiceError):
        calculate_plan(
            make_inputs(calculation_context="pregnant"),
            "maintain",
            PlanOptions(),
        )