"""The canonical nutrient list.

Every source is translated into these codes. Each code has one fixed unit,
and every amount is stored per 100 g of edible food, so values from
different sources can be compared and added up.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Nutrient:
    code: str
    name: str
    unit: str
    infoods_tagname: str
    sort_order: int


NUTRIENTS: tuple[Nutrient, ...] = (
    Nutrient("energy_kcal", "Energy", "kcal", "ENERC_KCAL", 1),
    Nutrient("protein", "Protein", "g", "PROCNT", 2),
    Nutrient("fat", "Fat, total", "g", "FAT", 3),
    Nutrient("carb_available", "Carbohydrate, available (excludes fibre)", "g", "CHOAVL", 4),
    Nutrient("carb_by_difference", "Carbohydrate, by difference (includes fibre)", "g", "CHOCDF", 5),
    Nutrient("fibre", "Dietary fibre, total", "g", "FIBTG", 6),
    Nutrient("sugars", "Sugars, total", "g", "SUGAR", 7),
    Nutrient("alcohol", "Alcohol", "g", "ALC", 8),
    Nutrient("sodium", "Sodium", "mg", "NA", 9),
    Nutrient("calcium", "Calcium", "mg", "CA", 10),
    Nutrient("iron", "Iron", "mg", "FE", 11),
    Nutrient("magnesium", "Magnesium", "mg", "MG", 12),
    Nutrient("vitamin_d", "Vitamin D", "ug", "VITD", 13),
)

NUTRIENT_CODES: frozenset[str] = frozenset(n.code for n in NUTRIENTS)
