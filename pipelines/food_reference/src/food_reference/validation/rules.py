"""Cleaning and checking rules, applied to every source.

Each problem found is recorded with one of three actions:
  dropped  the row was broken and never reaches the database
  skipped  one value was unusable (like a wrong unit); the food is kept
  flagged  kept, but looks unusual, so a human should take a look
"""

from __future__ import annotations

import pandas as pd

from ..domain.models import (
    FOOD_COLUMNS,
    FOOD_NUTRIENT_COLUMNS,
    ISSUE_COLUMNS,
    PORTION_COLUMNS,
    SOURCE_COLUMNS,
    Bundle,
    Row,
    issue,
)
from ..domain.nutrients import NUTRIENT_CODES

MAX_KCAL_PER_100G = 902  # pure fat is about 900 kcal per 100 g
MAX_MACROS_PER_100G = 105  # a little over 100 g allows for rounding
ENERGY_GAP_KCAL = 20
ENERGY_GAP_RATIO = 0.20
MAX_SODIUM_MG_PER_100G = 40_000  # pure table salt is about 39,300 mg sodium per 100 g

CleanTables = dict[str, pd.DataFrame]


def _record(issues: list[Row], ids: pd.Series, rule: str, detail: str, action: str) -> None:
    issues.extend(issue(fid, rule, detail, action) for fid in ids)


def _column(wide: pd.DataFrame, code: str) -> pd.Series:
    return wide[code] if code in wide.columns else pd.Series(float("nan"), index=wide.index)


def expected_kcal(wide: pd.DataFrame) -> pd.Series:
    """Energy worked out from the macros: 4 kcal per gram of protein and
    carbs, 9 for fat, 7 for alcohol. "Available" carbs leave fibre out, so
    fibre is added at 2 kcal per gram. "By difference" carbs already
    include fibre, so it is not added twice."""
    available, by_difference = _column(wide, "carb_available"), _column(wide, "carb_by_difference")
    fibre_kcal = (2 * _column(wide, "fibre").fillna(0)).where(available.notna(), 0)
    carbs = available.fillna(by_difference)
    return (
        4 * _column(wide, "protein")
        + 4 * carbs
        + 9 * _column(wide, "fat")
        + 7 * _column(wide, "alcohol").fillna(0)
        + fibre_kcal
    )


def clean_foods(foods: pd.DataFrame, issues: list[Row]) -> pd.DataFrame:
    broken = foods["id"].isna() | foods["name"].isna()
    _record(issues, foods.loc[broken, "id"], "missing_id_or_name", "food has no id or name", "dropped")
    foods = foods[~broken]
    repeated = foods.duplicated("id", keep="first")
    _record(issues, foods.loc[repeated, "id"], "duplicate_food", "same id twice; kept the first", "dropped")
    return foods[~repeated]


def clean_food_nutrients(rows: pd.DataFrame, food_ids: set[str], issues: list[Row]) -> pd.DataFrame:
    rows = rows.assign(amount_per_100g=pd.to_numeric(rows["amount_per_100g"], errors="coerce"))
    checks = [
        (lambda r: r["amount_per_100g"].isna(), "not_a_number", "amount is not a number"),
        (lambda r: r["amount_per_100g"] < 0, "negative_amount", "amount is below zero"),
        (lambda r: ~r["nutrient_code"].isin(NUTRIENT_CODES), "unknown_nutrient", "code not in nutrient list"),
        (lambda r: ~r["food_id"].isin(food_ids), "orphan_nutrient", "its food was dropped"),
    ]
    for find, rule, detail in checks:
        bad = find(rows)
        _record(issues, rows.loc[bad, "food_id"], rule, detail, "dropped")
        rows = rows[~bad]
    repeated = rows.duplicated(["food_id", "nutrient_code"], keep="first")
    _record(issues, rows.loc[repeated, "food_id"], "duplicate_nutrient", "same nutrient twice", "dropped")
    return rows[~repeated]


def add_missing_energy(rows: pd.DataFrame, food_ids: pd.Series) -> pd.DataFrame:
    """Only for foods whose source gives no energy at all. The basis says
    "computed_from_macros", so nobody mistakes it for a measured value."""
    wide = rows.pivot(index="food_id", columns="nutrient_code", values="amount_per_100g").reindex(food_ids)
    computed = expected_kcal(wide)
    missing = _column(wide, "energy_kcal").isna() & computed.notna()
    if not missing.any():
        return rows
    added = pd.DataFrame(
        {
            "food_id": wide.index[missing],
            "nutrient_code": "energy_kcal",
            "amount_per_100g": computed[missing].round(1).to_numpy(),
            "basis": "computed_from_macros",
        }
    )
    return pd.concat([rows, added], ignore_index=True)


def flag_unusual(rows: pd.DataFrame, issues: list[Row]) -> None:
    wide = rows.pivot(index="food_id", columns="nutrient_code", values="amount_per_100g")
    energy_basis = rows[rows["nutrient_code"] == "energy_kcal"].set_index("food_id")["basis"]
    energy = _column(wide, "energy_kcal")

    for fid in wide.index[energy > MAX_KCAL_PER_100G]:
        issues.append(issue(fid, "energy_too_high", f"{energy[fid]} kcal per 100 g", "flagged"))

    # Catches unit mix-ups, like sodium typed in mg where grams were expected.
    sodium = _column(wide, "sodium")
    for fid in wide.index[sodium > MAX_SODIUM_MG_PER_100G]:
        issues.append(issue(fid, "sodium_too_high", f"{sodium[fid]} mg per 100 g", "flagged"))

    available, by_difference = _column(wide, "carb_available"), _column(wide, "carb_by_difference")
    carbs_with_fibre = available.add(_column(wide, "fibre").fillna(0)).fillna(by_difference)
    total = (
        _column(wide, "protein").fillna(0)
        + _column(wide, "fat").fillna(0)
        + carbs_with_fibre.fillna(0)
        + _column(wide, "alcohol").fillna(0)
    )
    for fid in wide.index[total > MAX_MACROS_PER_100G]:
        issues.append(issue(fid, "macros_over_100g", f"{total[fid]:.1f} g per 100 g", "flagged"))

    computed = expected_kcal(wide)
    gap = (energy - computed).abs()
    measured = energy_basis.reindex(wide.index) != "computed_from_macros"
    unusual = (measured & (gap > ENERGY_GAP_KCAL) & (gap > ENERGY_GAP_RATIO * energy)).fillna(False)
    for fid in wide.index[unusual]:
        issues.append(
            issue(
                fid,
                "energy_macro_mismatch",
                f"stated {energy[fid]} kcal, macros suggest {computed[fid]:.0f}",
                "flagged",
            )
        )


def clean_portions(portions: pd.DataFrame, food_ids: set[str], issues: list[Row]) -> pd.DataFrame:
    portions = portions.assign(grams=pd.to_numeric(portions["grams"], errors="coerce"))
    bad = (
        portions["grams"].isna()
        | (portions["grams"] <= 0)
        | portions["label"].isna()
        | ~portions["food_id"].isin(food_ids)
    )
    _record(
        issues, portions.loc[bad, "food_id"], "invalid_portion", "no label, bad grams or no food", "dropped"
    )
    portions = portions[~bad]
    repeated = portions.duplicated(["food_id", "label"], keep="first")
    _record(issues, portions.loc[repeated, "food_id"], "duplicate_portion", "same label twice", "dropped")
    return portions[~repeated]


def clean_and_check(bundle: Bundle) -> tuple[CleanTables, pd.DataFrame]:
    issues: list[Row] = list(bundle.issues)

    sources = pd.DataFrame(bundle.sources, columns=SOURCE_COLUMNS).drop_duplicates("id")
    foods = clean_foods(pd.DataFrame(bundle.foods, columns=FOOD_COLUMNS), issues)
    food_ids = set(foods["id"])

    nutrients = clean_food_nutrients(
        pd.DataFrame(bundle.food_nutrients, columns=FOOD_NUTRIENT_COLUMNS), food_ids, issues
    )
    nutrients = add_missing_energy(nutrients, foods["id"])
    flag_unusual(nutrients, issues)
    portions = clean_portions(pd.DataFrame(bundle.portions, columns=PORTION_COLUMNS), food_ids, issues)

    tables: CleanTables = {
        "food_sources": sources[SOURCE_COLUMNS],
        "foods": foods[FOOD_COLUMNS],
        "food_nutrients": nutrients[FOOD_NUTRIENT_COLUMNS].sort_values(["food_id", "nutrient_code"]),
        "food_portions": portions[PORTION_COLUMNS],
    }
    return tables, pd.DataFrame(issues, columns=ISSUE_COLUMNS)
