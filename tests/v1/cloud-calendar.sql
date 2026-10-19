-- Execute ONLY on staging. All fixtures and clock replacement roll back.
begin;
create or replace function public.sushi_now() returns timestamptz language sql volatile set search_path=pg_catalog as $$select current_setting('sushi.test_clock')::timestamptz$$;
select set_config('sushi.test_clock','2026-10-22T15:59:00Z',true);
do $$declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); r2 uuid:=gen_random_uuid(); board jsonb; result jsonb; count1 bigint;
begin
 insert into auth.users(id) values(a),(b);
 perform sushi_profile(a,'日期测试甲'); perform sushi_profile(b,'日期测试乙');
 perform sushi_start(a,r,42);perform sushi_claim(a,r,'test-transaction');
 perform sushi_complete(a,r,'test-transaction',350,60,1,'{"cucumber":1}'::jsonb);
 board:=sushi_board(a); if board->>'day'<>'2026-10-22' or (board->'me'->>'score')::int<>350 then raise exception '23:59 ranking failed';end if;
 perform sushi_start(b,r2,43);
 perform set_config('sushi.test_clock','2026-10-22T16:00:00Z',true);
 perform sushi_claim(b,r2,'cross-day');result:=sushi_complete(b,r2,'cross-day',400,60,1);
 if result->>'day'<>'2026-10-23' then raise exception 'Cross-midnight attribution failed';end if;
 board:=sushi_board(a);if board->>'day'<>'2026-10-23' or board->'me'<>'null'::jsonb then raise exception 'Midnight reset failed';end if;
 if (board->'profile'->>'totalSushi')::int<>1 or jsonb_array_length(board->'profile'->'collection')<>1 then raise exception 'Permanent collection lost';end if;
 if (board->'profile'->>'bestScore')::int<>350 then raise exception 'Lifetime best lost';end if;
 perform sushi_finalize();select count(*) into count1 from sushi_daily_champions where day='2026-10-22' and player_id=a;
 if count1<>1 then raise exception 'Champion idempotency failed';end if;
 perform sushi_profile(a,'改名测试甲');
 if (select snapshot->0->>'nickname' from sushi_daily_champions where day='2026-10-22')<>'日期测试甲' then raise exception 'Historical nickname changed';end if;
 perform set_config('sushi.test_clock','2026-10-24T16:00:00Z',true);perform sushi_finalize();
 if not exists(select 1 from sushi_daily_champions where day='2026-10-24' and player_id is null and snapshot='[]') then raise exception 'Empty day handling failed';end if;
end $$;
select 'passed: live staging PostgreSQL 23:59/midnight/cross-day/history/champion/empty-day assertions; fixtures rolled back' as result;
rollback;
