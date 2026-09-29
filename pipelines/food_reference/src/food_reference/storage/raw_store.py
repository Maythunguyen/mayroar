"""Fingerprints (SHA-256 checksums) for the original source files.

sources.lock.json is committed to git and records exactly which file
versions the database is built from. If a file changes, even by one byte,
its fingerprint changes and the pipeline stops, instead of quietly
building different data. Run "food-reference lock" to accept new files.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from ..sources.base import Source

LockData = dict[str, list[dict[str, Any]]]


class SourceFilesChangedError(Exception):
    pass


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        while chunk := fh.read(1 << 20):
            digest.update(chunk)
    return digest.hexdigest()


def describe_files(files: list[Path]) -> list[dict[str, Any]]:
    return [{"file": p.name, "sha256": sha256_of(p), "bytes": p.stat().st_size} for p in files]


def read_lock(lock_file: Path) -> LockData:
    if not lock_file.exists():
        return {}
    return json.loads(lock_file.read_text(encoding="utf-8"))


def write_lock(lock_file: Path, sources: list[Source], raw_dir: Path) -> tuple[LockData, list[str]]:
    """Record the files currently present. Sources whose files are not on
    this computer keep their existing entry. Returns the whole lock and the
    ids of the sources that were actually found and updated."""
    lock = read_lock(lock_file)
    updated: list[str] = []
    for source in sources:
        files = source.raw_files(raw_dir)
        if files:
            lock[source.source_id] = describe_files(files)
            updated.append(source.source_id)
    lock = dict(sorted(lock.items()))
    lock_file.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    return lock, updated


def verify(source: Source, raw_dir: Path, lock: LockData) -> list[dict[str, Any]]:
    """Return the fingerprints of this source's files, or stop if they do
    not match sources.lock.json."""
    found = describe_files(source.raw_files(raw_dir))
    expected = lock.get(source.source_id)
    if expected is None:
        raise SourceFilesChangedError(
            f"{source.source_id} is not in sources.lock.json yet. "
            "Check the files are right, then run: food-reference lock"
        )
    as_set = lambda items: {(i["file"], i["sha256"]) for i in items}  # noqa: E731
    if as_set(found) != as_set(expected):
        raise SourceFilesChangedError(
            f"The files for {source.source_id} do not match sources.lock.json. "
            "If you meant to update them, run: food-reference lock"
        )
    return found
