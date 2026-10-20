-- V1.4 additive content. No deletes, resets, or changes to existing catalog IDs.
begin;
alter table public.sushi_game_sessions add column if not exists friend_profile jsonb;
insert into public.sushi_themes(id,name,description,config) values('friends-special','UU和她的朋友们','七位朋友，七份心头好。每个人都能品尝、收藏，想念时随时回来。','{"id":"friends-special","name":"UU和她的朋友们","description":"七位朋友，七份心头好。每个人都能品尝、收藏，想念时随时回来。","permanent":true,"opensAt":null,"closesAt":null,"color":"#86bba1","foods":["friends_nian","friends_orange","friends_rabbit","friends_red","friends_uu","friends_mum","friends_fitness","tea"],"collectionFoods":["friends_nian","friends_orange","friends_rabbit","friends_red","friends_uu","friends_mum","friends_fitness"],"featured":["friends_nian","friends_orange","friends_rabbit","friends_red","friends_uu","friends_mum","friends_fitness"]}'::jsonb) on conflict(id) do nothing;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('friends_nian','224','年崽不吃的抹茶拿铁','friends-special','common','奶泡轻轻盖住浓抹茶，小杯子正偷偷做鬼脸。','friend-matcha-latte','{"id":"friends_nian","number":224,"name":"年崽不吃的抹茶拿铁","themeId":"friends-special","category":"好友专属","categoryId":"sweet","rarity":"common","visualKey":"friend-matcha-latte","fullness":10,"points":70,"allergen":null,"collectible":true,"topping":"","description":"奶泡轻轻盖住浓抹茶，小杯子正偷偷做鬼脸。","friendId":"nian","friendName":"年崽","plateId":"matcha-dot","origin":"game-original"}'::jsonb) on conflict(id) do nothing;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('friends_orange','225','橘子徒步来点士力架吧','friends-special','common','巧克力、焦糖和小花生，装进一份原创的山野能量包装。','friend-energy-bar','{"id":"friends_orange","number":225,"name":"橘子徒步来点士力架吧","themeId":"friends-special","category":"好友专属","categoryId":"sweet","rarity":"common","visualKey":"friend-energy-bar","fullness":20,"points":100,"allergen":null,"collectible":true,"topping":"","description":"巧克力、焦糖和小花生，装进一份原创的山野能量包装。","friendId":"orange","friendName":"橘子","plateId":"orange-hike","origin":"game-original"}'::jsonb) on conflict(id) do nothing;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('friends_rabbit','226','兔兔咪最爱的小肌鱼','friends-special','select','银白小鱼趴在圆饭团上，粉盘子也竖起了兔耳朵。','friend-kohada','{"id":"friends_rabbit","number":226,"name":"兔兔咪最爱的小肌鱼","themeId":"friends-special","category":"好友专属","categoryId":"special","rarity":"select","visualKey":"friend-kohada","fullness":16,"points":90,"allergen":"fish","collectible":true,"topping":"","description":"银白小鱼趴在圆饭团上，粉盘子也竖起了兔耳朵。","friendId":"rabbit","friendName":"兔兔咪","plateId":"pink-bunny","origin":"game-original"}'::jsonb) on conflict(id) do nothing;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('friends_red','227','红果果最爱的苦抹蛋糕','friends-special','select','深绿苦抹与细细蛋糕层，一小朵奶油刚好。','friend-matcha-cake','{"id":"friends_red","number":227,"name":"红果果最爱的苦抹蛋糕","themeId":"friends-special","category":"好友专属","categoryId":"sweet","rarity":"select","visualKey":"friend-matcha-cake","fullness":18,"points":70,"allergen":"egg","collectible":true,"topping":"","description":"深绿苦抹与细细蛋糕层，一小朵奶油刚好。","friendId":"red","friendName":"红果果","plateId":"green-berry","origin":"game-original"}'::jsonb) on conflict(id) do nothing;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('friends_uu','228','UU最爱的冰美式','friends-special','common','冰块碰到小吸管，工作日也有一口清清爽爽。','friend-iced-americano','{"id":"friends_uu","number":228,"name":"UU最爱的冰美式","themeId":"friends-special","category":"好友专属","categoryId":"special","rarity":"common","visualKey":"friend-iced-americano","fullness":8,"points":70,"allergen":null,"collectible":true,"topping":"","description":"冰块碰到小吸管，工作日也有一口清清爽爽。","friendId":"uu","friendName":"UU","plateId":"blue-star","origin":"game-original"}'::jsonb) on conflict(id) do nothing;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('friends_mum','229','UU妈咪最爱的鹅肝寿司','friends-special','treasure','香槟金盘子托住焦香鹅肝，精致但不用赶时间。','friend-foie','{"id":"friends_mum","number":229,"name":"UU妈咪最爱的鹅肝寿司","themeId":"friends-special","category":"好友专属","categoryId":"special","rarity":"treasure","visualKey":"friend-foie","fullness":24,"points":120,"allergen":null,"collectible":true,"topping":"seared","description":"香槟金盘子托住焦香鹅肝，精致但不用赶时间。","friendId":"mum","friendName":"UU妈咪","plateId":"gold-lace","origin":"game-original"}'::jsonb) on conflict(id) do nothing;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('friends_fitness','230','健身人士必吃的高蛋白炙烤牛肉','friends-special','common','厚切牛肉带着轻轻焦香，今天也好好吃饭。','friend-beef','{"id":"friends_fitness","number":230,"name":"健身人士必吃的高蛋白炙烤牛肉","themeId":"friends-special","category":"好友专属","categoryId":"special","rarity":"common","visualKey":"friend-beef","fullness":26,"points":120,"allergen":null,"collectible":true,"topping":"seared","description":"厚切牛肉带着轻轻焦香，今天也好好吃饭。","friendId":"fitness","friendName":"健身人士","plateId":"red-power","origin":"game-original"}'::jsonb) on conflict(id) do nothing;
create or replace function public.sushi_start_loop(p_player uuid,p_id uuid,p_seed bigint,p_theme text,p_edition text,p_ranked boolean default false,p_friend jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare r sushi_game_sessions;known jsonb;
begin
 if p_edition<>'2026-10-friends1' or not exists(select 1 from sushi_themes where id=p_theme) then raise exception 'invalid menu';end if;
 if p_friend is not null and (p_theme<>'friends-special' or not exists(select 1 from sushi_catalog where id=p_friend->>'foodId' and theme_id='friends-special')) then raise exception 'invalid friend';end if;
 select coalesce(jsonb_agg(sushi_id),'[]') into known from sushi_player_collection where player_id=p_player;
 insert into sushi_game_sessions(id,player_id,seed,started_at,rules_version,theme_id,menu_edition,known_foods,ranked,friend_profile) values(p_id,p_player,p_seed,sushi_now(),'1.4.0',p_theme,p_edition,known,p_ranked,p_friend) returning * into r;
 return jsonb_build_object('runId',r.id,'seed',r.seed,'startedAt',r.started_at,'rulesVersion',r.rules_version,'themeId',r.theme_id,'menuEdition',r.menu_edition,'knownFoods',known,'ranked',r.ranked,'friendProfile',r.friend_profile);
end $$;
create or replace function public.sushi_archive_casual(p_player uuid,p_id uuid,p_ticks integer,p_food_counts jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare s sushi_game_sessions; item record; old_count bigint; delta bigint; total_delta bigint:=0;
begin
 perform pg_advisory_xact_lock(17419,1);
 select * into s from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if not found or s.rules_version not in ('1.2.0','1.2.1','1.4.0') or s.status not in ('playing','submitted','verified') then raise exception 'invalid archive session';end if;
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
 if s.rules_version not in ('1.2.1','1.4.0') then return sushi_complete_before_catalog(p_player,p_id,p_digest,p_score,p_ticks,p_sushi,p_food_counts);end if;
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
  if r.rules_version not in ('1.2.0','1.2.1','1.4.0') and n-r.started_at>interval '7 days' then return jsonb_build_object('error','expired'); end if;
  update sushi_game_sessions set status='submitted',ended_at=n,day=sushi_day(n),digest=p_digest where id=p_id returning * into r;
 end if;
 return to_jsonb(r);
end $$;
revoke all on function public.sushi_start_loop(uuid,uuid,bigint,text,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.sushi_start_loop(uuid,uuid,bigint,text,text,boolean,jsonb) to service_role;
commit;
