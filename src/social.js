import {PUBLIC_CONFIG} from './config.js';
import {sessionToken,authClient,emailAction} from './identity.js';
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function playerIdValue(value){const id=String(value??'').normalize('NFKC').trim();return /^[A-Za-z0-9\u3400-\u9fff]{2,12}$/u.test(id)?id:null;}
export class SocialClient{
 constructor(){
  this.local=['localhost','127.0.0.1'].includes(location.hostname);this.api=location.protocol==='file:'?null:this.local?location.origin:PUBLIC_CONFIG.supabaseUrl?PUBLIC_CONFIG.supabaseUrl+'/functions/v1/'+PUBLIC_CONFIG.edgeFunction:null;
  this.playerId='';this.profile=null;this.pending=[];this.mode='offline';this.lastBoard=null;this.inflight=new Map();
  try{this.playerId=playerIdValue(localStorage.getItem('sushi.nickname.v1'))||'';const p=JSON.parse(localStorage.getItem('sushi.pending.v1')||'[]');if(Array.isArray(p))this.pending=p.filter(p=>p&&typeof p.runId==='string'&&Array.isArray(p.body?.actions)).slice(-10);}catch{}
 }
 persist(){try{localStorage.setItem('sushi.nickname.v1',this.playerId);localStorage.setItem('sushi.pending.v1',JSON.stringify(this.pending));return true;}catch{return false;}}
 async request(path,body){
  if(!this.api)throw Object.assign(new Error('离线文件仅供练习，请打开在线游戏参与今日榜'),{code:'offline'});
  const token=this.local?null:await sessionToken();const authHeaders=token?{Authorization:'Bearer '+token}:{};if(!this.local)authHeaders.apikey=PUBLIC_CONFIG.publishableKey;
  const response=await fetch(this.api+path,{method:body!==undefined?'POST':'GET',headers:{...authHeaders,...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body!==undefined?JSON.stringify(body):undefined,credentials:this.local?'same-origin':'omit',signal:AbortSignal.timeout(8000)});
  let data;try{data=await response.json();}catch{throw new Error('联网服务暂不可用');}
  if(!response.ok||data.quarantined)throw Object.assign(new Error(data.error||'联网服务暂不可用'),{status:response.status,code:data.code});
  return data;
 }
 async initialize(){const data=await this.request('/api/identity');this.profile=data.profile;this.mode=data.mode;if(this.profile){this.playerId=this.profile.nickname;this.persist();}return data;}
 async rename(value){
  const nickname=playerIdValue(value);if(!nickname)throw Object.assign(new Error('昵称需为2–12个中文、英文字母或数字'),{status:400});
  if(!this.local)await sessionToken({create:true});const data=await this.request('/api/identity',{nickname});this.profile=data.profile;this.playerId=data.profile.nickname;this.mode=data.mode;this.persist();return data;
 }
 async start(id){
  const nickname=playerIdValue(id);if(!nickname)throw Object.assign(new Error('昵称需为2–12个中文、英文字母或数字'),{status:400});
  try{if(!this.profile||this.profile.nickname!==nickname)await this.rename(nickname);return await this.request('/api/runs',{});}
  catch(error){if([400,401,409,429].includes(error.status))throw error;this.playerId=nickname;this.persist();return{online:false};}
 }
 async reset(){if(!this.local){const c=await authClient();await c.auth.signOut({scope:'local'});}else await this.request('/api/identity/reset',{});this.profile=null;this.playerId='';this.persist();}
 async board(){const data=await this.request('/api/leaderboard');this.lastBoard=data;this.profile=data.profile||this.profile;return data;}
 submit(run,ticks,actions){
  if(this.inflight.has(run.runId))return this.inflight.get(run.runId);
  const promise=this.send(run,ticks,actions).finally(()=>this.inflight.delete(run.runId));this.inflight.set(run.runId,promise);return promise;
 }
 async send(run,ticks,actions){
  const entry={runId:run.runId,owner:this.profile?.id,body:{ticks,actions}};
  this.pending=this.pending.filter(p=>p.runId!==entry.runId).concat(entry).slice(-10);const saved=this.persist();
  try{const result=await this.request(`/api/runs/${entry.runId}/finish`,entry.body);this.pending=this.pending.filter(p=>p.runId!==entry.runId);this.persist();this.lastBoard=result.board;return result;}
  catch(error){if(error.status&&![429,503,504].includes(error.status)){this.pending=this.pending.filter(p=>p.runId!==entry.runId);this.persist();}error.saved=saved&&this.pending.some(p=>p.runId===entry.runId);throw error;}
 }
 async email(email,recover=false){if(this.local)throw new Error('本地联调环境不发送邮件，请使用公网版');return emailAction(email,recover);}
 async retry(){const outcomes=[];for(const entry of [...this.pending]){
  try{const result=await this.request(`/api/runs/${entry.runId}/finish`,entry.body);this.pending=this.pending.filter(p=>p.runId!==entry.runId);this.persist();outcomes.push(result);}
  catch(error){if(error.status&&![429,503,504].includes(error.status)){this.pending=this.pending.filter(p=>p.runId!==entry.runId);this.persist();outcomes.push({error:error.message,runId:entry.runId});}else throw error;}
 }return outcomes;}
}
