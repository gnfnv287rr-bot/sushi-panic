-- V1.4.1 additive, owner-authorized taste settings. Existing data/recipes remain untouched.
begin;
alter table public.sushi_players add column if not exists taste_preferences jsonb;
alter table public.sushi_players add column if not exists taste_revision bigint not null default 0;
alter table public.sushi_players add column if not exists taste_updated_at timestamptz;
alter table public.sushi_players add column if not exists taste_mutation uuid;
create or replace function public.sushi_tastes(p_player uuid,p_preferences jsonb default null,p_revision bigint default null,p_mutation uuid default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare p sushi_players;
begin
 select * into p from sushi_players where id=p_player for update;
 if not found then raise exception 'unknown player';end if;
 if p_preferences is not null then
  if jsonb_typeof(p_preferences)<>'object' or jsonb_typeof(p_preferences->'favorites') is distinct from 'array' or jsonb_typeof(p_preferences->'dislikedFoods') is distinct from 'array' or jsonb_typeof(p_preferences->'dislikedTags') is distinct from 'array' or jsonb_typeof(p_preferences->'configured') is distinct from 'boolean' or p_preferences->>'version'<>'1' or p_mutation is null or p_revision is null then raise exception 'invalid tastes';end if;
  if jsonb_array_length(p_preferences->'favorites')>3 or jsonb_array_length(p_preferences->'dislikedFoods')>230 or jsonb_array_length(p_preferences->'dislikedTags')>14 then raise exception 'invalid tastes';end if;
  if exists(select 1 from jsonb_array_elements_text((p_preferences->'favorites')||(p_preferences->'dislikedFoods')) v where not exists(select 1 from sushi_catalog where id=v)) then raise exception 'unknown dish';end if;
  if exists(select 1 from jsonb_array_elements_text(p_preferences->'dislikedTags') v where v not in ('matcha','raw-fish','shellfish','beef','spicy','vegetable','foie','coffee','dessert','roe','egg','fried','mushroom','nuts')) then raise exception 'unknown taste tag';end if;
  if p.taste_mutation=p_mutation then return jsonb_build_object('preferences',p.taste_preferences,'revision',p.taste_revision,'updatedAt',p.taste_updated_at,'duplicate',true);end if;
  if p.taste_revision<>p_revision then return jsonb_build_object('preferences',p.taste_preferences,'revision',p.taste_revision,'updatedAt',p.taste_updated_at,'conflict',true);end if;
  update sushi_players set taste_preferences=p_preferences,taste_revision=taste_revision+1,taste_updated_at=sushi_now(),taste_mutation=p_mutation where id=p_player returning * into p;
 end if;
 return jsonb_build_object('preferences',p.taste_preferences,'revision',p.taste_revision,'updatedAt',p.taste_updated_at);
end $$;
revoke all on function public.sushi_tastes(uuid,jsonb,bigint,uuid) from public,anon,authenticated;
grant execute on function public.sushi_tastes(uuid,jsonb,bigint,uuid) to service_role;
create or replace function public.sushi_start_taste(p_player uuid,p_id uuid,p_seed bigint,p_theme text,p_edition text,p_ranked boolean default false,p_friend jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare r sushi_game_sessions;known jsonb;
begin
 if p_edition<>'2026-10-friends1' or not exists(select 1 from sushi_themes where id=p_theme) then raise exception 'invalid menu';end if;
 if p_friend is not null and (p_theme<>'friends-special' or not exists(select 1 from sushi_catalog where id=p_friend->>'foodId' and theme_id='friends-special')) then raise exception 'invalid friend';end if;
 select coalesce(jsonb_agg(sushi_id),'[]') into known from sushi_player_collection where player_id=p_player;
 insert into sushi_game_sessions(id,player_id,seed,started_at,rules_version,theme_id,menu_edition,known_foods,ranked,friend_profile) values(p_id,p_player,p_seed,sushi_now(),'1.4.1',p_theme,p_edition,known,p_ranked,p_friend) returning * into r;
 return jsonb_build_object('runId',r.id,'seed',r.seed,'startedAt',r.started_at,'rulesVersion',r.rules_version,'themeId',r.theme_id,'menuEdition',r.menu_edition,'knownFoods',known,'ranked',r.ranked,'friendProfile',r.friend_profile);
end $$;
create or replace function public.sushi_archive_casual(p_player uuid,p_id uuid,p_ticks integer,p_food_counts jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare s sushi_game_sessions; item record; old_count bigint; delta bigint; total_delta bigint:=0;
begin
 perform pg_advisory_xact_lock(17419,1);
 select * into s from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if not found or s.rules_version not in ('1.2.0','1.2.1','1.4.0','1.4.1') or s.status not in ('playing','submitted','verified') then raise exception 'invalid archive session';end if;
 if p_ticks<s.archive_ticks then return jsonb_build_object('stale',true);end if;
 if jsonb_typeof(p_food_counts)<>'object' then raise exception 'invalid archive';end if;
 if exists(select 1 from jsonb_each_text(s.archived_counts) x where coalesce((p_food_counts->>x.key)::bigint,0)<x.value::bigint) then raise exception 'archive cannot decrease';end if;
 for item in select key,value from jsonb_each_text(p_food_counts) loop
  if item.value!~'^[0-9]+$' or item.value::bigint<1 or item.value::bigint>25000 or not exists(select 1 from sushi_catalog where id=item.key and collectible) then raise exception 'invalid food count';end if;
  old_count:=coalesce((s.archived_counts->>item.key)::bigint,0);delta:=item.value::bigint-old_count;
  if delta<0 then raise exception 'archive cannot decrease';end if;
  if delta>0 then
   insert into sushi_player_collection(player_id,sushi_id,first_discovered_at,last_tasted_at,taste_count) values(p_player,item.key,sushi_now(),sushi_now(),delta)
   on conflict(player_id,sushi_id) do update set taste_count=sushi_player_collection.taste_count+excluded.taste_count,last_tasted_at=greatest(sushi_player_collection.last_tasted_at,excluded.last_tasted_at);
   total_delta:=total_delta+delta;
  end if;
 end loop;
 update sushi_players set total_sushi=total_sushi+total_delta where id=p_player;
 update sushi_game_sessions set archived_counts=p_food_counts,archive_ticks=p_ticks where id=p_id;
 return jsonb_build_object('saved',true,'added',total_delta);
end $$;
create or replace function public.sushi_complete(p_player uuid,p_id uuid,p_digest text,p_score bigint,p_ticks integer,p_sushi integer,p_food_counts jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare s sushi_game_sessions;p sushi_players;r jsonb;count_sum bigint;
begin
 perform pg_advisory_xact_lock(17419,1);
 select * into s from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if not found then raise exception 'invalid session';end if;
 if s.rules_version not in ('1.2.1','1.4.0','1.4.1') then return sushi_complete_before_catalog(p_player,p_id,p_digest,p_score,p_ticks,p_sushi,p_food_counts);end if;
 select coalesce(sum(value::bigint),0) into count_sum from jsonb_each_text(p_food_counts);
 if p_score<0 or p_ticks<0 or count_sum<>p_sushi then raise exception 'invalid result';end if;
 if s.ranked then
  r:=sushi_complete_v1(p_player,p_id,p_digest,p_score,p_ticks,p_sushi);
  if r->>'quarantined'='true' then return r;end if;
 else
  if s.digest is distinct from p_digest then raise exception 'invalid session';end if;
  if s.status='verified' then return s.receipt||jsonb_build_object('duplicate',true);end if;
  if s.status<>'submitted' or sushi_now()-s.ended_at>interval '10 minutes' then perform sushi_quarantine(p_player,p_id,'confirmation_expired');return jsonb_build_object('quarantined',true);end if;
  select * into p from sushi_players where id=p_player for update;
  update sushi_players set best_score=greatest(best_score,p_score),play_count=play_count+1,total_score=total_score+p_score,last_played_at=s.ended_at where id=p_player;
  r:=jsonb_build_object('runId',p_id,'playerId',p_player,'nickname',p.nickname,'score',p_score,'sushi',p_sushi,'duration',p_ticks/60.0,'startedAt',s.started_at,'endedAt',s.ended_at,'day',s.day,'todayBest',(select score from sushi_daily_scores where day=s.day and player_id=p_player),'allTimeBest',greatest(p.best_score,p_score),'rank',null,'rankQueriedAt',sushi_now(),'personalRecord',p_score>p.best_score,'dailyRecord',false,'enteredTop100',false,'champion',false,'ranked',false,'duplicate',false);
  update sushi_game_sessions set status='verified',score=p_score,ticks=p_ticks,sushi=p_sushi,receipt=r where id=p_id;
 end if;
 perform sushi_archive_casual(p_player,p_id,p_ticks,p_food_counts);
 update sushi_game_sessions set food_counts=p_food_counts,collections_applied_at=sushi_now() where id=p_id;
 return r;
end $$;
create or replace function public.sushi_claim(p_player uuid,p_id uuid,p_digest text) returns jsonb language plpgsql security definer set search_path=public as $$
declare r sushi_game_sessions; n timestamptz:=sushi_now();
begin
 perform pg_advisory_xact_lock(17419,1);
 select * into r from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if not found then return jsonb_build_object('error','not_found'); end if;
 if r.digest is not null and r.digest<>p_digest then return jsonb_build_object('error','payload_changed'); end if;
 if r.status='playing' then
  if r.rules_version not in ('1.2.0','1.2.1','1.4.0','1.4.1') and n-r.started_at>interval '7 days' then return jsonb_build_object('error','expired'); end if;
  update sushi_game_sessions set status='submitted',ended_at=n,day=sushi_day(n),digest=p_digest where id=p_id returning * into r;
 end if;
 return to_jsonb(r);
end $$;
revoke all on function public.sushi_start_taste(uuid,uuid,bigint,text,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.sushi_start_taste(uuid,uuid,bigint,text,text,boolean,jsonb) to service_role;
commit;
