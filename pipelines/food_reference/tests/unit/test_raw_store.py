from pathlib import Path

import pytest

from food_reference.sources.fsanz_afcd import FsanzAfcd
from food_reference.storage.raw_store import SourceFilesChangedError, read_lock, verify, write_lock


def test_lock_then_verify_passes(raw_dir: Path, tmp_path: Path) -> None:
    lock_file = tmp_path / "sources.lock.json"
    write_lock(lock_file, [FsanzAfcd()], raw_dir)
    files = verify(FsanzAfcd(), raw_dir, read_lock(lock_file))
    assert len(files) == 2 and all(len(f["sha256"]) == 64 for f in files)


def test_changed_file_stops_the_pipeline(raw_dir: Path, tmp_path: Path) -> None:
    lock_file = tmp_path / "sources.lock.json"
    write_lock(lock_file, [FsanzAfcd()], raw_dir)
    with (raw_dir / "fsanz_afcd" / "AFCD_Release_3_-_Food_Details.xlsx").open("ab") as fh:
        fh.write(b"one extra byte")
    with pytest.raises(SourceFilesChangedError):
        verify(FsanzAfcd(), raw_dir, read_lock(lock_file))


def test_unlocked_source_stops_the_pipeline(raw_dir: Path) -> None:
    with pytest.raises(SourceFilesChangedError):
        verify(FsanzAfcd(), raw_dir, {})


def test_lock_reports_only_sources_it_actually_found(raw_dir: Path, tmp_path: Path) -> None:
    lock_file = tmp_path / "sources.lock.json"
    lock_file.write_text('{"old_source": [{"file": "x", "sha256": "y", "bytes": 1}]}', encoding="utf-8")
    lock, updated = write_lock(lock_file, [FsanzAfcd()], raw_dir)
    assert updated == ["fsanz_afcd"]
    assert set(lock) == {"fsanz_afcd", "old_source"}
