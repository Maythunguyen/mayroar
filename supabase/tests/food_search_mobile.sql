-- Run only against a disposable local/test database after all three migrations.
-- Synthetic fixtures are rolled back; they are not real food data.
begin;

insert into reference.food_sources (id, name, version, licence, attribution, url)
values ('__mobile_test', 'Synthetic source', 'test', 'Test only', 'Not a real food', 'https://example.invalid');

insert into reference.nutrients (code, name, unit, sort_order) values
  ('carb_available', 'Available carbohydrate', 'g', 1),
  ('carb_by_difference', 'Total carbohydrate', 'g', 2),
  ('fibre', 'Fibre', 'g', 3)
on conflict (code) do nothing;

insert into reference.foods (id, source_id, source_food_id, name, quality_tier) values
  ('__mobile_test:missing', '__mobile_test', 'missing', 'Missing carb fixture', 'reference'),
  ('__mobile_test:unknown_fibre', '__mobile_test', 'unknown_fibre', 'Unknown fibre fixture', 'reference'),
  ('__mobile_test:zero', '__mobile_test', 'zero', 'Reported zero fixture', 'label'),
  ('__mobile_test:converted', '__mobile_test', 'converted', 'Total minus fibre fixture', 'reference');

insert into reference.food_nutrients (food_id, nutrient_code, amount_per_100g) values
  ('__mobile_test:unknown_fibre', 'carb_by_difference', 30),
  ('__mobile_test:zero', 'carb_available', 0),
  ('__mobile_test:converted', 'carb_by_difference', 30),
  ('__mobile_test:converted', 'fibre', 5);

insert into reference.food_portions (food_id, label, grams)
values ('__mobile_test:converted', 'small bowl', 125);

do $$
begin
  assert (select carbs_available_g is null from public.food_search where id = '__mobile_test:missing'), 'Missing carbs became zero';
  assert (select carbs_basis is null from public.food_search where id = '__mobile_test:missing'), 'Missing carbs got a basis';
  assert (select carbs_available_g is null from public.food_search where id = '__mobile_test:unknown_fibre'), 'Missing fibre was assumed to be zero';
  assert (select carbs_available_g = 0 from public.food_search where id = '__mobile_test:zero'), 'A real zero was lost';
  assert (select carbs_available_g = 25 from public.food_search where id = '__mobile_test:converted'), 'Available-carb conversion is wrong';
  assert (select source_food_id = 'converted' and source_attribution = 'Not a real food' from public.food_search where id = '__mobile_test:converted'), 'Source identity is missing';
  assert (select portions = '[{"label":"small bowl","grams":125}]'::jsonb from public.food_search where id = '__mobile_test:converted'), 'Source portion weight is missing';
  assert (select portions = '[]'::jsonb from public.food_search where id = '__mobile_test:zero'), 'Missing portions should be an empty list';
end $$;

set local role anon;
select id, source_food_id, carbs_available_g from public.food_search where source_id = '__mobile_test' order by id;
rollback;
