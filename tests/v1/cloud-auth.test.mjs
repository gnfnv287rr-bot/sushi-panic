import test from 'node:test';import assert from 'node:assert/strict';
import {cloudApp} from '../../server/v1/cloud.js';
const env={SUPABASE_URL:'https://test.supabase.co',SUSHI_SECRET_KEY:'sb_secret_FAKE_TEST_ONLY',RATE_LIMIT_SECRET:'FAKE_TEST_ONLY',ALLOWED_ORIGINS:'https://gnfnv287rr-bot.github.io'};
function makeStub(){const calls=[];const factory=()=>({rpc:async(name,args)=>{calls.push({name,args});if(name==='sushi_limit')return{data:true};if(name==='sushi_clock')return{data:{}};return{data:{id:args.p_player,nickname:args.p_nickname}};},auth:{async getUser(token){calls.push({getUser:token});return token==='valid'?{data:{user:{id:'verified-user'}}}:{data:{},error:{status:401}};}}});return{factory,calls};}
test('Edge adapter verifies bearer JWT with Supabase getUser, never a client player ID',async()=>{
 const stub=makeStub(),app=cloudApp(env,{makeClient:stub.factory});const r=await app(new Request('https://edge.test/api/identity',{method:'POST',headers:{Authorization:'Bearer valid',Origin:env.ALLOWED_ORIGINS,'Content-Type':'application/json'},body:JSON.stringify({nickname:'玩家昵称',playerId:'malicious-id'})}));const body=await r.json();assert.equal(body.profile.id,'verified-user');assert.ok(stub.calls.some(c=>c.getUser==='valid'));assert.ok(!JSON.stringify(body).includes(env.SUSHI_SECRET_KEY));
});
test('Edge public board is allowed but forged/missing bearer cannot create or modify a profile',async()=>{
 const stub=makeStub(),app=cloudApp(env,{makeClient:stub.factory});for(const headers of [{},{Authorization:'Bearer forged'}]){const r=await app(new Request('https://edge.test/api/identity',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{"nickname":"玩家昵称"}'}));assert.equal(r.status,401);}
});
test('Edge CORS allows the Pages origin, handles anonymous preflight and rejects arbitrary origin',async()=>{
 const app=cloudApp(env,{makeClient:makeStub().factory});const r=await app(new Request('https://edge.test/api/runs',{method:'OPTIONS',headers:{Origin:env.ALLOWED_ORIGINS}}));assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGINS);assert.match(r.headers.get('Access-Control-Allow-Headers'),/authorization/);assert.equal((await app(new Request('https://edge.test/api/identity',{headers:{Origin:'https://evil.test'}}))).status,403);
});
test('production refuses incomplete or public/legacy administrator key configuration',()=>{assert.throws(()=>cloudApp({}));assert.throws(()=>cloudApp({...env,SUSHI_SECRET_KEY:'sb_publishable_FAKE'}));});

test('expired bearer cannot hide the public ranking but still cannot write',async()=>{const stub=makeStub(),app=cloudApp(env,{makeClient:stub.factory});const r=await app(new Request('https://edge.test/api/leaderboard',{headers:{Authorization:'Bearer expired'}}));assert.equal(r.status,200);const writes=await app(new Request('https://edge.test/api/runs',{method:'POST',headers:{Authorization:'Bearer expired','content-type':'application/json'},body:'{}'}));assert.equal(writes.status,401);});

test('temporary Auth outage cannot block public rows or falsely confirm personal identity',async()=>{const stub=makeStub();const factory=(...args)=>{const db=stub.factory(...args);db.auth.getUser=async()=>({error:{status:503},data:{}});return db;};const app=cloudApp(env,{makeClient:factory});const r=await app(new Request('https://edge.test/api/leaderboard',{headers:{Authorization:'Bearer valid'}}));assert.equal(r.status,200);assert.equal((await r.json()).identityUnavailable,true);});
