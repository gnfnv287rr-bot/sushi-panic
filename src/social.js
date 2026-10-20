import {PUBLIC_CONFIG} from './config.js';
import {sessionToken,currentIdentity,authClient,emailAction,verifyEmailAction} from './identity.js';
import {RunJournal,retryableStatus,deadline} from './storage.js';
export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function playerIdValue(value){const id=String(value??'').normalize('NFKC').trim();return /^[A-Za-z0-9\u3400-\u9fff]{2,12}$/u.test(id)?id:null;}
export class SocialClient{
 constructor(){
  this.local=['localhost','127.0.0.1'].includes(location.hostname);this.api=location.protocol==='file:'?null:this.local?location.origin:PUBLIC_CONFIG.supabaseUrl?PUBLIC_CONFIG.supabaseUrl+'/functions/v1/'+PUBLIC_CONFIG.edgeFunction:null;
  this.emailAvailable=PUBLIC_CONFIG.emailEnabled===true;this.playerId='';this.profile=null;this.profileRevision=0;this.mode='offline';this.lastBoard=null;this.inflight=new Map();this.journal=new RunJournal();this.syncing=null;this.lastError='';this.archiveBusy=0;this.archiveError='';this.archiveReadError='';this.archiveReadBusy=0;this.onState=()=>{};
  try{this.playerId=playerIdValue(localStorage.getItem('sushi.nickname.v1'))||'';const old=JSON.parse(localStorage.getItem('sushi.pending.v1')||'[]');if(Array.isArray(old))for(const e of old){if(e&&typeof e.runId==='string'&&Array.isArray(e.body?.actions)&&!this.journal.list().some(x=>x.runId===e.runId))this.journal.write({...e,kind:'pending'});}}catch{}
 }
 get pending(){return this.journal.list('pending');}
 persist(){try{localStorage.setItem('sushi.nickname.v1',this.playerId);localStorage.setItem('sushi.pending.v1',JSON.stringify(this.pending));return true;}catch{return false;}}
 changed(){this.onState();}
 async request(path,body){
  if(!this.api)throw Object.assign(new Error('离线文件仅供练习，请打开在线游戏参与今日榜'),{code:'offline'});
  const publicBoard=path==='/api/leaderboard'&&body===undefined;
  let token=null;if(!this.local){try{token=await deadline(sessionToken(),publicBoard?2000:8000);}catch(error){if(!publicBoard)throw error;}}
  const authHeaders=token?{Authorization:'Bearer '+token}:{};if(!this.local)authHeaders.apikey=PUBLIC_CONFIG.publishableKey;
  const response=await fetch(this.api+path,{method:body!==undefined?'POST':'GET',headers:{...authHeaders,...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body!==undefined?JSON.stringify(body):undefined,credentials:this.local?'same-origin':'omit',signal:AbortSignal.timeout(path.endsWith('/finish')?20000:12000)});
  let data;try{data=await response.json();}catch{throw Object.assign(new Error('联网服务返回异常，请稍后重试'),{status:response.status>=500?response.status:503});}
  if(!response.ok||data.quarantined)throw Object.assign(new Error(data.error||'联网服务暂不可用'),{status:response.status,code:data.code});return data;
 }
 async initialize(){this.archiveReadBusy++;this.changed();try{const revision=this.profileRevision;const data=await this.request('/api/identity');if(revision!==this.profileRevision||!this.local&&data.profile&&(await currentIdentity())?.id!==data.profile.id)return data;this.profile=data.profile;this.mode=data.mode;if(this.profile){this.playerId=this.profile.nickname;this.persist();}this.lastError='';this.archiveReadError='';this.changed();return data;}catch(error){this.archiveReadError=error.message;this.changed();throw error;}finally{this.archiveReadBusy--;this.changed();}}
 async rename(value){const nickname=playerIdValue(value);if(!nickname)throw Object.assign(new Error('昵称需为2–12个中文、英文字母或数字'),{status:400});
  if(!this.local)await deadline(sessionToken({create:true}));const data=await this.request('/api/identity',{nickname});if(!this.local&&(await currentIdentity())?.id!==data.profile.id)throw new Error('身份刚刚切换，请重新连接');this.profileRevision++;this.profile=data.profile;this.playerId=data.profile.nickname;this.mode=data.mode;this.persist();this.changed();return data;
 }
 async start(id,options={}){const nickname=playerIdValue(id);if(!nickname)throw Object.assign(new Error('昵称需为2–12个中文、英文字母或数字'),{status:400});
  try{if(!this.profile||this.profile.nickname!==nickname)await this.rename(nickname);const run=await this.request('/api/runs',options);this.mode=run.mode;this.lastError='';this.changed();return run;}
  catch(error){this.lastError=error.message;this.changed();if([400,401,409,429].includes(error.status))throw error;this.playerId=nickname;this.persist();return{online:false,error:error.message};}
 }
 async reset(){if(!this.local){const c=await authClient();await c.auth.signOut({scope:'local'});}else await this.request('/api/identity/reset',{});this.profileRevision++;this.profile=null;this.playerId='';this.persist();this.changed();}
 async board(){const data=await this.request('/api/leaderboard');this.lastBoard=data;if(data.profile)this.profile=data.profile;this.changed();return data;}
 submit(run,ticks,actions,extra={}){if(this.inflight.has(run.runId))return this.inflight.get(run.runId);const entry={runId:run.runId,owner:this.profile?.id,kind:'pending',body:{ticks,actions,...extra}};const saved=this.journal.write(entry);this.persist();this.changed();return this.sendEntry(entry,saved);}
 sendEntry(entry,saved=true){if(this.inflight.has(entry.runId))return this.inflight.get(entry.runId);const promise=this.deliver(entry,saved).finally(()=>this.inflight.delete(entry.runId));this.inflight.set(entry.runId,promise);return promise;}
 async deliver(entry,saved){this.archiveBusy++;this.changed();try{const data=await this.request(`/api/runs/${entry.runId}/finish`,entry.body);this.journal.remove(entry.runId);this.persist();this.lastBoard=data.board;if(data.board?.profile?.id===this.profile?.id)this.profile=data.board.profile;this.lastError='';this.archiveError='';this.changed();return data;}
  catch(error){this.archiveError=error.message;if(!retryableStatus(error.status))this.journal.write({...entry,kind:'rejected',error:error.message});this.persist();this.lastError=error.message;error.saved=saved&&this.pending.some(e=>e.runId===entry.runId);this.changed();throw error;}finally{this.archiveBusy--;this.changed();}
 }
 async checkpoint(run,body){if(!['1.2.0','1.2.1','1.4.0','1.4.1'].includes(run.rulesVersion))return;const owner=this.profile?.id;this.archiveBusy++;this.changed();try{const data=await this.request(`/api/runs/${run.runId}/checkpoint`,body);if(this.profile?.id===owner)this.profile=data.profile;this.archiveError='';return data;}catch(error){this.archiveError=error.message;throw error;}finally{this.archiveBusy--;this.changed();}}
 async email(email,recover=false){if(this.local)throw new Error('本地联调环境不发送邮件，请使用公网版');if(!recover&&!this.profile)throw new Error('请先输入昵称建立游客身份，再绑定邮箱');
  const user=await currentIdentity();const hasArchive=this.profile&&(this.profile.playCount>0||this.profile.collection?.length||this.journal.list().some(e=>e.owner===this.profile.id&&e.kind!=='rejected'));
  if(recover&&hasArchive&&user?.is_anonymous)throw new Error('当前游客已有成绩或未结账对局。请先给当前游客绑定邮箱，再切换账号；也可以在新的浏览器窗口恢复旧账号。不会覆盖或合并现有收藏。');
  return emailAction(email,recover);}
 async verifyEmail(email,token,recover){if(this.local)throw new Error('本地环境不能验证真实邮箱');const user=await verifyEmailAction(email,token,recover);this.profileRevision++;const data=await this.initialize();if(!data.profile)throw new Error('邮箱已验证，但档案暂未读到，请稍后重新连接；现有数据不会被覆盖');return{user,profile:data.profile};}
 retry(){if(this.syncing)return this.syncing;this.syncing=this.retryOwned().finally(()=>{this.syncing=null;});return this.syncing;}
 async retryOwned(){const outcomes=[];for(const entry of this.pending){if(entry.owner&&entry.owner!==this.profile?.id)continue;
  try{outcomes.push(await this.sendEntry(entry));}catch(error){outcomes.push({error:error.message,runId:entry.runId,retryable:retryableStatus(error.status)});if(retryableStatus(error.status))break;}}
  return outcomes;
 }
}
