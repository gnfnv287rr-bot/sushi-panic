// One live writer per saved run; authenticated server replay remains authoritative.
export class RunLease{
 constructor({locks=globalThis.navigator?.locks,storage,owner=globalThis.crypto.randomUUID(),now=Date.now}={}){this.locks=locks;this.owner=owner;this.now=now;try{this.storage=storage||globalThis.localStorage;}catch{}this.id=null;}
 async acquire(id){if(this.id===id&&this.valid())return true;this.release();if(!id)return true;
  if(this.locks)return new Promise(resolve=>{this.locks.request('sushi.active.'+id,{ifAvailable:true},async lock=>{if(!lock){resolve(false);return;}this.id=id;resolve(true);await new Promise(done=>this.releaseLock=done);}).catch(()=>resolve(false));});
  try{const key='sushi.lease.'+id,old=JSON.parse(this.storage.getItem(key)||'null');if(old&&old.owner!==this.owner&&old.until>this.now())return false;this.id=id;this.renew();this.timer=setInterval(()=>this.renew(),30000);return true;}catch{this.id=null;return false;}
 }
 renew(){if(!this.id)return;try{const current=JSON.parse(this.storage.getItem('sushi.lease.'+this.id)||'null');if(current&&current.owner!==this.owner&&current.until>this.now()){clearInterval(this.timer);return;}this.storage.setItem('sushi.lease.'+this.id,JSON.stringify({owner:this.owner,until:this.now()+90000}));}catch{}}
 valid(){if(!this.id)return false;if(this.locks)return true;try{return JSON.parse(this.storage.getItem('sushi.lease.'+this.id))?.owner===this.owner;}catch{return false;}}
 release(){clearInterval(this.timer);if(this.releaseLock){this.releaseLock();this.releaseLock=null;}else if(this.id)try{if(this.valid())this.storage.removeItem('sushi.lease.'+this.id);}catch{}this.id=null;}
}
