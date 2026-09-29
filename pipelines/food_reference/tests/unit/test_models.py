from food_reference.domain.models import clean_text, food_id, issue, normalise_unit
from food_reference.domain.nutrients import NUTRIENTS


def test_clean_text_squashes_spaces_and_line_breaks() -> None:
    assert clean_text("  Chicken,\n breast   raw ") == "Chicken, breast raw"


def test_clean_text_turns_blanks_into_none() -> None:
    assert clean_text("   ") is None
    assert clean_text(None) is None
    assert clean_text(float("nan")) is None


def test_normalise_unit_handles_case_and_both_micro_signs() -> None:
    assert normalise_unit("MG") == "mg"
    assert normalise_unit("\u00b5g") == "ug"
    assert normalise_unit("\u03bcg") == "ug"


def test_food_id_format_never_changes() -> None:
    assert food_id("fsanz_afcd", "F002594") == "fsanz_afcd:F002594"


def test_issue_reads_source_from_food_id() -> None:
    assert issue("usda_foundation:1", "r", "d", "flagged")["source_id"] == "usda_foundation"


def test_nutrient_codes_and_orders_are_unique() -> None:
    assert len({n.code for n in NUTRIENTS}) == len(NUTRIENTS)
    assert len({n.sort_order for n in NUTRIENTS}) == len(NUTRIENTS)
    assert {n.unit for n in NUTRIENTS} <= {"kcal", "g", "mg", "ug"}
