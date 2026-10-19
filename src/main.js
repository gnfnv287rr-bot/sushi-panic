import { Game as LegacyGame, ALLERGEN_NAMES, STEP, difficultyAt, fullnessZone, VERSION } from './core.js';
import { Renderer, drawPortrait, drawSushi } from './renderer-v12.js';
import {SocialClient,escapeHtml} from './social.js';
import {rebuildActiveRun} from './run-state.js';
import {watchIdentity,currentIdentity} from './identity.js';
import {CasualGame} from './casual-v12.js';
import {CATALOG as FOODS,THEMES,themeById,menuState} from './menus-v1.js';
const Game=CasualGame,isCasual=g=>g?.rulesVersion==='1.2.0';
const syncedEaten=new Map();
let rankedChoice=false;
let selectedTheme='classic',themeChosen=false,menuServerTime=null,checkpointTimer=null,checkpointBusy=false;
try{selectedTheme=localStorage.getItem('sushi.theme.v12')||'classic';themeChosen=!!localStorage.getItem('sushi.theme.v12');themeById(selectedTheme);}catch{selectedTheme='classic';}
const $=id=>document.getElementById(id), renderer=new Renderer($('game'));
let game=null,preview=new Game({seed:414}),lastFrame=performance.now(),accumulator=0,toastTimer,ended=false,audio;
const social=new SocialClient();let playerId=social.playerId,onlineRun=null,activeTicks=0,actionLog=[],entryBusy=false,lastReceipt=null,boardBusy=false,clockAnchor=null,identityWarning='';
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
  $('menu').innerHTML=Object.entries(FOODS).filter(([key])=>(game?.theme||themeById(selectedTheme)).foods.includes(key)).map(([key,f])=>`<div class="menu-item ${game&&f.allergen===game.character.allergy?'allergic':''}" data-food="${key}"><canvas width="100" height="90" aria-hidden="true"></canvas><span>${f.name}<b>${f.fullness>0?'+':''}${Math.round(f.fullness*(f.fullness>0?(game?.character.portion||1)*(game&&!isCasual(game)?1:.65):1))}</b></span></div>`).join('');
  for(const el of $('menu').children){const c=el.querySelector('canvas').getContext('2d');drawSushi(c,el.dataset.food,50,48,1.2);}
}
function characterUI(){
  if($('theme-select'))$('theme-select').disabled=!!game&&['playing','paused','card'].includes(game.phase);
  const c=game?.character;drawPortrait($('portrait'),c);
  $('character-tag').textContent=c?'已入座':'等待入座';$('character-name').textContent=playerId||'输入你的ID';$('character-title').textContent=c?`${physique(c)} · ${onlineRun?(onlineRun.mode==='local'?'本地联调榜':onlineRun.ranked===false?'云端收藏':'联网计分'):'练习局'}`:'慢慢吃，也慢慢收藏';
  $('character-ability').textContent=c?c.ability:'入座后抽取一张角色卡，看看今天要忌口什么。';
  $('allergy-name').textContent=c?ALLERGEN_NAMES[c.allergy]:'开局揭晓';$('allergy-detail').textContent=c?(isCasual(game)?'忌口会有一点不舒服，换一盘就好':'标「忌」的盘子会造成过敏伤害'):'看清再吃，别太心急';menu();
}
function showOverlay(html){$('overlay').classList.remove('hidden');$('overlay-content').classList.remove('record-celebration');$('overlay-content').innerHTML=html;const button=$('overlay-content').querySelector('button');if(button)button.focus({preventScroll:true});}
function home(){
  saveProgress();game=null;onlineRun=null;ended=false;$('pause').disabled=true;characterUI();updateUI();
  showOverlay(`<p class="eyebrow">随时入座 · 慢慢收藏</p><h2>寿司<br><em>别吃撑！</em></h2><div class="english-title">SUSHI PANIC</div><p>${social.profile?'欢迎回来，'+escapeHtml(playerId)+'。今天想尝哪一盘？':'取个昵称，来吃几盘喜欢的寿司。'}</p><form id="entry-form"><label class="player-id-label" for="player-id-input">你的昵称</label><input id="player-id-input" class="player-id-input" maxlength="12" autocomplete="nickname" placeholder="2–12个中文、英文或数字" value="${escapeHtml(playerId)}" required><label class="rank-choice"><input type="checkbox" id="ranked-choice" ${rankedChoice?'checked':''}> 参加今日积分榜（可选）</label><p id="entry-error" class="entry-error" role="status">${escapeHtml(identityWarning)}</p><button class="primary-button" id="new-game" type="submit">入座，开吃！ <span aria-hidden="true">→</span></button></form><p class="identity-note">${social.api?'自动记住此浏览器的匿名身份 · 允许重名':'在线身份服务待接通 · 当前可练习'}<br>绑定邮箱后可跨设备取回收藏；未绑定时，请保留浏览器数据。</p>${identityWarning?'<button id="reset-identity" class="text-button">使用新的匿名身份</button>':''}`);
  const saved=social.journal.list('active').filter(e=>e.owner===social.profile?.id).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];if(saved){const button=document.createElement('button');button.id='restore-run';button.className='secondary-button';button.textContent='继续上次未结账的对局';button.onclick=()=>restoreProgress(saved);$('overlay-content').append(button);}
  $('entry-form').onsubmit=e=>{e.preventDefault();beginRun($('player-id-input').value);};
  if($('reset-identity'))$('reset-identity').onclick=async()=>{try{await social.reset();playerId='';identityWarning='';home();}catch{toast('暂时无法重置，请稍后重试',true);}};
}
async function beginRun(id){
  if(entryBusy)return;if($('ranked-choice'))rankedChoice=$('ranked-choice').checked;entryBusy=true;const button=$('new-game')||$('retry');if(button){button.disabled=true;button.textContent='正在入座…';}
  try{const legacyTest=new URLSearchParams(location.search).get('test')==='1'&&new URLSearchParams(location.search).get('casual')!=='1';const run=await social.start(id,legacyTest?{}:{rulesVersion:'1.2.0',themeId:selectedTheme,ranked:rankedChoice});playerId=social.playerId;identityWarning='';newGame(run.runId?{seed:run.seed,characterId:run.characterId,onlineRun:run,legacy:run.rulesVersion!=='1.2.0'}:{});}
  catch(error){if(error.code==='identity_lost'){identityWarning=error.message;home();}if($('entry-error'))$('entry-error').textContent=error.message;else toast(error.message,true);if(button){button.disabled=false;button.textContent=button.id==='retry'?'再来一局！':'入座，开吃！ →';}}
  finally{entryBusy=false;}
}
function newGame(options={}){
  saveProgress();
  if(!playerId&&new URLSearchParams(location.search).get('test')==='1')playerId='测试食客';
  const run=options.onlineRun;game=options.legacy?new LegacyGame({seed:options.seed??newSeed(),characterId:options.characterId}):new CasualGame({seed:options.seed??newSeed(),characterId:options.characterId,themeId:run?.themeId||selectedTheme,knownFoods:run?.knownFoods||social.profile?.collection?.map(c=>c.sushiId)||[],menuEdition:run?.menuEdition});onlineRun=options.onlineRun||null;activeTicks=0;actionLog=[];ended=false;accumulator=0;renderer.effects=[];clearTimeout(toastTimer);$('toast').classList.remove('visible');characterUI();updateUI();
  const c=game.character;
  showOverlay(`<p class="eyebrow">你的本局角色卡</p><canvas class="card-portrait" id="card-portrait" width="200" height="200" aria-hidden="true"></canvas><h2 class="card-name">${escapeHtml(playerId)}</h2><p style="margin:3px 0 10px">本局体质：${physique(c)}</p><div class="card-traits"><span>${isCasual(game)?'精神':'生命'} ${c.hp}</span><span>温和消化 ${(c.drain*(isCasual(game)?.18:1)).toFixed(2)}/秒</span></div><p style="margin-bottom:10px">${c.ability}</p><div class="allergy-pill">本局忌口：<strong>${ALLERGEN_NAMES[c.allergy]}</strong> · ${isCasual(game)?'误食精神 −4，不会死亡':'误食扣 24 生命'}</div><button class="primary-button" id="start-game">记住了，开始！</button><p class="tiny-note">${onlineRun?(onlineRun.mode==='local'?'本地联调局 · 与公网榜单独立':(onlineRun.ranked===false?'云端收藏局 · 结账保存，不参与今日榜':'联网计分局 · 结束后参与今日全球榜')):'练习局 · 未连接今日榜，本局不上榜'}</p>`);
  drawPortrait($('card-portrait'),c);$('start-game').onclick=startGame;paintNetwork();
}
function startGame(){if(!game?.start())return;$('overlay').classList.add('hidden');$('pause').disabled=false;accumulator=0;lastFrame=performance.now();updateUI();renderer.draw(game,lastFrame/1000);saveProgress();paintNetwork();tone();}
function pauseGame(reason='寿司会等你。'){
  if(!game||!(game.pause()||isCasual(game)&&game.phase==='paused'&&game.autoRest))return;
  accumulator=0;saveProgress();
  showOverlay(`<p class="eyebrow">中场休息</p><h2>歇一口气。</h2><p>${reason}<br>饱腹、生命与计时都已暂停。</p><button class="primary-button" id="resume-game">继续开吃</button><button class="secondary-button" id="back-home">返回门口</button>`);
  if(isCasual(game)){const b=document.createElement('button');b.className='secondary-button';b.id='rest-checkout';b.textContent='结账，保存收藏';b.onclick=checkout;$('overlay-content').append(b);}
  $('resume-game').onclick=resumeGame;$('back-home').onclick=home;updateUI();
}
function resumeGame(){if(!game?.resume())return;if(isCasual(game)&&onlineRun)actionLog.push([activeTicks,0]);$('overlay').classList.add('hidden');accumulator=0;lastFrame=performance.now();updateUI();}
function finish(){
  if(ended||!game)return;ended=true;$('pause').disabled=true;$('theme-select').disabled=false;lastReceipt=null;
  if(game.score>high){high=game.score;try{localStorage.setItem('sushi-panic.best.v1',String(high));}catch{}}
  $('best-score').textContent=scoreText(high);drawPortrait($('portrait'),game.character,'sad');
  showOverlay(`<p class="eyebrow">${escapeHtml(playerId)} · 本桌已结账</p><h2 style="font-size:25px">${game.deathReason}</h2><div class="result-score" id="confirmed-score">${scoreText(game.score)}</div><div class="receipt-stats"><span><b>${timeText(game.time)}</b>${isCasual(game)?'用餐时间':'生存时间'}</span><span><b>${game.sushiEaten}</b>寿司盘数</span><span><b>${game.bestCombo}</b>最高连击</span></div><div class="result-totals"><span><b id="result-today">—</b>今日最高</span><span><b id="result-best">—</b>历史最高</span><span><b id="result-rank">—</b>今日全球排名</span></div><p id="result-badges" class="result-badges" role="status"></p><p id="rank-result" class="rank-result" role="status">${onlineRun?'提交中 · 正在核验本局积分…':'练习局 · 本局不上传今日榜'}</p><p id="result-times" class="receipt-times"></p><div class="result-actions"><button class="primary-button" id="retry">再来一局！</button><button class="secondary-button" id="result-board">查看排行榜</button><button class="secondary-button" id="result-share">分享成绩</button><button class="secondary-button" id="result-submit" disabled>重试提交</button></div><button class="text-button" id="result-home">回到门口 / 修改昵称</button>`);
  $('retry').onclick=()=>beginRun(playerId);$('result-home').onclick=home;$('result-board').onclick=showLeaderboard;$('result-share').onclick=shareScore;$('result-submit').onclick=async()=>{const b=$('result-submit');b.disabled=true;try{const results=await social.retry();for(const r of results){if(r.result&&r.result.runId===onlineRun?.runId)applyReceipt(r.result);else if(r.error)$('rank-result').textContent='提交未完成：'+r.error;}await refreshLeaderboard();}finally{if($('result-submit')&&social.pending.some(e=>e.runId===onlineRun?.runId))$('result-submit').disabled=false;}};
  if(onlineRun){const finished=game;social.submit(onlineRun,activeTicks,actionLog,isCasual(game)?{checkout:true}:{}).then(data=>{if(game!==finished||!$('rank-result'))return;applyReceipt(data.result);paintBoard(data.board);paintCollection();}).catch(error=>{if(game===finished&&$('rank-result')){$('rank-result').textContent=error.code==='quarantined'?'成绩待核查 · 暂不计入排行榜':error.saved?'提交失败 · 等待重试，打开榜单可重试上传':`未上榜：${error.message}`;if($('result-submit'))$('result-submit').disabled=!error.saved;}});}
}
function bjTime(value){return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value));}
function applyReceipt(result){
  lastReceipt=result;paintNetwork();if(!$('rank-result'))return;if($('result-submit')){$('result-submit').disabled=true;$('result-submit').textContent='成绩已同步';}
  $('confirmed-score').textContent=scoreText(result.score);$('result-today').textContent=result.todayBest==null?'暂无':scoreText(result.todayBest);$('result-best').textContent=scoreText(result.allTimeBest);$('result-rank').textContent=result.rank?'第 '+result.rank+' 名':'暂无';
  $('rank-result').textContent='提交成功 · 已通过服务端核验'+(result.ranked===false?' · 本局仅收藏，不参加排名':'')+(social.mode==='local'?'（本地联调榜）':'');
  const badges=[];if(result.personalRecord)badges.push('新的个人纪录！');if(result.dailyRecord)badges.push('今日最佳成绩刷新！');if(result.enteredTop100)badges.push('成功进入今日排行榜！');if(result.champion)badges.push('今日榜首！');$('result-badges').textContent=badges.join(' ');
  if(badges.length)$('overlay-content').classList.add('record-celebration');
  $('result-times').textContent=`成绩归属 ${result.day}（北京时间） · 开始 ${bjTime(result.startedAt)} · 结束 ${bjTime(result.endedAt)} · 排名查询 ${bjTime(result.rankQueriedAt)}`;
}
async function shareScore(){
 const r=lastReceipt;const text=r?`🍣 SUSHI PANIC《寿司别吃撑！》\n我在 ${r.day} 拿下了 ${r.score} 分！\n${r.rank?`当天全球排名第 ${r.rank} 名！（北京时间 ${bjTime(r.rankQueriedAt)} 查询）`:'本局仅收藏，未参与今日排名。'}\n敢不敢来挑战？\n游戏链接：${location.origin+location.pathname}`:`🍣 SUSHI PANIC《寿司别吃撑！》\n我刚完成一局寿司挑战，敢不敢来试试？\n本局尚无已确认的全球排名。\n游戏链接：${location.protocol==='file:'?'请使用在线版分享':location.origin+location.pathname}`;
 try{await navigator.clipboard.writeText(text);toast('分享文案已复制，发给朋友来挑战！');}
 catch{const area=document.createElement('textarea');area.className='share-copy';area.readOnly=true;area.value=text;area.setAttribute('aria-label','分享文案，请选中复制');$('overlay-content').append(area);area.focus();area.select();}
}
function toast(message,bad=false){$('toast').textContent=message;$('toast').classList.toggle('bad',bad);$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),1500);}
function paintBoard(board){
  if(!board)return;
  social.lastBoard=board;social.mode=board.mode||social.mode;clockAnchor={time:Date.parse(board.serverTime),reset:Date.parse(board.resetsAt),at:performance.now()};
  const local=board.mode==='local';$('board-day').textContent=board.day;$('mini-board-day').textContent=board.day+(local?' · 本地联调':'');
  $('board-champion').textContent=board.entries.length?`今日大胃王 · ${board.entries[0].nickname}`:'今日首位大胃王，等你上榜';
  $('board-status').textContent=board.entries.length?(local?'本地测试榜，与公网独立':'每人每日最高积分 · 同分先达到者优先'):'今天还没有已验证成绩，来吃下第一份荣耀。';
  const own=board.me?.playerId;
  const list=$('board-list'),scroll=list.scrollTop;
  list.innerHTML=board.entries.map(row=>`<li class="board-row ${row.rank===1?'champion-row':''} podium-${row.rank<=3?row.rank:0} ${row.playerId===own?'is-me':''}"><span class="board-position">${row.rank===1?'王':row.rank}</span><div class="board-player"><strong>${escapeHtml(row.nickname)}${row.playerId===own?' · 我':''}</strong><small>食客 ${row.playerId.slice(-4)}${row.rank===1?' · 今日大胃王':''}</small></div><b>${scoreText(row.score)}<small>积分</small></b></li>`).join('');list.scrollTop=scroll;
  const me=board.me?`我 · 第 ${board.me.rank} 名 · ${board.me.score} 分`:board.identityUnavailable||!board.profile&&social.profile?.id?'身份暂未确认 · 本人名次待重新连接':'我 · 今日尚无已验证成绩';$('board-me').textContent=me;$('mini-board-me').textContent=me;
  $('board-updated').textContent='排名查询：北京时间 '+bjTime(board.serverTime)+' · 可主动刷新，浏览时每60秒同步';
  $('mini-board-list').innerHTML=board.entries.slice(0,5).map(row=>`<li class="${row.playerId===own?'is-me':''}"><span>${row.rank===1?'王':row.rank}</span><strong>${escapeHtml(row.nickname)}</strong><b>${row.score}</b></li>`).join('');
  $('mini-board-status').textContent=board.entries.length?(local?'本地联调榜 · 非全球成绩':'今日前五名 · 完整榜单 TOP 100'):'今日还没人上榜，你来开席吧。';tickCountdown();
}
async function refreshLeaderboard({quiet=false}={}){
 if(boardBusy)return;boardBusy=true;$('board-refresh').disabled=true;
 if(!quiet)$('board-status').textContent='正在读取今日榜…';
 try{paintBoard(await social.board());}
 catch(error){
  $('board-champion').textContent='今日榜暂时连不上';$('board-status').textContent='请稍后刷新。游戏可以继续练习，未同步的成绩不会显示为已上榜。';$('mini-board-status').textContent='榜单暂不可用，点下方按钮重试';
  if(!social.lastBoard){$('board-list').replaceChildren();$('mini-board-list').replaceChildren();$('board-me').textContent='尚未取得有效排名';}
  else $('board-updated').textContent='当前显示上次读取的数据，请联网后刷新。';
 }finally{boardBusy=false;$('board-refresh').disabled=false;}
 // A failed score retry must never hide or block the public ranking.
 social.retry().then(async outcomes=>{let updated=false;for(const o of outcomes){if(o.result){updated=true;if($('rank-result')&&onlineRun?.runId===o.result.runId)applyReceipt(o.result);}else if(o.error&&$('rank-result')&&onlineRun?.runId===o.runId)$('rank-result').textContent=(o.retryable?'等待重试：':'成绩未上榜：')+o.error;}if(updated)paintBoard(await social.board());}).catch(()=>{});
}
function tickCountdown(){
 const left=clockAnchor?Math.max(0,Math.ceil((clockAnchor.reset-clockAnchor.time-(performance.now()-clockAnchor.at))/1000)):null;
 const value=left===null?'--:--:--':left===0?'换榜同步中':`${String(Math.floor(left/3600)).padStart(2,'0')}:${String(Math.floor(left/60)%60).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;
 for(const el of document.querySelectorAll('.reset-countdown'))el.textContent=value;
 if(left===0&&!document.hidden&&performance.now()-clockAnchor.at>5000){clockAnchor.at=performance.now();clockAnchor.time=clockAnchor.reset;refreshLeaderboard({quiet:true});}
}
function showLeaderboard(){if(game?.phase==='playing')pauseGame('看完今日榜，再继续开吃。');if(!$('leaderboard-dialog').open)$('leaderboard-dialog').showModal();refreshLeaderboard();}

function eatTarget(target){
  if(!target||!game)return;
  const e=game.eat(target.id);if(!e){if(isCasual(game))toast(game.fullness>100?'胃里满满的，先喝茶或休息':target.key==='tea'?'现在不需要喝茶，挑一盘寿司吧':'慢慢来，一次一口');return;}
  if(onlineRun)actionLog.push([activeTicks,target.id]);
  renderer.bite(target,e);tone(e.type);toast(e.text,e.type==='allergy');if(isCasual(game)){paintCollection();scheduleCollectionSync();}
  // Effects are handled once at input time; the engine keeps only a bounded event history.
  updateUI();saveProgress();if(game.phase==='gameover')finish();
}
function updateUI(){
  const g=game,c=g?.character,full=g?.fullness??55,hp=g?.hp??100;
  document.body.classList.toggle('play-mode',!!g);
  $('score').textContent=scoreText(g?.score??0);$('time').textContent=timeText(g?.time??0);$('level').innerHTML=isCasual(g)||!g?'慢慢转':`${difficultyAt(g?.time??0).level} <small>/ 6</small>`;
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
  if(isCasual(g)){ $('health-status').textContent=hp<40?'歇一会儿也很好':'慢慢享用';$('zone-text').textContent=full>100?'肚子满满 · 抿口茶':full<25?'肚子咕咕 · 吃一口':'吃得刚刚好';$('scene-warning-detail').textContent=full>85?'先歇一口，乌龙茶能帮忙消化':'挑一盘喜欢的寿司，不用着急';$('scene-warning-title').textContent=full>85?'猫师傅：先抿口茶吧':full<25?'肚子咕咕，来一口？':'';cue.dataset.severity='caution';$('checkout').disabled=!['playing','paused'].includes(g.phase);}else $('checkout').disabled=true;
  $('pause').disabled=!g||!['playing','paused'].includes(g.phase);
}
function frame(now){
  const realDt=Math.max(0,(now-lastFrame)/1000);lastFrame=now;
  if(game?.phase==='playing'){
    // Large foreground stalls pause instead of silently discarding survival time.
    if(realDt>0.5)pauseGame('刚才画面停顿，已替你暂停。');
    else{accumulator+=realDt;while(accumulator>=STEP&&game.phase==='playing'){game.step(STEP);activeTicks++;accumulator-=STEP;}updateUI();if(game.phase==='gameover')finish();else if(isCasual(game)&&game.autoRest)pauseGame('刚才没有操作，已替你歇一会儿；休息不加分，也不消耗饱腹。');}
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
$('leaderboard').onclick=showLeaderboard;$('sidebar-leaderboard').onclick=showLeaderboard;$('board-refresh').onclick=()=>refreshLeaderboard();$('close-board').onclick=()=>$('leaderboard-dialog').close();
$('account').onclick=()=>{if(game?.phase==='playing')pauseGame('保存或恢复后，再继续开吃。');$('account-dialog').showModal();$('account-status').textContent='';if(!social.local&&!social.emailAvailable){$('bind-email').disabled=true;$('recover-email').disabled=true;$('account-status').textContent='邮箱存档暂未开放。当前浏览器会记住游客身份；清除网站数据或更换设备后，可能无法恢复。';}paintArchive();social.initialize().then(paintArchive).catch(()=>{});if(!social.local&&social.emailAvailable)currentIdentity().then(u=>{if(u?.email_confirmed_at&&!u.is_anonymous)$('account-status').textContent='邮箱已验证 · 可以在其他设备通过邮件恢复此档案';}).catch(()=>{});};
function paintArchive(){const p=social.profile;$('account-archive').innerHTML=p?`<h3>我的历史成绩</h3><p>历史最高 <b>${p.bestScore}</b> · 累计 ${p.playCount} 局<br>累计寿司 ${p.totalSushi??0} 盘 · 已收藏 ${(p.collection||[]).length} 种<br>累计有效积分 ${p.totalScore} · 每日冠军 ${p.championships} 次</p><ol>${(p.dailyHistory||[]).map(row=>`<li><span>${escapeHtml(row.day)}</span><b>${row.score} 分</b></li>`).join('')}</ol><p class="identity-note">食客ID ${escapeHtml(p.id.slice(-8))} · 显示最近31个有成绩的日期，全部历史保存在服务器。</p>`:'完成联网计分局后，这里会显示你的历史成绩。';}
$('close-account').onclick=()=>$('account-dialog').close();
let emailOperation=null;
async function emailSubmit(recover){const buttons=[$('bind-email'),$('recover-email')];buttons.forEach(b=>b.disabled=true);$('account-status').textContent='正在请求发送邮件…';try{const email=$('account-email').value.trim();await social.email(email,recover);emailOperation={email,recover};$('email-code-section').hidden=false;$('account-status').textContent='邮件请求已受理，请在这里输入邮件中的验证码。未验证前尚未绑定或恢复。';}catch(error){$('account-status').textContent=error.message;}finally{buttons.forEach(b=>b.disabled=!social.local&&!social.emailAvailable);}}
$('bind-email').onclick=()=>emailSubmit(false);$('recover-email').onclick=()=>emailSubmit(true);
$('verify-email').onclick=async()=>{if(!emailOperation)return;const button=$('verify-email');button.disabled=true;saveProgress();const previous=social.profile?.id;try{await social.verifyEmail(emailOperation.email,$('account-code').value,emailOperation.recover);playerId=social.profile.nickname;$('account-code').value='';emailOperation=null;$('account-status').textContent='邮箱验证成功 · 云端档案已恢复';$('email-code-section').hidden=true;paintArchive();if(previous!==social.profile.id){game=null;onlineRun=null;home();}await refreshLeaderboard();}catch(error){$('account-status').textContent=error.message;}finally{button.disabled=false;}};
$('close-help').onclick=()=>$('help-dialog').close();
$('help-dialog').addEventListener('click',e=>{if(e.target===$('help-dialog')){const r=$('help-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('help-dialog').close();}});
document.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||$('help-dialog').open||$('leaderboard-dialog').open||$('account-dialog').open||$('collection-dialog').open||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;
  if(e.code==='KeyP'||e.code==='Escape'){if(game?.phase==='playing'){e.preventDefault();pauseGame();}else if(game?.phase==='paused'){e.preventDefault();resumeGame();}}
  if(/^[1-8]$/.test(e.key)&&game?.phase==='playing'){e.preventDefault();eatTarget(renderer.targets.find(f=>f.number===Number(e.key)));}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame('切换页面时，已替你暂停。');});
window.addEventListener('blur',()=>{if(game?.phase==='playing')pauseGame('离开窗口时，已替你暂停。');});
new ResizeObserver(()=>renderer.resize()).observe($('stage'));
if(new URLSearchParams(location.search).get('test')==='1'){
  // Explicit test-only seam; normal builds expose no mutation hook.
  window.__sushi={get game(){return game;},renderer,newGame(options={}){newGame({...options,legacy:options.casual!==true});},checkout,start:startGame,advance(seconds){for(let i=0;i<Math.ceil(seconds/STEP)&&game?.phase==='playing';i++){game.step(STEP);activeTicks++;}updateUI();if(game?.phase==='gameover')finish();else if(isCasual(game)&&game.autoRest)pauseGame('没有操作，已自动休息。');},snapshot:()=>game?.snapshot(),version:VERSION};
}
$('best-score').textContent=scoreText(high);soundUI();home();requestAnimationFrame(frame);
social.initialize().then(()=>{playerId=social.playerId;if(document.documentElement.dataset.emailLinkIgnored)identityWarning='为保护已有存档，邮件链接不会自动切换身份。请点存档，用邮箱验证码恢复。';if(!game&&document.activeElement!==$('player-id-input'))home();}).catch(error=>{if(error.code==='identity_lost'){identityWarning=error.message;if(!game)home();}});
refreshLeaderboard({quiet:true});
setInterval(tickCountdown,1000);
setInterval(()=>{if(!document.hidden&&($('leaderboard-dialog').open||$('daily-board-panel').getBoundingClientRect().width>0))refreshLeaderboard({quiet:true});},60000);
window.addEventListener('online',()=>social.initialize().catch(()=>{}).finally(()=>refreshLeaderboard({quiet:true}))); 

function paintNetwork(){const el=$('network-status');if(!el)return;const count=social.pending.filter(e=>!e.owner||e.owner===social.profile?.id).length;
 el.dataset.state=count?'pending':game&&!onlineRun?'practice':social.profile?'online':'connecting';
 el.textContent=count?`有 ${count} 局成绩等待同步 · 可点重新连接重试`:game&&!onlineRun?'当前是练习局 · 本局不会上榜，请重新连接后另开一局':social.profile?(onlineRun?(onlineRun.ranked===false?'云端收藏局 · 结账后保存收藏与个人纪录':'联网计分局 · 本局结束后自动上榜'):'云端档案已连接 · 输入昵称即可开玩'):social.lastError?'身份暂未连接 · 榜单仍可查看':'正在连接游客档案 · 榜单与本机纪录分开保存';
}
function saveProgress(){if(!onlineRun||!game||!['playing','paused'].includes(game.phase))return;const saved=social.journal.write({kind:'active',owner:social.profile?.id,runId:onlineRun.runId,run:onlineRun,body:{ticks:activeTicks,actions:[...actionLog]},updatedAt:Date.now()});if(!saved&&$('network-status'))$('network-status').textContent='浏览器未能保存对局，请保持页面开启，结束后确认成绩已提交';}
function restoreProgress(entry){try{game=rebuildActiveRun(entry);onlineRun=entry.run;activeTicks=entry.body.ticks;actionLog=[...entry.body.actions];ended=false;accumulator=0;renderer.effects=[];characterUI();updateUI();if(game.phase==='gameover')finish();else pauseGame('已恢复上次对局；未操作期间没有消耗饱腹。');paintNetwork();}catch(error){toast(error.message,true);}}
social.onState=paintNetwork;paintNetwork();setInterval(saveProgress,5000);window.addEventListener('pagehide',saveProgress);
$('retry-network').onclick=async()=>{const b=$('retry-network');b.disabled=true;try{await social.initialize();if(!game){playerId=social.playerId;home();}await refreshLeaderboard();paintNetwork();}catch(error){social.lastError=error.message;paintNetwork();toast(error.message,true);await refreshLeaderboard();}finally{b.disabled=false;}};
$('copy-diagnostics').onclick=async()=>{const text=JSON.stringify({version:'1.2.0',url:location.origin+location.pathname,apiHost:social.api?new URL(social.api).host:null,identity:social.profile?.id?.slice(-8)||null,mode:social.mode,run:onlineRun?'online':game?'practice':'home',pending:social.pending.length,day:social.lastBoard?.day,error:social.lastError||null},null,2);try{await navigator.clipboard.writeText(text);toast('诊断已复制，不包含密码或登录凭据');}catch{toast('浏览器不允许复制，请记录联网状态提示',true);}};
if(social.api&&!social.local)watchIdentity((event,id)=>{if(!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)||id===social.profile?.id&&event!=='USER_UPDATED')return;saveProgress();if(game&&id!==social.profile?.id){game=null;onlineRun=null;}social.initialize().then(()=>{playerId=social.playerId;if(document.documentElement.dataset.emailLinkIgnored)identityWarning='为保护已有存档，邮件链接不会自动切换身份。请点存档，用邮箱验证码恢复。';if(!game)home();paintArchive();refreshLeaderboard({quiet:true});}).catch(error=>{social.lastError=error.message;paintNetwork();});}).catch(()=>{});

function checkout(){if(!isCasual(game)||!game.checkout())return;clearTimeout(checkpointTimer);finish();}
$('checkout').onclick=checkout;
function scheduleCollectionSync(){if(!onlineRun||!isCasual(game)||checkpointTimer)return;checkpointTimer=setTimeout(()=>{checkpointTimer=null;syncCollection();},8000);}
async function syncCollection(){if(checkpointBusy||!onlineRun||!isCasual(game)||!['playing','paused'].includes(game.phase)||game.sushiEaten<=(syncedEaten.get(onlineRun.runId)||0))return;const run=onlineRun,owner=social.profile?.id,eaten=game.sushiEaten;checkpointBusy=true;const body={ticks:activeTicks,actions:[...actionLog]};try{await social.checkpoint(run,body);syncedEaten.set(run.runId,eaten);if(owner===social.profile?.id){paintCollection();$('collection-status').textContent='收藏已保存至云端';}}catch{$('collection-status').textContent='收藏待同步 · 此浏览器已保留本局，联网后重试或结账';}finally{checkpointBusy=false;}}
setInterval(()=>{if(!document.hidden)syncCollection();},20000);
window.addEventListener('online',()=>syncCollection());
function paintCollection(){const profile=social.profile,counts=new Map((profile?.collection||[]).map(c=>[c.sushiId,c]));const local=isCasual(game)?game.discoveries:new Set();const filter=$('collection-theme').value||'all';const list=Object.values(FOODS).filter(f=>f.collectible&&(filter==='all'||filter==='hidden'&&f.rarity==='hidden'||f.themeId===filter));
 $('collection-summary').textContent=profile?`${counts.size} / ${Object.values(FOODS).filter(f=>f.collectible).length} 种已收藏 · 累计 ${profile.totalSushi||0} 盘`:'输入昵称入座，结账后留下你的收藏';
 $('collection-grid').innerHTML=list.map(f=>{const owned=counts.get(f.id),pending=local.has(f.id)&&!owned,known=!!owned||pending;return `<article class="collection-card ${known?'unlocked':'locked'}"><small>NO.${String(f.number).padStart(3,'0')} · ${f.rarity==='hidden'?'隐藏':f.rarity==='rare'?'稀有':'普通'}</small><canvas width="120" height="90" data-sushi="${f.id}" aria-label="${known?escapeHtml(f.name):'未发现寿司剪影'}"></canvas><h3>${known?escapeHtml(f.name):'？？？'}</h3><p>${known?escapeHtml(f.description):'慢慢品尝，总会遇见。'}</p><b>${owned?`已品尝 ${owned.tasteCount} 次`:pending?'新发现 · 待云端确认':'尚未发现'}</b>${owned?`<small>初遇 ${bjTime(owned.firstDiscoveredAt)}</small>`:''}</article>`;}).join('');for(const c of $('collection-grid').querySelectorAll('canvas')){const ctx=c.getContext('2d');drawSushi(ctx,c.dataset.sushi,60,48,.9);}
 $('theme-progress').textContent=THEMES.map(t=>{const ids=t.foods.filter(k=>FOODS[k].collectible);return `${t.name} ${ids.filter(k=>counts.has(k)).length}/${ids.length}`;}).join(' · ');
}
$('collection').onclick=()=>{if(game?.phase==='playing')pauseGame('图鉴替你留着每一次小发现。');paintCollection();$('collection-dialog').showModal();$('collection-status').textContent='正在读取云端图鉴…';social.initialize().then(()=>{paintCollection();$('collection-status').textContent='云端确认后永久保留；每日换榜不会清空收藏。';}).catch(()=>{$('collection-status').textContent='云端暂不可用，显示已读取收藏；未确认的发现不会冒充已保存。';});};
$('close-collection').onclick=()=>$('collection-dialog').close();$('collection-theme').innerHTML='<option value="all">全部寿司</option><option value="hidden">隐藏寿司</option>'+THEMES.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');$('collection-theme').onchange=paintCollection;
function paintMenus(){const select=$('theme-select');select.innerHTML=THEMES.map(t=>{const state=menuState(t,menuServerTime);return `<option value="${t.id}">${t.name}${state==='current'?' · 本周':state==='archive'?' · 往期':state==='permanent'?' · 常驻':' · 时间待同步'}</option>`;}).join('');select.value=selectedTheme;select.disabled=!!game&&['playing','paused','card'].includes(game.phase);const t=game?.theme||themeById(selectedTheme);$('theme-description').textContent=t.description;$('theme-save-note').textContent='限定菜单结束后保留在往期菜单，不会永久绝版。';menu();}
$('theme-select').onchange=()=>{selectedTheme=$('theme-select').value;themeChosen=true;try{localStorage.setItem('sushi.theme.v12',selectedTheme);}catch{}paintMenus();};
social.request('/api/menus').then(data=>{menuServerTime=data.serverTime;if(!themeChosen&&!game){selectedTheme=data.themes.find(t=>t.state==='current')?.id||'classic';}paintMenus();}).catch(()=>{paintMenus();$('theme-save-note').textContent='菜单时间未连接；仍可品尝经典与已知主题，收藏在联网后同步。';});
paintMenus();paintCollection();
