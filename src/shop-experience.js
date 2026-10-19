import{CATALOG,rarityOf}from'./menus-v2.js';
import{Notebook,collectionProgress,archiveStatus,discoveryPresentation}from'./collection-feedback.js';
import{currentIdentity}from'./identity.js';
const $=id=>document.getElementById(id);
export function shopExperience({social,getGame,getRun,getTheme,getUnarchived,getLocalSaveFailure,drawSushi,playSound}){
 let storage;try{storage=localStorage;}catch{}const book=new Notebook(storage);let authOwner=null,authResolved=false,bound=false,queue=[],active=null,timer,observer,viewTimers=new Map();
 const pendingIds=()=>{const runs=social.journal.list().filter(e=>e.owner===social.profile?.id&&['active','pending'].includes(e.kind)).map(e=>e.runId);if(getRun())runs.push(getRun().runId);const game=getGame();return [...book.pending(runs),...(game?.discoveries||[])];};
 function useOwner(){const owner=social.profile?.id||'practice';if(book.owner!==owner){book.use(owner);authOwner=null;authResolved=false;bound=false;queue=[];active=null;clearTimeout(timer);$('discovery-card').hidden=true;}return owner;}
 async function readAuth(){const id=social.profile?.id;if(!id||social.local){authResolved=true;return;}if(authOwner===id)return;authOwner=id;authResolved=false;try{const u=await currentIdentity();if(social.profile?.id!==id)return;bound=u?.id===id&&!u.is_anonymous&&!!u.email_confirmed_at;}catch{bound=false;}authResolved=true;paint();}
 function paint(){useOwner();const game=getGame(),run=getRun(),profile=social.profile,pending=pendingIds(),p=collectionProgress(CATALOG,getTheme(),profile?.collection,pending);
  $('progress-count').textContent=`已尝鲜 ${p.count} / ${p.total} 种`;$('progress-percent').textContent=p.percent+'%';$('progress-fill').style.width=p.percent+'%';$('progress-fill').parentElement.setAttribute('role','progressbar');$('progress-fill').parentElement.setAttribute('aria-label','寿司收藏完成度');$('progress-fill').parentElement.setAttribute('aria-valuenow',p.percent);$('progress-fill').parentElement.setAttribute('aria-valuemin','0');$('progress-fill').parentElement.setAttribute('aria-valuemax','100');
  $('progress-theme').textContent=`本期放题 ${p.themeCount} / ${p.themeTotal}`;$('progress-sync').textContent=p.pending?`${social.local?'本地联调已确认':'云端已确认'} ${p.confirmed} 种 · 本机待同步 ${p.pending} 种${!run&&game?'（练习发现不上传）':''}`:p.count?`${social.local?'本地联调已确认':'云端已确认'} ${p.confirmed} 种 · 下一口，会是谁呢？`:'第一口寿司，还在等你呢！';
  const detached=social.journal.list('active').filter(e=>e.owner===profile?.id&&e.body?.actions?.length&&e.runId!==run?.runId).length;
  const ownPending=social.pending.filter(e=>!e.owner||e.owner===profile?.id).length,unarchived=getUnarchived();
  const state=archiveStatus({profile,bound,busy:social.archiveBusy>0||social.archiveReadBusy>0,error:social.archiveError||social.archiveReadError,pending:ownPending+detached+p.pending+(unarchived&&!p.pending?1:0),practice:!!game&&!run,local:social.local,offline:navigator.onLine===false,localUnsaved:getLocalSaveFailure()});
  $('save-state').textContent=(['failed','pending'].includes(state.state)?'⚠ ':state.state==='syncing'?'⏳ ':'☁ ')+state.label;$('save-detail').textContent=state.detail;$('save-state').parentElement.dataset.state=state.state;$('nav-save-dot').dataset.state=state.state;$('account-save-state').textContent=state.label+' · '+state.detail;
  $('archive-nudge').hidden=!(profile&&authResolved&&!social.local&&book.shouldRemind(bound,p.count));
  const known=new Set([...(profile?.collection||[]).map(c=>c.sushiId),...pending]);$('collection-new-count').hidden=![...known].some(id=>book.unseen(id));
  if(active){const saved=profile?.collection?.some(c=>c.sushiId===active.id);$('discovery-save').textContent=saved?'已放进云端手帐':run?'本机已发现 · 等待云端确认':'练习发现 · 仅在本机展示';}
  readAuth();return p;
 }
 function next(){if(active||!queue.length)return;active=queue.shift();const food=CATALOG[active.id],info=discoveryPresentation(food,rarityOf(food)),card=$('discovery-card');card.dataset.kind=info.kind;card.hidden=false;$('discovery-title').textContent=info.title;$('discovery-name').textContent=food.name;$('discovery-line').textContent=info.line;const c=$('discovery-art');c.getContext('2d').clearRect(0,0,c.width,c.height);drawSushi(c.getContext('2d'),food.id,55,46,.95);card.classList.remove('discover-enter');void card.offsetWidth;card.classList.add('discover-enter');playSound(info.kind);paint();timer=setTimeout(()=>{card.hidden=true;active=null;next();},2100);}
 function discover(event){useOwner();const id=event.item.key;if(!event.newDiscovery||social.profile?.collection?.some(c=>c.sushiId===id)||!book.discover(id,getRun()?.runId||'practice'))return false;queue.push({id});next();paint();return true;}
 function observeCards(){observer?.disconnect();for(const t of viewTimers.values())clearTimeout(t);viewTimers.clear();if(!$('collection-dialog').open)return;
  observer=new IntersectionObserver(entries=>{for(const entry of entries){const el=entry.target,id=el.dataset.sushiId;if(!entry.isIntersecting||entry.intersectionRatio<.6){clearTimeout(viewTimers.get(id));viewTimers.delete(id);continue;}if(!book.unseen(id)||viewTimers.has(id))continue;viewTimers.set(id,setTimeout(()=>{viewTimers.delete(id);if(!$('collection-dialog').open||document.hidden)return;book.viewed(id);el.querySelector('.new-tag')?.remove();el.classList.remove('is-new');paint();},700));}},{root:$('collection-dialog'),threshold:[.6]});for(const el of document.querySelectorAll('.collection-card.is-new'))observer.observe(el);
 }
 $('nudge-bind').onclick=()=>$('account').click();$('nudge-dismiss').onclick=()=>{book.dismiss();paint();};
 window.addEventListener('online',paint);window.addEventListener('offline',paint);window.addEventListener('storage',e=>{if(e.key?.startsWith('sushi.notebook.v122.')){const owner=book.owner;book.owner='';book.use(owner);paint();}});
 return{book,paint,discover,observeCards,pendingIds,refreshAuth(){authOwner=null;readAuth();},recent(id,confirmed){return Date.parse(confirmed?.firstDiscoveredAt)||book.items[id]?.at||0;}};
}
