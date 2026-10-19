export const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function playerIdValue(value){const id=String(value??'').normalize('NFKC').trim();return /^[\p{L}\p{N}_-]{2,16}$/u.test(id)?id:null;}
const CLOUD_API='https://sushi-panic.rubyssss98.chatgpt.site';
export class SocialClient{
  constructor(){
    this.api=location.protocol==='file:'?null:['localhost','127.0.0.1'].includes(location.hostname)?location.origin:CLOUD_API;
    this.playerId='';this.key='';this.pending=[];
    try{this.playerId=playerIdValue(localStorage.getItem('sushi.player-id'))||'';this.key=localStorage.getItem('sushi.player-key')||'';const pending=JSON.parse(localStorage.getItem('sushi.pending')||'[]');if(Array.isArray(pending))this.pending=pending.slice(-3);}catch{}
    if(!/^[a-f0-9]{64}$/.test(this.key))this.key=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
    this.persist();
  }
  persist(){try{localStorage.setItem('sushi.player-id',this.playerId);localStorage.setItem('sushi.player-key',this.key);localStorage.setItem('sushi.pending',JSON.stringify(this.pending));return true;}catch{return false;}}
  async request(path,body){
    if(!this.api){const e=new Error('离线文件不连接共享榜单，请打开在线版');e.offline=true;throw e;}
    const response=await fetch(this.api+path,{method:body?'POST':'GET',headers:{'X-Player-Key':this.key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,credentials:'omit',signal:AbortSignal.timeout(6000)});
    let data;try{data=await response.json();}catch{throw new Error('排行榜暂时无法连接');}
    if(!response.ok){const e=new Error(data.error||'排行榜暂时无法连接');e.status=response.status;throw e;}
    return data;
  }
  async start(id){
    const playerId=playerIdValue(id);if(!playerId){const e=new Error('ID需为2–16个中英文字母、数字、下划线或短横线');e.status=400;throw e;}
    let run;
    try{run=await this.request('/api/runs',{playerId});}catch(error){if([400,409,429].includes(error.status))throw error;run={online:false};}
    this.playerId=playerId;this.persist();return run;
  }
  board(){return this.request('/api/leaderboard');}
  async submit(run,ticks,actions){
    const entry={runId:run.runId,body:{ticks,actions}};
    this.pending=this.pending.filter(p=>p.runId!==entry.runId).concat(entry).slice(-3);const saved=this.persist();
    try{const result=await this.request(`/api/runs/${entry.runId}/finish`,entry.body);this.pending=this.pending.filter(p=>p.runId!==entry.runId);this.persist();return result;}
    catch(error){if(error.status&&![429,503].includes(error.status)){this.pending=this.pending.filter(p=>p.runId!==entry.runId);this.persist();}error.saved=saved;throw error;}
  }
  async retry(){for(const entry of [...this.pending]){try{await this.request(`/api/runs/${entry.runId}/finish`,entry.body);this.pending=this.pending.filter(p=>p.runId!==entry.runId);this.persist();}catch(error){if(error.status&&![429,503].includes(error.status)){this.pending=this.pending.filter(p=>p.runId!==entry.runId);this.persist();}else throw error;}}}
}
