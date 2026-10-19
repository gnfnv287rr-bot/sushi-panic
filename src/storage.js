// Per-run keys avoid one tab overwriting another tab's pending scores.
export class RunJournal{
 constructor(storage){try{this.storage=storage||globalThis.localStorage;}catch{this.storage=null;}this.memory=new Map();}
 key(id){return 'sushi.run.v12.'+id;}
 write(entry){this.memory.set(entry.runId,entry);try{this.storage.setItem(this.key(entry.runId),JSON.stringify(entry));return true;}catch{return false;}}
 remove(id){this.memory.delete(id);try{this.storage.removeItem(this.key(id));}catch{}}
 list(kind){const entries=new Map();try{for(let i=0;i<this.storage.length;i++){const key=this.storage.key(i);if(!key?.startsWith('sushi.run.v12.'))continue;try{const e=JSON.parse(this.storage.getItem(key));if(e&&typeof e.runId==='string'&&Array.isArray(e.body?.actions))entries.set(e.runId,e);}catch{}}}catch{}
 for(const [id,e] of this.memory)entries.set(id,e);return [...entries.values()].filter(e=>!kind||e.kind===kind);}
}
export function retryableStatus(status){return !status||status===401||status===408||status===425||status===429||status>=500;}
export function deadline(promise,ms=8000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('身份服务连接超时')),ms);})]).finally(()=>clearTimeout(timer));}
