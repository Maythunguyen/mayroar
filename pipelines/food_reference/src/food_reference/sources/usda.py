"""USDA FoodData Central: Foundation Foods and SR Legacy.

Download the JSON versions from https://fdc.nal.usda.gov/download-datasets,
unzip them, and put each file in its own folder without renaming it:
data/raw/usda_foundation/ and data/raw/usda_sr_legacy/.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ..domain.models import Bundle, Row, clean_text, food_id, issue, normalise_unit
from .base import Source

LICENCE = "CC0 1.0 (public domain)"
ATTRIBUTION = (
    "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. fdc.nal.usda.gov"
)
URL = "https://fdc.nal.usda.gov/download-datasets"


@dataclass(frozen=True)
class _Dataset:
    source_id: str
    name: str
    derivation: str
    file_pattern: re.Pattern[str]
    json_key: str


DATASETS: dict[str, _Dataset] = {
    "foundation": _Dataset(
        source_id="usda_foundation",
        name="USDA FoodData Central: Foundation Foods",
        derivation="USDA Foundation",
        file_pattern=re.compile(r"foundation_food_json_(.+)\.json$", re.IGNORECASE),
        json_key="FoundationFoods",
    ),
    "sr_legacy": _Dataset(
        source_id="usda_sr_legacy",
        name="USDA FoodData Central: SR Legacy",
        derivation="USDA SR Legacy",
        file_pattern=re.compile(r"sr_legacy_food_json_(.+)\.json$", re.IGNORECASE),
        json_key="SRLegacyFoods",
    ),
}

# USDA nutrient id -> (our code, the unit we expect, basis note)
NUTRIENT_MAP: dict[int, tuple[str, str, str | None]] = {
    1003: ("protein", "g", None),
    1004: ("fat", "g", None),
    1005: ("carb_by_difference", "g", None),
    1050: ("carb_available", "g", "usda_by_summation"),
    1079: ("fibre", "g", None),
    2000: ("sugars", "g", None),
    1018: ("alcohol", "g", None),
    1093: ("sodium", "mg", None),
    1087: ("calcium", "mg", None),
    1089: ("iron", "mg", None),
    1090: ("magnesium", "mg", None),
    1114: ("vitamin_d", "ug", "usda_d2_plus_d3"),
}

# Many Foundation Foods have no plain kcal value, only "Atwater" energy.
# We take the first one available and record which one it was.
ENERGY_PRIORITY: list[tuple[int, str]] = [
    (1008, "usda_reported_kcal"),
    (2048, "usda_atwater_specific"),
    (2047, "usda_atwater_general"),
]


def portion_label(portion: dict[str, Any]) -> str | None:
    """Turn a USDA portion into a readable label such as "1 cup, chopped"."""
    description = clean_text(portion.get("portionDescription"))
    if description and description.lower() != "quantity not specified":
        return description
    unit = clean_text((portion.get("measureUnit") or {}).get("name"))
    if unit == "undetermined":
        unit = None
    amount = portion.get("amount")
    parts = [clean_text(amount if amount is not None else 1), unit, clean_text(portion.get("modifier"))]
    label = " ".join(part for part in parts if part)
    return label or None


def _record_problem(food: Any) -> str | None:
    """Why this entry cannot be used as a food, or None if it is fine."""
    if not isinstance(food, dict):
        return "not_a_food_record"
    if not isinstance(food.get("fdcId"), int):
        return "missing_fdc_id"
    return None


def _amounts(food: dict[str, Any]) -> dict[int, tuple[float, str | None]]:
    out: dict[int, tuple[float, str | None]] = {}
    for entry in food.get("foodNutrients") or []:
        nutrient = entry.get("nutrient") or {}
        nid, amount = nutrient.get("id"), entry.get("amount")
        if isinstance(nid, int) and isinstance(amount, int | float):
            out[nid] = (float(amount), normalise_unit(nutrient.get("unitName")))
    return out


class UsdaFoodDataCentral(Source):
    def __init__(self, dataset: str) -> None:
        self.dataset = DATASETS[dataset]
        self.source_id = self.dataset.source_id
        self.name = self.dataset.name

    def _find(self, raw_dir: Path) -> tuple[Path, str] | None:
        folder = self.raw_folder(raw_dir)
        if not folder.exists():
            return None
        for path in sorted(folder.iterdir()):
            match = self.dataset.file_pattern.search(path.name)
            if match:
                return path, match.group(1)
        return None

    def raw_files(self, raw_dir: Path) -> list[Path]:
        found = self._find(raw_dir)
        return [found[0]] if found else []

    def extract(self, raw_dir: Path) -> Bundle:
        found = self._find(raw_dir)
        if found is None:
            return Bundle()
        path, version = found
        with path.open(encoding="utf-8") as fh:
            data = json.load(fh)
        foods = data.get(self.dataset.json_key)
        if not isinstance(foods, list):
            raise ValueError(f'Expected a "{self.dataset.json_key}" list in {path}')

        bundle = Bundle()
        bundle.sources.append(
            {
                "id": self.source_id,
                "name": self.name,
                "version": version,
                "licence": LICENCE,
                "attribution": ATTRIBUTION,
                "url": URL,
            }
        )
        for position, food in enumerate(foods):
            problem = _record_problem(food)
            if problem:
                # Real USDA files occasionally contain empty entries. Drop
                # them, but record each one so the report shows how many.
                bundle.issues.append(
                    {
                        "source_id": self.source_id,
                        "food_id": None,
                        "rule": problem,
                        "detail": f"entry {position} in {path.name}",
                        "action": "dropped",
                    }
                )
                continue
            self._add_food(bundle, food)
        return bundle

    def _add_food(self, bundle: Bundle, food: dict[str, Any]) -> None:
        fdc_id = str(food.get("fdcId"))
        fid = food_id(self.source_id, fdc_id)
        bundle.foods.append(
            {
                "id": fid,
                "source_id": self.source_id,
                "source_food_id": fdc_id,
                "name": clean_text(food.get("description")),
                "description": None,
                "quality_tier": "reference",
                "derivation": self.dataset.derivation,
                "brand": None,
                "barcode": None,
            }
        )

        amounts = _amounts(food)
        for nid, (code, unit, basis) in NUTRIENT_MAP.items():
            if nid not in amounts:
                continue
            amount, got_unit = amounts[nid]
            if got_unit and got_unit != unit:
                bundle.issues.append(
                    issue(fid, "unexpected_unit", f"nutrient {nid} in {got_unit}, expected {unit}", "skipped")
                )
                continue
            bundle.food_nutrients.append(_nutrient_row(fid, code, amount, basis))

        for nid, basis in ENERGY_PRIORITY:
            if nid in amounts:
                bundle.food_nutrients.append(_nutrient_row(fid, "energy_kcal", amounts[nid][0], basis))
                break

        for portion in food.get("foodPortions") or []:
            label, grams = portion_label(portion), portion.get("gramWeight")
            if label and isinstance(grams, int | float) and grams > 0:
                bundle.portions.append({"food_id": fid, "label": label, "grams": float(grams)})


def _nutrient_row(fid: str, code: str, amount: float, basis: str | None) -> Row:
    return {"food_id": fid, "nutrient_code": code, "amount_per_100g": amount, "basis": basis}
