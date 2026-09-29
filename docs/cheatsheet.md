# MayRoar command cheatsheet

Run every `make` command from the root `mayroar` folder (the one with the
Makefile). Run `conda deactivate` first if your prompt starts with `(base)`.

## Everyday coding

| Command | What it does | When |
|---|---|---|
| `make help` | Lists every make command | When you forget one |
| `make setup` | Installs everything the pipeline needs | First time, or after pulling new code |
| `make fix` | Tidies formatting and fixes simple mistakes automatically | Before every commit |
| `make lint` | Checks formatting, mistakes and types. Changes nothing | After `make fix` |
| `make test` | Runs the fast tests. No database needed | Before every commit |

Your routine before each commit: `make fix`, then `make lint`, then `make test`.

## Food data

| Command | What it does | When |
|---|---|---|
| `make foods-fetch` | Downloads the latest Open Food Facts products sold in Australia, and prints a summary | When you want fresh packaged product data. Then run `make foods-lock` |
| `make foods-lock` | Records fingerprints of the files in `data/raw` into `sources.lock.json` | After adding or updating source files. Then commit the lock file |
| `make foods-transform` | Cleans the source files into `data/clean`. Touches nothing online | To check results before loading |
| `make foods-load` | Writes `data/clean` into the database in `.env` | After checking the transform |
| `make foods` | Transform, then load, in one go | The normal way to build |

After a transform, look at `pipelines/food_reference/data/clean/validation_issues.csv`
for anything the pipeline dropped or flagged.

## Database tests

| Command | What it does |
|---|---|
| `make test-db` | Runs the database tests and the real AFCD checks |

Needs `TEST_DATABASE_URL` in `.env`, pointing at a throwaway local database.
Never point it at Supabase: these tests delete and recreate the food tables.

## Supabase

| Command | What it does | When |
|---|---|---|
| `supabase login` | Signs the tool in to your account | Once per computer |
| `supabase init` | Adds Supabase's config file to the repo | Once per repo |
| `supabase link --project-ref <ref>` | Connects this repo to your Supabase project | Once per computer |
| `supabase migration new <name>` | Creates an empty, timestamped migration file | Whenever the database design changes |
| `supabase migration list` | Shows which migrations are applied, locally and online | To check nothing is missing |
| `make db-push` | Applies new migrations to your linked project | After writing a migration |

Two rules: never edit a migration after it has been pushed (make a new one),
and never create tables by hand in the Supabase dashboard.

## Python packages (run inside `pipelines/food_reference`)

| Command | What it does |
|---|---|
| `uv add <package>` | Adds a package and updates `pyproject.toml` and `uv.lock` |
| `uv add --dev <package>` | Adds a tool only needed while coding, like a test helper |
| `uv remove <package>` | Removes a package from both files |
| `uv lock --upgrade` | Moves every package to its newest allowed version |
| `uv sync` | Makes your installed packages match `uv.lock` exactly |
| `uv run <command>` | Runs a command inside the project's environment |

Never use `pip install` in this project, or `uv.lock` will stop matching.

## What runs automatically

On every pull request and every push to `main` that touches the pipeline,
the database folder or the Makefile, GitHub runs `make lint` and `make test`.
A red cross means something failed: open the check on GitHub to see which.

Coming later: database tests on GitHub, automatic updates to staging, and a
monthly check for new food data releases.

## Common tasks, step by step

**I changed some pipeline code.**
`make fix`, `make lint`, `make test`, then commit and push.

**A food source published a new release.**
Put the new files in `data/raw/<source_id>/` (remove the old ones),
`make foods-lock`, `make foods-transform`, read `validation_issues.csv`,
then `make foods-load`. Commit the updated `sources.lock.json`.

**I need to change the database.**
`supabase migration new <what_it_does>`, write the SQL in the new file,
`make db-push`, then commit the file.

**I need a new Python package.**
`cd pipelines/food_reference`, `uv add <package>`, `cd ../..`, then commit
both `pyproject.toml` and `uv.lock`.

## When something goes wrong

| Message | Meaning and fix |
|---|---|
| `missing separator` | A Makefile line starts with spaces. It must start with a Tab |
| `is not in sources.lock.json yet` | New source files. Check they are right, then `make foods-lock` |
| `do not match sources.lock.json` | A source file changed. If you meant it, `make foods-lock`. If not, restore the original file |
| `DATABASE_URL is not set` | Copy `.env.example` to `.env` in the root folder and fill it in |
| `uv: command not found` | Open a new terminal window after installing uv |
| `Missing ... in data/clean` | Run `make foods-transform` before `make foods-load` |
