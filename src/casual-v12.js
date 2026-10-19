// V1.2 rules remain independent of the preserved 0.2.0 survival engine.
import {Game,STEP,clamp,seededRandom} from './core.js';
import {CATALOG,themeById,MENU_EDITION} from './menus-v1.js';
export const CASUAL_VERSION='1.2.0';
export class MenuDeck{
 constructor(rng,theme){this.rng=rng;this.theme=theme;this.sinceSafe=0;this.sinceHidden=0;this.sinceTea=0;}
 next(){const keys=this.theme.foods;
  if(this.sinceTea>=8){this.sinceTea=0;this.sinceSafe++;this.sinceHidden++;return 'tea';}
  let key;if(this.sinceSafe>=2)key=keys.find(k=>CATALOG[k].fullness>0&&!CATALOG[k].allergen);
  else if(this.sinceHidden>=35)key=keys.find(k=>CATALOG[k].rarity==='hidden');
  else {let n=this.rng()*keys.reduce((s,k)=>s+CATALOG[k].weight,0);key=keys.find(k=>(n-=CATALOG[k].weight)<0)||keys.at(-1);}
  this.sinceSafe=CATALOG[key].fullness>0&&!CATALOG[key].allergen?0:this.sinceSafe+1;this.sinceTea=key==='tea'?0:this.sinceTea+1;this.sinceHidden=CATALOG[key].rarity==='hidden'?0:this.sinceHidden+1;return key;
 }
}
export class CasualGame extends Game{
 constructor({seed,characterId,themeId='classic',knownFoods=[],menuEdition=MENU_EDITION}={}){super({seed,characterId});if(menuEdition!==MENU_EDITION)throw new Error('菜单版本不匹配，请重新连接');this.rulesVersion=CASUAL_VERSION;this.menuEdition=menuEdition;this.theme=themeById(themeId);this.deck=new MenuDeck(seededRandom(this.seed),this.theme);this.knownFoods=new Set(knownFoods);this.discoveries=new Set();this.lastActivity=0;this.autoRest=false;this.checkoutRequested=false;}
 start(){if(this.phase!=='card')return false;this.phase='playing';const safe=this.theme.foods.find(k=>CATALOG[k].fullness>0&&!CATALOG[k].allergen);for(const [key,p] of [[safe,.12],[this.deck.next(),.34],['tea',.56],[this.deck.next(),.78]])this.addFood(key,p);this.nextSpawn=2;return true;}
 tick(dt){this.time+=dt;
  // Real inactivity freezes the deterministic simulation after 20 seconds. No idle score.
  if(this.time-this.lastActivity>=20){this.autoRest=true;this.phase='paused';return;}
  this.fullness=clamp(this.fullness-this.character.drain*.18*dt,0,120);
  const unsafe=this.fullness<15||this.fullness>100;this.hazardTime=unsafe?this.hazardTime+dt:0;
  if(this.hazardTime>8)this.hp=Math.max(1,this.hp-.5*dt);
  this.beltTravel+=.035*dt;for(const f of this.foods){f.p=(f.p+.035*dt)%1;f.distance+=.035*dt;}this.foods=this.foods.filter(f=>f.distance<1&&f.p<.98);
  this.nextSpawn-=dt;if(this.nextSpawn<=0){if(this.foods.length<12&&this.foods.every(f=>Math.min(f.p,1-f.p)>=.08)){this.addFood(this.deck.next());this.nextSpawn=2;}else this.nextSpawn=0;}
  this.refreshScore();
 }
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
 snapshot(){return{...super.snapshot(),version:CASUAL_VERSION,themeId:this.theme.id,menuEdition:this.menuEdition,autoRest:this.autoRest};}
}
export function replayCasual(seed,ticks,actions,{themeId='classic',knownFoods=[],menuEdition=MENU_EDITION,checkout=false}={}){
 if(!Number.isSafeInteger(ticks)||ticks<0||ticks>6*3600*60||!Array.isArray(actions)||actions.length>25000||checkout!==true)throw new Error('invalid_checkout');let prev=-1;for(const a of actions){if(!Array.isArray(a)||a.length!==2||!Number.isSafeInteger(a[0])||a[0]<prev||a[0]>ticks||!Number.isSafeInteger(a[1])||a[1]<0)throw new Error('invalid_action');prev=a[0];}
 const game=new CasualGame({seed,themeId,knownFoods,menuEdition});game.start();const foodCounts={};let i=0;
 for(let tick=0;tick<=ticks;tick++){while(i<actions.length&&actions[i][0]===tick){const id=actions[i++][1];if(id===0){if(game.phase==='paused')game.resume();else if(game.phase==='playing')game.lastActivity=game.time;else throw new Error('invalid_resume');}else {const event=game.eat(id);if(!event)throw new Error('invalid_bite');if(CATALOG[event.item.key].collectible)foodCounts[event.item.key]=(foodCounts[event.item.key]||0)+1;}}if(tick===ticks)break;if(game.phase!=='playing')throw new Error('rest_ticks');game.step(STEP);}
 game.checkout();return{score:game.score,sushi:game.sushiEaten,ticks,character:game.character.id,foodCounts};
}
