"""What the pipeline's data looks like, whichever source it came from.

Column lists here are the single source of truth for the clean CSV files
and for the database COPY statements, so the two can never drift apart.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any

SOURCE_COLUMNS = ["id", "name", "version", "licence", "attribution", "url"]
FOOD_COLUMNS = [
    "id",
    "source_id",
    "source_food_id",
    "name",
    "description",
    "quality_tier",
    "derivation",
    "brand",
    "barcode",
]
FOOD_NUTRIENT_COLUMNS = ["food_id", "nutrient_code", "amount_per_100g", "basis"]
PORTION_COLUMNS = ["food_id", "label", "grams"]
ISSUE_COLUMNS = ["source_id", "food_id", "rule", "detail", "action"]

Row = dict[str, Any]


@dataclass
class Bundle:
    """Everything one or more sources produced, before cleaning."""

    sources: list[Row] = field(default_factory=list)
    foods: list[Row] = field(default_factory=list)
    food_nutrients: list[Row] = field(default_factory=list)
    portions: list[Row] = field(default_factory=list)
    issues: list[Row] = field(default_factory=list)

    def extend(self, other: Bundle) -> None:
        self.sources += other.sources
        self.foods += other.foods
        self.food_nutrients += other.food_nutrients
        self.portions += other.portions
        self.issues += other.issues


def food_id(source_id: str, source_food_id: str) -> str:
    """Food ids look like "fsanz_afcd:F002594". Once users log foods,
    these ids must never change, so always build them with this function."""
    return f"{source_id}:{source_food_id}"


def issue(food_id: str | None, rule: str, detail: str, action: str) -> Row:
    source_id = food_id.split(":", 1)[0] if food_id else None
    return {"source_id": source_id, "food_id": food_id, "rule": rule, "detail": detail, "action": action}


_WHITESPACE = re.compile(r"\s+")


def clean_text(value: Any) -> str | None:
    """Squash repeated spaces and line breaks; turn blanks into None."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    text = _WHITESPACE.sub(" ", str(value)).strip()
    return text or None


def normalise_unit(unit: Any) -> str | None:
    """ "MG" becomes "mg", and both micro signs become "u", so "µg" is "ug"."""
    text = clean_text(unit)
    if text is None:
        return None
    return text.lower().replace("\u00b5", "u").replace("\u03bc", "u")
