"""Loads the test sources into a real Postgres database.

WARNING: this deletes the reference schema in the database you point it
at. Only ever use a local, throwaway database. Run with:
    TEST_DATABASE_URL=postgresql://... uv run pytest -m integration
"""

from __future__ import annotations

import os
from pathlib import Path

import psycopg
import pytest

from food_reference import pipeline
from food_reference.config import Settings
from food_reference.sources.registry import enabled_sources
from food_reference.storage import raw_store

pytestmark = pytest.mark.integration

MIGRATIONS = Path(__file__).resolve().parents[4] / "supabase" / "migrations"
DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


@pytest.fixture
def settings(raw_dir: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Settings:
    if not DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL is not set")
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        # Plain Postgres lacks what Supabase provides, so create it first.
        conn.execute("create schema if not exists extensions")
        for role in ("anon", "authenticated"):
            conn.execute(f"do $$ begin create role {role}; exception when duplicate_object then null; end $$")
        conn.execute("drop view if exists public.food_search")
        conn.execute("drop schema if exists reference cascade")
        for migration in sorted(MIGRATIONS.glob("*.sql")):
            conn.execute(migration.read_text(encoding="utf-8"))  # type: ignore[arg-type]

    lock_file = tmp_path / "sources.lock.json"
    raw_store.write_lock(lock_file, enabled_sources(), raw_dir)
    monkeypatch.setattr(Settings, "lock_file", property(lambda self: lock_file))
    return Settings(data_dir=raw_dir.parent, database_url=DATABASE_URL)


def _count(sql: str) -> int:
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL) as conn:
        row = conn.execute(sql).fetchone()  # type: ignore[arg-type]
        assert row is not None
        return int(row[0])


def test_loading_twice_gives_the_same_result(settings: Settings) -> None:
    pipeline.transform(settings)
    pipeline.load(settings)
    first = (
        _count("select count(*) from reference.food_nutrients"),
        _count("select count(*) from reference.food_portions"),
    )
    pipeline.load(settings)
    second = (
        _count("select count(*) from reference.food_nutrients"),
        _count("select count(*) from reference.food_portions"),
    )
    assert first == second
    assert _count("select count(*) from reference.foods") == 5
    assert _count("select count(*) from reference.pipeline_runs where status = 'succeeded'") == 2


def test_view_shows_available_carbs_for_both_sources(settings: Settings) -> None:
    pipeline.transform(settings)
    pipeline.load(settings)
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL) as conn:
        rows = dict(conn.execute("select id, carbs_available_g from public.food_search").fetchall())
    assert float(rows["usda_foundation:2"]) == pytest.approx(58.6)  # 68.7 by difference minus 10.1 fibre
    assert float(rows["fsanz_afcd:F000002"]) == pytest.approx(4.7)


def test_food_missing_from_a_new_release_is_retired_not_deleted(settings: Settings) -> None:
    pipeline.transform(settings)
    pipeline.load(settings)
    for name in ("foods.csv", "food_nutrients.csv", "food_portions.csv"):
        path = settings.clean_dir / name
        lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
        path.write_text(
            "".join(ln for ln in lines if not ln.startswith("usda_foundation:2,")), encoding="utf-8"
        )
    pipeline.load(settings)
    assert (
        _count(
            "select count(*) from reference.foods where id = 'usda_foundation:2' and retired_at is not null"
        )
        == 1
    )
    assert _count("select count(*) from public.food_search where id = 'usda_foundation:2'") == 0


def test_app_roles_can_read_but_never_write(settings: Settings) -> None:
    pipeline.transform(settings)
    pipeline.load(settings)
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL) as conn:
        conn.execute("set role anon")
        row = conn.execute("select count(*) from public.food_search").fetchone()
        assert row is not None and row[0] == 5
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("delete from reference.foods")
        conn.rollback()
        conn.execute("set role anon")
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("select * from reference.pipeline_runs")


def test_a_failed_load_changes_nothing_and_is_recorded(settings: Settings) -> None:
    pipeline.transform(settings)
    pipeline.load(settings)
    before = _count("select count(*) from reference.food_nutrients")
    path = settings.clean_dir / "food_nutrients.csv"
    path.write_text(path.read_text(encoding="utf-8") + "no_such_food:1,protein,1,\n", encoding="utf-8")
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        pipeline.load(settings)
    assert _count("select count(*) from reference.food_nutrients") == before
    assert _count("select count(*) from reference.pipeline_runs where status = 'failed'") == 1


def test_packaged_products_load_with_barcode_and_brand(settings: Settings, make_off_extract) -> None:  # type: ignore[no-untyped-def]
    make_off_extract(settings.raw_dir / "open_food_facts")
    raw_store.write_lock(settings.lock_file, enabled_sources(), settings.raw_dir)
    pipeline.transform(settings)
    pipeline.load(settings)
    assert DATABASE_URL
    with psycopg.connect(DATABASE_URL) as conn:
        row = conn.execute(
            "select name, brand, quality_tier, energy_kcal from public.food_search "
            "where barcode = '9300000000011'"
        ).fetchone()
    assert row is not None
    assert row[:3] == ("Greek Yoghurt Plain", "Brand A", "label")
    assert float(row[3]) == 97
