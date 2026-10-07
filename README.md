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

## Mobile app and API setup

The app has two parts that run together:

| Location | Purpose |
| --- | --- |
| apps/mayroar-mobile | React Native frontend using Expo |
| services/api | Python backend using FastAPI |

The frontend calls the Python API. The API connects to Supabase and,
for photo analysis, OpenAI.

The existing `make setup` and `make test` commands only cover the
food pipeline. Install and test the API and mobile app separately.

### 1. Install Node.js

The mobile app requires Node.js 22.13.0 or newer.
Use the version pinned by the repository if one is provided.

Check your installed versions:

```bash
node --version
npm --version
```

If Node.js is not installed, install an LTS version from:
https://nodejs.org/

You also need uv for the Python backend:

```bash
brew install uv
```

Xcode and Android Studio are not required for browser development.

### 2. Check the Supabase setup

Link the repository to your Supabase project using the earlier
instructions, then inspect the migrations from the repository root:

```bash
supabase migration list
```

Apply any pending project migrations:

```bash
make db-push
```

This changes the linked remote database. Check that you have linked
the intended project before running it.

The app requires the food-search view, account diary tables,
row-level security policies and diary RPC functions from the
committed migrations.

Migrations create database structures. Food search also needs food
records loaded by the pipeline. If the shared database is already
populated, you do not need to rebuild it for every developer.

### 3. Configure the Python API

From the repository root:

```bash
cd services/api
uv sync --locked
```

If `.env` does not already exist:

```bash
cp .env.example .env
```

Set these values in `services/api/.env`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
ALLOWED_ORIGINS=["http://localhost:8081","http://127.0.0.1:8081"]
```

Use your project's Supabase URL and publishable key.

The OpenAI key is only required for photo analysis. You can leave it
empty while working on authentication, food search and diary logging.

Keep `.env` files out of Git. Never put the OpenAI key, database
password or Supabase service-role key in the mobile app.

### 4. Start the API — terminal 1

From `services/api`:

```bash
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8787
```

Keep this terminal running.

Useful URLs:

- Health check: http://127.0.0.1:8787/health
- API documentation: http://127.0.0.1:8787/docs

The health endpoint should return:

```json
{"status": "ok"}
```

This confirms the API is running. It does not verify the database
connection or OpenAI configuration.

### 5. Configure the mobile app — terminal 2

Open another terminal at the repository root:

```bash
cd apps/mayroar-mobile
npm install
```

Create or update `apps/mayroar-mobile/.env`:

```dotenv
EXPO_PUBLIC_API_URL=http://127.0.0.1:8787
```

Variables starting with `EXPO_PUBLIC_` are visible to app users.
Only put public configuration here.

The frontend and backend have separate `.env` files. The pipeline's
`DATABASE_URL` does not replace either of them.

### 6. Start the app in the browser

From `apps/mayroar-mobile`:

```bash
npx expo start --web --port 8081
```

Open:

http://localhost:8081

Keep both terminals running:

- Terminal 1 runs the Python API on port 8787.
- Terminal 2 runs the Expo frontend on port 8081.

Edit React Native code in VS Code to see frontend changes through
Fast Refresh. The API reloads when Python files change.

After changing environment variables, restart the relevant server.

### 7. Check the main features

1. Create an account.
2. Confirm your email if email confirmation is enabled in Supabase.
3. Sign in.
4. Search for a food.
5. Add it to Breakfast, Lunch, Dinner or Snacks.
6. Refresh and check that the entry remains.
7. Edit or delete an entry.
8. Upload a food photo and review the nutrition estimate before saving.

Photo analysis requires a valid OpenAI API key and available API billing.

### 8. Run checks

Backend, from `services/api`:

```bash
uv run pytest -q
```

Frontend, from `apps/mayroar-mobile`:

```bash
npm run typecheck
npm run lint
npm test
```

Food pipeline, from the repository root:

```bash
make test
```

Backend tests use mocked external services. Also check the main
features against your development Supabase project.

### Troubleshooting

**uv says “The current directory must exist”**

The terminal may still point to a folder that was replaced.
Run `cd ~`, then navigate back into the existing `services/api` folder.

**Food search returns no results**

Check that the API is running, the food-search migration is applied,
and the database contains food records.

**The browser cannot reach the API**

Check `EXPO_PUBLIC_API_URL`, confirm the API is running on port 8787,
and ensure `ALLOWED_ORIGINS` includes the exact frontend origin.

If Expo starts on another port, update the allowed origin or restart
Expo on port 8081.

**Expo shows stale code or configuration**

Stop Expo and restart it:

```bash
npx expo start --web --port 8081 --clear
```

**A request fails**

Check both the browser's Network panel and the API terminal.
The response body usually explains more than the HTTP status alone.

### Physical-phone testing

These instructions run the app in a browser on your computer.

On a phone, `127.0.0.1` points to the phone itself. Physical-device
testing needs a reachable API address and separate network setup.

Native camera and barcode-scanning behaviour must also be tested on
a device; browser testing does not confirm native functionality.