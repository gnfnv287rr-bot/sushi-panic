// No context, audio resources or sound are created until a user gesture.
export const AUDIO_KEY='sushi-panic.audio.v1';
export const AUDIO_DEFAULTS=Object.freeze({music:true,effects:false,muted:false,musicVolume:.25,effectsVolume:.36});
export function audioPreferences(value){
 const out={...AUDIO_DEFAULTS};
 for(const k of ['music','effects','muted'])if(typeof value?.[k]==='boolean')out[k]=value[k];
 for(const k of ['musicVolume','effectsVolume'])if(typeof value?.[k]==='number'&&Number.isFinite(value[k]))out[k]=Math.max(0,Math.min(.6,value[k]));
 return out;
}
export function foodSound(food={}){
 const text=[food.id,food.name,food.categoryId,food.topping,food.visualKey].join(' ');
 if(food.id==='tea'||food.fullness<0)return'tea';
 if(/sweet|pudding|dessert|布丁|蛋糕|冰淇淋|甜品|大福/.test(text))return'dessert';
 if(/tempura|fried|karaage|天妇罗|炸|可乐饼/.test(text))return'fried';
 if(/sear|aburi|caramel|炙|焦糖|蒲烧|烤/.test(text))return'seared';
 if(/vegetable|veggie|cucumber|avocado|黄瓜|牛油果|蔬|笋|秋葵|玉米|纳豆/.test(text))return'vegetable';
 if(/tamago|egg|玉子|蛋|豆腐/.test(text))return'soft';
 return'normal';
}
export class AudioManager{
 constructor({storage,contextFactory=()=>new(globalThis.AudioContext||globalThis.webkitAudioContext)(),loader=()=>import('./audio-score.js'),onChange=()=>{},now=()=>performance.now(),random=Math.random}={}){
  if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
  this.storage=storage;this.contextFactory=contextFactory;this.loader=loader;this.onChange=onChange;this.now=now;this.random=random;
  let saved;try{saved=JSON.parse(storage?.getItem(AUDIO_KEY));}catch{}
  this.settings=audioPreferences(saved);this.unlocked=false;this.visible=true;this.ducked=false;this.voices=new Set();this.buffers=new Map();this.recent=new Map();this.pending=0;this.epoch=0;this.status='idle';
 }
 get audible(){return !this.settings.muted&&(this.settings.music||this.settings.effects);}
 snapshot(){return{settings:{...this.settings},unlocked:this.unlocked,contextState:this.context?.state||'absent',voices:this.voices.size,pending:this.pending,bgm:!!this.bgm,ducked:this.ducked,visible:this.visible,status:this.status,cachedEffects:this.buffers.size};}
 notify(){this.onChange(this.snapshot());}
 configure(patch){this.settings=audioPreferences({...this.settings,...patch});try{this.storage?.setItem(AUDIO_KEY,JSON.stringify(this.settings));}catch{}this.epoch++;if(this.settings.muted||!this.settings.effects)this.stopEffects();this.sync();this.notify();}
 // Call from a real pointer/key event. Restored preferences never imply autoplay.
 unlock(){this.unlocked=true;this.sync();}
 ensureContext(){
  if(this.context)return this.context;
  const c=this.contextFactory();this.context=c;
  this.musicGain=c.createGain();this.musicGain.gain.value=0;
  this.effectGain=c.createGain();this.effectGain.gain.value=this.settings.effectsVolume;
  const limiter=c.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=16;limiter.ratio.value=3;limiter.attack.value=.01;limiter.release.value=.18;
  this.musicGain.connect(limiter);this.effectGain.connect(limiter);limiter.connect(c.destination);return c;
 }
 sync(){
  clearTimeout(this.backgroundTimer);
  if(!this.unlocked||!this.audible||!this.visible){this.fadeMusic(false);return;}
  try{
   const c=this.ensureContext();c.resume().catch(()=>{this.status='error';this.notify();});
   this.effectGain.gain.setTargetAtTime(this.settings.effectsVolume,c.currentTime,.025);
   if(this.settings.music)this.startMusic();else this.fadeMusic(false);
  }catch{this.status='error';this.notify();}
 }
 async score(){if(!this.scorePromise)this.scorePromise=this.loader().catch(e=>{this.scorePromise=null;throw e;});return this.scorePromise;}
 async startMusic(){
  if(this.bgm){this.fadeMusic(true);return;}
  if(this.musicLoading)return;
  this.musicLoading=true;this.status='loading';this.notify();
  try{
   const score=await this.score();
   this.musicBuffer??=await score.renderCafeLoop();
   if(this.settings.music&&this.audible&&this.visible&&this.unlocked){
    const source=this.context.createBufferSource();source.buffer=this.musicBuffer;source.loop=true;source.connect(this.musicGain);this.bgm=source;
    source.onended=()=>{source.disconnect();if(this.bgm===source)this.bgm=null;};
    this.musicGain.gain.cancelScheduledValues(this.context.currentTime);this.musicGain.gain.setValueAtTime(0,this.context.currentTime);source.start();this.fadeMusic(true);
   }
   this.status='ready';
  }catch{this.status='error';}finally{this.musicLoading=false;this.notify();}
 }
 fadeMusic(on){
  if(!this.context||!this.musicGain)return;
  const at=this.context.currentTime,g=this.musicGain.gain;g.cancelScheduledValues(at);g.setTargetAtTime(on?this.settings.musicVolume*(this.ducked?.38:1):0,at,on?.18:.035);
  if(!on&&this.bgm){const source=this.bgm;this.bgm=null;try{source.stop(at+.17);}catch{}}
 }
 setAlbum(open){this.ducked=open;if(this.bgm)this.fadeMusic(true);this.notify();}
 setVisible(visible){
  this.visible=visible;this.epoch++;if(!visible){this.stopEffects();this.fadeMusic(false);clearTimeout(this.backgroundTimer);this.backgroundTimer=setTimeout(()=>this.context?.suspend().catch(()=>{}),190);}else this.sync();this.notify();
 }
 stopEffects(){for(const voice of this.voices){try{voice.stop();voice.disconnect();}catch{}}this.voices.clear();}
 async play(kind,{gap=110,level=1}={}){
  if(!this.unlocked||!this.visible||!this.audible||!this.settings.effects||!this.context||this.pending>=4)return false;
  const at=this.now(),previous=this.recent.get(kind)??-Infinity;if(at-previous<gap)return false;this.recent.set(kind,at);
  const epoch=this.epoch;this.pending++;
  try{
   const score=await this.score();if(epoch!==this.epoch||!this.visible||!this.audible||!this.settings.effects)return false;
   if(!this.buffers.has(kind))this.buffers.set(kind,score.effectBuffer(this.context,kind));
   // Drop excess inputs rather than stacking or replaying them later.
   if(this.voices.size>=4)return false;
   const voice=this.context.createBufferSource(),gain=this.context.createGain();voice.buffer=this.buffers.get(kind);voice.playbackRate.value=.97+this.random()*.06;gain.gain.value=level;voice.connect(gain);gain.connect(this.effectGain);this.voices.add(voice);
   voice.onended=()=>{this.voices.delete(voice);voice.disconnect();gain.disconnect();};voice.start();return true;
  }catch{this.status='error';this.notify();return false;}finally{this.pending--;}
 }
 eat(food){return this.play(foodSound(food),{gap:90});}
 paper(action){return this.play('paper-'+action,{gap:240,level:.65});}
 confirm(){return this.play('confirm',{gap:180,level:.65});}
 discovery(kind='common'){
  const epoch=this.epoch;this.play('discovery-'+kind,{gap:1000,level:.9});
  // Timers never unlock audio and are invalidated by mute/background/settings changes.
  if(this.unlocked&&this.settings.effects&&this.audible&&this.visible)setTimeout(()=>{if(epoch===this.epoch)this.play('stamp',{gap:500,level:.7});},230);
 }
}
