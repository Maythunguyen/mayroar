"""Reads and writes the clean CSV files and the build manifest.

The manifest travels with the CSVs and says how they were made: which
code version and which source files. The loader copies it into
reference.pipeline_runs.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from ..validation.rules import CleanTables

TABLE_NAMES = ["food_sources", "foods", "food_nutrients", "food_portions"]
MANIFEST = "build_manifest.json"


def write_clean(clean_dir: Path, tables: CleanTables, issues: pd.DataFrame, manifest: dict[str, Any]) -> None:
    clean_dir.mkdir(parents=True, exist_ok=True)
    for name in TABLE_NAMES:
        tables[name].to_csv(clean_dir / f"{name}.csv", index=False)
    issues.to_csv(clean_dir / "validation_issues.csv", index=False)
    (clean_dir / MANIFEST).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def read_manifest(clean_dir: Path) -> dict[str, Any]:
    missing = [n for n in [*[f"{t}.csv" for t in TABLE_NAMES], MANIFEST] if not (clean_dir / n).exists()]
    if missing:
        raise FileNotFoundError(f"Missing {missing} in {clean_dir}. Run: food-reference transform")
    return json.loads((clean_dir / MANIFEST).read_text(encoding="utf-8"))
