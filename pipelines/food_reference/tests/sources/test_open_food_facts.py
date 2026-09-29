"""Tests for fetching Open Food Facts, using a tiny local file shaped like
their real export, so no internet connection is needed."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import duckdb
import pytest

from food_reference.sources.open_food_facts import OpenFoodFacts, pick_name, serving_grams, summarise
from food_reference.validation.rules import clean_and_check


def _nutrient(name: str, per_100g: float | None, unit: str) -> str:
    value = "null" if per_100g is None else str(per_100g)
    return f"{{'name': '{name}', 'value': {value}, '100g': {value}, 'serving': null, 'unit': '{unit}'}}"


@pytest.fixture
def export_file(tmp_path: Path) -> Path:
    """Three products: two sold in Australia (one obsolete), one only in France."""
    path = tmp_path / "food.parquet"
    rows = [
        (
            "9300000000011",
            "Greek Yoghurt",
            "['en:australia']",
            False,
            f"[{_nutrient('proteins', 9.0, 'g')}, {_nutrient('energy-kcal', 97.0, 'kcal')}]",
        ),
        (
            "9300000000028",
            "Old Muesli Bar",
            "['en:australia', 'en:new-zealand']",
            True,
            f"[{_nutrient('proteins', 7.0, 'g')}]",
        ),
        ("3000000000035", "Pain au chocolat", "['en:france']", False, f"[{_nutrient('proteins', 8.0, 'g')}]"),
    ]
    selects = [
        f"""select '{code}' as code, [{{'lang': 'main', 'text': '{name}'}}] as product_name,
                   'Brand' as brands, '500 g' as quantity, '100 g' as serving_size, '100' as serving_quantity,
                   '100g' as nutrition_data_per, {nutriments} as nutriments, {countries} as countries_tags,
                   0.8::float as completeness, []::varchar[] as data_quality_errors_tags,
                   1700000000::bigint as last_modified_t, {str(obsolete).lower()} as obsolete,
                   'extra column we do not need' as ingredients_text"""
        for code, name, countries, obsolete, nutriments in rows
    ]
    with duckdb.connect() as con:
        con.execute(f"copy ({' union all '.join(selects)}) to '{path.as_posix()}' (format parquet)")
    return path


def test_fetch_keeps_only_australian_products(export_file: Path, tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    saved = OpenFoodFacts().fetch(raw, url=export_file.as_posix(), today=date(2026, 9, 23))
    assert saved.name == "open_food_facts_au_2026-09-23.parquet"
    with duckdb.connect() as con:
        codes = {r[0] for r in con.execute(f"select code from '{saved.as_posix()}'").fetchall()}
        columns = [r[0] for r in con.execute(f"describe select * from '{saved.as_posix()}'").fetchall()]
    assert codes == {"9300000000011", "9300000000028"}
    assert "ingredients_text" not in columns


def test_new_fetch_replaces_the_old_file(export_file: Path, tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    source = OpenFoodFacts()
    source.fetch(raw, url=export_file.as_posix(), today=date(2026, 9, 1))
    source.fetch(raw, url=export_file.as_posix(), today=date(2026, 9, 23))
    names = [p.name for p in (raw / "open_food_facts").iterdir()]
    assert names == ["open_food_facts_au_2026-09-23.parquet"]
    assert [p.name for p in source.raw_files(raw)] == names


def test_summary_describes_the_extract(export_file: Path, tmp_path: Path) -> None:
    saved = OpenFoodFacts().fetch(tmp_path / "raw", url=export_file.as_posix(), today=date(2026, 9, 23))
    report = summarise(saved)
    assert "Products sold in Australia: 2" in report
    assert "marked obsolete: 1" in report
    assert "proteins  g  2" in report


def test_sources_without_automatic_download_say_so(tmp_path: Path) -> None:
    from food_reference.sources.fsanz_afcd import FsanzAfcd

    with pytest.raises(NotImplementedError, match="by hand"):
        FsanzAfcd().fetch(tmp_path)


# ---- reading the extract (step 2) ----


@pytest.fixture
def off_raw(tmp_path: Path, make_off_extract) -> Path:  # type: ignore[no-untyped-def]
    raw = tmp_path / "raw"
    make_off_extract(raw / "open_food_facts")
    return raw


def _nutrients(bundle, fid: str) -> dict[str, tuple[float, str]]:  # type: ignore[no-untyped-def]
    return {
        n["nutrient_code"]: (n["amount_per_100g"], n["basis"])
        for n in bundle.food_nutrients
        if n["food_id"] == fid
    }


def test_products_become_label_foods_with_barcode_and_brand(off_raw: Path) -> None:
    bundle = OpenFoodFacts().extract(off_raw)
    foods = {f["id"]: f for f in bundle.foods}
    yoghurt = foods["open_food_facts:9300000000011"]
    assert yoghurt["name"] == "Greek Yoghurt Plain"
    assert yoghurt["brand"] == "Brand A"
    assert yoghurt["barcode"] == "9300000000011"
    assert yoghurt["quality_tier"] == "label"
    assert yoghurt["description"] == "Pack size 500 g"
    assert bundle.sources[0]["version"] == "2026-09-23"


def test_minerals_are_converted_from_grams(off_raw: Path) -> None:
    yoghurt = _nutrients(OpenFoodFacts().extract(off_raw), "open_food_facts:9300000000011")
    assert yoghurt["sodium"][0] == pytest.approx(50)
    assert yoghurt["calcium"][0] == pytest.approx(120)
    assert yoghurt["vitamin_d"][0] == pytest.approx(2.5)


def test_salt_is_ignored_because_it_repeats_sodium(off_raw: Path) -> None:
    bundle = OpenFoodFacts().extract(off_raw)
    assert all(n["nutrient_code"] != "salt" for n in bundle.food_nutrients)


def test_carbohydrates_are_available_carbs(off_raw: Path) -> None:
    yoghurt = _nutrients(OpenFoodFacts().extract(off_raw), "open_food_facts:9300000000011")
    assert yoghurt["carb_available"][0] == 4.0


def test_per_serving_products_are_marked_as_converted(off_raw: Path) -> None:
    bar = _nutrients(OpenFoodFacts().extract(off_raw), "open_food_facts:9300000000028")
    assert bar["protein"] == (30.0, "off_converted_from_serving")


def test_kilojoules_are_converted_and_labelled(off_raw: Path) -> None:
    bar = _nutrients(OpenFoodFacts().extract(off_raw), "open_food_facts:9300000000028")
    assert bar["energy_kcal"] == (pytest.approx(358.5), "off_converted_from_serving_kj_converted")


def test_ambiguous_energy_field_is_never_used(off_raw: Path) -> None:
    tables, _ = clean_and_check(OpenFoodFacts().extract(off_raw))
    rows = tables["food_nutrients"]
    energy = rows[
        (rows["food_id"] == "open_food_facts:9300000000042") & (rows["nutrient_code"] == "energy_kcal")
    ]
    assert str(energy["basis"].iloc[0]) == "computed_from_macros"
    assert float(energy["amount_per_100g"].iloc[0]) == pytest.approx(80)


def test_serving_becomes_a_portion(off_raw: Path) -> None:
    portions = OpenFoodFacts().extract(off_raw).portions
    by_food = {p["food_id"]: (p["label"], p["grams"]) for p in portions}
    assert by_food["open_food_facts:9300000000028"] == ("1 serving (1 bar (60 g))", 60.0)
    assert "open_food_facts:9300000000042" not in by_food  # "abc" is not a weight


def test_unusable_products_are_dropped_and_reported(off_raw: Path) -> None:
    bundle = OpenFoodFacts().extract(off_raw)
    ids = {f["id"] for f in bundle.foods}
    assert "open_food_facts:9300000000035" not in ids
    assert {i["rule"] for i in bundle.issues} == {"invalid_barcode", "no_per_100g_nutrition"}
    assert len(bundle.foods) == 3


def test_helpers() -> None:
    assert pick_name([{"lang": "main", "text": "Yaourt"}, {"lang": "fr", "text": "Yaourt"}]) == "Yaourt"
    assert pick_name(None) is None
    assert serving_grams("30") == 30.0
    assert serving_grams("0") is None
    assert serving_grams("5000") is None
    assert serving_grams(None) is None
