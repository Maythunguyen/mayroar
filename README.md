# MayRoar

An AI strength training coach, built mainly for women who lift.

This repository holds everything: the food database pipeline now, and the
mobile app and backend later. AGENTS.md explains how the repo works and
the rules we follow. docs/adr explains why big decisions were made.

## First time setup

You need three tools. On a Mac with Homebrew:

    brew install uv
    brew install supabase/tap/supabase

and git, which Macs usually already have. uv installs the right Python
version by itself, so you do not need to install Python separately.

Then, from this folder:

    make setup
    make test

If the tests pass, your setup works.

## Connect to Supabase (once)

    supabase login
    supabase init
    supabase link --project-ref <your project ref>
    make db-push

"supabase init" adds a config file and keeps the existing migrations.
If it asks about VS Code or Deno settings, answer no. Your project ref is
the random code in your Supabase dashboard address. "make db-push"
creates the reference schema and the food_search view.

Then copy .env.example to .env and fill in DATABASE_URL.

## Build the food database

Put the original files in pipelines/food_reference/data/raw, one folder
per source, without renaming them:

    data/raw/fsanz_afcd/        AFCD "Nutrient profiles" and "Food Details" .xlsx
    data/raw/usda_foundation/   USDA Foundation Foods JSON (unzipped)
    data/raw/usda_sr_legacy/    USDA SR Legacy JSON (unzipped)

Then:

    make foods

The first time you add new source files, the pipeline stops and asks you
to run "make foods-lock". That records each file's fingerprint in
sources.lock.json. Commit that file, so everyone builds from the same data.

Clean files, a list of any data problems (validation_issues.csv) and a
build record land in pipelines/food_reference/data/clean.

## Data sources and licences

USDA FoodData Central is public domain (CC0). The Australian Food
Composition Database is licensed by FSANZ under terms based on CC BY-SA
3.0 Australia: credit FSANZ, and share the food data under the same
licence. Full attribution text is stored in reference.food_sources.