# 1. The food database is rebuilt, never edited

Date: 2026-09-23. Status: accepted.

## Context

MayRoar's food data comes from public databases (USDA, FSANZ AFCD) that
publish new releases from time to time. Data fixed by hand drifts away
from its sources, and nobody can tell afterwards what was changed or why.

## Decision

The food database is a build output. It is created only by the pipeline,
from the original source files, whose exact versions are recorded in
sources.lock.json. Each load records its code version and source files in
reference.pipeline_runs.

Related choices:

Foods missing from a new release are retired, not deleted, so users' old
food logs keep working.

Nutrients are stored one row per food per nutrient, each with a basis
saying how the value was obtained. USDA and AFCD define carbohydrate
differently (USDA includes fibre, AFCD does not), so both are kept as
different nutrients, and the public.food_search view shows available
carbohydrate for every food.

## Consequences

The food database needs no backup of its own: code plus source files can
always rebuild it. The original source files must be kept safe instead.
User data, when it arrives, is different and will need real backups.
