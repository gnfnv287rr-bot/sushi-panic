-- P0 additive archive. Existing scores, UUIDs and championship snapshots remain intact.
alter table public.sushi_players add column total_sushi bigint not null default 0 check(total_sushi>=0);
alter table public.sushi_game_sessions add column food_counts jsonb;
alter table public.sushi_game_sessions add column collections_applied_at timestamptz;
update public.sushi_players p set total_sushi=coalesce((select sum(s.sushi) from public.sushi_game_sessions s where s.player_id=p.id and s.status='verified'),0);

create table public.sushi_themes (
 id text primary key, name text not null, description text not null default '', created_at timestamptz not null default clock_timestamp()
);
create table public.sushi_catalog (
 id text primary key, catalog_number integer not null unique, name text not null,
 theme_id text not null references public.sushi_themes(id), rarity text not null default 'common',
 description text not null, visual_key text not null, collectible boolean not null default true
);
create index sushi_catalog_theme on public.sushi_catalog(theme_id);
create table public.sushi_player_collection (
 player_id uuid not null references public.sushi_players(id), sushi_id text not null references public.sushi_catalog(id),
 first_discovered_at timestamptz not null, last_tasted_at timestamptz not null, taste_count bigint not null check(taste_count>0),
 primary key(player_id,sushi_id)
);
create index sushi_collection_food on public.sushi_player_collection(sushi_id);
alter table public.sushi_themes enable row level security;
alter table public.sushi_catalog enable row level security;
alter table public.sushi_player_collection enable row level security;
revoke all on public.sushi_themes,public.sushi_catalog,public.sushi_player_collection from public,anon,authenticated;
grant all on public.sushi_themes,public.sushi_catalog,public.sushi_player_collection to service_role;
grant select on public.sushi_player_collection to authenticated;
create policy sushi_own_collection on public.sushi_player_collection for select to authenticated using(player_id=(select auth.uid()));
insert into public.sushi_themes(id,name,description) values('classic','经典寿司放题','常驻经典菜单；长期收藏不会随每日排行榜清空。');
insert into public.sushi_catalog(id,catalog_number,name,theme_id,description,visual_key) values
 ('salmon',1,'三文鱼','classic','柔软鲜香，回转台上的经典一口。','salmon'),
 ('tuna',2,'金枪鱼','classic','红润的鱼片，清爽又满足。','tuna'),
 ('shrimp',3,'鲜虾','classic','小小虾尾，带着海的鲜甜。','shrimp'),
 ('tamago',4,'玉子烧','classic','金灿灿的玉子，温柔微甜。','tamago'),
 ('cucumber',5,'黄瓜卷','classic','咔嚓一口，胃里也清爽起来。','cucumber'),
 ('ikura',6,'鱼子军舰','classic','一颗颗橙色小珍珠。','ikura'),
 ('onigiri',7,'大饭团','classic','扎实的米香，记得慢慢吃。','onigiri');
-- Historical sessions have verified total sushi counts, but no per-food log.
-- Do not invent historical discoveries. New verified replays populate accurate collections.

alter function public.sushi_profile(uuid,text) rename to sushi_profile_v1;
create function public.sushi_profile(p_player uuid,p_nickname text default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
 result:=sushi_profile_v1(p_player,p_nickname);if result is null then return null;end if;
 return result||jsonb_build_object('createdAt',(select created_at from sushi_players where id=p_player),'totalSushi',(select total_sushi from sushi_players where id=p_player),
 'collection',coalesce((select jsonb_agg(jsonb_build_object('sushiId',c.sushi_id,'firstDiscoveredAt',c.first_discovered_at,'lastTastedAt',c.last_tasted_at,'tasteCount',c.taste_count) order by s.catalog_number) from sushi_player_collection c join sushi_catalog s on s.id=c.sushi_id where c.player_id=p_player),'[]'),
 'themeProgress',coalesce((select jsonb_agg(v order by v.id) from (select t.id,t.name,count(c.id) filter(where c.collectible) as total,count(pc.sushi_id) as unlocked from sushi_themes t left join sushi_catalog c on c.theme_id=t.id and c.collectible left join sushi_player_collection pc on pc.sushi_id=c.id and pc.player_id=p_player group by t.id,t.name) v),'[]'));
end $$;
alter function public.sushi_complete(uuid,uuid,text,bigint,integer,integer) rename to sushi_complete_v1;
create function public.sushi_complete(p_player uuid,p_id uuid,p_digest text,p_score bigint,p_ticks integer,p_sushi integer,p_food_counts jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare was_verified boolean; result jsonb; s sushi_game_sessions; item record; count_sum bigint:=0;
begin
 perform pg_advisory_xact_lock(17419,1);
 select status='verified' into was_verified from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if p_food_counts is not null then
  if jsonb_typeof(p_food_counts)<>'object' then raise exception 'invalid food counts';end if;
  for item in select key,value from jsonb_each_text(p_food_counts) loop
   if item.value!~'^[0-9]+$' or item.value::bigint<1 or item.value::bigint>25000 or not exists(select 1 from sushi_catalog where id=item.key and collectible) then raise exception 'invalid sushi archive';end if;
   count_sum:=count_sum+item.value::bigint;
  end loop;
  if count_sum<>p_sushi then raise exception 'sushi total mismatch';end if;
 end if;
 result:=sushi_complete_v1(p_player,p_id,p_digest,p_score,p_ticks,p_sushi);
 if result->>'quarantined'='true' then return result;end if;
 select * into s from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if not coalesce(was_verified,false) then update sushi_players set total_sushi=total_sushi+p_sushi where id=p_player;end if;
 if s.status='verified' and s.collections_applied_at is null and p_food_counts is not null then
  for item in select key,value from jsonb_each_text(p_food_counts) loop
   insert into sushi_player_collection(player_id,sushi_id,first_discovered_at,last_tasted_at,taste_count) values(p_player,item.key,s.ended_at,s.ended_at,item.value::bigint)
   on conflict(player_id,sushi_id) do update set taste_count=sushi_player_collection.taste_count+excluded.taste_count,last_tasted_at=greatest(sushi_player_collection.last_tasted_at,excluded.last_tasted_at),first_discovered_at=least(sushi_player_collection.first_discovered_at,excluded.first_discovered_at);
  end loop;
  update sushi_game_sessions set food_counts=p_food_counts,collections_applied_at=sushi_now() where id=p_id;
 end if;
 return result;
end $$;
revoke all on function public.sushi_profile(uuid,text),public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.sushi_profile(uuid,text),public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) to service_role;
