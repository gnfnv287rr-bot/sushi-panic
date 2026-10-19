async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function ipDigest(secret,value){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
import {Game} from '../../src/core.js';
import {replayRun} from '../api.js';
import {HttpError,nicknameValue} from './common.js';
export function createApp({store,auth,ipSecret,mode='production',cronSecret,allowedOrigins=[]}){
 if(!ipSecret)throw new Error('Rate limit secret is required');
 return async function handle(request,{ip='local'}={}){
  const headers=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  let user=null;const rpc=store.rpc;
  const audit=async(event,id=null,details={})=>{await rpc('sushi_audit',{p_player:user,p_id:id,p_event:event,p_details:details});};
  try{
   const url=new URL(request.url),path=url.pathname;
   // Same-origin cookie API: no credentialed CORS, no client-supplied identity.
   const origin=request.headers.get('origin');
   if(origin&&(origin===url.origin||allowedOrigins.includes(origin))){headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info');headers.set('Access-Control-Allow-Methods','GET,POST,OPTIONS');}
   if(origin&&origin!==url.origin&&!allowedOrigins.includes(origin))throw new HttpError(403,'请从游戏页面发起请求','origin');
   if(!allowedOrigins.length&&request.headers.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'请求来源无效','origin');
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(path==='/api/health')return json({app:'SUSHI PANIC',version:'1.0.0-rc.1',mode,clock:await rpc('sushi_clock')});
   if(path==='/api/finalize'){
    if(!cronSecret||request.headers.get('authorization')!==`Bearer ${cronSecret}`)throw new HttpError(401,'此操作需要服务端授权');
    return json({finalized:await rpc('sushi_finalize')});
   }
   const scope=path==='/api/identity'?'identity':path.endsWith('/finish')?'finish':path==='/api/runs'?'start':'read';
   const ipHash=await ipDigest(ipSecret,ip);
   if(!await rpc('sushi_limit',{p_key:`ip:${scope}:${ipHash}`,p_limit:scope==='identity'?120:scope==='read'?180:60,p_seconds:60}))throw new HttpError(429,'操作有点频繁，请稍后再试','rate_limit');
   if(path==='/api/identity/reset'&&request.method==='POST'){
    for(const name of ['sushi_access','sushi_refresh','sushi_dev'])headers.append('Set-Cookie',name+'=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/api'+(mode==='production'?'; Secure':''));
    return json({reset:true});
   }
   const existing=await auth.resolve(request);user=existing.id;for(const c of existing.cookies)headers.append('Set-Cookie',c);
   let body;
   if(request.method!=='GET'){
    if(request.method!=='POST')throw new HttpError(405,'不支持此操作');
    if(!request.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'请求格式应为JSON');
    const raw=await request.text();if(new TextEncoder().encode(raw).byteLength>1000000)throw new HttpError(413,'对局记录过大');
    try{body=JSON.parse(raw);}catch{throw new HttpError(400,'请求内容无法读取');}
   }
   if(path==='/api/identity'&&request.method==='POST'){
    const nickname=nicknameValue(body?.nickname);
    if(!user){
     if(!await rpc('sushi_limit',{p_key:'signup:'+ipHash,p_limit:30,p_seconds:3600}))throw new HttpError(429,'本网络创建身份较多，请稍后再试');
     const created=await auth.resolve(request,{create:true,ip});user=created.id;for(const c of created.cookies)headers.append('Set-Cookie',c);
    }
    if(!await rpc('sushi_limit',{p_key:'rename:'+user,p_limit:10,p_seconds:60}))throw new HttpError(429,'修改昵称太频繁，请稍后再试');
    return json({profile:await rpc('sushi_profile',{p_player:user,p_nickname:nickname}),clock:await rpc('sushi_clock'),mode});
   }
   if(path==='/api/identity'&&request.method==='GET')return json({profile:user?await rpc('sushi_profile',{p_player:user}):null,clock:await rpc('sushi_clock'),mode});
   if(path==='/api/leaderboard'&&request.method==='GET')return json({...await rpc('sushi_board',{p_player:user}),mode});
   if(!user)throw new HttpError(401,'匿名身份已失效，请重新填写昵称；旧身份成绩可能无法恢复','identity_lost');
   if(!await rpc('sushi_limit',{p_key:`user:${scope}:${user}`,p_limit:scope==='start'?12:scope==='finish'?20:120,p_seconds:60})){await audit('rate_limited');throw new HttpError(429,'操作有点频繁，请稍后再试','rate_limit');}
   if(path==='/api/runs'&&request.method==='POST'){
    if(!await rpc('sushi_profile',{p_player:user}))throw new HttpError(409,'请先填写昵称');
    const run=await rpc('sushi_start',{p_player:user,p_id:crypto.randomUUID(),p_seed:crypto.getRandomValues(new Uint32Array(1))[0]});
    return json({...run,characterId:new Game({seed:run.seed}).character.id,mode},201);
   }
   const match=path.match(/^\/api\/runs\/([a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})\/finish$/);
   if(match&&request.method==='POST'){
    const id=match[1];const session=await rpc('sushi_session',{p_player:user,p_id:id});
    if(!session){await audit('session_ownership_rejected',id);throw new HttpError(404,'未找到属于你的这局记录');}
    const payloadDigest=await digest(JSON.stringify({ticks:body?.ticks,actions:body?.actions}));
    const claim=await rpc('sushi_claim',{p_player:user,p_id:id,p_digest:payloadDigest});
    if(claim.error){await audit(claim.error,id);throw new HttpError(claim.error==='expired'?410:409,claim.error==='payload_changed'?'本局已收到不同的结算记录':'本局记录已过期，请重新开局');}
    if(claim.status==='verified')return json({result:{...claim.receipt,duplicate:true},board:await rpc('sushi_board',{p_player:user})});
    if(claim.status==='quarantined')return json({quarantined:true,error:'本局成绩需要核查，暂不计入榜单',code:'quarantined'},202);
    let result;
    try{
     if(!Number.isSafeInteger(body.ticks)||body.ticks/60>(Date.parse(claim.ended_at)-Date.parse(claim.started_at))/1000+2)throw new Error('wall_time');
     result=replayRun(claim.seed,body.ticks,body.actions);
    }catch(error){
     await rpc('sushi_quarantine',{p_player:user,p_id:id,p_reason:error.message==='wall_time'?'wall_time':'invalid_replay'});
     return json({quarantined:true,error:'本局操作或计时未通过校验，暂不计入榜单',code:'quarantined'},202);
    }
    const receipt=await rpc('sushi_complete',{p_player:user,p_id:id,p_digest:payloadDigest,p_score:result.score,p_ticks:result.ticks,p_sushi:result.sushi});
    if(receipt.quarantined)return json({quarantined:true,error:'成绩确认已超时，本局暂不计入榜单',code:'quarantined'},202);
    return json({result:receipt,board:await rpc('sushi_board',{p_player:user})});
   }
   throw new HttpError(404,'未找到这个接口');
  }catch(error){
   if(error.status)return json({error:error.message,code:error.code},error.status);
   console.error(JSON.stringify({event:'api_failure',code:'dependency_unavailable'}));
   return json({error:'联网服务暂不可用，游戏仍可练习；成绩请稍后重试',code:'unavailable'},503);
  }
 };
}
