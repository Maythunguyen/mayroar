-- Additive migration: reference catalogue and previous SQLite data are untouched.
create table public.diary_entries (
  id bigint generated always as identity primary key check (id <= 9007199254740991),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  day date not null,
  meal text not null check (meal in ('Breakfast','Lunch','Dinner','Snacks')),
  grams double precision not null check (grams > 0 and grams <= 10000),
  food jsonb not null check (jsonb_typeof(food) = 'object'),
  created_at timestamptz not null default now(),
  unique(user_id, request_id)
);
create index diary_entries_user_day on public.diary_entries(user_id, day, id);
create table public.diary_custom_foods (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  food jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id,id)
);
create table public.diary_favourites (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  food jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id,id)
);
create table public.diary_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  targets jsonb not null
);

-- All API operations carry the user's JWT; no service-role bypass.
do $$
declare t text;
begin
  foreach t in array array['diary_entries','diary_custom_foods','diary_favourites','diary_targets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy own_data on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
grant usage, select on sequence public.diary_entries_id_seq to authenticated;

create function public.diary_toggle_favourite(p_food jsonb) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in required'; end if;
  if coalesce(p_food->>'id','') = '' then raise exception 'Food ID required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || (p_food->>'id'), 0));
  delete from public.diary_favourites where user_id=uid and id=p_food->>'id';
  if found then return false; end if;
  insert into public.diary_favourites(user_id,id,food) values(uid,p_food->>'id',p_food);
  return true;
end $$;

create function public.diary_clear_data() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  delete from public.diary_entries where user_id=auth.uid();
  delete from public.diary_custom_foods where user_id=auth.uid();
  delete from public.diary_favourites where user_id=auth.uid();
  delete from public.diary_targets where user_id=auth.uid();
end $$;

-- Private quota counters, not writable by clients. Failed provider attempts count.
create table public.diary_photo_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  attempts integer not null,
  last_attempt timestamptz not null,
  primary key(user_id,day)
);
alter table public.diary_photo_usage enable row level security;
revoke all on public.diary_photo_usage from anon, authenticated;
create function public.diary_claim_photo() returns boolean
language plpgsql security definer set search_path = '' as $$
declare claimed integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into public.diary_photo_usage(user_id,day,attempts,last_attempt)
  values(auth.uid(), (now() at time zone 'UTC')::date, 1, now())
  on conflict(user_id,day) do update
    set attempts=public.diary_photo_usage.attempts+1, last_attempt=now()
    where public.diary_photo_usage.attempts < 10
      and public.diary_photo_usage.last_attempt < now() - interval '1 minute'
  returning attempts into claimed;
  return claimed is not null;
end $$;
revoke all on function public.diary_toggle_favourite(jsonb), public.diary_clear_data(), public.diary_claim_photo() from public, anon;
grant execute on function public.diary_toggle_favourite(jsonb), public.diary_clear_data(), public.diary_claim_photo() to authenticated;
