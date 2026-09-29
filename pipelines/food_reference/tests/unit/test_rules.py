import pandas as pd
import pytest

from food_reference.domain.models import Bundle
from food_reference.validation.rules import clean_and_check, expected_kcal


def _food(fid: str, name: str | None = "Food") -> dict[str, object]:
    return {
        "id": fid,
        "source_id": fid.split(":")[0],
        "source_food_id": fid.split(":")[1],
        "name": name,
        "description": None,
        "quality_tier": "reference",
        "derivation": None,
    }


def _n(fid: str, code: str, amount: object, basis: str | None = None) -> dict[str, object]:
    return {"food_id": fid, "nutrient_code": code, "amount_per_100g": amount, "basis": basis}


def _rules(issues: pd.DataFrame) -> set[str]:
    return set(issues["rule"])


def test_expected_kcal_counts_alcohol_and_fibre() -> None:
    wide = pd.DataFrame([{"protein": 0, "fat": 0, "carb_available": 3, "fibre": 0, "alcohol": 4}])
    assert expected_kcal(wide).iloc[0] == pytest.approx(4 * 3 + 7 * 4)
    wide = pd.DataFrame([{"protein": 10, "fat": 1, "carb_available": 50, "fibre": 10}])
    assert expected_kcal(wide).iloc[0] == pytest.approx(40 + 9 + 200 + 20)


def test_by_difference_carbs_do_not_count_fibre_twice() -> None:
    wide = pd.DataFrame([{"protein": 0, "fat": 0, "carb_by_difference": 60, "fibre": 10}])
    assert expected_kcal(wide).iloc[0] == pytest.approx(240)


def test_foods_without_a_name_or_repeated_are_dropped() -> None:
    bundle = Bundle(foods=[_food("x:1"), _food("x:1"), _food("x:2", name=None)])
    tables, issues = clean_and_check(bundle)
    assert list(tables["foods"]["id"]) == ["x:1"]
    assert {"duplicate_food", "missing_id_or_name"} <= _rules(issues)


def test_bad_nutrient_values_are_dropped() -> None:
    bundle = Bundle(
        foods=[_food("x:1")],
        food_nutrients=[
            _n("x:1", "protein", -1),
            _n("x:1", "fat", "abc"),
            _n("x:1", "zinc", 1),
            _n("x:9", "protein", 1),
            _n("x:1", "sugars", 1),
            _n("x:1", "sugars", 2),
        ],
    )
    tables, issues = clean_and_check(bundle)
    kept = tables["food_nutrients"]
    assert list(kept["nutrient_code"]) == ["sugars"] and kept["amount_per_100g"].iloc[0] == 1
    assert {
        "negative_amount",
        "not_a_number",
        "unknown_nutrient",
        "orphan_nutrient",
        "duplicate_nutrient",
    } <= _rules(issues)


def test_missing_energy_is_computed_and_labelled() -> None:
    bundle = Bundle(
        foods=[_food("x:1")],
        food_nutrients=[_n("x:1", "protein", 10), _n("x:1", "fat", 10), _n("x:1", "carb_available", 10)],
    )
    tables, _ = clean_and_check(bundle)
    rows = tables["food_nutrients"]
    energy = rows[rows["nutrient_code"] == "energy_kcal"].iloc[0]
    assert float(energy["amount_per_100g"]) == 170
    assert str(energy["basis"]) == "computed_from_macros"


def test_measured_energy_far_from_macros_is_flagged_not_dropped() -> None:
    bundle = Bundle(
        foods=[_food("x:1")],
        food_nutrients=[
            _n("x:1", "protein", 10),
            _n("x:1", "fat", 0),
            _n("x:1", "carb_available", 0),
            _n("x:1", "energy_kcal", 200, "reported"),
        ],
    )
    tables, issues = clean_and_check(bundle)
    assert "energy_macro_mismatch" in _rules(issues)
    assert len(tables["food_nutrients"]) == 4


def test_beer_is_not_flagged_because_alcohol_counts() -> None:
    bundle = Bundle(
        foods=[_food("x:1")],
        food_nutrients=[
            _n("x:1", "protein", 0.3),
            _n("x:1", "fat", 0),
            _n("x:1", "carb_available", 2.5),
            _n("x:1", "alcohol", 3.7),
            _n("x:1", "energy_kcal", 36.3, "reported"),
        ],
    )
    _, issues = clean_and_check(bundle)
    assert issues.empty


def test_impossible_foods_are_flagged() -> None:
    bundle = Bundle(
        foods=[_food("x:1")],
        food_nutrients=[_n("x:1", "protein", 60), _n("x:1", "fat", 60), _n("x:1", "energy_kcal", 950)],
    )
    _, issues = clean_and_check(bundle)
    assert {"energy_too_high", "macros_over_100g"} <= _rules(issues)


def test_bad_and_repeated_portions_are_dropped() -> None:
    bundle = Bundle(
        foods=[_food("x:1")],
        portions=[
            {"food_id": "x:1", "label": "1 cup", "grams": 80},
            {"food_id": "x:1", "label": "1 cup", "grams": 80},
            {"food_id": "x:1", "label": "1 slice", "grams": 0},
            {"food_id": "x:9", "label": "1 egg", "grams": 50},
        ],
    )
    tables, issues = clean_and_check(bundle)
    assert len(tables["food_portions"]) == 1
    assert {"duplicate_portion", "invalid_portion"} <= _rules(issues)


def test_impossible_sodium_is_flagged() -> None:
    bundle = Bundle(foods=[_food("x:1")], food_nutrients=[_n("x:1", "sodium", 50_000)])
    _, issues = clean_and_check(bundle)
    assert "sodium_too_high" in _rules(issues)
