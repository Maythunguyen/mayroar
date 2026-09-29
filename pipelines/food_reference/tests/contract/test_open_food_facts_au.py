"""Checks against the real Open Food Facts extract, if it is on this computer.
Run "make foods-fetch" first. Skipped otherwise."""

from __future__ import annotations

import pytest

from food_reference.config import load_settings
from food_reference.sources.open_food_facts import OpenFoodFacts
from food_reference.validation.rules import clean_and_check

pytestmark = pytest.mark.contract

RAW_DIR = load_settings().raw_dir


@pytest.fixture(scope="module")
def tables():  # type: ignore[no-untyped-def]
    if not OpenFoodFacts().raw_files(RAW_DIR):
        pytest.skip("no Open Food Facts extract in data/raw/open_food_facts")
    return clean_and_check(OpenFoodFacts().extract(RAW_DIR))


def test_most_products_are_usable(tables) -> None:  # type: ignore[no-untyped-def]
    foods, _ = tables
    assert len(foods["foods"]) >= 50_000


def test_sodium_is_in_milligrams(tables) -> None:  # type: ignore[no-untyped-def]
    """If the gram to milligram conversion broke, the typical product would
    show well under 1 mg of sodium per 100 g, which is not realistic."""
    foods, _ = tables
    rows = foods["food_nutrients"]
    sodium = rows[rows["nutrient_code"] == "sodium"]["amount_per_100g"]
    assert 50 < float(sodium.median()) < 2_000
