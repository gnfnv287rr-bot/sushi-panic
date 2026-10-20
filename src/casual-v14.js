// V1.2 rules remain independent of the preserved 0.2.0 survival engine.
import {Game,STEP,clamp,seededRandom} from './core.js';
import {CATALOG,themeById,MENU_EDITION,rarityOf} from './menus-v14.js';
export const CASUAL_VERSION='1.4.0';
import {MenuDeck as OriginalDeck} from './casual-v121.js';
export class FriendsDeck{
 constructor(rng,theme,friendProfile){this.rng=rng;this.theme=theme;this.friend=friendProfile;this.sinceOwn=0;this.sinceTea=0;this.lastKey=null;this.sameCount=0;this.lastDraw=null;}
 next(){
  if(this.sinceTea>=7){this.sinceTea=0;this.lastDraw={kind:'tea'};return'tea';}
  const own=this.friend?.foodId,forced=own&&this.sinceOwn>=(this.friend.pity||8)-1;
  let pool=this.theme.collectionFoods.filter(k=>this.sameCount<2||k!==this.lastKey),key;
  if(forced)key=own;else{const weights=pool.map(k=>k===own?(this.friend.weight||3):1),total=weights.reduce((a,b)=>a+b,0);let n=this.rng()*total;key=pool.at(-1);for(let i=0;i<pool.length;i++){n-=weights[i];if(n<0){key=pool[i];break;}}}
  this.sinceOwn=key===own?0:this.sinceOwn+1;this.sinceTea++;this.sameCount=key===this.lastKey?this.sameCount+1:1;this.lastKey=key;this.lastDraw={kind:'food',forced,own:key===own};return key;
 }
}
export class CasualGame extends Game{
 constructor({seed,characterId,themeId='classic',knownFoods=[],menuEdition=MENU_EDITION,friendProfile=null}={}){super({seed,characterId});if(menuEdition!==MENU_EDITION)throw new Error('菜单版本不匹配，请重新连接');this.rulesVersion=CASUAL_VERSION;this.menuEdition=menuEdition;this.theme=themeById(themeId);this.friendProfile=friendProfile;this.deck=this.theme.id==='friends-special'?new FriendsDeck(seededRandom(this.seed),this.theme,friendProfile):new OriginalDeck(seededRandom(this.seed),this.theme,knownFoods);this.knownFoods=new Set(knownFoods);this.discoveries=new Set();this.lastActivity=0;this.autoRest=false;this.checkoutRequested=false;}
 start(){if(this.phase!=='card')return false;this.phase='playing';const safe=this.theme.id==='friends-special'?this.deck.next():this.theme.foods.find(k=>CATALOG[k].fullness>0&&!CATALOG[k].allergen);for(const [key,p] of [[safe,.12],[this.deck.next(),.34],['tea',.56],[this.deck.next(),.78]])this.addFood(key,p);this.nextSpawn=2;return true;}
 tick(dt){this.time+=dt;
  // Real inactivity freezes the deterministic simulation after 20 seconds. No idle score.
  if(this.time-this.lastActivity>=20-1e-8){this.autoRest=true;this.phase='paused';return;}
  this.fullness=clamp(this.fullness-this.character.drain*.18*dt,0,120);
  const unsafe=this.fullness<15||this.fullness>100;this.hazardTime=unsafe?this.hazardTime+dt:0;
  if(this.hazardTime>8)this.hp=Math.max(1,this.hp-.5*dt);
  this.beltTravel+=.035*dt;for(const f of this.foods){f.p=(f.p+.035*dt)%1;f.distance+=.035*dt;}this.foods=this.foods.filter(f=>f.distance<1&&f.p<.98);
  this.nextSpawn-=dt;if(this.nextSpawn<=0){if(this.foods.length<12&&this.foods.every(f=>Math.min(f.p,1-f.p)>=.08)){this.addFood(this.deck.next());this.nextSpawn=2;}else this.nextSpawn=0;}
  this.refreshScore();
 }
 rest(){if(this.phase==='playing')this.pause();if(this.phase==='paused'){this.autoRest=true;return true;}return false;}
 resume(){if(!super.resume())return false;this.lastActivity=this.time;this.autoRest=false;return true;}
 eat(id){if(this.phase!=='playing'||this.time-this.lastBite<.7)return null;const index=this.foods.findIndex(f=>f.id===id);if(index<0)return null;const item=this.foods[index],food=CATALOG[item.key];
  // Neither excessive tea nor forced overeating can be used to farm points/collections.
  if(food.fullness>0&&this.fullness>100||food.fullness<0&&this.fullness<=65)return null;
  this.foods.splice(index,1);this.lastBite=this.time;this.lastActivity=this.time;this.eaten++;if(food.collectible)this.sushiEaten++;
  const change=food.fullness>0?food.fullness*this.character.portion*.65:-Math.min(18,this.fullness-55);this.fullness=clamp(this.fullness+change,0,120);
  const allergy=food.allergen===this.character.allergy;let text,type,newDiscovery=false;
  if(allergy){const shielded=this.shield>0;if(shielded)this.shield--;else this.hp=Math.max(1,this.hp-4);this.allergies++;this.combo=0;type='allergy';text=shielded?'护身符接住了这次忌口':'有点不舒服，换一盘吧 · 精神 −4';}
  else if(food.collectible){const comfy=this.fullness>=25&&this.fullness<=85;this.combo=comfy?this.combo+1:0;this.bestCombo=Math.max(this.bestCombo,this.combo);this.foodScore+=Math.round(food.points*.5*(this.character.id==='taro'?1.15:1));if(comfy){this.perfects++;this.bonusScore+=10+Math.min(this.combo,5)*2;}type=comfy?'perfect':'eat';text=comfy?'一口刚刚好':'慢慢消化，先抿口茶';if(this.character.id==='momo'&&this.lastFood!==item.key)this.hp=Math.min(this.character.hp,this.hp+1);if(this.character.id==='nori'&&food.visualKey==='cucumber')this.hp=Math.min(this.character.hp,this.hp+3);this.lastFood=item.key;}
  else {type='tea';text='抿一口茶，舒服多了';}
  if(food.collectible&&!this.knownFoods.has(item.key)&&!this.discoveries.has(item.key)){this.discoveries.add(item.key);this.bonusScore+=25;newDiscovery=true;text='新发现！'+food.name+' · 结账后保存图鉴';}
  this.refreshScore();const event={type,text,item,change,newDiscovery};this.events.push(event);if(this.events.length>32)this.events.shift();return event;
 }
 checkout(){if(!['playing','paused'].includes(this.phase))return false;this.checkoutRequested=true;this.phase='gameover';this.deathReason='吃得刚刚好，下次再来。';return true;}
 snapshot(){return{...super.snapshot(),version:CASUAL_VERSION,themeId:this.theme.id,menuEdition:this.menuEdition,autoRest:this.autoRest,friendProfile:this.friendProfile};}
}
export function replayCasual(seed,ticks,actions,{themeId='classic',knownFoods=[],menuEdition=MENU_EDITION,checkout=false,friendProfile=null}={}){
 if(!Number.isSafeInteger(ticks)||ticks<0||ticks>6*3600*60||!Array.isArray(actions)||actions.length>25000||checkout!==true)throw new Error('invalid_checkout');let prev=-1;for(const a of actions){if(!Array.isArray(a)||a.length!==2||!Number.isSafeInteger(a[0])||a[0]<prev||a[0]>ticks||!Number.isSafeInteger(a[1])||a[1]<0)throw new Error('invalid_action');prev=a[0];}
 const game=new CasualGame({seed,themeId,knownFoods,menuEdition,friendProfile});game.start();const foodCounts={};let i=0;
 for(let tick=0;tick<=ticks;tick++){while(i<actions.length&&actions[i][0]===tick){const id=actions[i++][1];if(id===0){if(game.phase==='paused')game.resume();else if(game.phase==='playing')game.lastActivity=game.time;else throw new Error('invalid_resume');}else {const event=game.eat(id);if(!event)throw new Error('invalid_bite');if(CATALOG[event.item.key].collectible)foodCounts[event.item.key]=(foodCounts[event.item.key]||0)+1;}}if(tick===ticks)break;if(game.phase!=='playing')throw new Error('rest_ticks');game.step(STEP);}
 game.checkout();return{score:game.score,sushi:game.sushiEaten,ticks,character:game.character.id,foodCounts};
}
