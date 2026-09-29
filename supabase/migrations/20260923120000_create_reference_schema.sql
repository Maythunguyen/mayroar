-- Food reference data for MayRoar.
--
-- Tables live in their own "reference" schema, away from user data.
-- The app never reads these tables directly. It reads public.food_search,
-- which is the only part exposed through the Supabase API.

create extension if not exists pg_trgm with schema extensions;

create schema if not exists reference;

create table reference.food_sources (
  id text primary key,
  name text not null,
  version text not null,
  licence text not null,
  attribution text not null,
  url text not null,
  loaded_at timestamptz not null default now()
);

create table reference.nutrients (
  code text primary key,
  name text not null,
  unit text not null,
  infoods_tagname text,
  sort_order integer not null,
  constraint nutrients_unit_check check (unit in ('kcal', 'g', 'mg', 'ug'))
);

create table reference.foods (
  id text primary key,
  source_id text not null references reference.food_sources (id),
  source_food_id text not null,
  name text not null,
  description text,
  quality_tier text not null,
  derivation text,
  retired_at timestamptz,
  constraint foods_source_food_key unique (source_id, source_food_id),
  constraint foods_quality_tier_check check (quality_tier in ('reference', 'label', 'custom'))
);

create table reference.food_nutrients (
  food_id text not null references reference.foods (id) on delete cascade,
  nutrient_code text not null references reference.nutrients (code),
  amount_per_100g numeric not null,
  basis text,
  primary key (food_id, nutrient_code),
  constraint food_nutrients_amount_check check (amount_per_100g >= 0)
);

create table reference.food_portions (
  id bigint generated always as identity primary key,
  food_id text not null references reference.foods (id) on delete cascade,
  label text not null,
  grams numeric not null,
  constraint food_portions_food_label_key unique (food_id, label),
  constraint food_portions_grams_check check (grams > 0)
);

-- One row per load, so we can always answer: which code and which source
-- files produced the data users are seeing right now?
create table reference.pipeline_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  status text not null,
  git_commit text,
  source_files jsonb not null default '[]',
  food_count integer,
  issue_counts jsonb not null default '{}',
  error text,
  constraint pipeline_runs_status_check check (status in ('succeeded', 'failed'))
);

create index foods_name_trgm_idx on reference.foods using gin (name extensions.gin_trgm_ops);
create index foods_source_id_idx on reference.foods (source_id);
create index food_portions_food_id_idx on reference.food_portions (food_id);

-- Security. Anyone may read food data; nobody may change it through the API.
-- The pipeline connects as the database owner, which is allowed to write.
-- pipeline_runs is internal and gets no read access at all.
alter table reference.food_sources enable row level security;
alter table reference.nutrients enable row level security;
alter table reference.foods enable row level security;
alter table reference.food_nutrients enable row level security;
alter table reference.food_portions enable row level security;
alter table reference.pipeline_runs enable row level security;

grant usage on schema reference to anon, authenticated;
grant select on reference.food_sources, reference.nutrients, reference.foods,
  reference.food_nutrients, reference.food_portions to anon, authenticated;

create policy food_sources_read on reference.food_sources for select to anon, authenticated using (true);
create policy nutrients_read on reference.nutrients for select to anon, authenticated using (true);
create policy foods_read on reference.foods for select to anon, authenticated using (true);
create policy food_nutrients_read on reference.food_nutrients for select to anon, authenticated using (true);
create policy food_portions_read on reference.food_portions for select to anon, authenticated using (true);

-- The app's view of food data: one row per active food. Carbs are always
-- shown as available carbohydrate (without fibre). AFCD reports it directly;
-- for USDA it is "by difference" minus fibre. carbs_basis says which.
create view public.food_search
with (security_invoker = true) as
select
  f.id,
  f.source_id,
  f.name,
  f.quality_tier,
  f.derivation,
  max(n.amount_per_100g) filter (where n.nutrient_code = 'energy_kcal') as energy_kcal,
  max(n.basis) filter (where n.nutrient_code = 'energy_kcal') as energy_basis,
  max(n.amount_per_100g) filter (where n.nutrient_code = 'protein') as protein_g,
  max(n.amount_per_100g) filter (where n.nutrient_code = 'fat') as fat_g,
  coalesce(
    max(n.amount_per_100g) filter (where n.nutrient_code = 'carb_available'),
    greatest(
      0,
      max(n.amount_per_100g) filter (where n.nutrient_code = 'carb_by_difference')
        - coalesce(max(n.amount_per_100g) filter (where n.nutrient_code = 'fibre'), 0)
    )
  ) as carbs_available_g,
  case
    when max(n.amount_per_100g) filter (where n.nutrient_code = 'carb_available') is not null
      then 'reported_available'
    when max(n.amount_per_100g) filter (where n.nutrient_code = 'carb_by_difference') is not null
      then 'by_difference_minus_fibre'
  end as carbs_basis,
  max(n.amount_per_100g) filter (where n.nutrient_code = 'fibre') as fibre_g,
  max(n.amount_per_100g) filter (where n.nutrient_code = 'sugars') as sugars_g
from reference.foods f
left join reference.food_nutrients n on n.food_id = f.id
where f.retired_at is null
group by f.id;

grant select on public.food_search to anon, authenticated;
