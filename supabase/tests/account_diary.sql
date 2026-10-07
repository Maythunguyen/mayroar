-- Run only on a local/test database after migrations. All fixtures roll back.
begin;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
insert into public.diary_entries(user_id,request_id,day,meal,grams,food)
 values(auth.uid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-10-07','Lunch',150,'{}');
select public.diary_toggle_favourite('{"id":"test-food"}');
do $$ begin
 if (select count(*) from public.diary_entries) <> 1 then raise exception 'Owner cannot read'; end if;
 if not public.diary_claim_photo() then raise exception 'First quota claim failed'; end if;
 if public.diary_claim_photo() then raise exception 'Throttle failed'; end if;
end $$;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
do $$ begin
 if (select count(*) from public.diary_entries) <> 0 then raise exception 'Cross-user read leak'; end if;
 if (select count(*) from public.diary_favourites) <> 0 then raise exception 'Cross-user favourite leak'; end if;
 update public.diary_entries set grams=999;
 if found then raise exception 'Cross-user update leak'; end if;
 begin
  insert into public.diary_targets(user_id,targets) values ('11111111-1111-4111-8111-111111111111','{}');
  raise exception 'Cross-user insert accepted';
 exception when insufficient_privilege then null;
 end;
end $$;
select public.diary_clear_data();
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$ begin
 if (select count(*) from public.diary_entries) <> 1 then raise exception 'Cross-user delete leak'; end if;
end $$;
select public.diary_clear_data();
do $$ begin
 if (select count(*) from public.diary_entries) <> 0 then raise exception 'Clear failed'; end if;
 if public.diary_claim_photo() then raise exception 'Clear reset quota'; end if;
end $$;
reset role;
-- Advance test counters to verify the daily upper bound separately from the minute throttle.
update public.diary_photo_usage set attempts=10,last_attempt=now()-interval '2 minutes';
set local role authenticated;
do $$ begin
 if public.diary_claim_photo() then raise exception 'Daily cap failed'; end if;
end $$;
rollback;
