from pathlib import Path

from food_reference.sources.usda import UsdaFoodDataCentral, portion_label
from food_reference.validation.rules import clean_and_check


def test_extract_reads_foods_nutrients_and_portions(raw_dir: Path) -> None:
    bundle = UsdaFoodDataCentral("foundation").extract(raw_dir)
    assert bundle.sources[0]["version"] == "TEST"
    assert [f["name"] for f in bundle.foods] == ["Chicken, breast, raw", "Oats, rolled", None]
    assert bundle.foods[0]["id"] == "usda_foundation:1"


def test_energy_prefers_atwater_specific_over_general(raw_dir: Path) -> None:
    bundle = UsdaFoodDataCentral("foundation").extract(raw_dir)
    energy = [
        n
        for n in bundle.food_nutrients
        if n["food_id"] == "usda_foundation:1" and n["nutrient_code"] == "energy_kcal"
    ]
    assert energy == [
        {
            "food_id": "usda_foundation:1",
            "nutrient_code": "energy_kcal",
            "amount_per_100g": 104.0,
            "basis": "usda_atwater_specific",
        }
    ]


def test_wrong_unit_is_skipped_not_converted(raw_dir: Path) -> None:
    bundle = UsdaFoodDataCentral("foundation").extract(raw_dir)
    assert not any(n["nutrient_code"] == "sodium" for n in bundle.food_nutrients)
    assert "unexpected_unit" in {i["rule"] for i in bundle.issues}


def test_micrograms_symbol_is_understood(raw_dir: Path) -> None:
    bundle = UsdaFoodDataCentral("foundation").extract(raw_dir)
    assert any(n["nutrient_code"] == "vitamin_d" for n in bundle.food_nutrients)


def test_after_cleaning(raw_dir: Path) -> None:
    tables, issues = clean_and_check(UsdaFoodDataCentral("foundation").extract(raw_dir))
    assert len(tables["foods"]) == 2
    assert len(tables["food_portions"]) == 2
    assert set(issues["rule"]) == {
        "unexpected_unit",
        "missing_id_or_name",
        "duplicate_portion",
        "not_a_food_record",
        "missing_fdc_id",
    }


def test_portion_labels() -> None:
    assert (
        portion_label({"amount": 1, "measureUnit": {"name": "cup"}, "modifier": "chopped"}) == "1 cup chopped"
    )
    assert portion_label({"amount": 1, "measureUnit": {"name": "undetermined"}, "modifier": "cup"}) == "1 cup"
    assert portion_label({"portionDescription": "1 medium egg"}) == "1 medium egg"


def test_missing_files_give_an_empty_result(tmp_path: Path) -> None:
    source = UsdaFoodDataCentral("sr_legacy")
    assert source.raw_files(tmp_path) == []
    assert source.extract(tmp_path).foods == []


def test_empty_entries_and_missing_ids_are_dropped_and_reported(raw_dir: Path) -> None:
    bundle = UsdaFoodDataCentral("foundation").extract(raw_dir)
    assert len(bundle.foods) == 3
    dropped = [i for i in bundle.issues if i["action"] == "dropped"]
    assert [i["rule"] for i in dropped] == ["not_a_food_record", "missing_fdc_id"]
    assert all(i["source_id"] == "usda_foundation" for i in dropped)
