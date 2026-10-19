-- Optional ranking preserves all historical rows; private buffet still archives verified progress.
alter table public.sushi_game_sessions add column ranked boolean not null default true;
create function public.sushi_start_private(p_player uuid,p_id uuid,p_seed bigint,p_theme text,p_edition text) returns jsonb language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
 r:=sushi_start_casual(p_player,p_id,p_seed,p_theme,p_edition);
 update sushi_game_sessions set ranked=false where id=p_id and player_id=p_player;
 return r||jsonb_build_object('ranked',false);
end $$;
alter function public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) rename to sushi_complete_ranked;
create function public.sushi_complete(p_player uuid,p_id uuid,p_digest text,p_score bigint,p_ticks integer,p_sushi integer,p_food_counts jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare s sushi_game_sessions;p sushi_players;r jsonb;count_sum bigint;
begin
 perform pg_advisory_xact_lock(17419,1);
 select * into s from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if s.ranked or s.rules_version<>'1.2.0' then return sushi_complete_ranked(p_player,p_id,p_digest,p_score,p_ticks,p_sushi,p_food_counts);end if;
 if not found or s.digest is distinct from p_digest then raise exception 'invalid session';end if;
 if s.status='verified' then return s.receipt||jsonb_build_object('duplicate',true);end if;
 if s.status<>'submitted' or sushi_now()-s.ended_at>interval '10 minutes' then perform sushi_quarantine(p_player,p_id,'confirmation_expired');return jsonb_build_object('quarantined',true);end if;
 select coalesce(sum(value::bigint),0) into count_sum from jsonb_each_text(p_food_counts);
 if p_score<0 or p_ticks<0 or count_sum<>p_sushi then raise exception 'invalid result';end if;
 select * into p from sushi_players where id=p_player for update;
 update sushi_players set best_score=greatest(best_score,p_score),play_count=play_count+1,total_score=total_score+p_score,last_played_at=s.ended_at where id=p_player;
 r:=jsonb_build_object('runId',p_id,'playerId',p_player,'nickname',p.nickname,'score',p_score,'sushi',p_sushi,'duration',p_ticks/60.0,'startedAt',s.started_at,'endedAt',s.ended_at,'day',s.day,'todayBest',(select score from sushi_daily_scores where day=s.day and player_id=p_player),'allTimeBest',greatest(p.best_score,p_score),'rank',null,'rankQueriedAt',sushi_now(),'personalRecord',p_score>p.best_score,'dailyRecord',false,'enteredTop100',false,'champion',false,'ranked',false,'duplicate',false);
 update sushi_game_sessions set status='verified',score=p_score,ticks=p_ticks,sushi=p_sushi,receipt=r where id=p_id;
 perform sushi_archive_casual(p_player,p_id,p_ticks,p_food_counts);
 update sushi_game_sessions set food_counts=p_food_counts,collections_applied_at=sushi_now() where id=p_id;
 return r;
end $$;
revoke all on function public.sushi_start_private(uuid,uuid,bigint,text,text),public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.sushi_start_private(uuid,uuid,bigint,text,text),public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) to service_role;
