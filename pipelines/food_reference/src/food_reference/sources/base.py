"""The pattern every food source follows.

To add a new source: create a module in this folder with a class that
inherits from Source, then add it to registry.py. Nothing else changes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from ..domain.models import Bundle


class Source(ABC):
    #: Stable id, written as publisher_dataset, e.g. "fsanz_afcd". Never rename
    #: one after real users exist, because every food id starts with it.
    source_id: str
    #: Human readable name, shown on the app's attribution screen.
    name: str

    def raw_folder(self, raw_dir: Path) -> Path:
        """Each source keeps its original files in data/raw/<source_id>."""
        return raw_dir / self.source_id

    @abstractmethod
    def raw_files(self, raw_dir: Path) -> list[Path]:
        """The original files this source needs, or [] if they are missing."""

    @abstractmethod
    def extract(self, raw_dir: Path) -> Bundle:
        """Read the original files and translate them into MayRoar's format."""

    def fetch(self, raw_dir: Path) -> Path:
        """Download the original files automatically. Sources that need a
        manual download (like AFCD, for now) keep this default."""
        raise NotImplementedError(
            f"{self.source_id} has no automatic download yet. Download it by hand, see the README."
        )
