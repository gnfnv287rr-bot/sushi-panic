import {TasteStore} from './taste-store.js';
import {tasteUI} from './taste-ui.js';
import {tasteOf,TasteFeedback} from './taste-model.js';
import {enableTaste,TASTE_MARKER} from './casual-v141.js';
import {RunLease} from './run-lease.js';
import {friendForFood,friendSnapshot} from './friends-special.js';
import {AudioManager} from './audio-manager.js';
import { Game as LegacyGame, ALLERGEN_NAMES, STEP, difficultyAt, fullnessZone, VERSION } from './core.js';
import { Renderer, drawPortrait, drawSushi } from './renderer-cozy.js';
import {shopExperience} from './shop-experience.js';
import {SocialClient,escapeHtml} from './social.js';
import {rebuildActiveRun} from './run-state-v14.js';
import {watchIdentity,currentIdentity} from './identity.js';
import {CasualGame} from './casual-v141.js';
import {createCasual,isCasualVersion} from './casual-engine.js';
import {CATALOG as FOODS,THEMES,themeById,menuState,RARITIES,rarityOf,FEATURED} from './menus-v14.js';
const Game=CasualGame,isCasual=g=>isCasualVersion(g?.rulesVersion);
const syncedEaten=new Map();
let localSaveFailed=false;
let rankedChoice=false,menuPage=0,collectionPage=0,collectionPaintSignature='';
const collectionFilters={theme:'all',rarity:'all',sort:'recent'};
const collectionMenuName=t=>({classic:'常驻菜单','first-taste':'本期菜单',autumn:'往期菜单','friends-special':'UU和她的朋友们'}[t.id]||t.name);
let selectedTheme='friends-special',themeChosen=false,menuServerTime=null,checkpointTimer=null,checkpointBusy=false;
try{selectedTheme=localStorage.getItem('sushi.theme.v12')||'friends-special';themeChosen=!!localStorage.getItem('sushi.theme.v12');themeById(selectedTheme);}catch{selectedTheme='classic';}
const $=id=>document.getElementById(id), renderer=new Renderer($('game'));
let game=null,preview=new Game({seed:414}),lastFrame=performance.now(),accumulator=0,toastTimer,ended=false;
let practiceRun=null,autoRestoreOnLoad=true;
let restoreAttempt='',lastSavedSignature='',animationFrame=0;
const lease=new RunLease();
const loopRun=()=>isCasual(game);
const sounds=new AudioManager({onChange:()=>soundUI()});
const social=new SocialClient();let playerId=social.playerId,onlineRun=null,activeTicks=0,actionLog=[],entryBusy=false,lastReceipt=null,boardBusy=false,clockAnchor=null,identityWarning='';
const shop=shopExperience({social,getGame:()=>game,getRun:()=>onlineRun,getTheme:displayTheme,getLocalSaveFailure:()=>localSaveFailed,getUnarchived:()=>onlineRun&&['playing','paused'].includes(game?.phase)?Math.max(0,game.sushiEaten-(syncedEaten.get(onlineRun.runId)||0)):0,drawSushi,playSound:kind=>sounds.discovery(kind)});
const taste=new TasteStore({request:(...args)=>social.request(...args),onChange:()=>tasteView.paint()});
const tasteView=tasteUI({store:taste,drawSushi,onChange:()=>{renderer.getTaste=()=>taste.value;characterUI();}});
const tasteFeedback=new TasteFeedback();let tasteBubble='',tasteUntil=0,tasteTimer;
function openTaste(){if(loopRun()&&['playing','paused'].includes(game.phase))enterRest();tasteView.open();}
function tasteOwner(){const id=social.profile?.id;if(!id&&taste.owner&&taste.owner!=='practice'){taste.select('practice');return;}if(id&&taste.owner!==id){tasteBubble='';tasteFeedback.streak=0;taste.select(id);}}
const abilityText=c=>game?.tasteMode&&c.id==='yuzu'?'慢食观察家：温和消化，饱腹增量 ×1.15':c.ability;
const physique=c=>c.id==='momo'?'杂食型':c.id==='taro'?'快消化型':c.id==='yuzu'?'慢消化型':'清爽型';
preview.start();preview.character={...preview.character,allergy:'none'};
let high=0;
try{const n=Number(localStorage.getItem('sushi-panic.best.v1'));if(Number.isSafeInteger(n)&&n>=0)high=n;}catch{}
const scoreText=n=>String(Math.floor(n)).padStart(5,'0'),timeText=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function newSeed(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0];}
function tone(){sounds.confirm();}
function soundUI(){
 const s=sounds.settings,on=sounds.audible;
 $('sound').querySelector('use').setAttribute('href','#cozy-'+(on?'sound':'muted'));
 const label='音效：'+(on?'开':'关');if($('sound').querySelector('span').textContent!==label)$('sound').querySelector('span').textContent=label;
 $('sound').setAttribute('aria-pressed',String(on));
 for(const [id,key]of [['audio-music','music'],['audio-effects','effects']])$(id).checked=s[key];
 for(const [id,key]of [['audio-music-volume','musicVolume'],['audio-effects-volume','effectsVolume']]){$(id).value=Math.round(s[key]*100);$(id+'-value').textContent=Math.round(s[key]*100)+'%';}
 $('audio-mute').textContent=s.muted?'开启已选声音':'一键静音';$('audio-mute').setAttribute('aria-pressed',String(s.muted));
 $('audio-status').textContent=sounds.status==='error'?'声音暂未准备好，游戏可以照常玩；可关掉声音继续玩，网络恢复后刷新再试。':sounds.status==='loading'?'正在轻轻调音，游戏可以照常玩…':s.muted?'现在安安静静的，选好声音后再开启。':'音量轻一点，慢慢吃；离开页面会暂停声音。';
}
// Capture real input before game handlers; persisted preferences alone never autoplay.
for(const type of ['pointerdown','keydown'])document.addEventListener(type,e=>{if(e.isTrusted&&!e.repeat)sounds.unlock();},{capture:true});
function menu(){
 const pool=game&&!isCasual(game)?['salmon','tuna','shrimp','tamago','cucumber','ikura','onigiri','tea']:displayTheme().foods;
 const keys=pool.includes('taste_caramel_salmon')?[...FEATURED,'tea',...pool.filter(k=>!FEATURED.includes(k)&&k!=='tea')]:pool;
 const pages=Math.ceil(keys.length/12);menuPage=Math.min(menuPage,pages-1);const shown=keys.slice(menuPage*12,menuPage*12+12);
 $('menu').innerHTML=shown.map(key=>{const f=FOODS[key],grade=RARITIES[rarityOf(f)];return `<div class="menu-item ${game&&!game.tasteMode&&f.allergen===game.character.allergy?'allergic':''}" data-food="${key}"><canvas width="100" height="90" aria-hidden="true"></canvas><span>${escapeHtml(f.name)}<b>${f.fullness>0?'+':''}${Math.round(f.fullness*(f.fullness>0?(game?.character.portion||1)*(game&&!isCasual(game)?1:.65):1))} <small style="color:${grade?.color||'#66886d'}">${f.collectible?grade?.name||'日常':'茶饮'}</small></b></span></div>`;}).join('');
 for(const el of $('menu').children)drawSushi(el.querySelector('canvas').getContext('2d'),el.dataset.food,50,48,1.2);
 $('menu-page-info').textContent=`${keys.length}款餐品 · ${menuPage+1}/${pages}页`;$('menu-prev').disabled=menuPage===0;$('menu-next').disabled=menuPage>=pages-1;
}
function characterUI(){
  if($('theme-select'))$('theme-select').disabled=!!game&&['playing','paused','card'].includes(game.phase);
  const c=game?.character;drawPortrait($('portrait'),c);
  $('character-tag').textContent=c?'已入座':'等待入座';$('character-name').textContent=playerId||'输入你的ID';$('character-title').textContent=c?`${physique(c)} · ${onlineRun?(onlineRun.mode==='local'?'本地联调榜':onlineRun.ranked===false?'云端收藏':'联网计分'):'练习局'}`:'慢慢吃，也慢慢收藏';
  $('character-ability').textContent=c?abilityText(c):'入座抽一张体质卡，想吃什么由你决定。';
  $('allergy-name').textContent=game&&!isCasual(game)?ALLERGEN_NAMES[c.allergy]:taste.value.configured?'按你的喜好':'自由品尝';$('allergy-detail').textContent=game&&!isCasual(game)?'旧生存模式保留原规则':'心头好会开心，挑食会吐槽。都能吃，不扣分。';menu();
}
function showOverlay(html){$('overlay').classList.remove('hidden');$('overlay-content').classList.remove('record-celebration');$('overlay-content').innerHTML=html;const button=$('overlay-content').querySelector('button');if(button)button.focus({preventScroll:true});}
function home(){
  saveProgress();lease.release();game=null;onlineRun=null;practiceRun=null;ended=false;$('pause').disabled=true;characterUI();updateUI();shop.paint();
  showOverlay(`<p class="eyebrow">随时入座 · 慢慢收藏</p><h2>寿司<br><em>转转！</em></h2><div class="english-title">SUSHI LOOP</div><p>${social.profile?'欢迎回来，'+escapeHtml(playerId)+'。今天想尝哪一盘？':'取个昵称，来吃几盘喜欢的寿司。'}</p><form id="entry-form"><label class="player-id-label" for="player-id-input">你的昵称</label><input id="player-id-input" class="player-id-input" maxlength="12" autocomplete="nickname" placeholder="2–12个中文、英文或数字" value="${escapeHtml(playerId)}" required><label class="rank-choice"><input type="checkbox" id="ranked-choice" ${rankedChoice?'checked':''}> 参加今日积分榜（可选）</label><p id="entry-error" class="entry-error" role="status">${escapeHtml(identityWarning)}</p><button class="primary-button" id="new-game" type="submit">入座，开吃！ <span aria-hidden="true">→</span></button></form><p class="identity-note">${social.api?'自动记住此浏览器的匿名身份 · 允许重名':'在线身份服务待接通 · 当前可练习'}<br>绑定邮箱后可跨设备取回收藏；未绑定时，请保留浏览器数据。</p>${identityWarning?'<button id="reset-identity" class="text-button">使用新的匿名身份</button>':''}`);
  const saved=social.journal.list('active').filter(e=>e.owner===(social.profile?.id||'practice')).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];if(autoRestoreOnLoad&&saved?.run&&isCasualVersion(saved.run.rulesVersion)&&restoreAttempt!==saved.runId){autoRestoreOnLoad=false;restoreAttempt=saved.runId;queueMicrotask(()=>restoreProgress(saved));}if(saved){const button=document.createElement('button');button.id='restore-run';button.className='secondary-button';button.textContent='继续上次未结账的对局';button.onclick=()=>restoreProgress(saved);$('overlay-content').append(button);}
  $('entry-form').onsubmit=e=>{e.preventDefault();beginRun($('player-id-input').value);};
  if($('reset-identity'))$('reset-identity').onclick=async()=>{try{await social.reset();playerId='';identityWarning='';home();}catch{toast('暂时无法重置，请稍后重试',true);}};
}
async function beginRun(id){
  if(entryBusy)return;if($('ranked-choice'))rankedChoice=$('ranked-choice').checked;entryBusy=true;const button=$('new-game')||$('retry');if(button){button.disabled=true;button.textContent='正在入座…';}
  try{const legacyTest=new URLSearchParams(location.search).get('test')==='1'&&new URLSearchParams(location.search).get('casual')!=='1';const run=await social.start(id,legacyTest?{}:{rulesVersion:'1.4.1',themeId:selectedTheme,ranked:rankedChoice});if(run.runId&&!await lease.acquire(run.runId))throw new Error('这一桌在另一个窗口开着，请回到原窗口。');playerId=social.playerId;identityWarning='';tasteOwner();newGame(run.runId?{seed:run.seed,characterId:run.characterId,onlineRun:run,legacy:!isCasualVersion(run.rulesVersion)}:{});}
  catch(error){if(error.code==='identity_lost'){identityWarning=error.message;home();}if($('entry-error'))$('entry-error').textContent=error.message;else toast(error.message,true);if(button){button.disabled=false;button.textContent=button.id==='retry'?'再来一局！':'入座，开吃！ →';}}
  finally{entryBusy=false;}
}
function newGame(options={}){
  autoRestoreOnLoad=false;
  saveProgress();
  if(!playerId&&new URLSearchParams(location.search).get('test')==='1')playerId='测试食客';
  const run=options.onlineRun;game=options.legacy?new LegacyGame({seed:options.seed??newSeed(),characterId:options.characterId}):createCasual({rulesVersion:run?.rulesVersion||'1.4.1',seed:options.seed??newSeed(),characterId:options.characterId,themeId:run?.themeId||selectedTheme,knownFoods:run?.knownFoods||social.profile?.collection?.map(c=>c.sushiId)||[],menuEdition:run?.menuEdition,friendProfile:run?.friendProfile||friendSnapshot({id:social.profile?.id,nickname:playerId})});onlineRun=options.onlineRun||null;practiceRun=onlineRun?null:{runId:'practice-'+crypto.randomUUID(),online:false,seed:game.seed,rulesVersion:game.rulesVersion,themeId:game.theme?.id,menuEdition:game.menuEdition,knownFoods:[...game.knownFoods||[]],friendProfile:game.friendProfile};if(practiceRun)lease.acquire(practiceRun.runId).then(ok=>{if(ok)saveProgress();});activeTicks=0;actionLog=[];ended=false;accumulator=0;renderer.effects=[];clearTimeout(toastTimer);$('toast').classList.remove('visible');characterUI();updateUI();
  const c=game.character;
  showOverlay(`<p class="eyebrow">你的本局角色卡</p><canvas class="card-portrait" id="card-portrait" width="200" height="200" aria-hidden="true"></canvas><h2 class="card-name">${escapeHtml(playerId)}</h2><p style="margin:3px 0 10px">本局体质：${physique(c)}</p><div class="card-traits"><span>${isCasual(game)?'精神':'生命'} ${c.hp}</span><span>温和消化 ${(c.drain*(isCasual(game)?.18:1)).toFixed(2)}/秒</span></div><p style="margin-bottom:10px">${abilityText(c)}</p><div class="allergy-pill">${isCasual(game)?'每道都能吃，口味只影响小表情。':'旧生存局忌口：'+ALLERGEN_NAMES[c.allergy]}</div>${isCasual(game)?'<button id="card-taste" type="button" class="text-button">今天想吃点什么呀？选选我的口味 →</button><p class="tiny-note">可跳过，之后在设置里随时修改。</p>':''}<button class="primary-button" id="start-game">记住了，开始！</button><p class="tiny-note">${onlineRun?(onlineRun.mode==='local'?'本地联调局 · 与公网榜单独立':(onlineRun.ranked===false?'云端收藏局 · 结账保存，不参与今日榜':'联网计分局 · 结束后参与今日全球榜')):'练习局 · 未连接今日榜，本局不上榜'}</p>`);
  drawPortrait($('card-portrait'),c);if($('card-taste'))$('card-taste').onclick=openTaste;$('start-game').onclick=startGame;paintNetwork();
}
function enterRest(){if(!loopRun()||!['playing','paused'].includes(game.phase))return;if(!game.autoRest||game.phase==='playing'){if(game.rest)game.rest();else{game.pause();game.autoRest=true;}accumulator=0;saveProgress();}if(!document.querySelector('dialog[open]'))$('overlay').classList.add('hidden');updateUI();}
function startGame(){if(!game?.start())return;if(isCasual(game)&&taste.loaded&&!taste.value.configured)taste.save(taste.value);shop.paint();$('overlay').classList.add('hidden');$('pause').disabled=false;accumulator=0;lastFrame=performance.now();updateUI();renderer.draw(game,lastFrame/1000);saveProgress();paintNetwork();tone();}
function pauseGame(reason='寿司会等你。'){
  if(!game||!(game.pause()||isCasual(game)&&game.phase==='paused'&&game.autoRest))return;
  accumulator=0;saveProgress();
  showOverlay(`<p class="eyebrow">中场休息</p><h2>${game.autoRest?'偷偷打个盹儿～':'歇一口气。'}</h2><p>${reason}<br>这一桌替你留着，休息时不消耗，也不加分。</p><button class="primary-button" id="resume-game">继续开吃</button><button class="secondary-button" id="back-home">返回门口</button>`);
  if(isCasual(game)){const b=document.createElement('button');b.className='secondary-button';b.id='rest-checkout';b.textContent='结账，保存收藏';b.onclick=checkout;$('overlay-content').append(b);}
  $('resume-game').onclick=resumeGame;$('back-home').onclick=home;updateUI();
}
function resumeGame(){if(loopRun()&&(activeTicks>=6*3600*60||actionLog.length>=24998)){toast('这桌的用餐记录满啦，结账保存后再来一桌。');return;}if(!game?.resume())return;if(isCasual(game)&&(onlineRun||practiceRun))actionLog.push([activeTicks,0]);$('overlay').classList.add('hidden');accumulator=0;lastFrame=performance.now();updateUI();}
function finish(){
  if(practiceRun)social.journal.remove(practiceRun.runId);
  if(ended||!game)return;ended=true;$('pause').disabled=true;$('theme-select').disabled=false;lastReceipt=null;
  if(game.score>high){high=game.score;try{localStorage.setItem('sushi-panic.best.v1',String(high));}catch{}}
  $('best-score').textContent=scoreText(high);drawPortrait($('portrait'),game.character,'sad');
  showOverlay(`<p class="eyebrow">${escapeHtml(playerId)} · 本桌已结账</p><h2 style="font-size:25px">${game.deathReason}</h2><div class="result-score" id="confirmed-score">${scoreText(game.score)}</div><div class="receipt-stats"><span><b>${timeText(game.time)}</b>${isCasual(game)?'用餐时间':'生存时间'}</span><span><b>${game.sushiEaten}</b>寿司盘数</span><span><b>${game.bestCombo}</b>最高连击</span></div><div class="result-totals"><span><b id="result-today">—</b>今日最高</span><span><b id="result-best">—</b>历史最高</span><span><b id="result-rank">—</b>今日全球排名</span></div><p id="result-badges" class="result-badges" role="status"></p><p id="rank-result" class="rank-result" role="status">${onlineRun?'提交中 · 正在核验本局积分…':'练习局 · 本局不上传今日榜'}</p><details class="receipt-detail"><summary>看看这桌小票</summary><p id="result-times" class="receipt-times"></p></details><div class="result-actions"><button class="primary-button" id="retry">再来一局！</button><button class="secondary-button" id="result-board">查看排行榜</button><button class="secondary-button" id="result-share">分享成绩</button><button class="secondary-button" id="result-submit" disabled>重试提交</button></div><button class="text-button" id="result-home">回到门口 / 修改昵称</button>`);
  $('retry').onclick=()=>beginRun(playerId);$('result-home').onclick=home;$('result-board').onclick=showLeaderboard;$('result-share').onclick=shareScore;$('result-submit').onclick=async()=>{const b=$('result-submit');b.disabled=true;try{const results=await social.retry();for(const r of results){if(r.result&&r.result.runId===onlineRun?.runId)applyReceipt(r.result);else if(r.error)$('rank-result').textContent='提交未完成：'+r.error;}await refreshLeaderboard();}finally{if($('result-submit')&&social.pending.some(e=>e.runId===onlineRun?.runId))$('result-submit').disabled=false;}};
  if(onlineRun){const finished=game;social.submit(onlineRun,activeTicks,actionLog,isCasual(game)?{checkout:true}:{}).then(data=>{if(game!==finished||!$('rank-result'))return;applyReceipt(data.result);paintBoard(data.board);paintCollection();}).catch(error=>{if(game===finished&&$('rank-result')){$('rank-result').textContent=error.code==='quarantined'?'成绩待核查 · 暂不计入排行榜':error.saved?'提交失败 · 等待重试，打开榜单可重试上传':`未上榜：${error.message}`;if($('result-submit'))$('result-submit').disabled=!error.saved;}});}
}
function bjTime(value){return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value));}
function applyReceipt(result){
  lastReceipt=result;localSaveFailed=false;paintNetwork();if(!$('rank-result'))return;if($('result-submit')){$('result-submit').disabled=true;$('result-submit').textContent='成绩已同步';}
  $('confirmed-score').textContent=scoreText(result.score);$('result-today').textContent=result.todayBest==null?'暂无':scoreText(result.todayBest);$('result-best').textContent=scoreText(result.allTimeBest);$('result-rank').textContent=result.rank?'第 '+result.rank+' 名':'暂无';
  $('rank-result').textContent='提交成功 · 这桌已记进云端手帐'+(result.ranked===false?' · 本局仅收藏，不参加排名':'')+(social.mode==='local'?'（本地联调榜）':'');
  const badges=[];if(result.personalRecord)badges.push('新的个人纪录！');if(result.dailyRecord)badges.push('今日最佳成绩刷新！');if(result.enteredTop100)badges.push('成功进入今日排行榜！');if(result.champion)badges.push('今日榜首！');$('result-badges').textContent=badges.join(' ');
  if(badges.length)$('overlay-content').classList.add('record-celebration');
  $('result-times').textContent=`成绩归属 ${result.day}（北京时间） · 开始 ${bjTime(result.startedAt)} · 结束 ${bjTime(result.endedAt)} · 排名查询 ${bjTime(result.rankQueriedAt)}`;
}
async function shareScore(){
 const r=lastReceipt;const text=r?`🍣 SUSHI LOOP《寿司转转！》\n我在 ${r.day} 拿下了 ${r.score} 分！\n${r.rank?`当天全球排名第 ${r.rank} 名！（北京时间 ${bjTime(r.rankQueriedAt)} 查询）`:'本局仅收藏，未参与今日排名。'}\n敢不敢来挑战？\n游戏链接：${location.origin+location.pathname}`:`🍣 SUSHI LOOP《寿司转转！》\n我刚完成一局寿司挑战，敢不敢来试试？\n本局尚无已确认的全球排名。\n游戏链接：${location.protocol==='file:'?'请使用在线版分享':location.origin+location.pathname}`;
 try{await navigator.clipboard.writeText(text);toast('分享文案已复制，发给朋友来挑战！');}
 catch{const area=document.createElement('textarea');area.className='share-copy';area.readOnly=true;area.value=text;area.setAttribute('aria-label','分享文案，请选中复制');$('overlay-content').append(area);area.focus();area.select();}
}
function toast(message,bad=false){$('toast').textContent=message;$('toast').classList.toggle('bad',bad);$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),1500);}
function paintBoard(board){
  if(!board)return;
  social.lastBoard=board;social.mode=board.mode||social.mode;clockAnchor={time:Date.parse(board.serverTime),reset:Date.parse(board.resetsAt),at:performance.now()};
  const local=board.mode==='local';$('board-day').textContent=board.day;$('mini-board-day').textContent=board.day+(local?' · 本地联调':'');
  $('board-champion').innerHTML=board.entries.length?`<span class="sushi-medal"><canvas width="80" height="58" data-medal aria-hidden="true"></canvas><small>大胃王</small></span><span><small>今天吃得最开心的客人</small><strong>${escapeHtml(board.entries[0].nickname)}</strong></span>`:'今日首位大胃王，等你来开席。';
  $('board-status').textContent=board.entries.length?(local?'本地测试榜，与公网独立':'每人每日最高积分 · 同分先达到者优先'):'今天还没有已验证成绩，来吃下第一份荣耀。';
  const own=board.me?.playerId;
  const list=$('board-list'),scroll=list.scrollTop;
  list.innerHTML=board.entries.map(row=>`<li class="board-row ${row.rank===1?'champion-row':''} podium-${row.rank<=3?row.rank:0} ${row.playerId===own?'is-me':''}"><span class="board-position">${row.rank===1?'<span class="sushi-medal"><canvas width="80" height="58" data-medal aria-hidden="true"></canvas><small>大胃王</small></span>':row.rank}</span><div class="board-player"><strong>${escapeHtml(row.nickname)}${row.playerId===own?' · 我':''}</strong><small>食客 ${row.playerId.slice(-4)}${row.rank===1?' · 第1名':''}</small></div><b>${scoreText(row.score)}<small>积分</small></b></li>`).join('');list.scrollTop=scroll;
  const me=board.me?`我 · 第 ${board.me.rank} 名 · ${board.me.score} 分`:board.identityUnavailable||!board.profile&&social.profile?.id?'身份暂未确认 · 本人名次待重新连接':'我 · 今日尚无已验证成绩';$('board-me').textContent=me;$('mini-board-me').textContent=me;
  $('board-updated').textContent='排名查询：北京时间 '+bjTime(board.serverTime)+' · 可主动刷新，浏览时每60秒同步';
  $('mini-board-list').innerHTML=board.entries.slice(0,5).map(row=>`<li class="${row.playerId===own?'is-me':''}"><span class="mini-position">${row.rank===1?'<span class="mini-medal">🍣<small>大胃王</small></span>':row.rank}</span><strong>${escapeHtml(row.nickname)}</strong><b>${row.score}</b></li>`).join('');
  $('mini-board-status').textContent=board.entries.length?(local?'本地联调榜 · 非全球成绩':'今日前五名 · 完整榜单 TOP 100'):'今天的第一张小餐券，还在等你。';for(const c of document.querySelectorAll('[data-medal]'))drawSushi(c.getContext('2d'),'salmon',40,33,.68);tickCountdown();
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
function showLeaderboard(){if(game?.phase==='playing')pauseGame('看完今日榜，再继续开吃。');if(!$('leaderboard-dialog').open)$('leaderboard-dialog').showModal();selectNavigation('leaderboard');refreshLeaderboard();}

function eatTarget(target){
  if(!target||!game)return;
  if((onlineRun||practiceRun)&&(lease.id!==(onlineRun||practiceRun).runId||!lease.valid())){enterRest();toast('这一桌已在另一个窗口继续，请回原窗口操作',true);return;}
  if(loopRun()&&game.autoRest&&game.phase==='paused'&&!document.querySelector('dialog[open]')){resumeGame();if(game.phase!=='playing')return;}
  const e=game.eat(target.id);if(!e){if(isCasual(game))toast(game.fullness>100?'胃里满满的，先喝茶或休息':target.key==='tea'?'现在不需要喝茶，挑一盘寿司吧':'慢慢来，一次一口');return;}
  if(onlineRun||practiceRun)actionLog.push([activeTicks,target.id]);
  renderer.bite(target,e);sounds.eat(FOODS[e.item.key]);toast(e.newDiscovery?'新发现！'+FOODS[e.item.key].name:e.text,e.type==='allergy');if(isCasual(game)){shop.discover(e);paintCollection();scheduleCollectionSync();}shop.paint();
  // Effects are handled once at input time; the engine keeps only a bounded event history.
  const friend=loopRun()&&game.theme.id==='friends-special'&&game.friendProfile?.foodId===e.item.key?friendForFood(e.item.key):null;if(friend)sounds.confirm();if(game.tasteMode){const kind=tasteOf(e.item.key,taste.value),line=tasteFeedback.bite(kind);tasteBubble=[line,friend?.easterEgg].filter(Boolean).join(' · ');tasteUntil=performance.now()+3000;$('chef').dataset.taste=kind;clearTimeout(tasteTimer);tasteTimer=setTimeout(()=>{tasteBubble='';$('chef').dataset.taste='neutral';updateUI();},3000);}else if(friend)toast(friend.easterEgg);
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
  $('game-hint').innerHTML=`<span class="hint-dot"></span>${g&&!isCasual(g)?`本局忌口：${ALLERGEN_NAMES[g.character.allergy]}`:'点击盘子慢慢吃 · 口味只影响小表情'}`;
  if(isCasual(g)){ $('health-status').textContent=hp<40?'歇一会儿也很好':'慢慢享用';$('zone-text').textContent=full>100?'肚子满满 · 抿口茶':full<25?'肚子咕咕 · 吃一口':'吃得刚刚好';$('scene-warning-detail').textContent=full>85?'先歇一口，乌龙茶能帮忙消化':'挑一盘喜欢的寿司，不用着急';$('scene-warning-title').textContent=full>85?'猫师傅：先抿口茶吧':full<25?'肚子咕咕，来一口？':'';cue.dataset.severity='caution';$('checkout').disabled=!['playing','paused'].includes(g.phase);}else $('checkout').disabled=true;
  $('pause').disabled=!g||!['playing','paused'].includes(g.phase);
  $('pause').setAttribute('aria-pressed',String(g?.phase==='paused'));
  $('pause').setAttribute('aria-label',g?.phase==='paused'?'继续游戏':'暂停游戏');
  $('pause').querySelector('span').textContent=g?.phase==='paused'?'继续慢慢吃':'歇一歇';
  $('cozy-tea-action').disabled=!(g?.phase==='playing'||loopRun()&&g.autoRest)||!g.foods.some(f=>f.key==='tea');
  $('idle-rest').hidden=!(loopRun()&&g?.autoRest&&g.phase==='paused');
  if(performance.now()>=tasteUntil){tasteBubble='';$('chef').dataset.taste='neutral';}
  $('chef-copy').textContent=tasteBubble|| (g?.phase==='paused'?'这一桌，替你留着。':full>85?'先抿口茶，好味道会等你。':full<25?'肚子咕咕，来吃一口吧。':'慢慢来，好味道会等你。');
}
function frame(now){
 if(loopRun()&&game.autoRest&&game.phase==='paused'&&now-lastFrame<1000/30){animationFrame=requestAnimationFrame(frame);return;}
 const realDt=Math.max(0,(now-lastFrame)/1000);lastFrame=now;
 if(document.hidden){animationFrame=0;return;}
 if(game?.phase==='playing'){
  if(realDt>.5){if(loopRun())enterRest();else pauseGame('刚才画面停顿，已替你暂停。');}
  else{accumulator+=realDt;while(accumulator>=STEP&&game.phase==='playing'){if(loopRun()&&(activeTicks>=6*3600*60||actionLog.length>=24998)){enterRest();toast('这桌的用餐记录满啦，结账保存后再来一桌。');break;}game.step(STEP);activeTicks++;accumulator-=STEP;}updateUI();if(game.phase==='gameover')finish();else if(game.autoRest){if(loopRun())enterRest();else pauseGame('刚才没有操作，已替你歇一会儿。');}}
 }
 if(loopRun()&&game.autoRest&&game.phase==='paused')game.restTravel=((game.restTravel||0)+Math.min(realDt,.05)*.008)%1;
 if(!game){preview.time+=Math.min(realDt,.1);const speed=.018;preview.beltTravel+=Math.min(realDt,.1)*speed;for(const f of preview.foods)f.p=(f.p+Math.min(realDt,.1)*speed)%1;}
 renderer.draw(game??preview,now/1000,Math.min(realDt,.05));animationFrame=requestAnimationFrame(frame);
}
renderer.onEat=eatTarget;
$('cozy-menu-open').onclick=()=>$('today-menu').click();
$('cozy-tea-action').onclick=()=>eatTarget(renderer.targets.find(t=>t.key==='tea'));
for(const c of document.querySelectorAll('[data-cozy-food]'))drawSushi(c.getContext('2d'),c.dataset.cozyFood,c.width/2,c.height*.53,c.width<80?.52:.76);
$('game').addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary||!(game?.phase==='playing'||loopRun()&&game.autoRest))return;e.preventDefault();const b=$('game').getBoundingClientRect();eatTarget(renderer.hit(e.clientX-b.left,e.clientY-b.top));});
$('game').addEventListener('pointermove',e=>{const b=$('game').getBoundingClientRect();renderer.hover=renderer.hit(e.clientX-b.left,e.clientY-b.top)?.id??null;});
$('game').addEventListener('pointerleave',()=>renderer.hover=null);
$('pause').onclick=()=>game?.phase==='paused'?resumeGame():pauseGame();
document.querySelector('.brand').onclick=e=>{e.preventDefault();home();};
$('sound').onclick=()=>{if(game?.phase==='playing')pauseGame('调好小店的声音，再继续。');soundUI();$('audio-dialog').showModal();selectNavigation('sound');};
$('close-audio').onclick=()=>$('audio-dialog').close();
$('audio-taste').onclick=()=>{$('audio-dialog').close();openTaste();};$('taste-open').onclick=openTaste;$('taste-nudge-open').onclick=openTaste;
for(const [id,key]of [['audio-music','music'],['audio-effects','effects']])$(id).onchange=()=>{sounds.unlock();sounds.configure({[key]:$(id).checked,...($(id).checked?{muted:false}:{})});if(key==='effects'&&sounds.settings.effects)sounds.confirm();};
for(const [id,key]of [['audio-music-volume','musicVolume'],['audio-effects-volume','effectsVolume']])$(id).oninput=()=>{sounds.unlock();sounds.configure({[key]:Number($(id).value)/100});};
$('audio-mute').onclick=()=>{sounds.unlock();sounds.configure({muted:!sounds.settings.muted});};
$('help').onclick=()=>{if(game?.phase==='playing')pauseGame('菜单还在，看完玩法再继续。');$('help-dialog').showModal();selectNavigation('help');};
$('leaderboard').onclick=showLeaderboard;$('sidebar-leaderboard').onclick=showLeaderboard;$('board-refresh').onclick=()=>refreshLeaderboard();$('close-board').onclick=()=>$('leaderboard-dialog').close();
$('account').onclick=()=>{if(game?.phase==='playing')pauseGame('保存或恢复后，再继续开吃。');$('account-dialog').showModal();selectNavigation('account');shop.refreshAuth();$('account-status').textContent='';if(!social.local&&!social.emailAvailable){$('bind-email').disabled=true;$('recover-email').disabled=true;$('account-status').textContent='邮箱存档暂未开放。当前浏览器会记住游客身份；清除网站数据或更换设备后，可能无法恢复。';}paintArchive();social.initialize().then(paintArchive).catch(()=>{});if(!social.local&&social.emailAvailable)currentIdentity().then(u=>{if(u?.email_confirmed_at&&!u.is_anonymous)$('account-status').textContent='邮箱已验证 · 可以在其他设备通过邮件恢复此档案';}).catch(()=>{});};
function paintArchive(){const p=social.profile;$('account-archive').innerHTML=p?`<h3>我的历史成绩</h3><p>历史最高 <b>${p.bestScore}</b> · 累计 ${p.playCount} 局<br>累计寿司 ${p.totalSushi??0} 盘 · 已收藏 ${(p.collection||[]).length} 种<br>累计有效积分 ${p.totalScore} · 每日冠军 ${p.championships} 次</p><ol>${(p.dailyHistory||[]).map(row=>`<li><span>${escapeHtml(row.day)}</span><b>${row.score} 分</b></li>`).join('')}</ol><p class="identity-note">食客ID ${escapeHtml(p.id.slice(-8))} · 显示最近31个有成绩的日期，全部历史保存在服务器。</p>`:'完成联网计分局后，这里会显示你的历史成绩。';}
$('close-account').onclick=()=>$('account-dialog').close();
let emailOperation=null;
async function emailSubmit(recover){const buttons=[$('bind-email'),$('recover-email')];buttons.forEach(b=>b.disabled=true);$('account-status').textContent='正在请求发送邮件…';try{const email=$('account-email').value.trim();await social.email(email,recover);emailOperation={email,recover};$('email-code-section').hidden=false;$('account-status').textContent='邮件请求已受理，请在这里输入邮件中的验证码。未验证前尚未绑定或恢复。';}catch(error){$('account-status').textContent=error.message;}finally{buttons.forEach(b=>b.disabled=!social.local&&!social.emailAvailable);}}
$('bind-email').onclick=()=>emailSubmit(false);$('recover-email').onclick=()=>emailSubmit(true);
$('verify-email').onclick=async()=>{if(!emailOperation)return;const button=$('verify-email');button.disabled=true;saveProgress();const previous=social.profile?.id;try{await social.verifyEmail(emailOperation.email,$('account-code').value,emailOperation.recover);playerId=social.profile.nickname;$('account-code').value='';emailOperation=null;$('account-status').textContent='邮箱验证成功 · 云端档案已恢复';$('email-code-section').hidden=true;shop.refreshAuth();paintArchive();if(previous!==social.profile.id){game=null;onlineRun=null;home();}await refreshLeaderboard();}catch(error){$('account-status').textContent=error.message;}finally{button.disabled=false;}};
$('close-help').onclick=()=>$('help-dialog').close();
$('help-dialog').addEventListener('click',e=>{if(e.target===$('help-dialog')){const r=$('help-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('help-dialog').close();}});
document.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||$('food-detail-dialog').open||$('help-dialog').open||$('leaderboard-dialog').open||$('account-dialog').open||$('collection-dialog').open||$('menu-dialog').open||$('audio-dialog').open||$('taste-dialog').open||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;
  if(e.code==='KeyP'||e.code==='Escape'){if(game?.phase==='playing'){e.preventDefault();pauseGame();}else if(game?.phase==='paused'){e.preventDefault();resumeGame();}}
  if(/^[1-8]$/.test(e.key)&&(game?.phase==='playing'||loopRun()&&game.autoRest)){e.preventDefault();eatTarget(renderer.targets.find(f=>f.number===Number(e.key)));}
});
document.addEventListener('visibilitychange',()=>{sounds.setVisible(!document.hidden);if(document.hidden){if(loopRun())enterRest();else pauseGame('切换页面时，已替你暂停。');saveProgress(true);cancelAnimationFrame(animationFrame);animationFrame=0;}else{lastFrame=performance.now();accumulator=0;if(!animationFrame)animationFrame=requestAnimationFrame(frame);}});
window.addEventListener('blur',()=>{if(game?.phase==='playing'){if(loopRun())enterRest();else pauseGame('离开窗口时，已替你暂停。');}});
new ResizeObserver(()=>renderer.resize()).observe($('stage'));
if(new URLSearchParams(location.search).get('test')==='1'){
  // Explicit test-only seam; normal builds expose no mutation hook.
  window.__sushi={audio:sounds,get game(){return game;},renderer,newGame(options={}){newGame({...options,legacy:options.casual!==true});},checkout,start:startGame,advance(seconds){for(let i=0;i<Math.ceil(seconds/STEP)&&game?.phase==='playing';i++){game.step(STEP);activeTicks++;}updateUI();if(game?.phase==='gameover')finish();else if(game.autoRest){if(loopRun())enterRest();else pauseGame('没有操作，已自动休息。');}},snapshot:()=>game?.snapshot(),version:VERSION};
}
$('best-score').textContent=scoreText(high);soundUI();home();animationFrame=requestAnimationFrame(frame);
try{if(navigator.getAutoplayPolicy?.('audiocontext')==='allowed')sounds.unlock();}catch{}
social.initialize().then(()=>{playerId=social.playerId;if(document.documentElement.dataset.emailLinkIgnored)identityWarning='为保护已有存档，邮件链接不会自动切换身份。请点存档，用邮箱验证码恢复。';if(!game&&document.activeElement!==$('player-id-input'))home();}).catch(error=>{if(error.code==='identity_lost'){identityWarning=error.message;if(!game)home();}});
refreshLeaderboard({quiet:true});
setInterval(tickCountdown,1000);
setInterval(()=>{if(!document.hidden&&($('leaderboard-dialog').open||$('daily-board-panel').getBoundingClientRect().width>0))refreshLeaderboard({quiet:true});},60000);
window.addEventListener('online',()=>{taste.refresh();return social.initialize().catch(()=>{}).finally(()=>refreshLeaderboard({quiet:true}));});

function paintNetwork(){shop.paint();const el=$('network-status');if(!el)return;const count=social.pending.filter(e=>!e.owner||e.owner===social.profile?.id).length;
 el.dataset.state=count?'pending':game&&!onlineRun?'practice':social.profile?'online':'connecting';
 el.textContent=count?`有 ${count} 局成绩等待同步 · 可点重新连接重试`:game&&!onlineRun?'当前是练习局 · 本局不会上榜，请重新连接后另开一局':social.profile?(onlineRun?(onlineRun.ranked===false?'云端收藏局 · 结账后保存收藏与个人纪录':'联网计分局 · 本局结束后自动上榜'):'云端档案已连接 · 输入昵称即可开玩'):social.lastError?'身份暂未连接 · 榜单仍可查看':'正在连接游客档案 · 榜单与本机纪录分开保存';
}
function saveProgress(force=false){
 const run=onlineRun||practiceRun;if(!run||!game||!['playing','paused'].includes(game.phase))return;
 if(lease.id!==run.runId||!lease.valid())return;
 const signature=[run.runId,activeTicks,actionLog.length,game.phase,game.autoRest].join(':');if(!force&&signature===lastSavedSignature)return;
 const saved=social.journal.write({saveVersion:2,kind:'active',owner:social.profile?.id||'practice',runId:run.runId,run,body:{ticks:activeTicks,actions:[...actionLog]},presentation:{restTravel:game.restTravel||0,phase:game.phase,autoRest:game.autoRest},updatedAt:Date.now()});
 localSaveFailed=!saved;if(saved)lastSavedSignature=signature;shop.paint();if(!saved)$('network-status').textContent='浏览器未能保存对局，请保持页面开启，结束后确认成绩已提交';
}
async function restoreProgress(entry){try{if(!await lease.acquire(entry.runId)){toast('这一桌还在另一个窗口开着，回原窗口继续就好。',true);return;}game=rebuildActiveRun(entry);onlineRun=entry.run.online===false?null:entry.run;practiceRun=entry.run.online===false?entry.run:null;activeTicks=entry.body.ticks;actionLog=[...entry.body.actions];if(isCasual(game)&&!game.tasteMode){enableTaste(game);actionLog.push([activeTicks,TASTE_MARKER]);}ended=false;accumulator=0;lastFrame=performance.now();renderer.effects=[];characterUI();updateUI();if(game.phase==='gameover')finish();else if(loopRun()){$('overlay').classList.add('hidden');enterRest();toast('这桌替你留好了，点一盘继续。');}else pauseGame('已恢复上次对局；未操作期间没有消耗饱腹。');paintNetwork();}catch(error){lease.release();toast(error.message,true);}}
social.onState=()=>{tasteOwner();paintNetwork();if($('collection-dialog').open&&collectionPaintSignature!==collectionSignature())paintCollection();};paintNetwork();setInterval(saveProgress,5000);window.addEventListener('pagehide',()=>{saveProgress(true);lease.release();});
window.addEventListener('pageshow',async e=>{if(e.persisted&&onlineRun&&!await lease.acquire(onlineRun.runId)){enterRest();toast('这一桌已在另一个窗口继续。',true);}});
$('retry-network').onclick=async()=>{const b=$('retry-network');b.disabled=true;try{await social.initialize();if(!game){playerId=social.playerId;home();}await refreshLeaderboard();paintNetwork();}catch(error){social.lastError=error.message;paintNetwork();toast(error.message,true);await refreshLeaderboard();}finally{b.disabled=false;}};
$('copy-diagnostics').onclick=async()=>{const text=JSON.stringify({version:'1.4.1',url:location.origin+location.pathname,apiHost:social.api?new URL(social.api).host:null,identity:social.profile?.id?.slice(-8)||null,mode:social.mode,run:onlineRun?'online':game?'practice':'home',pending:social.pending.length,day:social.lastBoard?.day,error:social.lastError||null},null,2);try{await navigator.clipboard.writeText(text);toast('诊断已复制，不包含密码或登录凭据');}catch{toast('浏览器不允许复制，请记录联网状态提示',true);}};
if(social.api&&!social.local)watchIdentity((event,id)=>{if(!['SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event)||id===social.profile?.id&&event!=='USER_UPDATED')return;saveProgress();if(game&&id!==social.profile?.id){game=null;onlineRun=null;}social.initialize().then(()=>{playerId=social.playerId;if(document.documentElement.dataset.emailLinkIgnored)identityWarning='为保护已有存档，邮件链接不会自动切换身份。请点存档，用邮箱验证码恢复。';if(!game)home();shop.refreshAuth();paintArchive();refreshLeaderboard({quiet:true});}).catch(error=>{social.lastError=error.message;paintNetwork();});}).catch(()=>{});

function checkout(){if(!isCasual(game)||!game.checkout())return;clearTimeout(checkpointTimer);finish();}
$('checkout').onclick=checkout;
function scheduleCollectionSync(){if(!onlineRun||!isCasual(game)||checkpointTimer)return;checkpointTimer=setTimeout(()=>{checkpointTimer=null;syncCollection();},8000);}
async function syncCollection(){if(checkpointBusy||!onlineRun||!isCasual(game)||!['playing','paused'].includes(game.phase)||game.sushiEaten<=(syncedEaten.get(onlineRun.runId)||0))return;const run=onlineRun,owner=social.profile?.id,eaten=game.sushiEaten;checkpointBusy=true;const body={ticks:activeTicks,actions:[...actionLog]};try{await social.checkpoint(run,body);syncedEaten.set(run.runId,eaten);if(owner===social.profile?.id){paintCollection();$('collection-status').textContent='收藏已保存至云端';}}catch{$('collection-status').textContent='收藏待同步 · 此浏览器已保留本局，联网后重试或结账';}finally{checkpointBusy=false;}}
setInterval(()=>{if(!document.hidden)syncCollection();},20000);
window.addEventListener('online',()=>syncCollection());
function collectionSignature(){return JSON.stringify([social.profile?.id,social.profile?.collection,social.profile?.totalSushi]);}
function paintCollection(){collectionPaintSignature=collectionSignature();const profile=social.profile,counts=new Map((profile?.collection||[]).map(c=>[c.sushiId,c]));shop.paint();const local=new Set(shop.pendingIds());const filter=collectionFilters.theme,tier=collectionFilters.rarity,query=$('collection-search').value.trim();
 const list=Object.values(FOODS).filter(f=>f.collectible&&(filter==='all'||f.themeId===filter)&&(tier==='all'||rarityOf(f)===tier)&&(!query||f.name.includes(query)||String(f.number).includes(query))).sort((a,b)=>collectionFilters.sort==='number'?a.number-b.number:Number(counts.has(b.id)||local.has(b.id))-Number(counts.has(a.id)||local.has(a.id))||shop.recent(b.id,counts.get(b.id))-shop.recent(a.id,counts.get(a.id))||a.number-b.number);
 const pages=Math.max(1,Math.ceil(list.length/24));collectionPage=Math.min(collectionPage,pages-1);const shown=list.slice(collectionPage*24,collectionPage*24+24);
 $('collection-summary').textContent=profile?`${counts.size} / ${Object.values(FOODS).filter(f=>f.collectible).length} 种${social.local?'本地联调已确认':'云端已收藏'} · 累计 ${profile.totalSushi||0} 盘${[...local].some(id=>!counts.has(id))?' · 另有 '+[...local].filter(id=>!counts.has(id)&&FOODS[id]?.collectible).length+' 种本机待确认':''}`:'第一口寿司，还在等你呢！入座后会替你记进手帐。';
 $('collection-grid').innerHTML=shown.length?shown.map(f=>{const owned=counts.get(f.id),pending=local.has(f.id)&&!owned,known=!!owned||pending,grade=RARITIES[rarityOf(f)];return `<article class="collection-card ${known?'unlocked':'locked'} ${known&&shop.book.unseen(f.id)?'is-new':''}" data-sushi-id="${f.id}" ${f.friendId&&known?'data-friend="'+f.friendId+'" tabindex="0" role="button" aria-label="查看'+escapeHtml(f.name)+'的收藏卡"':''} data-rarity="${rarityOf(f)}">${known&&shop.book.unseen(f.id)?'<span class="new-tag">NEW</span>':''}<small>NO.${String(f.number).padStart(3,'0')} · <span style="color:${grade.color}">${grade.name}</span></small><canvas width="120" height="90" data-sushi="${f.id}" aria-label="${known?escapeHtml(f.name):'未发现寿司剪影'}"></canvas><h3>${known?escapeHtml(f.name):'？？？'}</h3><p>${known?escapeHtml(flavorCopy(f)):'主厨留了一点小惊喜。'}</p><b>${owned?`已品尝 ${owned.tasteCount} 次`:pending?'新发现 · 等待云端确认':'等你来尝鲜'}</b>${owned?`<small>初遇 ${bjTime(owned.firstDiscoveredAt)}</small>`:''}</article>`;}).join(''):'<p class="collection-empty">还没找到这道寿司，换个分类或关键词试试。<br>也可以点「重置筛选」重新翻看。</p>';for(const c of $('collection-grid').querySelectorAll('canvas'))drawSushi(c.getContext('2d'),c.dataset.sushi,60,48,.9);
 $('collection-page-info').textContent=`${list.length}款 · 第${collectionPage+1}/${pages}页`;$('collection-prev').disabled=collectionPage===0;$('collection-next').disabled=collectionPage>=pages-1;
 shop.observeCards();$('theme-progress').innerHTML=THEMES.map(t=>{const ids=(t.collectionFoods||t.foods).filter(k=>FOODS[k].collectible);return `<span title="${escapeHtml(t.name)}">${escapeHtml(collectionMenuName(t))}<b>${ids.filter(k=>counts.has(k)).length}/${ids.length}</b></span>`;}).join('');
 for(const [key,id] of Object.entries({theme:'collection-theme',rarity:'collection-rarity',sort:'collection-sort'}))for(const button of $(id).querySelectorAll('button[data-value]'))button.setAttribute('aria-pressed',String(button.dataset.value===collectionFilters[key]));
 $('collection-reset').disabled=filter==='all'&&tier==='all'&&collectionFilters.sort==='recent'&&!query;
}
$('collection').onclick=()=>{if(game?.phase==='playing')pauseGame('图鉴替你留着每一次小发现。');paintCollection();$('collection-dialog').showModal();sounds.setAlbum(true);sounds.paper('open');selectNavigation('collection');shop.observeCards();$('collection-status').textContent='正在翻开云端手帐…';social.initialize().then(()=>{if(collectionPaintSignature!==collectionSignature())paintCollection();$('collection-status').textContent=social.local?'本地联调手帐已读到，与正式云端分开保存。':'云端已读到，今天的收藏也在这里。每日换榜不清空手帐。';}).catch(()=>{$('collection-status').textContent='云端暂不可用，显示已读取收藏；未确认的发现不会冒充已保存。';});};
$('close-collection').onclick=()=>$('collection-dialog').close();
$('collection-dialog').addEventListener('close',()=>{sounds.setAlbum(false);sounds.paper('close');});
$('collection-theme').innerHTML='<button type="button" data-value="all" aria-pressed="true">全部</button>'+THEMES.map(t=>`<button type="button" data-value="${escapeHtml(t.id)}" aria-pressed="false" title="${escapeHtml(t.name)}">${escapeHtml(collectionMenuName(t))}</button>`).join('');
for(const [key,id] of Object.entries({theme:'collection-theme',rarity:'collection-rarity',sort:'collection-sort'}))$(id).addEventListener('click',event=>{const button=event.target.closest('button[data-value]');if(!button)return;collectionFilters[key]=button.dataset.value;collectionPage=0;paintCollection();});
$('collection-search').addEventListener('input',()=>{collectionPage=0;paintCollection();});
$('collection-reset').onclick=()=>{Object.assign(collectionFilters,{theme:'all',rarity:'all',sort:'recent'});$('collection-search').value='';collectionPage=0;paintCollection();};
$('collection-prev').onclick=()=>{sounds.paper('page');collectionPage--;paintCollection();$('collection-grid').scrollIntoView({block:'start'});};$('collection-next').onclick=()=>{sounds.paper('page');collectionPage++;paintCollection();$('collection-grid').scrollIntoView({block:'start'});};
$('menu-prev').onclick=()=>{menuPage--;menu();};$('menu-next').onclick=()=>{menuPage++;menu();};
function paintMenus(){const select=$('theme-select');select.innerHTML=THEMES.map(t=>{const state=menuState(t,menuServerTime);return `<option value="${t.id}">${t.name}${state==='current'?' · 本周':state==='archive'?' · 往期':state==='permanent'?' · 常驻':' · 时间待同步'}</option>`;}).join('');select.value=selectedTheme;select.disabled=!!game&&['playing','paused','card'].includes(game.phase);const t=displayTheme();$('cozy-theme-name').textContent=t.name;paintCozyMenuCards(t,select.disabled);$('theme-description').textContent=themeCopy(t);document.querySelector('.menu-panel').dataset.theme=t.id;shop.paint();if($('menu-picker')){$('menu-picker').innerHTML=select.innerHTML;$('menu-picker').value=selectedTheme;$('menu-picker').disabled=select.disabled;$('menu-picker-note').textContent=select.disabled?'这桌先慢慢吃，结账回门口后可以换菜单。':themeCopy(t);}$('theme-save-note').textContent='想念的味道会留在往期，随时回来尝。';menu();}
$('theme-select').onchange=()=>{sounds.confirm();selectedTheme=$('theme-select').value;menuPage=0;themeChosen=true;try{localStorage.setItem('sushi.theme.v12',selectedTheme);}catch{}paintMenus();};
social.request('/api/menus').then(data=>{menuServerTime=data.serverTime;if(!themeChosen&&!game){selectedTheme=data.themes.find(t=>t.id==='friends-special')?.id||data.themes.find(t=>t.state==='current')?.id||'classic';}paintMenus();}).catch(()=>{paintMenus();$('theme-save-note').textContent='菜单时间未连接；仍可品尝经典与已知主题，收藏在联网后同步。';});
paintMenus();paintCollection();

function themeCopy(t){return t.id==='friends-special'?'七位朋友的心头好，人人都能收藏。用朋友昵称来玩，还会更常遇到自己的那一盘。':t.id==='first-taste'?'188款熟悉好味，加上28道本期小惊喜。慢慢找，下一盘说不定就是心头好。':t.id==='classic'?'熟悉的188款常驻好味，随时为你开席。喝口茶，慢慢挑。':'秋天的好味道留着呢，再来尝一盘。';}
function selectNavigation(id){for(const b of document.querySelectorAll('.nav-button[aria-controls]')){const active=b.id===id;b.classList.toggle('is-active',active);b.setAttribute('aria-expanded',String(active));if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('close',()=>selectNavigation('today-menu'));
$('open-progress').onclick=()=>$('collection').click();
$('today-menu').onclick=()=>{if(game?.phase==='playing')pauseGame('主厨把菜单递过来啦，看完继续。');paintMenus();const t=displayTheme();$('menu-preview').innerHTML=(t.featured||t.foods).slice(0,t.id==='friends-special'?7:6).map(id=>`<div><canvas width="100" height="90" data-preview="${id}" aria-hidden="true"></canvas><span>${escapeHtml(FOODS[id].name)}</span></div>`).join('');for(const c of $('menu-preview').querySelectorAll('canvas'))drawSushi(c.getContext('2d'),c.dataset.preview,50,44,.9);$('menu-dialog').showModal();selectNavigation('today-menu');};
$('menu-picker').onchange=()=>{$('theme-select').value=$('menu-picker').value;$('theme-select').dispatchEvent(new Event('change'));const t=themeById(selectedTheme);$('menu-preview').innerHTML=(t.featured||t.foods).slice(0,t.id==='friends-special'?7:6).map(id=>`<div><canvas width="100" height="90" data-preview="${id}" aria-hidden="true"></canvas><span>${escapeHtml(FOODS[id].name)}</span></div>`).join('');for(const c of $('menu-preview').querySelectorAll('canvas'))drawSushi(c.getContext('2d'),c.dataset.preview,50,44,.9);};
$('close-menu').onclick=()=>{sounds.confirm();$('menu-dialog').close();};
$('cozy-menu-dismiss').onclick=()=>$('close-menu').click();

$('account-retry').onclick=async()=>{await $('retry-network').onclick();shop.paint();};

function displayTheme(){return game?.theme&&['playing','paused','card'].includes(game.phase)?game.theme:themeById(selectedTheme);}

function flavorCopy(f){if(f.friendId)return f.description;if(f.rarity==='hidden'||['lucky_tamago','cat_tamago'].includes(f.id))return'主厨偷偷留的一口福气，被你找到啦。';if(f.topping==='caramel')return'一点焦香，给这一口添一点甜。';if(f.topping==='spicy')return'微微一口辣，胃口也醒过来。';if(f.categoryId==='sweet')return'甜甜的一口，给今天留点好心情。';if(f.categoryId==='meat')return'扎实又满足，慢慢嚼才香。';if(f.topping==='citrus')return'一点清新果香，像吹来一阵海风。';return f.description.replace('本期端上回转台的小惊喜，过期后也能回来继续品尝。','这期的小惊喜，想念时也能去往期再尝一口。');}

// Approved menu-paper component, backed by all real current/permanent/archive configurations.
function paintCozyMenuCards(current,disabled){
 const container=$('cozy-theme-options');
 container.innerHTML=THEMES.map(t=>`<button type="button" class="theme-card ${t.id===current.id?'is-selected':''}" data-theme="${t.id}" aria-pressed="${t.id===current.id}" ${disabled?'disabled':''}><span class="theme-caption">${escapeHtml(collectionMenuName(t))}</span><b class="round-type">${escapeHtml(t.name)}</b><span class="theme-foods">${(t.featured||t.foods).filter(k=>k!=='tea').slice(0,3).map(k=>`<canvas width="100" height="75" data-cozy-menu-food="${k}" aria-hidden="true"></canvas>`).join('')}</span><small>${escapeHtml(t.id==='autumn'?'想念的味道，随时回来尝。':t.id==='classic'?'熟悉的188款常驻好味。':t.id==='friends-special'?'七份专属好味，一直为朋友们留着。':'188款经典，加上28道本期惊喜。')}</small><span class="theme-check"><svg class="icon" aria-hidden="true"><use href="#cozy-check"/></svg></span></button>`).join('');
 for(const c of container.querySelectorAll('canvas'))drawSushi(c.getContext('2d'),c.dataset.cozyMenuFood,50,40,.76);
 for(const b of container.querySelectorAll('button'))b.onclick=()=>{$('menu-picker').value=b.dataset.theme;$('menu-picker').dispatchEvent(new Event('change'));};
}

function openFoodDetail(id){const f=FOODS[id];if(!f?.friendId)return;const owned=social.profile?.collection?.find(c=>c.sushiId===id);if(!owned&&!shop.pendingIds().includes(id))return;
 $('food-detail-title').textContent=f.name;$('food-detail-friend').textContent=f.friendName+'的专属收藏 · NO.'+f.number;
 $('food-detail-copy').textContent=f.description;$('food-detail-egg').textContent=friendForFood(id).easterEgg;
 $('food-detail-state').textContent=owned?'云端已收藏 · 初遇 '+bjTime(owned.firstDiscoveredAt)+' · 已品尝 '+owned.tasteCount+' 次':'本机新发现 · 等待云端确认';
 const c=$('food-detail-art'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);drawSushi(ctx,id,c.width/2,c.height*.52,2.6);$('food-detail-dialog').showModal();
}
$('collection-grid').addEventListener('click',e=>{const card=e.target.closest('[data-friend]');if(card)openFoodDetail(card.dataset.sushiId);});
$('collection-grid').addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-friend]')){e.preventDefault();openFoodDetail(e.target.dataset.sushiId);}});
$('close-food-detail').onclick=()=>$('food-detail-dialog').close();

setInterval(()=>{if(!document.hidden&&taste.pending&&!taste.pending.conflict&&!taste.busy)taste.flush();},30000);
window.addEventListener('storage',e=>{if(taste.owner&&e.key===taste.key()&&!taste.pending)taste.refresh();});
