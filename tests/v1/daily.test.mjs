import test from 'node:test';import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,register,run,completed} from './helpers.mjs';
import {nicknameValue} from '../../server/v1/common.js';

test('nickname validation permits Chinese English numbers, duplicates; rejects empty markup profanity and length',()=>{
 assert.equal(nicknameValue(' ＡＢ寿司 '),'AB寿司');for(const v of ['',null,'A','a'.repeat(13),'<script>','两个_字','fuckyou','傻逼玩家'])assert.throws(()=>nicknameValue(v));
});
test('anonymous identity persists, same nickname is allowed, rename retains history and ID',async t=>{
 const f=await fixture(t),a=await register(f),b=await register(f,'b');assert.notEqual(a.id,b.id);assert.match(f.actors.get('a'),/^sushi_dev=/);const r=await run(f);assert.equal(r.status,200);
 assert.equal((await f.request('/api/identity')).data.profile.id,a.id);
 const rename=await f.request('/api/identity',{body:{nickname:'新的昵称'}});assert.equal(rename.data.profile.id,a.id);assert.equal(rename.data.profile.playCount,1);assert.equal(rename.data.profile.bestScore,r.data.result.score);
 const fresh=await f.request('/api/identity',{actor:'new'});assert.equal(fresh.data.profile,null);
});
test('server replays real run, ignores forged score and player ID, exactly-once counters on duplicate',async t=>{
 const f=await fixture(t),a=await register(f);const start=(await f.request('/api/runs',{body:{playerId:randomUUID()}})).data,done=completed(start.seed,1);await f.advance();
 const path=`/api/runs/${start.runId}/finish`,body={...done,score:999999999999,playerId:randomUUID(),endedAt:'2099-01-01'};
 const r=await f.request(path,{body});assert.equal(r.status,200);assert.equal(r.data.result.score,done.expected);assert.equal(r.data.result.playerId,a.id);assert.equal(r.data.board.me.rank,1);
 const repeat=await f.request(path,{body});assert.equal(repeat.data.result.duplicate,true);const p=(await f.request('/api/identity')).data.profile;assert.equal(p.playCount,1);assert.equal(p.totalScore,done.expected);
 assert.equal((await f.request(path,{body:{ticks:0,actions:[]}})).status,409);
});
test('multiple games keep daily and all-time maximum while valid totals count every run',async t=>{
 const f=await fixture(t);await register(f);const first=await run(f,'a',2),second=await run(f);const p=(await f.request('/api/identity')).data.profile;
 assert.equal(p.playCount,2);assert.equal(p.totalScore,first.data.result.score+second.data.result.score);assert.equal(p.bestScore,Math.max(first.data.result.score,second.data.result.score));assert.equal(second.data.result.todayBest,p.bestScore);
});
test('two authenticated players can see each other, own row and own out-of-top100 rank returned',async t=>{
 const f=await fixture(t);const a=await register(f),b=await register(f,'b','寿司乙');await run(f,'a',1);await run(f,'b',2);const board=(await f.request('/api/leaderboard')).data;
 assert.equal(board.entries.length,2);assert.equal(board.me.playerId,a.id);assert.ok(board.entries.some(x=>x.playerId===b.id));assert.ok(board.entries[0].score>=board.entries[1].score);
});
test('Beijing midnight separates dates; cross-midnight run uses first server end confirmation',async t=>{
 const f=await fixture(t);await register(f);await f.time('2026-10-19T15:59:00Z');const old=await run(f); // 00:00 next day due 60s advancement
 assert.equal(old.data.result.day,'2026-10-20');
 const firstDay=(await f.request('/api/leaderboard')).data;assert.equal(firstDay.day,'2026-10-20');assert.equal(firstDay.entries.length,1);
 await f.time('2026-10-20T16:00:00Z');const next=(await f.request('/api/leaderboard')).data;assert.equal(next.day,'2026-10-21');assert.equal(next.entries.length,0);assert.equal(next.me,null);assert.equal(next.profile.bestScore,old.data.result.score);assert.equal(next.profile.dailyHistory[0].day,'2026-10-20');
});
test('date and countdown are based on PostgreSQL authority, client date fields ignored',async t=>{
 const f=await fixture(t);await register(f);await f.time('2026-10-19T15:59:59Z');let b=(await f.request('/api/leaderboard')).data;assert.equal(b.day,'2026-10-19');assert.equal(Date.parse(b.resetsAt)-Date.parse(b.serverTime),1000);
 await f.time('2026-10-19T16:00:00Z');b=(await f.request('/api/leaderboard')).data;assert.equal(b.day,'2026-10-20');assert.equal(Date.parse(b.resetsAt)-Date.parse(b.serverTime),86400000);
});
test('tie ordering uses first achievement then stable UUID; lower score never changes achievement time',async t=>{
 const f=await fixture(t),a=await register(f),b=await register(f,'b');const add=async(id,score)=>{const r=await f.store.rpc('sushi_start',{p_player:id,p_id:randomUUID(),p_seed:1});await f.store.rpc('sushi_claim',{p_player:id,p_id:r.runId,p_digest:r.runId});return f.store.rpc('sushi_complete',{p_player:id,p_id:r.runId,p_digest:r.runId,p_score:score,p_ticks:1,p_sushi:0});};
 await add(b.id,100);await f.advance(1000);await add(a.id,100);let board=await f.store.rpc('sushi_board',{p_player:a.id});assert.equal(board.entries[0].playerId,b.id);
 await add(b.id,99);board=await f.store.rpc('sushi_board');assert.equal(board.entries[0].playerId,b.id);
 await f.store.db.query('update sushi_daily_scores set achieved_at=$1',['2026-10-19T10:00:00Z']);board=await f.store.rpc('sushi_board');assert.equal(board.entries[0].playerId,[a.id,b.id].sort()[0]);
});
test('TOP100 truncation still returns personal rank 101 and highlights by unique identity',async t=>{
 const f=await fixture(t),a=await register(f);
 await f.store.db.exec(`with u as (insert into auth.users(id) select gen_random_uuid() from generate_series(1,100) returning id) insert into sushi_players(id,nickname) select id,'同名食客' from u;
 insert into sushi_game_sessions(id,player_id,seed,started_at,ended_at,day,status,score) select gen_random_uuid(),id,1,sushi_now(),sushi_now(),sushi_day(sushi_now()),'verified',case when id='${a.id}' then 1 else 100 end from sushi_players;
 insert into sushi_daily_scores(day,player_id,score,achieved_at,session_id,nickname_at_score) select day,player_id,score,ended_at,id,'同名食客' from sushi_game_sessions;`);
 const b=(await f.request('/api/leaderboard')).data;assert.equal(b.entries.length,100);assert.equal(b.me.rank,101);assert.equal(b.me.score,1);assert.ok(!b.entries.some(x=>x.playerId===a.id));
});
test('champion archival is idempotent, includes empty days and immutable nickname/score snapshot',async t=>{
 const f=await fixture(t),a=await register(f,'a','原来昵称');const result=await run(f);await f.time('2026-10-21T16:00:01Z');await f.request('/api/leaderboard');await f.request('/api/leaderboard');
 const archived=(await f.store.db.query('select * from sushi_daily_champions order by day')).rows;assert.equal(archived.length,3);assert.equal(archived[0].player_id,a.id);assert.equal(archived[1].player_id,null);assert.deepEqual(archived[1].snapshot,[]);
 await f.request('/api/identity',{body:{nickname:'改名之后'}});const p=(await f.request('/api/identity')).data.profile;assert.equal(p.championships,1);const snapshot=(await f.store.db.query('select snapshot from sushi_daily_champions order by day limit 1')).rows[0].snapshot;assert.equal(snapshot[0].nickname,'原来昵称');assert.equal(snapshot[0].score,result.data.result.score);
});
test('pending pre-midnight claim defers archive; retry preserves acknowledged date',async t=>{
 const f=await fixture(t),a=await register(f);await f.time('2026-10-19T15:59:00Z');const start=(await f.request('/api/runs',{body:{}})).data,done=completed(start.seed);await f.time('2026-10-19T15:59:59Z');
 let fail=true;const old=f.store.rpc;f.store.rpc=async(name,args)=>{if(name==='sushi_complete'&&fail){fail=false;throw new Error('simulated write outage');}return old(name,args);};
 // createApp captures the method, so inject at its own store boundary instead.
 const {createApp}=await import('../../server/v1/app.js');const {localAuth}=await import('../../server/v1/local.mjs');const app=createApp({store:f.store,auth:localAuth(f.store,'test-only-not-production'),ipSecret:'test-only-not-production',mode:'local'});
 const send=()=>app(new Request(`https://game.test/api/runs/${start.runId}/finish`,{method:'POST',headers:{cookie:f.actors.get('a'),'content-type':'application/json'},body:JSON.stringify(done)}));
 assert.equal((await send()).status,503);await f.time('2026-10-19T16:00:01Z');await f.store.rpc('sushi_board');assert.equal((await f.store.db.query("select count(*) c from sushi_daily_champions where day='2026-10-19'")).rows[0].c,0);
 const r=await(await send()).json();assert.equal(r.result.day,'2026-10-19');await f.store.rpc('sushi_finalize');assert.equal((await f.store.db.query("select player_id from sushi_daily_champions where day='2026-10-19'")).rows[0].player_id,a.id);
});
test('expired processing claim is isolated before immutable historical champion finalization',async t=>{
 const f=await fixture(t),a=await register(f);const started=(await f.request('/api/runs',{body:{}})).data;await f.store.rpc('sushi_claim',{p_player:a.id,p_id:started.runId,p_digest:'x'});await f.time('2026-10-20T10:00:00Z');await f.store.rpc('sushi_finalize');const r=await f.store.rpc('sushi_complete',{p_player:a.id,p_id:started.runId,p_digest:'x',p_score:999,p_ticks:10,p_sushi:0});assert.equal(r.quarantined,true);
});
test('invalid score log or accelerated wall time quarantines, never enters rank and records audit',async t=>{
 const f=await fixture(t);await register(f);const start=(await f.request('/api/runs',{body:{}})).data,done=completed(start.seed);
 const r=await f.request(`/api/runs/${start.runId}/finish`,{body:done});assert.equal(r.status,202);assert.equal(r.data.quarantined,true);assert.equal((await f.request('/api/leaderboard')).data.entries.length,0);assert.equal((await f.request('/api/identity')).data.profile.playCount,0);assert.equal((await f.store.db.query('select count(*) c from sushi_security_events')).rows[0].c,1);
});
test('incomplete games and impossible food events are isolated, not accepted as final scores',async t=>{
 const f=await fixture(t);await register(f);for(const body of [{ticks:0,actions:[]},{ticks:100,actions:[[0,999999]]}]){const start=(await f.request('/api/runs',{body:{}})).data;await f.advance();assert.equal((await f.request(`/api/runs/${start.runId}/finish`,{body})).status,202);}
 assert.equal((await f.request('/api/identity')).data.profile.playCount,0);
});
test('ownership, forged cookies, cross-origin and rate limits reject malicious requests',async t=>{
 const f=await fixture(t);await register(f);await register(f,'b');const start=(await f.request('/api/runs',{body:{}})).data;assert.equal((await f.request(`/api/runs/${start.runId}/finish`,{actor:'b',body:{ticks:1,actions:[]}})).status,404);
 assert.equal((await f.request('/api/runs',{actor:'forged',cookie:'sushi_dev=forged',body:{playerId:randomUUID()}})).status,401);assert.equal((await f.request('/api/runs',{body:{},origin:'https://evil.test'})).status,403);
 for(let i=0;i<11;i++)assert.equal((await f.request('/api/runs',{body:{}})).status,201);assert.equal((await f.request('/api/runs',{body:{}})).status,429);
});
test('PostgreSQL RLS denies score writes and service RPC to anonymous/authenticated roles; own reads only',async t=>{
 const f=await fixture(t),a=await register(f),b=await register(f,'b');await f.store.db.query("select set_config('request.jwt.claim.sub',$1,false)",[a.id]);await f.store.db.exec('set role authenticated');
 const own=(await f.store.db.query('select id from sushi_players')).rows;assert.deepEqual(own.map(x=>x.id),[a.id]);assert.ok(!own.some(x=>x.id===b.id));
 await assert.rejects(f.store.db.query("update sushi_players set best_score=99999"),/permission denied/);await assert.rejects(f.store.db.query("select sushi_board(null)"),/permission denied/);await assert.rejects(f.store.db.query("insert into sushi_daily_scores(day,player_id,score,achieved_at,session_id,nickname_at_score) values(current_date,$1,999,now(),$2,'违规')",[a.id,randomUUID()]),/permission denied/);
 await f.store.db.exec('reset role; set role anon');await assert.rejects(f.store.db.query('select * from sushi_players'),/permission denied/);await assert.rejects(f.store.db.query('select sushi_complete(null,null,null,99999,0,0)'),/permission denied/);await f.store.db.exec('reset role');
});
test('multiple concurrent finish requests count once; independent windows may run separate sessions',async t=>{
 const f=await fixture(t);await register(f);const a=(await f.request('/api/runs',{body:{}})).data,b=(await f.request('/api/runs',{body:{}})).data;assert.notEqual(a.runId,b.runId);const done=completed(a.seed);await f.advance();const results=await Promise.all([f.request(`/api/runs/${a.runId}/finish`,{body:done}),f.request(`/api/runs/${a.runId}/finish`,{body:done})]);assert.ok(results.every(x=>x.status===200));assert.equal((await f.request('/api/identity')).data.profile.playCount,1);
});
