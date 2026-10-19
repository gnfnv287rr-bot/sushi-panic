import {Game,STEP} from './core.js';
import {createCasual,isCasualVersion} from './casual-engine.js';
// Reconstruct from seed and legal inputs, never from a stored score/HP supplied by the browser.
export function rebuildActiveRun(entry){
 const ticks=entry?.body?.ticks,actions=entry?.body?.actions;
 if(!entry?.run||!Number.isSafeInteger(ticks)||ticks<0||ticks>6*3600*60||!Array.isArray(actions)||actions.length>25000)throw new Error('上次对局记录不完整');
 let previous=-1;for(const a of actions){if(!Array.isArray(a)||a.length!==2||!Number.isSafeInteger(a[0])||a[0]<previous||a[0]>ticks||!Number.isSafeInteger(a[1])||a[1]<(isCasualVersion(entry.run.rulesVersion)?0:1))throw new Error('上次对局记录无效');previous=a[0];}
 const g=isCasualVersion(entry.run.rulesVersion)?createCasual({rulesVersion:entry.run.rulesVersion,seed:entry.run.seed,themeId:entry.run.themeId,menuEdition:entry.run.menuEdition,knownFoods:entry.run.knownFoods}):new Game({seed:entry.run.seed});g.start();let i=0;
 for(let tick=0;tick<=ticks;tick++){
  while(i<actions.length&&actions[i][0]===tick){if(actions[i][1]===0&&isCasualVersion(g.rulesVersion)){if(g.phase==='paused')g.resume();else g.lastActivity=g.time;}else if(!g.eat(actions[i][1]))throw new Error('上次对局无法按原规则恢复');i++;}
  if(tick===ticks)break;if(g.phase!=='playing')throw new Error('已结束的对局不能继续');g.step(STEP);
 }
 return g;
}
