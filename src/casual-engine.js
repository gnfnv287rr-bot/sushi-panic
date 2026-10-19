import {CasualGame as OldGame,replayCasual as oldReplay} from './casual-v12.js';
import {CasualGame as NewGame,replayCasual as newReplay} from './casual-v121.js';
export const isCasualVersion=v=>['1.2.0','1.2.1'].includes(v);
export function createCasual(options={}){return new(options.rulesVersion==='1.2.0'?OldGame:NewGame)(options);}
export function replayVersion(version,seed,ticks,actions,options){if(!isCasualVersion(version))throw new Error('unsupported_rules');return(version==='1.2.0'?oldReplay:newReplay)(seed,ticks,actions,options);}
