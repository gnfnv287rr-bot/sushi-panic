// Local/test PostgreSQL engine. Never imported by the production Vercel handler.
import {PGlite} from '@electric-sql/pglite';
import {readFile,mkdir} from 'node:fs/promises';
import {createHmac,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
export async function localStore(path){
 const db=new PGlite(path||undefined);await db.waitReady;
 await db.exec(`create schema if not exists auth; create table if not exists auth.users(id uuid primary key,is_anonymous boolean default true);
 do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role;end if;end$$;
 create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create table if not exists public._sushi_migrations(name text primary key);`);
 const name='20261019093147_daily_leaderboard.sql';
 if(!(await db.query('select 1 from _sushi_migrations where name=$1 or name=$2',[name,'202610190001_daily_leaderboard.sql'])).rows.length){await db.transaction(async tx=>{await tx.exec(await readFile(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'));await tx.query('insert into _sushi_migrations values($1)',[name]);});}
 const rpc=async(name,args={})=>{
  if(!/^sushi_[a-z_]+$/.test(name))throw new Error('Invalid local RPC');
  const keys=Object.keys(args);if(keys.some(k=>!/^p_[a-z_]+$/.test(k)))throw new Error('Invalid local args');
  const sql=`select public.${name}(${keys.map((k,i)=>`${k} => $${i+1}`).join(',')}) as result`;
  return(await db.query(sql,Object.values(args))).rows[0].result;
 };
 return{db,rpc,async addUser(id){await db.query('insert into auth.users(id) values($1) on conflict do nothing',[id]);},close:()=>db.close()};
}
export function localAuth(store,secret=randomBytes(32).toString('hex')){
 const sign=id=>{const value=id+'.'+Math.floor(Date.now()/1000+365*86400);return value+'.'+createHmac('sha256',secret).update(value).digest('hex');};
 return{async resolve(request,{create=false}={}){
  const raw=(request.headers.get('cookie')||'').match(/(?:^|;\s*)sushi_dev=([^;]+)/)?.[1];let id;
  if(raw){const parts=raw.split('.'),value=parts.slice(0,2).join('.'),expected=createHmac('sha256',secret).update(value).digest('hex');if(parts.length===3&&/^[a-f0-9]{64}$/.test(parts[2])&&timingSafeEqual(Buffer.from(parts[2]),Buffer.from(expected))&&Number(parts[1])>Date.now()/1000)id=parts[0];}
  if(id&&/^[a-f0-9-]{36}$/.test(id))return{id,cookies:[]};
  if(!create)return{id:null,cookies:[]};id=randomUUID();await store.addUser(id);return{id,cookies:[`sushi_dev=${sign(id)}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=31536000`]};
 },mode:'local'};
}
