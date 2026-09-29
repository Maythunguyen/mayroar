"""The three jobs of the pipeline, in the order they run:
lock (fingerprint the source files), transform (clean), load (into Supabase)."""

from __future__ import annotations

import subprocess
from datetime import UTC, datetime
from typing import Any

from .config import PACKAGE_ROOT, Settings
from .domain.models import Bundle
from .sources.open_food_facts import OpenFoodFacts, summarise
from .sources.registry import enabled_sources, find_source
from .storage import clean_store, loader, raw_store
from .validation.rules import clean_and_check


def git_commit() -> str | None:
    """The code version, plus "-dirty" if there are unsaved changes."""
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=PACKAGE_ROOT, capture_output=True, text=True, check=True
        ).stdout.strip()
        status = subprocess.run(
            ["git", "status", "--porcelain"], cwd=PACKAGE_ROOT, capture_output=True, text=True, check=True
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None
    return f"{sha}-dirty" if status else sha


def fetch(settings: Settings, source_id: str) -> None:
    source = find_source(source_id)
    print(f"Fetching {source_id}. This can take several minutes...")
    path = source.fetch(settings.raw_dir)
    size_mb = path.stat().st_size / 1_000_000
    print(f"Saved {path} ({size_mb:.1f} MB)\n")
    if isinstance(source, OpenFoodFacts):
        print(summarise(path))


def lock(settings: Settings) -> None:
    lock_data, updated = raw_store.write_lock(settings.lock_file, enabled_sources(), settings.raw_dir)
    print("Found and fingerprinted:" if updated else "No source files found on this computer.")
    for source_id in updated:
        for f in lock_data[source_id]:
            print(f"  {source_id}: {f['file']}  {f['sha256'][:12]}")
    kept = [s for s in lock_data if s not in updated]
    if kept:
        print("Not found here, so their existing entries were kept unchanged:")
        for source_id in kept:
            print(f"  {source_id}")
    print(f"Wrote {settings.lock_file}")


def transform(settings: Settings) -> dict[str, Any]:
    lock_data = raw_store.read_lock(settings.lock_file)
    bundle, source_files = Bundle(), []

    for source in enabled_sources():
        if not source.raw_files(settings.raw_dir):
            print(f"Skipping {source.source_id}: no files in {source.raw_folder(settings.raw_dir)}")
            continue
        files = raw_store.verify(source, settings.raw_dir, lock_data)
        print(f"Reading {source.source_id}")
        extracted = source.extract(settings.raw_dir)
        print(f"  {len(extracted.foods)} foods")
        bundle.extend(extracted)
        source_files += [{"source_id": source.source_id, **f} for f in files]

    if not bundle.foods:
        raise SystemExit(f"No source files found in {settings.raw_dir}. See the README.")

    tables, issues = clean_and_check(bundle)
    keys = issues["action"] + ":" + issues["rule"]
    issue_counts = {str(k): int(v) for k, v in sorted(keys.value_counts().to_dict().items())}
    manifest = {
        "transformed_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "git_commit": git_commit(),
        "source_files": source_files,
        "food_count": len(tables["foods"]),
        "issue_counts": issue_counts,
    }
    clean_store.write_clean(settings.clean_dir, tables, issues, manifest)

    print(f"\nWrote clean files to {settings.clean_dir}")
    for name, table in tables.items():
        print(f"  {name}.csv: {len(table)} rows")
    print("\nIssues found" if issue_counts else "\nNo issues found")
    for key, n in issue_counts.items():
        print(f"  {key}: {n}")
    return manifest


def load(settings: Settings) -> None:
    if not settings.database_url:
        raise SystemExit(
            "DATABASE_URL is not set. Copy .env.example to .env at the repo root and fill it in."
        )
    manifest = clean_store.read_manifest(settings.clean_dir)
    started_at = datetime.now(UTC)
    try:
        result = loader.load_clean(settings.database_url, settings.clean_dir, manifest, started_at)
    except Exception as exc:
        loader.record_failed_run(settings.database_url, manifest, started_at, repr(exc))
        raise
    print("Loaded into the database")
    for source_id, version, active in result["sources"]:
        print(f"  {source_id} ({version}): {active} active foods")
    if result["retired"]:
        print(f"  {result['retired']} foods retired because they are no longer in their source")
