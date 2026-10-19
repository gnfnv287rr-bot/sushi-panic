import {Game,STEP,VERSION} from '../src/core.js';
const MAX_TICKS=6*3600*60,MAX_ACTIONS=25000;
const ORDER='best_score DESC,best_sushi DESC,best_ticks DESC,best_at ASC,owner_key ASC';
const ORIGINS=new Set(['https://sushi-panic.rubyssss98.chatgpt.site','https://gnfnv287rr-bot.github.io']);
class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
export function normalizePlayerId(value){
  if(typeof value!=='string')throw new ApiError(400,'请输入玩家ID');
  const id=value.normalize('NFKC').trim();
  if(!/^[\p{L}\p{N}_-]{2,16}$/u.test(id))throw new ApiError(400,'ID需为2–16个中英文字母、数字、下划线或短横线');
  return id;
}
async function ownerOf(request){
  const key=request.headers.get('X-Player-Key')||'';
  if(!/^[a-f0-9]{64}$/.test(key))throw new ApiError(401,'玩家凭证无效，请重新入座');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
function originAllowed(origin){return !origin||origin==='null'||ORIGINS.has(origin)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);}
async function readBody(request){
  if(!request.headers.get('Content-Type')?.includes('application/json'))throw new ApiError(415,'请求格式应为JSON');
  if(Number(request.headers.get('Content-Length')||0)>1000000)throw new ApiError(413,'对局记录过大');
  const raw=await request.text();if(raw.length>1000000)throw new ApiError(413,'对局记录过大');
  try{return JSON.parse(raw);}catch{throw new ApiError(400,'无法读取对局记录');}
}
export function replayRun(seed,ticks,actions){
  if(!Number.isInteger(ticks)||ticks<0||ticks>MAX_TICKS||!Array.isArray(actions)||actions.length>MAX_ACTIONS)throw new ApiError(400,'对局时长或记录超出允许范围');
  let previous=-1;
  for(const a of actions){if(!Array.isArray(a)||a.length!==2||!Number.isInteger(a[0])||a[0]<previous||a[0]>ticks||!Number.isInteger(a[1])||a[1]<1)throw new ApiError(400,'对局操作记录无效');previous=a[0];}
  const game=new Game({seed});game.start();let action=0;const foodCounts={};
  for(let tick=0;tick<=ticks;tick++){
    while(action<actions.length&&actions[action][0]===tick){const event=game.eat(actions[action][1]);if(!event)throw new ApiError(400,'对局操作与游戏规则不一致');if(event.change>0)foodCounts[event.item.key]=(foodCounts[event.item.key]||0)+1;action++;}
    if(tick===ticks)break;
    if(game.phase!=='playing')throw new ApiError(400,'结束后的对局记录无效');
    game.step(STEP);
  }
  if(game.phase!=='gameover')throw new ApiError(409,'本局尚未正常结束');
  return {score:game.score,sushi:game.sushiEaten,ticks,character:game.character.id,foodCounts};
}
async function leaderboard(db,owner){
  const rows=await db.prepare(`SELECT player_id AS playerId,best_score AS score,best_sushi AS sushi,ROUND(best_ticks/60.0,1) AS seconds FROM players WHERE best_score>0 ORDER BY ${ORDER} LIMIT 50`).all();
  let me=null;
  if(owner)me=await db.prepare(`WITH ranked AS(SELECT owner_key,player_id AS playerId,best_score AS score,best_sushi AS sushi,ROUND(best_ticks/60.0,1) AS seconds,ROW_NUMBER() OVER(ORDER BY ${ORDER}) AS rank FROM players WHERE best_score>0) SELECT playerId,score,sushi,seconds,rank FROM ranked WHERE owner_key=?`).bind(owner).first();
  return {entries:rows.results.map((r,i)=>({...r,rank:i+1,title:i===0?'大胃王':'挑战者'})),me,ranking:'single_best_score',version:VERSION};
}
export async function handleApi(request,env){
  const origin=request.headers.get('Origin')||'';
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(originAllowed(origin)&&origin){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='Content-Type,X-Player-Key';headers['Access-Control-Allow-Methods']='GET,POST,OPTIONS';}
  const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  try{
    if(!originAllowed(origin))throw new ApiError(403,'此来源不可访问排行榜');
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(!env.DB)throw new ApiError(503,'排行榜服务暂未就绪');
    const url=new URL(request.url),now=env.clock?env.clock():Date.now();
    if(url.pathname==='/api/leaderboard'&&request.method==='GET'){
      const owner=request.headers.has('X-Player-Key')?await ownerOf(request):null;
      return json(await leaderboard(env.DB,owner));
    }
    if(url.pathname==='/api/runs'&&request.method==='POST'){
      const owner=await ownerOf(request),body=await readBody(request),id=normalizePlayerId(body.playerId),normalized=id.toLowerCase();
      const count=await env.DB.prepare('SELECT COUNT(*) AS total FROM runs WHERE owner_key=? AND created_at>?').bind(owner,now-60000).first();
      if(count.total>=8)throw new ApiError(429,'入座有点频繁，请稍等再试');
      const occupied=await env.DB.prepare('SELECT owner_key FROM players WHERE normalized_id=?').bind(normalized).first();
      if(occupied&&occupied.owner_key!==owner)throw new ApiError(409,'这个ID已被使用，请换一个或使用原浏览器');
      const seed=crypto.getRandomValues(new Uint32Array(1))[0],runId=crypto.randomUUID();
      try{await env.DB.batch([
        env.DB.prepare('INSERT INTO players(owner_key,player_id,normalized_id,created_at) VALUES(?,?,?,?) ON CONFLICT(owner_key) DO UPDATE SET player_id=excluded.player_id,normalized_id=excluded.normalized_id').bind(owner,id,normalized,now),
        env.DB.prepare('INSERT INTO runs(id,owner_key,seed,created_at) VALUES(?,?,?,?)').bind(runId,owner,seed,now),
      ]);}catch(error){if(/UNIQUE/i.test(error.message))throw new ApiError(409,'这个ID已被使用，请换一个');throw error;}
      return json({runId,seed,playerId:id,characterId:new Game({seed}).character.id,version:VERSION},201);
    }
    const match=url.pathname.match(/^\/api\/runs\/([a-f0-9-]{36})\/finish$/);
    if(match&&request.method==='POST'){
      const owner=await ownerOf(request),run=await env.DB.prepare('SELECT * FROM runs WHERE id=? AND owner_key=?').bind(match[1],owner).first();
      if(!run)throw new ApiError(404,'未找到本局记录');
      if(run.finished_at!==null)return json({result:{score:run.score,sushi:run.sushi,ticks:run.ticks},board:await leaderboard(env.DB,owner),duplicate:true});
      const body=await readBody(request);
      if(now-run.created_at>7*86400000)throw new ApiError(410,'本局记录已过期');
      if(body.ticks/60>(now-run.created_at)/1000+2)throw new ApiError(400,'对局计时校验未通过');
      const result=replayRun(run.seed,body.ticks,body.actions);
      await env.DB.batch([
        env.DB.prepare('UPDATE players SET best_score=?,best_sushi=?,best_ticks=?,best_at=? WHERE owner_key=? AND (best_score<? OR (best_score=? AND best_sushi<?) OR (best_score=? AND best_sushi=? AND best_ticks<?))').bind(result.score,result.sushi,result.ticks,now,owner,result.score,result.score,result.sushi,result.score,result.sushi,result.ticks),
        env.DB.prepare('UPDATE runs SET finished_at=?,score=?,sushi=?,ticks=? WHERE id=? AND finished_at IS NULL').bind(now,result.score,result.sushi,result.ticks,run.id),
      ]);
      return json({result,board:await leaderboard(env.DB,owner)});
    }
    throw new ApiError(404,'未找到该排行榜接口');
  }catch(error){return json({error:error.status?error.message:'排行榜暂时无法连接，请稍后重试'},error.status||503);}
}
