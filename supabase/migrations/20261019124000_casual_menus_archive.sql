-- Additive V1.2 menus and idempotent live collection archive. Never reset older records.
alter table public.sushi_game_sessions add column theme_id text;
alter table public.sushi_game_sessions add column menu_edition text;
alter table public.sushi_game_sessions add column known_foods jsonb not null default '[]';
alter table public.sushi_game_sessions add column archived_counts jsonb not null default '{}';
alter table public.sushi_game_sessions add column archive_ticks integer not null default 0;
alter table public.sushi_themes add column config jsonb not null default '{}';
alter table public.sushi_catalog add column recipe jsonb not null default '{}';
insert into public.sushi_themes(id,name,description,config) values('classic','经典寿司放题','熟悉的味道，随时回来慢慢吃。','{"id":"classic","name":"经典寿司放题","description":"熟悉的味道，随时回来慢慢吃。","opensAt":null,"closesAt":null,"permanent":true,"color":"#527e6a","foods":["salmon","tuna","shrimp","tamago","cucumber","ikura","onigiri","lucky_tamago","tea"],"edition":"2026-10-v1"}'::jsonb) on conflict(id) do update set config=excluded.config;
insert into public.sushi_themes(id,name,description,config) values('autumn','第01期 · 秋日小食堂','五份暖心寿司，还有猫师傅的一点小惊喜。过期后仍可在往期菜单品尝。','{"id":"autumn","name":"第01期 · 秋日小食堂","description":"五份暖心寿司，还有猫师傅的一点小惊喜。过期后仍可在往期菜单品尝。","opensAt":"2026-10-18T16:00:00Z","closesAt":"2026-10-25T16:00:00Z","permanent":false,"color":"#b97d54","foods":["maple_salmon","harvest_tamago","garden_roll","moon_onigiri","pearl_ikura","cat_tamago","tea"],"edition":"2026-10-v1"}'::jsonb) on conflict(id) do update set config=excluded.config;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('salmon','1','三文鱼','classic','common','柔软鲜香，回转台上的经典一口。','salmon','{"name":"三文鱼","fullness":19,"points":100,"allergen":"fish","color":"#f78069","id":"salmon","number":1,"themeId":"classic","rarity":"common","visualKey":"salmon","description":"柔软鲜香，回转台上的经典一口。","collectible":true,"weight":6}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('tuna','2','金枪鱼','classic','common','红润鱼片，清爽又满足。','tuna','{"name":"金枪鱼","fullness":15,"points":120,"allergen":"fish","color":"#d95166","id":"tuna","number":2,"themeId":"classic","rarity":"common","visualKey":"tuna","description":"红润鱼片，清爽又满足。","collectible":true,"weight":6}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('shrimp','3','鲜虾','classic','common','翘起的小虾尾，藏着海的鲜甜。','shrimp','{"name":"鲜虾","fullness":16,"points":110,"allergen":"shellfish","color":"#f5a285","id":"shrimp","number":3,"themeId":"classic","rarity":"common","visualKey":"shrimp","description":"翘起的小虾尾，藏着海的鲜甜。","collectible":true,"weight":6}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('tamago','4','玉子烧','classic','common','金灿灿的玉子，温柔微甜。','tamago','{"name":"玉子烧","fullness":22,"points":90,"allergen":"egg","color":"#f8c94d","id":"tamago","number":4,"themeId":"classic","rarity":"common","visualKey":"tamago","description":"金灿灿的玉子，温柔微甜。","collectible":true,"weight":6}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('cucumber','5','黄瓜卷','classic','common','咔嚓一口，胃里也清爽起来。','cucumber','{"name":"黄瓜卷","fullness":12,"points":80,"allergen":null,"color":"#84ad72","id":"cucumber","number":5,"themeId":"classic","rarity":"common","visualKey":"cucumber","description":"咔嚓一口，胃里也清爽起来。","collectible":true,"weight":6}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('ikura','6','鱼子军舰','classic','common','一颗颗橙色小珍珠。','ikura','{"name":"鱼子军舰","fullness":14,"points":140,"allergen":"roe","color":"#f58c3a","id":"ikura","number":6,"themeId":"classic","rarity":"common","visualKey":"ikura","description":"一颗颗橙色小珍珠。","collectible":true,"weight":6}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('onigiri','7','大饭团','classic','common','扎实的米香，记得慢慢吃。','onigiri','{"name":"大饭团","fullness":30,"points":110,"allergen":null,"color":"#e9e1cf","id":"onigiri","number":7,"themeId":"classic","rarity":"common","visualKey":"onigiri","description":"扎实的米香，记得慢慢吃。","collectible":true,"weight":6}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('lucky_tamago','9','福气玉子','classic','hidden','厨师悄悄放上回转台的小福气。每份菜单都会再见，不用赶时间。','tamago','{"name":"福气玉子","fullness":22,"points":160,"allergen":"egg","color":"#f8c94d","id":"lucky_tamago","number":9,"themeId":"classic","rarity":"hidden","visualKey":"tamago","description":"厨师悄悄放上回转台的小福气。每份菜单都会再见，不用赶时间。","collectible":true,"weight":1,"accent":"#e5b74e"}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('maple_salmon','10','枫叶三文鱼','autumn','common','秋日的一片暖橙。','salmon','{"name":"枫叶三文鱼","fullness":19,"points":100,"allergen":"fish","color":"#f78069","id":"maple_salmon","number":10,"themeId":"autumn","rarity":"common","visualKey":"salmon","description":"秋日的一片暖橙。","collectible":true,"weight":6,"accent":"#ca835c"}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('harvest_tamago','11','丰收玉子','autumn','common','把金黄的秋天卷进一口玉子里。','tamago','{"name":"丰收玉子","fullness":22,"points":90,"allergen":"egg","color":"#f8c94d","id":"harvest_tamago","number":11,"themeId":"autumn","rarity":"common","visualKey":"tamago","description":"把金黄的秋天卷进一口玉子里。","collectible":true,"weight":6,"accent":"#ca835c"}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('garden_roll','12','小院黄瓜卷','autumn','common','午后的院子，清清爽爽。','cucumber','{"name":"小院黄瓜卷","fullness":12,"points":80,"allergen":null,"color":"#84ad72","id":"garden_roll","number":12,"themeId":"autumn","rarity":"common","visualKey":"cucumber","description":"午后的院子，清清爽爽。","collectible":true,"weight":6,"accent":"#ca835c"}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('moon_onigiri','13','月见饭团','autumn','common','圆圆的米香，陪你慢慢坐一会儿。','onigiri','{"name":"月见饭团","fullness":30,"points":110,"allergen":null,"color":"#e9e1cf","id":"moon_onigiri","number":13,"themeId":"autumn","rarity":"common","visualKey":"onigiri","description":"圆圆的米香，陪你慢慢坐一会儿。","collectible":true,"weight":6,"accent":"#ca835c"}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('pearl_ikura','14','琥珀鱼子','autumn','rare','像秋光一样透亮的小珍珠。','ikura','{"name":"琥珀鱼子","fullness":14,"points":140,"allergen":"roe","color":"#f58c3a","id":"pearl_ikura","number":14,"themeId":"autumn","rarity":"rare","visualKey":"ikura","description":"像秋光一样透亮的小珍珠。","collectible":true,"weight":3,"accent":"#ca835c"}') on conflict(id) do update set recipe=excluded.recipe;
insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values('cat_tamago','15','招财猫玉子','autumn','hidden','猫师傅留下的惊喜，今天遇见就很好。','tamago','{"name":"招财猫玉子","fullness":22,"points":140,"allergen":"egg","color":"#f8c94d","id":"cat_tamago","number":15,"themeId":"autumn","rarity":"hidden","visualKey":"tamago","description":"猫师傅留下的惊喜，今天遇见就很好。","collectible":true,"weight":1,"accent":"#b88c46"}') on conflict(id) do update set recipe=excluded.recipe;
create function public.sushi_start_casual(p_player uuid,p_id uuid,p_seed bigint,p_theme text,p_edition text) returns jsonb language plpgsql security definer set search_path=public as $$
declare r sushi_game_sessions; known jsonb;
begin
 if p_edition<>'2026-10-v1' or not exists(select 1 from sushi_themes where id=p_theme) then raise exception 'invalid menu';end if;
 select coalesce(jsonb_agg(sushi_id),'[]') into known from sushi_player_collection where player_id=p_player;
 insert into sushi_game_sessions(id,player_id,seed,started_at,rules_version,theme_id,menu_edition,known_foods) values(p_id,p_player,p_seed,sushi_now(),'1.2.0',p_theme,p_edition,known) returning * into r;
 return jsonb_build_object('runId',r.id,'seed',r.seed,'startedAt',r.started_at,'rulesVersion',r.rules_version,'themeId',r.theme_id,'menuEdition',r.menu_edition,'knownFoods',known);
end $$;
create function public.sushi_archive_casual(p_player uuid,p_id uuid,p_ticks integer,p_food_counts jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare s sushi_game_sessions; item record; old_count bigint; delta bigint; total_delta bigint:=0;
begin
 perform pg_advisory_xact_lock(17419,1);
 select * into s from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if not found or s.rules_version<>'1.2.0' or s.status not in ('playing','submitted','verified') then raise exception 'invalid archive session';end if;
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
alter function public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) rename to sushi_complete_archive;
create function public.sushi_complete(p_player uuid,p_id uuid,p_digest text,p_score bigint,p_ticks integer,p_sushi integer,p_food_counts jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare s sushi_game_sessions; result jsonb; count_sum bigint;
begin
 perform pg_advisory_xact_lock(17419,1);
 select * into s from sushi_game_sessions where id=p_id and player_id=p_player for update;
 if s.rules_version<>'1.2.0' then return sushi_complete_archive(p_player,p_id,p_digest,p_score,p_ticks,p_sushi,p_food_counts);end if;
 select coalesce(sum(value::bigint),0) into count_sum from jsonb_each_text(p_food_counts);
 if count_sum<>p_sushi then raise exception 'sushi total mismatch';end if;
 result:=sushi_complete_v1(p_player,p_id,p_digest,p_score,p_ticks,p_sushi);
 if result->>'quarantined'='true' then return result;end if;
 perform sushi_archive_casual(p_player,p_id,p_ticks,p_food_counts);
 update sushi_game_sessions set food_counts=p_food_counts,collections_applied_at=sushi_now() where id=p_id;
 return result;
end $$;
revoke all on function public.sushi_start_casual(uuid,uuid,bigint,text,text),public.sushi_archive_casual(uuid,uuid,integer,jsonb),public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.sushi_start_casual(uuid,uuid,bigint,text,text),public.sushi_archive_casual(uuid,uuid,integer,jsonb),public.sushi_complete(uuid,uuid,text,bigint,integer,integer,jsonb) to service_role;
