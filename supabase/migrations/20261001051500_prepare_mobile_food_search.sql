-- Additive mobile API migration. Keep the two earlier migrations unchanged.
-- PostgreSQL GREATEST(0, NULL) returns 0. Missing carbs must stay unknown.
-- Fibre is also required before converting total carbohydrate to available carbs.
-- Append source metadata so every logged food keeps its real source ID.

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
    case
      when max(n.amount_per_100g) filter (where n.nutrient_code = 'carb_by_difference') is not null
        and max(n.amount_per_100g) filter (where n.nutrient_code = 'fibre') is not null
      then greatest(
        0,
        max(n.amount_per_100g) filter (where n.nutrient_code = 'carb_by_difference')
          - max(n.amount_per_100g) filter (where n.nutrient_code = 'fibre')
      )
      else null
    end
  ) as carbs_available_g,
  case
    when max(n.amount_per_100g) filter (where n.nutrient_code = 'carb_available') is not null
      then 'reported_available'
    when max(n.amount_per_100g) filter (where n.nutrient_code = 'carb_by_difference') is not null
      and max(n.amount_per_100g) filter (where n.nutrient_code = 'fibre') is not null
      then 'by_difference_minus_fibre'
  end as carbs_basis,
  max(n.amount_per_100g) filter (where n.nutrient_code = 'fibre') as fibre_g,
  max(n.amount_per_100g) filter (where n.nutrient_code = 'sugars') as sugars_g,
  f.brand,
  f.barcode,
  f.source_food_id,
  s.name as source_name,
  s.version as source_version,
  s.licence as source_licence,
  s.attribution as source_attribution,
  s.url as source_url,
  coalesce(
    (select jsonb_agg(jsonb_build_object('label', p.label, 'grams', p.grams) order by p.label)
     from reference.food_portions p where p.food_id = f.id),
    '[]'::jsonb
  ) as portions
from reference.foods f
join reference.food_sources s on s.id = f.source_id
left join reference.food_nutrients n on n.food_id = f.id
where f.retired_at is null
group by f.id, s.id;

grant select on public.food_search to anon, authenticated;

create index if not exists foods_brand_trgm_idx
  on reference.foods using gin (brand extensions.gin_trgm_ops);
