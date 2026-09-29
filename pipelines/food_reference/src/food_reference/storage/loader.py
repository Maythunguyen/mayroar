"""Writes the clean CSVs into Supabase (Postgres).

Everything happens inside one transaction: either the whole load succeeds,
or Postgres undoes all of it and the old data stays exactly as it was.
Loading the same files twice gives the same result, never duplicates.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

from ..domain.models import FOOD_COLUMNS, FOOD_NUTRIENT_COLUMNS, PORTION_COLUMNS, SOURCE_COLUMNS
from ..domain.nutrients import NUTRIENTS


def _identifiers(names: list[str]) -> sql.Composable:
    """Column names are added with sql.Identifier, never by gluing strings
    together, so a strange name can never turn into extra SQL (this is how
    SQL injection attacks work)."""
    return sql.SQL(", ").join(sql.Identifier(n) for n in names)


def _table(name: str) -> sql.Identifier:
    return sql.Identifier(*name.split("."))


def _copy_csv(cur: psycopg.Cursor[Any], table: str, columns: list[str], path: Path) -> None:
    """COPY streams a whole file into Postgres in one go, which is far
    faster than sending thousands of separate INSERT statements."""
    statement = sql.SQL("copy {} ({}) from stdin with (format csv, header true)").format(
        _table(table), _identifiers(columns)
    )
    with path.open("rb") as fh, cur.copy(statement) as copy:
        while chunk := fh.read(1 << 16):
            copy.write(chunk)


def _upsert_nutrients(cur: psycopg.Cursor[Any]) -> None:
    cur.executemany(
        """insert into reference.nutrients (code, name, unit, infoods_tagname, sort_order)
           values (%s, %s, %s, %s, %s)
           on conflict (code) do update set name = excluded.name, unit = excluded.unit,
             infoods_tagname = excluded.infoods_tagname, sort_order = excluded.sort_order""",
        [(n.code, n.name, n.unit, n.infoods_tagname, n.sort_order) for n in NUTRIENTS],
    )


def _upsert_sources(cur: psycopg.Cursor[Any], clean_dir: Path) -> None:
    cur.execute(
        "create temp table stage_sources (like reference.food_sources including defaults) on commit drop"
    )
    _copy_csv(cur, "stage_sources", SOURCE_COLUMNS, clean_dir / "food_sources.csv")
    cur.execute(
        sql.SQL(
            """insert into reference.food_sources ({columns}, loaded_at)
               select {columns}, now() from stage_sources
               on conflict (id) do update set name = excluded.name, version = excluded.version,
                 licence = excluded.licence, attribution = excluded.attribution,
                 url = excluded.url, loaded_at = now()"""
        ).format(columns=_identifiers(SOURCE_COLUMNS))
    )


def _upsert_foods(cur: psycopg.Cursor[Any], clean_dir: Path) -> int:
    """Returns how many foods were retired."""
    cur.execute("create temp table stage_foods (like reference.foods including defaults) on commit drop")
    _copy_csv(cur, "stage_foods", FOOD_COLUMNS, clean_dir / "foods.csv")
    cur.execute(
        sql.SQL(
            """insert into reference.foods ({columns}, retired_at)
               select {columns}, null from stage_foods
               on conflict (id) do update set name = excluded.name, description = excluded.description,
                 quality_tier = excluded.quality_tier, derivation = excluded.derivation,
                 brand = excluded.brand, barcode = excluded.barcode, retired_at = null"""
        ).format(columns=_identifiers(FOOD_COLUMNS))
    )
    # A food missing from a new release is retired, never deleted, because
    # a user's old food log may still point to it.
    cur.execute(
        """update reference.foods f set retired_at = now()
           where f.retired_at is null
             and f.source_id in (select distinct source_id from stage_foods)
             and not exists (select 1 from stage_foods s where s.id = f.id)"""
    )
    return cur.rowcount


def _replace_details(cur: psycopg.Cursor[Any], clean_dir: Path) -> None:
    """Nutrients and portions are replaced completely for every food in
    this load. Simpler and safer than working out what changed."""
    cur.execute("delete from reference.food_nutrients where food_id in (select id from stage_foods)")
    _copy_csv(cur, "reference.food_nutrients", FOOD_NUTRIENT_COLUMNS, clean_dir / "food_nutrients.csv")
    cur.execute("delete from reference.food_portions where food_id in (select id from stage_foods)")
    _copy_csv(cur, "reference.food_portions", PORTION_COLUMNS, clean_dir / "food_portions.csv")


def _record_run(
    cur: psycopg.Cursor[Any], started_at: datetime, manifest: dict[str, Any], status: str, error: str | None
) -> None:
    cur.execute(
        """insert into reference.pipeline_runs
             (started_at, status, git_commit, source_files, food_count, issue_counts, error)
           values (%s, %s, %s, %s, %s, %s, %s)""",
        (
            started_at,
            status,
            manifest.get("git_commit"),
            Jsonb(manifest.get("source_files", [])),
            manifest.get("food_count"),
            Jsonb(manifest.get("issue_counts", {})),
            error,
        ),
    )


def load_clean(
    database_url: str, clean_dir: Path, manifest: dict[str, Any], started_at: datetime
) -> dict[str, Any]:
    with psycopg.connect(database_url) as conn, conn.cursor() as cur:
        _upsert_nutrients(cur)
        _upsert_sources(cur, clean_dir)
        retired = _upsert_foods(cur, clean_dir)
        _replace_details(cur, clean_dir)
        _record_run(cur, started_at, manifest, "succeeded", None)
        cur.execute(
            """select s.id, s.version, count(f.id) filter (where f.retired_at is null)
               from reference.food_sources s left join reference.foods f on f.source_id = s.id
               group by s.id, s.version order by s.id"""
        )
        return {"sources": cur.fetchall(), "retired": retired}


def record_failed_run(database_url: str, manifest: dict[str, Any], started_at: datetime, error: str) -> None:
    """Saved in its own transaction, because the failed load was undone."""
    try:
        with psycopg.connect(database_url) as conn, conn.cursor() as cur:
            _record_run(cur, started_at, manifest, "failed", error[:2000])
    except psycopg.Error:
        pass  # the database itself is unreachable; the error is still printed
