-- V1 additive migration. No changes to old Sites/D1 data.
create table public.sushi_players (
 id uuid primary key references auth.users(id) on delete restrict,
 nickname text not null check (nickname ~ '^[A-Za-z0-9一-鿿㐀-䶿]{2,12}$'),
 created_at timestamptz not null default clock_timestamp(),
 best_score bigint not null default 0,
 play_count bigint not null default 0,
 total_score bigint not null default 0,
 last_played_at timestamptz
);
create table public.sushi_game_sessions (
 id uuid primary key,
 player_id uuid not null references public.sushi_players(id),
 seed bigint not null check(seed between 0 and 4294967295),
 rules_version text not null default '0.2.0',
 started_at timestamptz not null,
 ended_at timestamptz,
 day date,
 status text not null default 'playing' check(status in ('playing','submitted','verified','quarantined')),
 digest text,
 score bigint, ticks integer, sushi integer,
 reason text,
 receipt jsonb
);
create index sushi_sessions_owner on public.sushi_game_sessions(player_id,started_at desc);
create index sushi_sessions_pending on public.sushi_game_sessions(day,status) where status='submitted';
create table public.sushi_daily_scores (
 day date not null,
 player_id uuid not null references public.sushi_players(id),
 score bigint not null check(score>=0),
 achieved_at timestamptz not null,
 session_id uuid not null references public.sushi_game_sessions(id),
 nickname_at_score text not null,
 primary key(day,player_id)
);
create index sushi_daily_rank on public.sushi_daily_scores(day,score desc,achieved_at,player_id);
create table public.sushi_daily_champions (
 day date primary key,
 player_id uuid references public.sushi_players(id),
 nickname text,score bigint,
 snapshot jsonb not null default '[]',
 finalized_at timestamptz not null
);
create table public.sushi_security_events (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default clock_timestamp(),
 player_id uuid, session_id uuid, event text not null,
 details jsonb not null default '{}'
);
create index sushi_events_time on public.sushi_security_events(created_at);
create table public.sushi_rate_limits (
 key text primary key, window_start timestamptz not null, hits integer not null
);

alter table public.sushi_players enable row level security;
alter table public.sushi_game_sessions enable row level security;
alter table public.sushi_daily_scores enable row level security;
alter table public.sushi_daily_champions enable row level security;
alter table public.sushi_security_events enable row level security;
alter table public.sushi_rate_limits enable row level security;
revoke all on public.sushi_players,public.sushi_game_sessions,public.sushi_daily_scores,public.sushi_daily_champions,public.sushi_security_events,public.sushi_rate_limits from anon,authenticated;
grant select on public.sushi_players,public.sushi_game_sessions,public.sushi_daily_scores to authenticated;
create policy sushi_own_player on public.sushi_players for select to authenticated using(id=(select auth.uid()));
create policy sushi_own_sessions on public.sushi_game_sessions for select to authenticated using(player_id=(select auth.uid()));
create policy sushi_own_daily on public.sushi_daily_scores for select to authenticated using(player_id=(select auth.uid()));
-- No client INSERT/UPDATE/DELETE policies. Only verified server RPC can write scores.

create function public.sushi_now() returns timestamptz language sql volatile as $$ select clock_timestamp() $$;
create function public.sushi_day(p_time timestamptz) returns date language sql immutable as $$ select (p_time at time zone 'Asia/Shanghai')::date $$;
create function public.sushi_clock() returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object('serverTime',n,'day',sushi_day(n),'resetsAt',((sushi_day(n)+1)::timestamp at time zone 'Asia/Shanghai')) from (select sushi_now() n) t
$$;
create function public.sushi_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$
declare n timestamptz:=sushi_now(); c integer;
begin
 insert into sushi_rate_limits(key,window_start,hits) values(p_key,n,1)
 on conflict(key) do update set hits=case when sushi_rate_limits.window_start<=n-make_interval(secs=>p_seconds) then 1 else sushi_rate_limits.hits+1 end,
 window_start=case when sushi_rate_limits.window_start<=n-make_interval(secs=>p_seconds) then n else sushi_rate_limits.window_start end returning hits into c;
 return c<=p_limit;
end $$;
create function public.sushi_profile(p_player uuid,p_nickname text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare r sushi_players;
begin
 if p_nickname is not null then
  insert into sushi_players(id,nickname,created_at) values(p_player,p_nickname,sushi_now())
  on conflict(id) do update set nickname=excluded.nickname;
 end if;
 select * into r from sushi_players where id=p_player;
 if not found then return null; end if;
 return jsonb_build_object('id',r.id,'nickname',r.nickname,'bestScore',r.best_score,'playCount',r.play_count,'totalScore',r.total_score,'lastPlayedAt',r.last_played_at,
 'championships',(select count(*) from sushi_daily_champions where player_id=p_player),'dailyHistory',coalesce((select jsonb_agg(v order by v.day desc) from (select day,score,achieved_at from sushi_daily_scores where player_id=p_player order by day desc limit 31) v),'[]'));
end $$;
create function public.sushi_start(p_player uuid,p_id uuid,p_seed bigint) returns jsonb language plpgsql security definer set search_path=public as $$
declare r sushi_game_sessions;
begin
 insert into sushi_game_sessions(id,player_id,seed,started_at) values(p_id,p_player,p_seed,sushi_now()) returning * into r;
 return jsonb_build_object('runId',r.id,'seed',r.seed,'startedAt',r.started_at,'rulesVersion',r.rules_version);
end $$;
create function public.sushi_session(p_player uuid,p_id uuid) returns jsonb language sql security definer set search_path=public as $$
 select to_jsonb(s) from sushi_game_sessions s where id=p_id and player_id=p_player
$$;
create function public.sushi_claim(p_player uuid,p_id uuid,p_digest text) returns jsonb language plpgsql security definer set search_path=public as $$
declare r sushi_game_sessions; n timestamptz:=sushi_now();
begin
 perform pg_advisory_xact_lock(17419,1);
 select * into r from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if not found then return jsonb_build_object('error','not_found'); end if;
 if r.digest is not null and r.digest<>p_digest then return jsonb_build_object('error','payload_changed'); end if;
 if r.status='playing' then
  if n-r.started_at>interval '7 days' then return jsonb_build_object('error','expired'); end if;
  update sushi_game_sessions set status='submitted',ended_at=n,day=sushi_day(n),digest=p_digest where id=p_id returning * into r;
 end if;
 return to_jsonb(r);
end $$;
create function public.sushi_audit(p_player uuid,p_id uuid,p_event text,p_details jsonb) returns boolean language plpgsql security definer set search_path=public as $$
begin
 insert into sushi_security_events(player_id,session_id,event,details) values(p_player,p_id,left(p_event,64),p_details);
 return true;
end $$;
create function public.sushi_quarantine(p_player uuid,p_id uuid,p_reason text) returns boolean language plpgsql security definer set search_path=public as $$
begin
 update sushi_game_sessions set status='quarantined',reason=left(p_reason,200) where id=p_id and player_id=p_player and status in ('playing','submitted');
 if found then perform sushi_audit(p_player,p_id,'quarantined',jsonb_build_object('reason',left(p_reason,200))); end if;
 return true;
end $$;
create function public.sushi_finalize() returns integer language plpgsql security definer set search_path=public as $$
declare n timestamptz:=sushi_now(); d date; first_day date; snapshot jsonb; winner jsonb; total integer:=0;
begin
 perform pg_advisory_xact_lock(17419,1);
 -- A claimed finish may retry for ten minutes after its first server acknowledgement.
 -- Expired claims are isolated rather than mutating an already finalized day.
 update sushi_game_sessions set status='quarantined',reason='confirmation_expired'
 where status='submitted' and ended_at<n-interval '10 minutes';
 select min(sushi_day(started_at)) into first_day from sushi_game_sessions;
 if first_day is null then return 0; end if;
 for d in select x::date from generate_series(first_day::timestamp,(sushi_day(n)-1)::timestamp,interval '1 day') x
 where not exists(select 1 from sushi_daily_champions c where c.day=x::date) order by x limit 31 loop
  if exists(select 1 from sushi_game_sessions where day=d and status='submitted') then continue; end if;
  select coalesce(jsonb_agg(v order by v.rank),'[]') into snapshot from (
   select row_number() over(order by score desc,achieved_at,player_id) rank,player_id as "playerId",nickname_at_score as nickname,score,achieved_at as "achievedAt"
   from sushi_daily_scores where day=d
  ) v;
  winner:=snapshot->0;
  insert into sushi_daily_champions(day,player_id,nickname,score,snapshot,finalized_at)
  values(d,(winner->>'playerId')::uuid,winner->>'nickname',(winner->>'score')::bigint,snapshot,n) on conflict(day) do nothing;
  if found then total:=total+1; end if;
 end loop;
 -- Retain score history; only remove expired throttle buckets, never game results.
 delete from sushi_rate_limits where window_start<n-interval '2 days';
 return total;
end $$;
create function public.sushi_board(p_player uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare n timestamptz:=sushi_now(); rows jsonb; me jsonb;
begin
 perform sushi_finalize();
 with ranked as (
 select d.player_id as "playerId",p.nickname,d.score,d.achieved_at as "achievedAt",row_number() over(order by d.score desc,d.achieved_at,d.player_id) rank
 from sushi_daily_scores d join sushi_players p on p.id=d.player_id where d.day=sushi_day(n)
 ) select coalesce(jsonb_agg(v order by v.rank),'[]') into rows from (select * from ranked where rank<=100) v;
 with ranked as (
 select d.player_id as "playerId",p.nickname,d.score,row_number() over(order by d.score desc,d.achieved_at,d.player_id) rank
 from sushi_daily_scores d join sushi_players p on p.id=d.player_id where d.day=sushi_day(n)
 ) select to_jsonb(v) into me from ranked v where "playerId"=p_player;
 return jsonb_build_object('entries',rows,'me',me,'day',sushi_day(n),'serverTime',n,'resetsAt',((sushi_day(n)+1)::timestamp at time zone 'Asia/Shanghai'),'ranking','daily_best_score','profile',sushi_profile(p_player));
end $$;
create function public.sushi_complete(p_player uuid,p_id uuid,p_digest text,p_score bigint,p_ticks integer,p_sushi integer) returns jsonb language plpgsql security definer set search_path=public as $$
declare r sushi_game_sessions; p sushi_players; old_daily bigint; old_global bigint; personal boolean; daily boolean; first_top boolean; rnk bigint; res jsonb;
begin
 perform pg_advisory_xact_lock(17419,1);
 select * into r from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if not found or r.digest<>p_digest then raise exception 'invalid session'; end if;
 if r.status='verified' then return r.receipt||jsonb_build_object('duplicate',true); end if;
 if r.status<>'submitted' then return jsonb_build_object('quarantined',true,'reason',r.reason); end if;
 if sushi_now()-r.ended_at>interval '10 minutes' or exists(select 1 from sushi_daily_champions where day=r.day) then
  perform sushi_quarantine(p_player,p_id,'confirmation_expired'); return jsonb_build_object('quarantined',true);
 end if;
 if p_score<0 or p_ticks<0 or p_sushi<0 then raise exception 'invalid verified result'; end if;
 select * into p from sushi_players where id=p_player for update;
 select score into old_daily from sushi_daily_scores where day=r.day and player_id=p_player;
 select max(score) into old_global from sushi_daily_scores where day=r.day;
 personal:=p_score>p.best_score; daily:=old_daily is null or p_score>old_daily;
 first_top:=not exists(select 1 from (
  select player_id,row_number() over(order by score desc,achieved_at,player_id) rank from sushi_daily_scores where day=r.day
 ) x where player_id=p_player and rank<=100);
 update sushi_players set best_score=greatest(best_score,p_score),play_count=play_count+1,total_score=total_score+p_score,last_played_at=r.ended_at where id=p_player;
 insert into sushi_daily_scores(day,player_id,score,achieved_at,session_id,nickname_at_score)
 values(r.day,p_player,p_score,r.ended_at,p_id,p.nickname)
 on conflict(day,player_id) do update set score=excluded.score,achieved_at=excluded.achieved_at,session_id=excluded.session_id,nickname_at_score=excluded.nickname_at_score
 where excluded.score>sushi_daily_scores.score;
 select rank into rnk from (select player_id,row_number() over(order by score desc,achieved_at,player_id) rank from sushi_daily_scores where day=r.day) x where player_id=p_player;
 select score into old_daily from sushi_daily_scores where day=r.day and player_id=p_player;
 res:=jsonb_build_object('runId',p_id,'playerId',p_player,'nickname',p.nickname,'score',p_score,'sushi',p_sushi,'duration',p_ticks/60.0,'startedAt',r.started_at,'endedAt',r.ended_at,'day',r.day,
 'todayBest',old_daily,'allTimeBest',greatest(p.best_score,p_score),'rank',rnk,'rankQueriedAt',sushi_now(),'personalRecord',personal,'dailyRecord',daily,'globalRecord',old_global is null or p_score>old_global,'enteredTop100',first_top and rnk<=100,'champion',rnk=1,'duplicate',false);
 update sushi_game_sessions set status='verified',score=p_score,ticks=p_ticks,sushi=p_sushi,receipt=res where id=p_id;
 return res;
end $$;

-- PostgREST exposes function signatures. Parameters are trusted ONLY at the service boundary.
do $$ declare r record; begin
 for r in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'sushi_%' loop
  execute format('revoke all on function %s from public, anon, authenticated',r.signature);
  execute format('grant execute on function %s to service_role',r.signature);
 end loop;
end $$;
