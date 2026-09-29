-- Packaged products from Open Food Facts have a barcode and a brand.
-- Whole foods from USDA and AFCD have neither, so both columns allow empty.

alter table reference.foods
  add column brand text,
  add column barcode text;

-- Finding a product by barcode must be instant when someone scans it.
create index foods_barcode_idx on reference.foods (barcode) where barcode is not null;

-- The view gains brand and barcode. "create or replace view" can only add
-- new columns at the end, so the existing columns stay exactly as before.
create or replace view public.food_search
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
  max(n.amount_per_100g) filter (where n.nutrient_code = 'sugars') as sugars_g,
  f.brand,
  f.barcode
from reference.foods f
left join reference.food_nutrients n on n.food_id = f.id
where f.retired_at is null
group by f.id;
