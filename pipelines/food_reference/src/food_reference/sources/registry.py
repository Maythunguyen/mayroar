"""Which sources exist. Add a new source here."""

from __future__ import annotations

from .base import Source
from .fsanz_afcd import FsanzAfcd
from .open_food_facts import OpenFoodFacts
from .usda import UsdaFoodDataCentral


def enabled_sources() -> list[Source]:
    """Sources that are fully built and go into the database."""
    return [
        UsdaFoodDataCentral("foundation"),
        UsdaFoodDataCentral("sr_legacy"),
        FsanzAfcd(),
        OpenFoodFacts(),
    ]


def in_progress_sources() -> list[Source]:
    """Sources still being built. They can be fetched, but lock and
    transform ignore them until they move up to enabled_sources()."""
    return []


def find_source(source_id: str) -> Source:
    for source in [*enabled_sources(), *in_progress_sources()]:
        if source.source_id == source_id:
            return source
    known = ", ".join(s.source_id for s in [*enabled_sources(), *in_progress_sources()])
    raise SystemExit(f"Unknown source {source_id!r}. Known sources: {known}")
