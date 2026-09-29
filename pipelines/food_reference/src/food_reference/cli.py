"""Command line entry point.

food-reference lock        record fingerprints of the source files
food-reference transform   clean the source files into data/clean
food-reference load        write data/clean into the database
food-reference run         transform, then load
"""

from __future__ import annotations

import argparse
import sys

from . import pipeline
from .config import load_settings
from .storage.raw_store import SourceFilesChangedError


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="food-reference", description="Build MayRoar's food database.")
    commands = parser.add_subparsers(dest="command", required=True)
    fetch = commands.add_parser("fetch", help="download a source automatically")
    fetch.add_argument("source_id", help="for example: open_food_facts")
    commands.add_parser("lock", help="record fingerprints of the source files")
    commands.add_parser("transform", help="clean the source files into data/clean")
    commands.add_parser("load", help="write data/clean into the database")
    commands.add_parser("run", help="transform, then load")
    args = parser.parse_args(argv)

    settings = load_settings()
    try:
        if args.command == "fetch":
            pipeline.fetch(settings, args.source_id)
        elif args.command == "lock":
            pipeline.lock(settings)
        elif args.command == "transform":
            pipeline.transform(settings)
        elif args.command == "load":
            pipeline.load(settings)
        else:
            pipeline.transform(settings)
            pipeline.load(settings)
    except (SourceFilesChangedError, FileNotFoundError) as exc:
        sys.exit(f"Stopped: {exc}")


if __name__ == "__main__":
    main()
