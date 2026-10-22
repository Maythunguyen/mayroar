alter table public.diary_targets
  add column revision bigint not null default 1
  check (revision > 0);


create function public.bump_diary_target_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
  else
    new.revision := old.revision + 1;
  end if;

  return new;
end;
$$;


create trigger diary_targets_revision
before insert or update on public.diary_targets
for each row
execute function public.bump_diary_target_revision();


create table public.target_calculations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id) on delete cascade,

  request_id uuid not null,

  inputs jsonb not null
    check (jsonb_typeof(inputs) = 'object'),

  goal jsonb not null
    check (jsonb_typeof(goal) = 'object'),

  plan jsonb
    check (plan is null or jsonb_typeof(plan) = 'object'),

  revision integer not null default 1
    check (revision > 0),

  base_target_revision bigint not null default 0
    check (base_target_revision >= 0),

  policy_version text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, request_id),
  unique (id, user_id)
);


create function public.revise_target_calculation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.request_id is distinct from old.request_id
     or new.inputs is distinct from old.inputs
     or new.policy_version is distinct from old.policy_version
  then
    raise exception
      'Create a new assessment when its inputs or policy change.';
  end if;

  new.revision := old.revision + 1;
  new.created_at := old.created_at;
  new.updated_at := now();

  return new;
end;
$$;


create trigger target_calculations_revision
before update on public.target_calculations
for each row
execute function public.revise_target_calculation();


create table public.target_calculation_history (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id) on delete cascade,

  calculation_id uuid not null,
  calculation_revision integer not null,

  request_id uuid not null,

  inputs jsonb not null,
  goal jsonb not null,
  targets jsonb not null,
  policy_version text not null,

  target_revision bigint not null,
  effective_at timestamptz not null default now(),

  foreign key (calculation_id, user_id)
    references public.target_calculations(id, user_id)
    on delete cascade,

  unique (user_id, request_id),
  unique (calculation_id, calculation_revision)
);


alter table public.target_calculations enable row level security;
alter table public.target_calculation_history enable row level security;

revoke all on public.target_calculations
  from anon, authenticated;

revoke all on public.target_calculation_history
  from anon, authenticated;

grant select, insert, update, delete
  on public.target_calculations to authenticated;

grant select, insert, delete
  on public.target_calculation_history to authenticated;


create policy own_target_calculations
on public.target_calculations
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


create policy own_target_calculation_history
on public.target_calculation_history
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


create function public.confirm_target_calculation(
  p_calculation_id uuid,
  p_expected_revision integer,
  p_request_id uuid,
  p_plan jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  calculation public.target_calculations%rowtype;
  history public.target_calculation_history%rowtype;

  next_target_revision bigint;
  target_values jsonb;

  nutrient text;
  amount numeric;
  maximum numeric;
begin
  if uid is null then
    raise exception 'Sign in required';
  end if;

  -- Serialize confirmations belonging to the same user.
  perform pg_advisory_xact_lock(
    hashtextextended(uid::text || ':target-confirmation', 0)
  );

  -- Replaying a successful request never reactivates old targets.
  select *
    into history
    from public.target_calculation_history
    where user_id = uid
      and request_id = p_request_id;

  if found then
    if history.calculation_id <> p_calculation_id
       or history.calculation_revision <> p_expected_revision
    then
      return jsonb_build_object(
        'status', 'conflict',
        'error', 'This request ID was used for a different confirmation.'
      );
    end if;

    return jsonb_build_object(
      'status', 'replayed',
      'history_id', history.id,
      'target_revision', history.target_revision,
      'targets', history.targets
    );
  end if;

  select *
    into calculation
    from public.target_calculations
    where id = p_calculation_id
      and user_id = uid
    for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Repeated confirmation with a different request ID is also safe.
  select *
    into history
    from public.target_calculation_history
    where user_id = uid
      and calculation_id = p_calculation_id
      and calculation_revision = p_expected_revision;

  if found then
    return jsonb_build_object(
      'status', 'replayed',
      'history_id', history.id,
      'target_revision', history.target_revision,
      'targets', history.targets
    );
  end if;

  if calculation.revision <> p_expected_revision then
    return jsonb_build_object(
      'status', 'conflict',
      'error', 'The preview changed. Reload and review it again.'
    );
  end if;

  if calculation.plan is null
     or calculation.goal->>'selected_goal' is null
     or p_plan is distinct from calculation.plan
  then
    return jsonb_build_object(
      'status', 'conflict',
      'error', 'Recalculate and review your targets before confirming.'
    );
  end if;

  target_values := p_plan->'targets';

  if jsonb_typeof(target_values) is distinct from 'object' then
    return jsonb_build_object(
      'status', 'invalid',
      'error', 'Invalid target values.'
    );
  end if;

  foreach nutrient in array array[
    'calories', 'protein', 'carbs', 'fat'
  ]
  loop
    if jsonb_typeof(target_values->nutrient)
       is distinct from 'number'
    then
      return jsonb_build_object(
        'status', 'invalid',
        'error', 'Targets must contain numeric values.'
      );
    end if;

    amount := (target_values->>nutrient)::numeric;

    maximum := case nutrient
      when 'calories' then 20000
      when 'carbs' then 3000
      else 2000
    end;

    if amount <= 0 or amount > maximum then
      return jsonb_build_object(
        'status', 'invalid',
        'error', 'A target value is outside its allowed range.'
      );
    end if;
  end loop;

  if abs(
    (target_values->>'calories')::numeric
    - (target_values->>'protein')::numeric * 4
    - (target_values->>'carbs')::numeric * 4
    - (target_values->>'fat')::numeric * 9
  ) > 1 then
    return jsonb_build_object(
      'status', 'invalid',
      'error', 'Calculated macros do not match the calorie target.'
    );
  end if;

  if calculation.base_target_revision = 0 then
    insert into public.diary_targets(user_id, targets)
      values (uid, target_values)
      on conflict (user_id) do nothing
      returning revision into next_target_revision;
  else
    update public.diary_targets
      set targets = target_values
      where user_id = uid
        and revision = calculation.base_target_revision
      returning revision into next_target_revision;
  end if;

  if next_target_revision is null then
    return jsonb_build_object(
      'status', 'conflict',
      'error',
      'Your active targets changed. Select your goal again to refresh the preview.'
    );
  end if;

  insert into public.target_calculation_history (
    user_id,
    calculation_id,
    calculation_revision,
    request_id,
    inputs,
    goal,
    targets,
    policy_version,
    target_revision
  )
  values (
    uid,
    calculation.id,
    calculation.revision,
    p_request_id,
    calculation.inputs,
    calculation.goal,
    target_values,
    calculation.policy_version,
    next_target_revision
  )
  returning * into history;

  return jsonb_build_object(
    'status', 'saved',
    'history_id', history.id,
    'target_revision', history.target_revision,
    'targets', history.targets
  );
end;
$$;


revoke all on function public.confirm_target_calculation(
  uuid, integer, uuid, jsonb
) from public, anon;

grant execute on function public.confirm_target_calculation(
  uuid, integer, uuid, jsonb
) to authenticated;


-- Include the new personal data in the existing deletion flow.
create or replace function public.diary_clear_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  delete from public.target_calculation_history
    where user_id = auth.uid();

  delete from public.target_calculations
    where user_id = auth.uid();

  delete from public.diary_entries
    where user_id = auth.uid();

  delete from public.diary_custom_foods
    where user_id = auth.uid();

  delete from public.diary_favourites
    where user_id = auth.uid();

  delete from public.diary_targets
    where user_id = auth.uid();
end;
$$;