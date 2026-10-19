import {localStore,localAuth} from '../../server/v1/local.mjs';
import {createApp} from '../../server/v1/app.js';
import {Game,STEP} from '../../src/core.js';
export async function fixture(t){
 const store=await localStore();t.after(()=>store.close());
 await store.db.exec("create table _test_clock(value timestamptz);insert into _test_clock values('2026-10-19T10:00:00Z');create or replace function public.sushi_now() returns timestamptz language sql volatile as $$select value from _test_clock$$;");
 const auth=localAuth(store,'test-only-not-production'),handler=createApp({store,auth,ipSecret:'test-only-not-production',mode:'local',cronSecret:'test-cron'});
 const actors=new Map();
 return{store,handler,async time(value){await store.db.query('update _test_clock set value=$1',[value]);},async advance(ms=60000){await store.db.query("update _test_clock set value=value+$1*interval '1 millisecond'",[ms]);},
 async request(path,{actor='a',body,origin='https://game.test',cookie,headers={},ip='test-ip'}={}){
  const r=await handler(new Request('https://game.test'+path,{method:body===undefined?'GET':'POST',headers:{...((cookie||actors.get(actor))?{cookie:cookie||actors.get(actor)}:{}),...(origin?{origin}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)}),{ip});
  for(const c of r.headers.getSetCookie())actors.set(actor,c.split(';')[0]);
  return{status:r.status,data:await r.json(),headers:r.headers};
 },actors};
}
export function completed(seed,bites=0){const g=new Game({seed});g.start();const actions=[];let ticks=0;for(let i=0;i<bites;i++){const f=g.foods.find(f=>f.key==='cucumber');if(f&&g.eat(f.id))actions.push([ticks,f.id]);for(let j=0;j<18&&g.phase==='playing';j++){g.step(STEP);ticks++;}}while(g.phase==='playing'){g.step(STEP);ticks++;}return{ticks,actions,expected:g.score};}
export async function register(f,actor='a',nickname='寿司食客'){return(await f.request('/api/identity',{actor,body:{nickname}})).data.profile;}
export async function run(f,actor='a',bites=0){const started=await f.request('/api/runs',{actor,body:{}});const done=completed(started.data.seed,bites);await f.advance();const response=await f.request(`/api/runs/${started.data.runId}/finish`,{actor,body:done});return{...response,started:started.data,done};}
