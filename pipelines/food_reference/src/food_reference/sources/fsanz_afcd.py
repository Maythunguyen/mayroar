"""Australian Food Composition Database (AFCD), Release 3, from FSANZ.

Put the "Nutrient profiles" and "Food Details" .xlsx files in
data/raw/fsanz_afcd/. The other AFCD files are documentation only.
"""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from ..domain.models import Bundle, Row, clean_text, food_id
from .base import Source

VERSION = "Release 3"
LICENCE = "FSANZ Data User Licence, based on Creative Commons Attribution-ShareAlike 3.0 Australia"
ATTRIBUTION = (
    "Food Standards Australia New Zealand (2025). Australian Food Composition Database, "
    "Release 3. Canberra: FSANZ."
)
URL = "https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd"

# \s matches every kind of space, including the invisible "non-breaking
# space" that files downloaded from websites sometimes have in their names.
PROFILES_FILE = re.compile(r"nutrient[\s_-]*profiles.*\.xlsx$", re.IGNORECASE)
DETAILS_FILE = re.compile(r"food[\s_-]*details.*\.xlsx$", re.IGNORECASE)

KJ_PER_KCAL = 4.184
METRIC_CUP_ML = 250
ENERGY_COLUMN = "Energy with dietary fibre, equated (kJ)"

# FSANZ column name (spaces squashed) -> (our code, basis note)
NUTRIENT_COLUMNS: dict[str, tuple[str, str | None]] = {
    "Protein (g)": ("protein", None),
    "Fat, total (g)": ("fat", None),
    "Available carbohydrate, with sugar alcohols (g)": (
        "carb_available",
        "afcd_available_with_sugar_alcohols",
    ),
    "Total dietary fibre (g)": ("fibre", None),
    "Total sugars (g)": ("sugars", None),
    "Alcohol (g)": ("alcohol", None),
    "Sodium (Na) (mg)": ("sodium", None),
    "Calcium (Ca) (mg)": ("calcium", None),
    "Iron (Fe) (mg)": ("iron", None),
    "Magnesium (Mg) (mg)": ("magnesium", None),
    "Vitamin D3 equivalents (ug)": ("vitamin_d", "afcd_d3_equivalents"),
}


def read_fsanz_sheet(path: Path, sheet: str) -> pd.DataFrame:
    """FSANZ sheets start with a title and empty rows. Instead of guessing
    which row holds the column names, look for "Public Food Key"."""
    raw = pd.read_excel(path, sheet_name=sheet, header=None, dtype=object)
    first_column = raw.iloc[:, 0].map(clean_text)
    header_rows = raw.index[first_column == "Public Food Key"]
    if len(header_rows) == 0:
        raise ValueError(f'No "Public Food Key" header row in sheet "{sheet}" of {path}')
    header = int(header_rows[0])
    table = raw.iloc[header + 1 :].copy()
    table.columns = [clean_text(c) or f"unnamed_{i}" for i, c in enumerate(raw.iloc[header])]
    table = table[table["Public Food Key"].map(clean_text).notna()]
    return table.reset_index(drop=True)


def _require(table: pd.DataFrame, columns: list[str], label: str) -> None:
    missing = [c for c in columns if c not in table.columns]
    if missing:
        raise ValueError(f"{label} is missing columns {missing}. Did FSANZ rename them in a new release?")


class FsanzAfcd(Source):
    source_id = "fsanz_afcd"
    name = "Australian Food Composition Database"

    def _find(self, raw_dir: Path, pattern: re.Pattern[str]) -> Path | None:
        folder = self.raw_folder(raw_dir)
        if not folder.exists():
            return None
        return next((p for p in sorted(folder.iterdir()) if pattern.search(p.name)), None)

    def raw_files(self, raw_dir: Path) -> list[Path]:
        profiles, details = self._find(raw_dir, PROFILES_FILE), self._find(raw_dir, DETAILS_FILE)
        return [profiles, details] if profiles and details else []

    def extract(self, raw_dir: Path) -> Bundle:
        files = self.raw_files(raw_dir)
        if not files:
            return Bundle()
        profiles_path, details_path = files

        profiles = read_fsanz_sheet(profiles_path, "All solids & liquids per 100 g")
        liquids = read_fsanz_sheet(profiles_path, "Liquids only per 100 mL")
        details = read_fsanz_sheet(details_path, "Food details")
        _require(
            profiles,
            ["Public Food Key", "Food Name", "Derivation", ENERGY_COLUMN, *NUTRIENT_COLUMNS],
            "Nutrient profiles",
        )
        _require(details, ["Public Food Key", "Food Description", "Specific Gravity"], "Food details")

        # An empty cell means "not measured", which is not the same as zero.
        # Empty cells become NaN and are simply not stored. Never fill them with 0.
        for column in [ENERGY_COLUMN, *NUTRIENT_COLUMNS]:
            profiles[column] = pd.to_numeric(profiles[column], errors="coerce")
        details["Specific Gravity"] = pd.to_numeric(details["Specific Gravity"], errors="coerce")

        detail_by_key: dict[str | None, tuple[str | None, float]] = {
            clean_text(r["Public Food Key"]): (clean_text(r["Food Description"]), r["Specific Gravity"])
            for r in details.to_dict("records")
        }
        liquid_keys = {clean_text(k) for k in liquids["Public Food Key"]}

        bundle = Bundle()
        bundle.sources.append(
            {
                "id": self.source_id,
                "name": self.name,
                "version": VERSION,
                "licence": LICENCE,
                "attribution": ATTRIBUTION,
                "url": URL,
            }
        )
        for record in profiles.to_dict("records"):
            row: Row = {str(k): v for k, v in record.items()}
            key = clean_text(row["Public Food Key"])
            if key is None:
                continue
            description, gravity = detail_by_key.get(key, (None, float("nan")))
            self._add_food(bundle, row, key, description, gravity if key in liquid_keys else None)
        return bundle

    def _add_food(
        self, bundle: Bundle, row: Row, key: str, description: str | None, gravity: float | None
    ) -> None:
        fid = food_id(self.source_id, key)
        derivation = clean_text(row["Derivation"])
        bundle.foods.append(
            {
                "id": fid,
                "source_id": self.source_id,
                "source_food_id": key,
                "name": clean_text(row["Food Name"]),
                "description": description,
                # FSANZ built a few foods from nutrition labels. Keep that visible.
                "quality_tier": "label" if (derivation or "").lower() == "label data" else "reference",
                "derivation": derivation,
                "brand": None,
                "barcode": None,
            }
        )

        kj = row[ENERGY_COLUMN]
        if pd.notna(kj):
            bundle.food_nutrients.append(
                {
                    "food_id": fid,
                    "nutrient_code": "energy_kcal",
                    "amount_per_100g": round(kj / KJ_PER_KCAL, 1),
                    "basis": "afcd_kj_with_fibre_converted",
                }
            )
        for column, (code, basis) in NUTRIENT_COLUMNS.items():
            value = row[column]
            if pd.notna(value):
                bundle.food_nutrients.append(
                    {"food_id": fid, "nutrient_code": code, "amount_per_100g": float(value), "basis": basis}
                )

        # AFCD has no serving sizes, but for drinks it gives specific gravity
        # (how heavy 1 mL is), which lets people log milk or juice in mL.
        if gravity is not None and pd.notna(gravity) and gravity > 0:
            bundle.portions.append({"food_id": fid, "label": "100 mL", "grams": round(100 * gravity, 1)})
            bundle.portions.append(
                {
                    "food_id": fid,
                    "label": f"1 metric cup ({METRIC_CUP_ML} mL)",
                    "grams": round(METRIC_CUP_ML * gravity, 1),
                }
            )
