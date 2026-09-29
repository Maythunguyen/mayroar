"""Settings, read from environment variables and an optional .env file.

The .env file is searched for from the current folder upwards, so the one
at the repository root works from anywhere inside the repo.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import find_dotenv, load_dotenv

PACKAGE_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    database_url: str | None

    @property
    def raw_dir(self) -> Path:
        return self.data_dir / "raw"

    @property
    def clean_dir(self) -> Path:
        return self.data_dir / "clean"

    @property
    def lock_file(self) -> Path:
        return PACKAGE_ROOT / "sources.lock.json"


def load_settings() -> Settings:
    load_dotenv(find_dotenv(usecwd=True))
    data_dir = Path(os.environ.get("FOOD_REFERENCE_DATA_DIR", PACKAGE_ROOT / "data"))
    return Settings(data_dir=data_dir, database_url=os.environ.get("DATABASE_URL"))
