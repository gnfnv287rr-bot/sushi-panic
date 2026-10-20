import {CasualGame as TasteGame,enableTaste,TASTE_MARKER} from './casual-v141.js';
import {CasualGame as LoopGame,replayCasual as loopReplay} from './casual-v14.js';
import {CasualGame as OldGame,replayCasual as oldReplay} from './casual-v12.js';
import {CasualGame as NewGame,replayCasual as newReplay} from './casual-v121.js';
import {STEP} from './core.js';
import {CATALOG} from './menus-v14.js';
export const isCasualVersion=v=>['1.2.0','1.2.1','1.4.0','1.4.1'].includes(v);
export function createCasual(options={}){return new(options.rulesVersion==='1.4.1'?TasteGame:options.rulesVersion==='1.4.0'?LoopGame:options.rulesVersion==='1.2.0'?OldGame:NewGame)(options);}
// -1 is a single explicit rule transition. Prior actions replay with their original scoring.
// Old cached clients send no marker, so every prior replay remains unchanged.
export function reconstructCasual(version,seed,ticks,actions,options={}){
 if(!isCasualVersion(version)||!Number.isSafeInteger(ticks)||ticks<0||ticks>6*3600*60||!Array.isArray(actions)||actions.length>25000)throw new Error('invalid_checkout');
 let prev=-1,markers=0;for(const a of actions){if(!Array.isArray(a)||a.length!==2||!Number.isSafeInteger(a[0])||a[0]<prev||a[0]>ticks||!Number.isSafeInteger(a[1])||a[1]<-1)throw new Error('invalid_action');prev=a[0];if(a[1]===TASTE_MARKER&&++markers>1)throw new Error('duplicate_taste_transition');}
 const game=createCasual({...options,rulesVersion:version,seed});game.start();let i=0;const foodCounts={};
 for(let tick=0;tick<=ticks;tick++){while(i<actions.length&&actions[i][0]===tick){const id=actions[i++][1];if(id===TASTE_MARKER){if(version==='1.4.1'||!['playing','paused'].includes(game.phase))throw new Error('invalid_taste_transition');enableTaste(game);}else if(id===0){if(game.phase==='paused')game.resume();else if(game.phase==='playing')game.lastActivity=game.time;else throw new Error('invalid_resume');}else{const e=game.eat(id);if(!e)throw new Error('invalid_bite');if(CATALOG[e.item.key].collectible)foodCounts[e.item.key]=(foodCounts[e.item.key]||0)+1;}}if(tick===ticks)break;if(game.phase!=='playing')throw new Error('rest_ticks');game.step(STEP);}return{game,foodCounts};
}
export function replayVersion(version,seed,ticks,actions,options){if(!isCasualVersion(version))throw new Error('unsupported_rules');if(version==='1.4.1'||actions?.some(a=>a?.[1]===TASTE_MARKER)){if(options?.checkout!==true)throw new Error('invalid_checkout');const{game,foodCounts}=reconstructCasual(version,seed,ticks,actions,options);game.checkout();return{score:game.score,sushi:game.sushiEaten,ticks,character:game.character.id,foodCounts};}return(version==='1.4.0'?loopReplay:version==='1.2.0'?oldReplay:newReplay)(seed,ticks,actions,options);}
