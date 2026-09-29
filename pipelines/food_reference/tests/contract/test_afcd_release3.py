"""Checks against the real AFCD Release 3 files, if they are on this computer.

These catch a broken download or a format change that the small test
files cannot. They are skipped when data/raw/fsanz_afcd is empty.
"""

from __future__ import annotations

import pytest

from food_reference.config import load_settings
from food_reference.sources.fsanz_afcd import FsanzAfcd
from food_reference.validation.rules import clean_and_check

pytestmark = pytest.mark.contract

RAW_DIR = load_settings().raw_dir
EXPECTED_FOODS = 1588


@pytest.fixture(scope="module")
def tables():  # type: ignore[no-untyped-def]
    if not FsanzAfcd().raw_files(RAW_DIR):
        pytest.skip("real AFCD files are not in data/raw/fsanz_afcd")
    return clean_and_check(FsanzAfcd().extract(RAW_DIR))


def test_food_count_has_not_collapsed(tables) -> None:  # type: ignore[no-untyped-def]
    foods, _ = tables
    assert len(foods["foods"]) >= EXPECTED_FOODS * 0.95


def test_known_value_raw_chicken_breast(tables) -> None:  # type: ignore[no-untyped-def]
    foods, _ = tables
    rows = foods["food_nutrients"]
    protein = rows[(rows["food_id"] == "fsanz_afcd:F002594") & (rows["nutrient_code"] == "protein")]
    assert float(protein["amount_per_100g"].iloc[0]) == 22.5


def test_no_rows_dropped_or_flagged(tables) -> None:  # type: ignore[no-untyped-def]
    _, issues = tables
    assert issues.empty, issues.groupby("rule").size().to_dict()
