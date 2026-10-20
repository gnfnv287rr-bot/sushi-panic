import{readFile,writeFile}from'node:fs/promises';import{FRIEND_THEME,MENU_EDITION}from'../../src/menus-v14.js';import{FRIEND_FOODS}from'../../src/friends-special.js';
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
let sql='-- V1.4 additive content. No deletes, resets, or changes to existing catalog IDs.\nbegin;\nalter table public.sushi_game_sessions add column if not exists friend_profile jsonb;\n';
sql+=`insert into public.sushi_themes(id,name,description,config) values(${quote(FRIEND_THEME.id)},${quote(FRIEND_THEME.name)},${quote(FRIEND_THEME.description)},${quote(JSON.stringify(FRIEND_THEME))}::jsonb) on conflict(id) do nothing;\n`;
for(const f of Object.values(FRIEND_FOODS))sql+=`insert into public.sushi_catalog(id,catalog_number,name,theme_id,rarity,description,visual_key,recipe) values(${[f.id,f.number,f.name,f.themeId,f.rarity,f.description,f.visualKey,JSON.stringify(f)].map(quote).join(',') }::jsonb) on conflict(id) do nothing;\n`;
sql+=`create or replace function public.sushi_start_loop(p_player uuid,p_id uuid,p_seed bigint,p_theme text,p_edition text,p_ranked boolean default false,p_friend jsonb default null) returns jsonb language plpgsql security definer set search_path=public as $$
declare r sushi_game_sessions;known jsonb;
begin
 if p_edition<>${quote(MENU_EDITION)} or not exists(select 1 from sushi_themes where id=p_theme) then raise exception 'invalid menu';end if;
 if p_friend is not null and (p_theme<>'friends-special' or not exists(select 1 from sushi_catalog where id=p_friend->>'foodId' and theme_id='friends-special')) then raise exception 'invalid friend';end if;
 select coalesce(jsonb_agg(sushi_id),'[]') into known from sushi_player_collection where player_id=p_player;
 insert into sushi_game_sessions(id,player_id,seed,started_at,rules_version,theme_id,menu_edition,known_foods,ranked,friend_profile) values(p_id,p_player,p_seed,sushi_now(),'1.4.0',p_theme,p_edition,known,p_ranked,p_friend) returning * into r;
 return jsonb_build_object('runId',r.id,'seed',r.seed,'startedAt',r.started_at,'rulesVersion',r.rules_version,'themeId',r.theme_id,'menuEdition',r.menu_edition,'knownFoods',known,'ranked',r.ranked,'friendProfile',r.friend_profile);
end $$;\n`;
const old=await readFile('supabase/migrations/20261019131500_menu_catalog_216.sql','utf8');
const archive=old.slice(old.indexOf('create or replace function public.sushi_archive_casual'),old.indexOf('alter function public.sushi_complete'));
sql+=archive.replace("('1.2.0','1.2.1')","('1.2.0','1.2.1','1.4.0')");
const complete=old.slice(old.indexOf('create function public.sushi_complete('),old.indexOf('revoke all on function public.sushi_start_catalog'));
sql+=complete.replace('create function','create or replace function').replace("s.rules_version<>'1.2.1'", "s.rules_version not in ('1.2.1','1.4.0')");
const original=await readFile('supabase/migrations/20261019093147_daily_leaderboard.sql','utf8');
let claim=original.slice(original.indexOf('create function public.sushi_claim('),original.indexOf('create function public.sushi_audit('));
claim=claim.replace('create function','create or replace function').replace("n-r.started_at>interval '7 days'", "r.rules_version not in ('1.2.0','1.2.1','1.4.0') and n-r.started_at>interval '7 days'");sql+=claim;
sql+=`revoke all on function public.sushi_start_loop(uuid,uuid,bigint,text,text,boolean,jsonb) from public,anon,authenticated;\ngrant execute on function public.sushi_start_loop(uuid,uuid,bigint,text,text,boolean,jsonb) to service_role;\ncommit;\n`;
await writeFile('supabase/migrations/20261020080000_friends_safe_rest.sql',sql);
