import {Game,STEP} from './core.js';
class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
const MAX_TICKS=6*3600*60,MAX_ACTIONS=25000;
export function replayRun(seed,ticks,actions){
  if(!Number.isInteger(ticks)||ticks<0||ticks>MAX_TICKS||!Array.isArray(actions)||actions.length>MAX_ACTIONS)throw new ApiError(400,'对局时长或记录超出允许范围');
  let previous=-1;
  for(const a of actions){if(!Array.isArray(a)||a.length!==2||!Number.isInteger(a[0])||a[0]<previous||a[0]>ticks||!Number.isInteger(a[1])||a[1]<1)throw new ApiError(400,'对局操作记录无效');previous=a[0];}
  const game=new Game({seed});game.start();let action=0;
  for(let tick=0;tick<=ticks;tick++){
    while(action<actions.length&&actions[action][0]===tick){if(!game.eat(actions[action][1]))throw new ApiError(400,'对局操作与游戏规则不一致');action++;}
    if(tick===ticks)break;
    if(game.phase!=='playing')throw new ApiError(400,'结束后的对局记录无效');
    game.step(STEP);
  }
  if(game.phase!=='gameover')throw new ApiError(409,'本局尚未正常结束');
  return {score:game.score,sushi:game.sushiEaten,ticks,character:game.character.id};
}
