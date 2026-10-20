-- ONLY staging: all clock changes, anonymous fixtures and scores roll back.
begin;
create or replace function public.sushi_now() returns timestamptz language sql volatile set search_path=pg_catalog as $$select current_setting('sushi.test_clock')::timestamptz$$;
select set_config('sushi.test_clock','2026-10-20T15:59:00Z',true);
do $$declare a uuid:=gen_random_uuid();r uuid:=gen_random_uuid();r2 uuid:=gen_random_uuid();result jsonb;p jsonb;
begin
 insert into auth.users(id) values(a);perform sushi_profile(a,'长休息测试');
 perform sushi_start_loop(a,r,12,'friends-special','2026-10-friends1',true,null);
 perform set_config('sushi.test_clock','2026-11-04T16:00:01Z',true);
 result:=sushi_claim(a,r,'long-sleep');if result ? 'error' then raise exception 'Long idle session expired';end if;
 result:=sushi_complete(a,r,'long-sleep',70,0,1,'{"friends_uu":1}');
 if result->>'day'<>'2026-11-05' then raise exception 'Wrong authoritative Beijing end date';end if;
 p:=sushi_profile(a);if (p->>'totalSushi')::int<>1 then raise exception 'Collection missing';end if;
 perform sushi_start_loop(a,r2,13,'friends-special','2026-10-friends1',false,null);
 perform set_config('sushi.test_clock','2026-11-05T16:00:01Z',true);
 perform sushi_claim(a,r2,'next-day');perform sushi_complete(a,r2,'next-day',50,0,1,'{"friends_nian":1}');
 p:=sushi_profile(a);if (p->>'bestScore')::int<>70 or (p->>'totalSushi')::int<>2 or jsonb_array_length(p->'collection')<>2 then raise exception 'Long-term archive changed after midnight';end if;
 if not exists(select 1 from sushi_daily_scores where player_id=a and day='2026-11-05' and score=70) then raise exception 'Previous daily score missing';end if;
end $$;
select 'passed: 15-day idle, authoritative midnight, permanent archive; all fixtures rolled back' as result;
rollback;
