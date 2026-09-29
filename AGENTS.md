# Guide for AI coding assistants (and new teammates)

MayRoar is an AI strength training coach, built mainly for women who lift.
This file explains how the repository works. Follow it exactly.

## The one rule

Git plus the original source files must always be enough to rebuild the
food database. Never fix data by hand in the database. Fix the pipeline.

## Where things live

    apps/mobile/                 Expo app (not started)
    services/api/                FastAPI backend (not started)
    pipelines/food_reference/    builds the food database (Python)
    supabase/migrations/         every database change, as timestamped SQL
    docs/adr/                    why big decisions were made

## Commands

Always use the Makefile targets. Run "make help" to list them.
Before finishing any change, run "make lint" and "make test".

## Food pipeline rules

Each food source is one module in sources/, inheriting from Source in
sources/base.py, and listed in sources/registry.py.

Source ids are publisher_dataset, like fsanz_afcd. Food ids are
source_id:source_food_id, built only with domain.models.food_id().
Never rename either once real users exist.

Every nutrient amount is per 100 g, in the one unit set in
domain/nutrients.py. Never convert units silently. A wrong unit is
skipped and reported.

An empty value means "not measured". Never store it as zero.

Every value records its basis (how it was obtained). Measured values and
values we calculated must always be distinguishable.

Every rule in validation/rules.py needs a test that triggers it.

## Database rules

Schema changes only through a new file in supabase/migrations, named with
a timestamp by "supabase migration new <name>". Never edit a migration
that has already been applied. Write a new one instead.

Food data lives in the reference schema. The app reads only
public.food_search. User data will live in a separate app schema.

Names are snake_case, tables are plural, foreign keys are <singular>_id,
timestamps end in _at, booleans start with is_, units go in column names.

Foods missing from a new source release are retired (retired_at), never
deleted, because user food logs may point to them.

## Never

Commit .env, passwords or files from data/.
Point TEST_DATABASE_URL at Supabase; the tests delete the schema.
Make medical or injury diagnosis claims anywhere in the product.
