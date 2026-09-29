# MayRoar commands. Run "make help" to see them all.
# Every command here is also what GitHub runs, so your laptop and CI match.

PIPELINE := pipelines/food_reference
RUN := cd $(PIPELINE) && uv run

.PHONY: help setup fix lint test test-db foods-fetch foods-lock foods-transform foods-load foods db-push

help: ## show this list
	@grep -E "^[a-z-]+:.*## " $(MAKEFILE_LIST) | awk -F ":.*## " '{printf "  make %-16s %s\n", $$1, $$2}'

setup: ## install everything the pipeline needs
	cd $(PIPELINE) && uv sync

fix: ## fix formatting and simple mistakes automatically
	$(RUN) ruff format .
	$(RUN) ruff check --fix .

lint: ## check formatting, style and types
	$(RUN) ruff format --check .
	$(RUN) ruff check .
	$(RUN) pyright

test: ## run the fast tests (no database needed)
	$(RUN) pytest -m "not integration and not contract"

test-db: ## run database tests (needs TEST_DATABASE_URL, a throwaway database)
	$(RUN) pytest -m "integration or contract"

foods-fetch: ## download the latest Open Food Facts products sold in Australia
	$(RUN) food-reference fetch open_food_facts

foods-lock: ## record fingerprints of new source files
	$(RUN) food-reference lock

foods-transform: ## clean the source files into data/clean
	$(RUN) food-reference transform

foods-load: ## write data/clean into the database in .env
	$(RUN) food-reference load

foods: foods-transform foods-load ## transform, then load

db-push: ## apply new migrations to the linked Supabase project
	supabase db push
