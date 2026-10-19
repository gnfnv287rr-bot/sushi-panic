import { Game, FOODS, ALLERGEN_NAMES, STEP, difficultyAt, fullnessZone, VERSION } from './core.js';
import { Renderer, drawPortrait, drawSushi } from './renderer.js';
import {SocialClient,escapeHtml} from './social.js';
const $=id=>document.getElementById(id), renderer=new Renderer($('game'));
let game=null,preview=new Game({seed:414}),lastFrame=performance.now(),accumulator=0,toastTimer,ended=false,audio;
const social=new SocialClient();let playerId=social.playerId,onlineRun=null,activeTicks=0,actionLog=[],entryBusy=false;
const physique=c=>c.id==='momo'?'杂食型':c.id==='taro'?'快消化型':c.id==='yuzu'?'慢消化型':'清爽型';
preview.start();preview.character={...preview.character,allergy:'none'};
let high=0,sound=false;
try{const n=Number(localStorage.getItem('sushi-panic.best.v1'));if(Number.isSafeInteger(n)&&n>=0)high=n;sound=localStorage.getItem('sushi-panic.sound')==='on';}catch{}
const scoreText=n=>String(Math.floor(n)).padStart(5,'0'),timeText=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function newSeed(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0];}
function tone(kind='eat'){
  if(!sound)return;
  try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),gain=audio.createGain();o.type='sine';o.frequency.setValueAtTime(kind==='allergy'?180:kind==='perfect'?680:450,audio.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='allergy'?80:950,audio.currentTime+.09);gain.gain.setValueAtTime(.065,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.connect(gain);gain.connect(audio.destination);o.start();o.stop(audio.currentTime+.16);}catch{}
}
function soundUI(){$('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));}
function menu(){
  $('menu').innerHTML=Object.entries(FOODS).map(([key,f])=>`<div class="menu-item ${game&&f.allergen===game.character.allergy?'allergic':''}" data-food="${key}"><canvas width="100" height="90" aria-hidden="true"></canvas><span>${f.name}<b>${f.fullness>0?'+':''}${Math.round(f.fullness*(f.fullness>0&&game?game.character.portion:1))}</b></span></div>`).join('');
  for(const el of $('menu').children){const c=el.querySelector('canvas').getContext('2d');drawSushi(c,el.dataset.food,50,48,1.2);}
}
function characterUI(){
  const c=game?.character;drawPortrait($('portrait'),c);
  $('character-tag').textContent=c?'已入座':'等待入座';$('character-name').textContent=playerId||'输入你的ID';$('character-title').textContent=c?`${physique(c)} · ${onlineRun?'联网计分':'练习局'}`:'和朋友一起挑战大胃王';
  $('character-ability').textContent=c?c.ability:'入座后抽取一张角色卡，看看今天要忌口什么。';
  $('allergy-name').textContent=c?ALLERGEN_NAMES[c.allergy]:'开局揭晓';$('allergy-detail').textContent=c?'标「忌」的盘子会造成过敏伤害':'看清再吃，别太心急';menu();
}
function showOverlay(html){$('overlay').classList.remove('hidden');$('overlay-content').innerHTML=html;const button=$('overlay-content').querySelector('button');if(button)button.focus({preventScroll:true});}
function home(){
  game=null;onlineRun=null;ended=false;$('pause').disabled=true;characterUI();updateUI();
  showOverlay(`<p class="eyebrow">欢迎光临 · 谁是下一位大胃王</p><h2>寿司<br><em>别吃撑！</em></h2><div class="english-title">SUSHI PANIC</div><p>输入你的ID，用积分和朋友一决高下。</p><form id="entry-form"><label class="player-id-label" for="player-id-input">你的玩家ID</label><input id="player-id-input" class="player-id-input" maxlength="16" autocomplete="nickname" placeholder="2–16字，例如：寿司小王" value="${escapeHtml(playerId)}" required><p id="entry-error" class="entry-error" role="status"></p><button class="primary-button" id="new-game" type="submit">入座，开吃！ <span aria-hidden="true">→</span></button></form><p class="tiny-note">此浏览器记住你的ID · 每人保留单局最高积分</p>`);
  $('entry-form').onsubmit=e=>{e.preventDefault();beginRun($('player-id-input').value);};
}
async function beginRun(id){
  if(entryBusy)return;entryBusy=true;const button=$('new-game')||$('retry');if(button){button.disabled=true;button.textContent='正在入座…';}
  try{const run=await social.start(id);playerId=social.playerId;newGame(run.runId?{seed:run.seed,characterId:run.characterId,onlineRun:run}:{});}
  catch(error){if($('entry-error'))$('entry-error').textContent=error.message;else toast(error.message,true);if(button){button.disabled=false;button.textContent=button.id==='retry'?'再来一局！':'入座，开吃！ →';}}
  finally{entryBusy=false;}
}
function newGame(options={}){
  if(!playerId&&new URLSearchParams(location.search).get('test')==='1')playerId='测试食客';
  game=new Game({seed:options.seed??newSeed(),characterId:options.characterId});onlineRun=options.onlineRun||null;activeTicks=0;actionLog=[];ended=false;accumulator=0;renderer.effects=[];clearTimeout(toastTimer);$('toast').classList.remove('visible');characterUI();updateUI();
  const c=game.character;
  showOverlay(`<p class="eyebrow">你的本局角色卡</p><canvas class="card-portrait" id="card-portrait" width="200" height="200" aria-hidden="true"></canvas><h2 class="card-name">${escapeHtml(playerId)}</h2><p style="margin:3px 0 10px">本局体质：${physique(c)}</p><div class="card-traits"><span>生命 ${c.hp}</span><span>基础消化 ${c.drain}/秒</span></div><p style="margin-bottom:10px">${c.ability}</p><div class="allergy-pill">本局忌口：<strong>${ALLERGEN_NAMES[c.allergy]}</strong> · 误食扣 24 生命</div><button class="primary-button" id="start-game">记住了，开始！</button><p class="tiny-note">${onlineRun?'联网计分局 · 结束后按积分上榜':'练习局 · 当前未连接共享排行榜'}</p>`);
  drawPortrait($('card-portrait'),c);$('start-game').onclick=startGame;
}
function startGame(){if(!game?.start())return;$('overlay').classList.add('hidden');$('pause').disabled=false;accumulator=0;lastFrame=performance.now();updateUI();renderer.draw(game,lastFrame/1000);tone();}
function pauseGame(reason='寿司会等你。'){
  if(!game?.pause())return;
  accumulator=0;
  showOverlay(`<p class="eyebrow">中场休息</p><h2>歇一口气。</h2><p>${reason}<br>饱腹、生命与计时都已暂停。</p><button class="primary-button" id="resume-game">继续开吃</button><button class="secondary-button" id="back-home">返回门口</button>`);
  $('resume-game').onclick=resumeGame;$('back-home').onclick=home;updateUI();
}
function resumeGame(){if(!game?.resume())return;$('overlay').classList.add('hidden');accumulator=0;lastFrame=performance.now();updateUI();}
function finish(){
  if(ended||!game)return;ended=true;$('pause').disabled=true;
  const record=game.score>high;if(record){high=game.score;try{localStorage.setItem('sushi-panic.best.v1',String(high));}catch{}}
  $('best-score').textContent=scoreText(high);drawPortrait($('portrait'),game.character,'sad');
  showOverlay(`<p class="eyebrow">${escapeHtml(playerId)} · ${record?'本机新纪录！':'本桌已结账'}</p><h2 style="font-size:29px">${game.deathReason}</h2><div class="result-score">${scoreText(game.score)}</div><div class="receipt-stats"><span><b>${timeText(game.time)}</b>生存时间</span><span><b>${game.sushiEaten}</b>寿司盘数</span><span><b>${game.bestCombo}</b>最高连击</span></div><p id="rank-result" class="rank-result" role="status">${onlineRun?'正在核对本局积分…':'练习局 · 不上传共享榜单'}</p><button class="primary-button" id="retry">再来一局！</button><button class="secondary-button" id="result-board">查看大胃王榜</button><button class="text-button" id="result-home">回到门口</button><p class="tiny-note">${physique(game.character)} · 种子 ${game.seed}</p>`);
  $('retry').onclick=()=>beginRun(playerId);$('result-home').onclick=home;$('result-board').onclick=showLeaderboard;
  if(onlineRun){const finished=game;social.submit(onlineRun,activeTicks,actionLog).then(data=>{if(game!==finished||!$('rank-result'))return;const me=data.board.me;$('rank-result').textContent=me?.rank===1?'你登顶了！现任大胃王就是你！':me?`已上榜 · 你的最高积分排名第 ${me.rank} 名`:'本局已记录';}).catch(error=>{if(game===finished&&$('rank-result'))$('rank-result').textContent=error.status?`未上榜：${error.message}`:error.saved?'网络未连接，成绩已保留，点榜单可重试':'暂未上传，请在本页重试';});}
}
function toast(message,bad=false){$('toast').textContent=message;$('toast').classList.toggle('bad',bad);$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),1500);}
async function refreshLeaderboard(){
  $('board-refresh').disabled=true;$('board-status').textContent='正在读取共享积分榜…';
  try{
    await social.retry();const board=await social.board();
    $('board-champion').textContent=board.entries.length?`现任大胃王 · ${board.entries[0].playerId}`:'第一位大胃王，等你上榜';
    $('board-status').textContent=board.entries.length?'按每人单局最高积分排名，第一名就是大胃王。':'还没有已验证成绩，完成你的第一局吧。';
    $('board-list').innerHTML=board.entries.map(row=>`<li class="board-row ${row.rank===1?'champion-row':''}"><span class="board-position">${row.rank===1?'王':row.rank}</span><div class="board-player"><strong>${escapeHtml(row.playerId)}</strong><small>${row.sushi} 盘寿司 · ${timeText(row.seconds)}${row.rank===1?' · 大胃王':''}</small></div><b>${scoreText(row.score)}<small>积分</small></b></li>`).join('');
    $('board-me').textContent=board.me?`${board.me.playerId} · 最高 ${scoreText(board.me.score)} 分 · 第 ${board.me.rank} 名`:'完成联网计分局后，你的成绩会出现在这里。';
  }catch(error){$('board-champion').textContent='共享排行榜暂不可用';$('board-status').textContent=social.api?'暂时连不上共享榜单，请稍后重试。':'离线文件不连接共享榜单，请打开在线版。';$('board-list').replaceChildren();$('board-me').textContent='没有成功读取名次；游戏仍可进行练习。';}
  finally{$('board-refresh').disabled=false;}
}
function showLeaderboard(){if(game?.phase==='playing')pauseGame('看完大胃王榜，再继续开吃。');if(!$('leaderboard-dialog').open)$('leaderboard-dialog').showModal();refreshLeaderboard();}
function eatTarget(target){
  if(!target||!game)return;
  const e=game.eat(target.id);if(!e)return;
  if(onlineRun)actionLog.push([activeTicks,target.id]);
  renderer.bite(target,e);tone(e.type);toast(e.text,e.type==='allergy');
  // Effects are handled once at input time; the engine keeps only a bounded event history.
  updateUI();if(game.phase==='gameover')finish();
}
function updateUI(){
  const g=game,c=g?.character,full=g?.fullness??55,hp=g?.hp??100;
  document.body.classList.toggle('play-mode',!!g);
  $('score').textContent=scoreText(g?.score??0);$('time').textContent=timeText(g?.time??0);$('level').innerHTML=`${difficultyAt(g?.time??0).level} <small>/ 6</small>`;
  $('hp').textContent=String(Math.ceil(hp));$('hp-max').textContent=` / ${c?.hp??100}`;$('fullness').textContent=String(Math.round(full));$('health-fill').style.width=`${hp/(c?.hp??100)*100}%`;
  $('health-bar').setAttribute('aria-valuemax',String(c?.hp??100));$('health-bar').setAttribute('aria-valuenow',String(Math.ceil(hp)));$('fullness-bar').setAttribute('aria-valuenow',String(Math.round(full)));
  $('fullness-pointer').style.left=`${full/120*100}%`;
  $('fullness-fill').style.width=`${full/120*100}%`;
  const zone=fullnessZone(full),danger=zone!=='safe',lowHealth=hp>0&&hp<(c?.hp??100)*.4;
  const panel=document.querySelector('.game-panel');panel.classList.toggle('danger',danger);panel.dataset.bellyState=danger?zone:full<25?'low':full>85?'high':'comfortable';panel.dataset.lowHealth=String(lowHealth);
  $('zone-text').textContent=zone==='hungry'?'太饿了 · 快吃！':zone==='overfull'?'吃撑了 · 停一停':full>=25&&full<=85?'恰到好处':full<25?'偏饿 · 该吃了':'偏撑 · 慢一点';
  $('health-status').textContent=hp===0?'已结账':danger&&g?.hazardTime>=2?'生命流失中':danger?`${Math.max(0,2-(g?.hazardTime??0)).toFixed(1)}秒后掉血`:hp<(c?.hp??100)*.4?'有点虚弱':'精神满满';
  const nearlyHungry=full<25,nearlyFull=full>85;
  const cue=$('scene-warning'),cueTitle=danger?(zone==='hungry'?'快饿坏了，吃一口！':'吃撑啦，先停嘴！'):lowHealth?'生命不多了，小心忌口！':nearlyHungry?'该吃一口了！':nearlyFull?'快吃撑啦，慢一点！':'';
  cue.hidden=!(g?.phase==='playing'&&cueTitle);
  cue.dataset.severity=danger||lowHealth?'danger':'caution';
  if($('scene-warning-title').textContent!==cueTitle)$('scene-warning-title').textContent=cueTitle;
  $('scene-warning-detail').textContent=danger?(g?.hazardTime>=2?'正在掉血！':`${Math.max(0,2-(g?.hazardTime??0)).toFixed(1)} 秒后开始掉血`):lowHealth?'避开红色「忌」，稳住胃口':nearlyHungry?'先挑一盘不过敏的寿司':nearlyFull?'先等消化，乌龙茶也能减饱腹':'';
  $('combo').textContent=g?.combo>=2?`${g.combo} 连击 · 吃得刚刚好`:' ';
  $('game-hint').innerHTML=`<span class="hint-dot"></span>${g?`本局忌口：${ALLERGEN_NAMES[g.character.allergy]} · 红色「忌」别乱吃`:'点击盘子开吃 · 看清红色过敏标记'}`;
  $('pause').disabled=!g||!['playing','paused'].includes(g.phase);
}
function frame(now){
  const realDt=Math.max(0,(now-lastFrame)/1000);lastFrame=now;
  if(game?.phase==='playing'){
    // Large foreground stalls pause instead of silently discarding survival time.
    if(realDt>0.5)pauseGame('刚才画面停顿，已替你暂停。');
    else{accumulator+=realDt;while(accumulator>=STEP&&game.phase==='playing'){game.step(STEP);activeTicks++;accumulator-=STEP;}updateUI();if(game.phase==='gameover')finish();}
  }
  if(!game){preview.time+=Math.min(realDt,.1);const speed=difficultyAt(0).speed;preview.beltTravel+=Math.min(realDt,.1)*speed;for(const f of preview.foods)f.p=(f.p+Math.min(realDt,.1)*speed)%1;}
  renderer.draw(game??preview,now/1000,Math.min(realDt,.05));requestAnimationFrame(frame);
}
$('game').addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary||game?.phase!=='playing')return;e.preventDefault();const b=$('game').getBoundingClientRect();eatTarget(renderer.hit(e.clientX-b.left,e.clientY-b.top));});
$('game').addEventListener('pointermove',e=>{const b=$('game').getBoundingClientRect();renderer.hover=renderer.hit(e.clientX-b.left,e.clientY-b.top)?.id??null;});
$('game').addEventListener('pointerleave',()=>renderer.hover=null);
$('pause').onclick=()=>game?.phase==='paused'?resumeGame():pauseGame();
document.querySelector('.brand').onclick=e=>{e.preventDefault();home();};
$('sound').onclick=()=>{sound=!sound;soundUI();try{localStorage.setItem('sushi-panic.sound',sound?'on':'off');}catch{}tone();};
$('help').onclick=()=>{if(game?.phase==='playing')pauseGame('菜单还在，看完玩法再继续。');$('help-dialog').showModal();};
$('leaderboard').onclick=showLeaderboard;$('board-refresh').onclick=refreshLeaderboard;$('close-board').onclick=()=>$('leaderboard-dialog').close();
$('close-help').onclick=()=>$('help-dialog').close();
$('help-dialog').addEventListener('click',e=>{if(e.target===$('help-dialog')){const r=$('help-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('help-dialog').close();}});
document.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||$('help-dialog').open||$('leaderboard-dialog').open||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;
  if(e.code==='KeyP'||e.code==='Escape'){if(game?.phase==='playing'){e.preventDefault();pauseGame();}else if(game?.phase==='paused'){e.preventDefault();resumeGame();}}
  if(/^[1-8]$/.test(e.key)&&game?.phase==='playing'){e.preventDefault();eatTarget(renderer.targets.find(f=>f.number===Number(e.key)));}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame('切换页面时，已替你暂停。');});
window.addEventListener('blur',()=>{if(game?.phase==='playing')pauseGame('离开窗口时，已替你暂停。');});
new ResizeObserver(()=>renderer.resize()).observe($('stage'));
if(new URLSearchParams(location.search).get('test')==='1'){
  // Explicit test-only seam; normal builds expose no mutation hook.
  window.__sushi={get game(){return game;},renderer,newGame,start:startGame,advance(seconds){for(let i=0;i<Math.ceil(seconds/STEP)&&game?.phase==='playing';i++){game.step(STEP);activeTicks++;}updateUI();if(game?.phase==='gameover')finish();},snapshot:()=>game?.snapshot(),version:VERSION};
}
$('best-score').textContent=scoreText(high);soundUI();home();requestAnimationFrame(frame);
