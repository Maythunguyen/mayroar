"""Open Food Facts: packaged products sold in Australia, with barcodes.

Open Food Facts publishes its whole database every night. It is far too
big to keep (about 4.7 million products worldwide), so "fetch" reads it
straight from where it is hosted and saves only the products tagged as
sold in Australia, with only the columns we use. That extract is our raw
source file, fingerprinted in sources.lock.json like any other.

Their rules: the live API is only for real user scans, one call per scan.
Bulk use must come from these published exports, which is what we do.
"""

from __future__ import annotations

import re
from datetime import date
from pathlib import Path
from typing import Any

import duckdb

from ..domain.models import Bundle, Row, clean_text, food_id
from .base import Source

# The official Parquet export, linked from https://world.openfoodfacts.org/data
EXPORT_URL = "https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet"
LICENCE = (
    "Open Database License (ODbL) 1.0; contents under the Database Contents License; "
    "images under CC BY-SA 3.0"
)
ATTRIBUTION = "Open Food Facts contributors. Open Food Facts database. openfoodfacts.org"
URL = "https://world.openfoodfacts.org/data"
COUNTRY_TAG = "en:australia"
FILE_PATTERN = re.compile(r"open_food_facts_au_(\d{4}-\d{2}-\d{2})\.parquet$")

# Only the columns MayRoar needs. Keeping fewer columns makes the file
# much smaller and the download much faster.
COLUMNS = [
    "code",
    "product_name",
    "brands",
    "quantity",
    "serving_size",
    "serving_quantity",
    "nutrition_data_per",
    "nutriments",
    "countries_tags",
    "completeness",
    "data_quality_errors_tags",
    "last_modified_t",
    "obsolete",
]


# Open Food Facts nutrient name -> (our code, multiply by).
# Open Food Facts stores minerals and vitamins per 100 g in GRAMS, even though
# labels show milligrams. So sodium of 50 mg arrives as 0.05 and must be
# multiplied by 1,000. Vitamin D goes from grams to micrograms (x 1,000,000).
NUTRIENT_MAP: dict[str, tuple[str, float]] = {
    "proteins": ("protein", 1),
    "fat": ("fat", 1),
    # Australian labels give carbohydrate without fibre, the same "available
    # carbohydrate" as AFCD. A few imported products may carry a US label,
    # where carbs include fibre; we cannot tell them apart reliably.
    "carbohydrates": ("carb_available", 1),
    "fiber": ("fibre", 1),
    "sugars": ("sugars", 1),
    "sodium": ("sodium", 1_000),
    "calcium": ("calcium", 1_000),
    "iron": ("iron", 1_000),
    "magnesium": ("magnesium", 1_000),
    "vitamin-d": ("vitamin_d", 1_000_000),
}
# "alcohol" is left out on purpose: Open Food Facts stores it as % volume,
# not grams, and converting needs the drink's density.
# Energy: only these two names are trusted. The plain "energy" field mixes
# kJ and kcal, and a wrong guess would be four times off.
ENERGY_KCAL = "energy-kcal"
ENERGY_KJ = "energy-kj"
KJ_PER_KCAL = 4.184
WANTED_NUTRIENTS = [*NUTRIENT_MAP, ENERGY_KCAL, ENERGY_KJ]

# How the label gave its numbers decides the basis we record.
BASIS = {
    "100g": ("off_label_per_100g", "Label, per 100 g"),
    "100ml": ("off_label_per_100ml", "Label, per 100 mL"),
    "serving": (
        "off_converted_from_serving",
        "Label, per serving, converted to per 100 g by Open Food Facts",
    ),
}
UNKNOWN_BASIS = ("off_label_basis_not_stated", "Label, basis not stated")

BARCODE = re.compile(r"^\d{8,14}$")
MAX_SERVING_GRAMS = 2_000


def sql_path(path: Path) -> str:
    """A file path written safely inside SQL. A folder name with an
    apostrophe, like "May's projects", would otherwise break the query."""
    return "'" + path.as_posix().replace("'", "''") + "'"


def pick_name(names: list[dict[str, Any]] | None) -> str | None:
    """Products can have names in several languages. Prefer English."""
    by_lang = {n.get("lang"): clean_text(n.get("text")) for n in names or []}
    return by_lang.get("en") or by_lang.get("main") or next((v for v in by_lang.values() if v), None)


def serving_grams(value: Any) -> float | None:
    try:
        grams = float(str(value).strip())
    except (TypeError, ValueError):
        return None
    return grams if 0 < grams <= MAX_SERVING_GRAMS else None


class OpenFoodFacts(Source):
    source_id = "open_food_facts"
    name = "Open Food Facts (products sold in Australia)"

    def raw_files(self, raw_dir: Path) -> list[Path]:
        folder = self.raw_folder(raw_dir)
        if not folder.exists():
            return []
        found = sorted(p for p in folder.iterdir() if FILE_PATTERN.search(p.name))
        return found[-1:]  # only ever use the newest extract

    def extract(self, raw_dir: Path) -> Bundle:
        files = self.raw_files(raw_dir)
        if not files:
            return Bundle()
        path = files[0]
        match = FILE_PATTERN.search(path.name)
        version = match.group(1) if match else "unknown"

        with duckdb.connect() as con:
            # If a barcode appears more than once, keep only its most recently
            # edited version. Mixing two versions would give one product the
            # protein of one label and the sodium of another.
            con.execute(
                f"""create table p as
                    select * exclude (version_rank) from (
                      select *, row_number() over (
                        partition by code order by last_modified_t desc nulls last
                      ) as version_rank
                      from read_parquet({sql_path(path)})
                      where not coalesce(obsolete, false)
                    ) where version_rank = 1"""
            )
            older_versions = con.execute(
                f"""select code, count(*) - 1 from read_parquet({sql_path(path)})
                    where not coalesce(obsolete, false)
                    group by code having count(*) > 1"""
            ).fetchall()
            products = con.execute(
                """select code, product_name, brands, quantity, serving_size, serving_quantity,
                          nutrition_data_per from p"""
            ).fetchall()
            per_100g = con.execute(
                """select code, n.name, n."100g"
                   from (select code, unnest(nutriments) as n from p)
                   where n."100g" is not null and list_contains(?::varchar[], n.name)""",
                [WANTED_NUTRIENTS],
            ).fetchall()

        nutrients_by_code: dict[str, dict[str, float]] = {}
        for code, name, value in per_100g:
            nutrients_by_code.setdefault(code, {})[name] = float(value)

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
        for code, extra in older_versions:
            self._drop(bundle, "older_version_of_barcode", f"barcode {code}: {extra} older version(s)")
        for code, names, brands, quantity, serving_size, serving_quantity, per in products:
            self._add_product(
                bundle,
                clean_text(code),
                names,
                brands,
                quantity,
                serving_size,
                serving_quantity,
                per,
                nutrients_by_code.get(code, {}),
            )
        return bundle

    def _drop(self, bundle: Bundle, rule: str, detail: str) -> None:
        bundle.issues.append(
            {
                "source_id": self.source_id,
                "food_id": None,
                "rule": rule,
                "detail": detail,
                "action": "dropped",
            }
        )

    def _add_product(
        self,
        bundle: Bundle,
        code: str | None,
        names: Any,
        brands: Any,
        quantity: Any,
        serving_size: Any,
        serving_quantity: Any,
        per: Any,
        nutrients: dict[str, float],
    ) -> None:
        if code is None or not BARCODE.match(code):
            self._drop(bundle, "invalid_barcode", f"code {code!r} is not 8 to 14 digits")
            return
        fid = food_id(self.source_id, code)
        basis, derivation = BASIS.get(clean_text(per) or "", UNKNOWN_BASIS)

        rows = self._nutrient_rows(fid, nutrients, basis)
        if not rows:
            # Nothing per 100 g means it cannot be logged by weight.
            self._drop(bundle, "no_per_100g_nutrition", f"barcode {code}")
            return

        pack = clean_text(quantity)
        bundle.foods.append(
            {
                "id": fid,
                "source_id": self.source_id,
                "source_food_id": code,
                "name": pick_name(names),
                "description": f"Pack size {pack}" if pack else None,
                "quality_tier": "label",
                "derivation": derivation,
                "brand": clean_text(brands),
                "barcode": code,
            }
        )
        bundle.food_nutrients += rows

        grams = serving_grams(serving_quantity)
        if grams is not None:
            size = clean_text(serving_size)
            bundle.portions.append(
                {"food_id": fid, "label": f"1 serving ({size})" if size else "1 serving", "grams": grams}
            )

    @staticmethod
    def _nutrient_rows(fid: str, nutrients: dict[str, float], basis: str) -> list[Row]:
        def row(code: str, amount: float, row_basis: str) -> Row:
            return {"food_id": fid, "nutrient_code": code, "amount_per_100g": amount, "basis": row_basis}

        rows = [
            row(code, round(nutrients[name] * factor, 4), basis)
            for name, (code, factor) in NUTRIENT_MAP.items()
            if name in nutrients
        ]
        if ENERGY_KCAL in nutrients:
            rows.append(row("energy_kcal", nutrients[ENERGY_KCAL], basis))
        elif ENERGY_KJ in nutrients:
            rows.append(
                row("energy_kcal", round(nutrients[ENERGY_KJ] / KJ_PER_KCAL, 1), f"{basis}_kj_converted")
            )
        return rows

    def fetch(self, raw_dir: Path, url: str = EXPORT_URL, today: date | None = None) -> Path:
        """Download the Australian products into data/raw/open_food_facts/.
        Older extracts are removed, so the folder always holds one file."""
        folder = self.raw_folder(raw_dir)
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / f"open_food_facts_au_{(today or date.today()).isoformat()}.parquet"
        partial = target.with_suffix(".partial")

        columns = ", ".join(COLUMNS)
        try:
            with duckdb.connect() as con:
                # Show a progress bar in the terminal for long downloads.
                con.execute("set enable_progress_bar = true")
                con.execute(
                    f"""copy (
                          select {columns} from read_parquet(?)
                          where list_contains(countries_tags, ?)
                        ) to {sql_path(partial)} (format parquet, compression zstd)""",
                    [url, COUNTRY_TAG],
                )
        except BaseException:
            # Failed or stopped (including Ctrl+C): remove the half-written
            # file. The previous good extract is left untouched.
            partial.unlink(missing_ok=True)
            raise

        # Put the new file in place first, then remove older extracts and any
        # half-finished files left by earlier interrupted downloads.
        partial.replace(target)
        for old in folder.iterdir():
            is_old_extract = FILE_PATTERN.search(old.name) and old != target
            if is_old_extract or old.suffix == ".partial":
                old.unlink()
        return target


def summarise(path: Path) -> str:
    """A short report on what an extract contains, used to design step 2."""
    lines: list[str] = []
    with duckdb.connect() as con:
        con.execute(f"create view p as select * from read_parquet({sql_path(path)})")

        def one(sql: str) -> object:
            row = con.execute(sql).fetchone()
            return row[0] if row else None

        lines.append(f"Products sold in Australia: {one('select count(*) from p')}")
        lines.append(f"  marked obsolete: {one('select count(*) from p where obsolete')}")
        lines.append(f"  with no nutrients at all: {one('select count(*) from p where len(nutriments) = 0')}")
        lines.append(
            f"  barcodes listed more than once: {one('select count(*) - count(distinct code) from p')}"
        )
        lines.append("Nutrition given per:")
        for per, n in con.execute(
            "select coalesce(nutrition_data_per, '(not stated)'), count(*) from p group by 1 order by 2 desc"
        ).fetchall():
            lines.append(f"  {per}: {n}")
        lines.append("Most common nutrients with a per 100 g value (name, unit, products):")
        for name, unit, n in con.execute(
            """select n.name, coalesce(n.unit, '-'), count(*)
               from (select unnest(nutriments) as n from p)
               where n."100g" is not null
               group by 1, 2 order by 3 desc limit 30"""
        ).fetchall():
            lines.append(f"  {name}  {unit}  {n}")
    return "\n".join(lines)