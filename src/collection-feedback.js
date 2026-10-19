// Presentation-only notebook. Cloud ownership and discoveries remain server authoritative.
export function collectionProgress(catalog,theme,collection=[],pendingIds=[]){
 const all=Object.values(catalog).filter(f=>f.collectible),valid=new Set(all.map(f=>f.id));
 const confirmed=new Set(collection.map(c=>c.sushiId).filter(id=>valid.has(id))),pending=new Set([...pendingIds].filter(id=>valid.has(id)&&!confirmed.has(id))),tasted=new Set([...confirmed,...pending]);
 const ids=(theme.collectionFoods||theme.foods).filter(id=>valid.has(id));return{confirmed:confirmed.size,pending:pending.size,count:tasted.size,total:valid.size,percent:valid.size?Math.round(tasted.size/valid.size*1000)/10:0,themeCount:ids.filter(id=>tasted.has(id)).length,themeConfirmed:ids.filter(id=>confirmed.has(id)).length,themeTotal:ids.length};
}
export function archiveStatus({profile,bound=false,busy=false,error='',pending=0,practice=false,local=false,offline=false,localUnsaved=false}){
 if(localUnsaved)return{state:'failed',label:'本机暂未保存',detail:'浏览器没能留住本机记录。请保持页面开启，结账后确认云端保存。'};
 if(local)return{state:busy?'syncing':error?'failed':pending?'pending':'local',label:busy?'正在同步':error?'同步失败':pending?'等待同步':'本地联调',detail:'本地联调收藏与正式云端手帐分开保存。'+(error?'请重新连接后重试。':'')};
 if(practice)return{state:'practice',label:'练习中',detail:'这一桌暂未联网，发现只在本机展示；重新连接后另开一桌可保存。'};
 if(busy)return{state:'syncing',label:'正在同步',detail:'正在把这次发现放进云端手帐…'};
 if(error)return{state:'failed',label:'同步失败',detail:'这口小惊喜还在本机等候。重新连接或结账后，可安全重试。'};
 if(offline)return{state:'failed',label:'暂时离线',detail:'先慢慢吃，待同步记录会留在此浏览器；联网后重试。'};
 if(pending)return{state:'pending',label:'等待同步',detail:`${pending} 项本机记录待核验，尚未确认保存至云端。`};
 if(!profile)return{state:'idle',label:'等你入座',detail:'输入昵称开吃，游客也能留下云端收藏。'};
 return bound?{state:'synced',label:'已同步',detail:'云端手帐已读取 · 已绑定邮箱，可以换设备继续收集。'}:{state:'guest',label:'游客存档',detail:'云端手帐已读取 · 此浏览器记得你，绑定邮箱可换设备继续。'};
}
export class Notebook{
 constructor(storage){this.storage=storage;this.owner='';this.items={};this.reminder={};}
 use(owner){owner=owner||'practice';if(this.owner===owner)return;this.owner=owner;this.items={};this.reminder={};try{const v=JSON.parse(this.storage?.getItem('sushi.notebook.v122.'+owner)||'{}');this.items=v.items||{};this.reminder=v.reminder||{};}catch{}}
 persist(){try{this.storage?.setItem('sushi.notebook.v122.'+this.owner,JSON.stringify({items:this.items,reminder:this.reminder}));return true;}catch{return false;}}
 discover(id,runId,at=Date.now()){if(this.items[id])return false;this.items[id]={seen:false,at,runId};this.persist();return true;}
 unseen(id){return !!this.items[id]&&!this.items[id].seen;}
 viewed(id){if(this.items[id]){this.items[id].seen=true;this.persist();}}
 pending(validRuns){const runs=new Set(validRuns);return Object.keys(this.items).filter(id=>runs.has(this.items[id].runId));}
 dismiss(now=Date.now()){if(this.reminder.dismissedAt)this.reminder.secondDismissed=true;this.reminder.dismissedAt=now;this.persist();}
 shouldRemind(bound,count,now=Date.now()){if(bound||!this.owner||this.owner==='practice')return false;if(!this.reminder.dismissedAt)return true;return count>=10&&now-this.reminder.dismissedAt>=7*86400000&&!this.reminder.secondDismissed;}
}
export function discoveryPresentation(food,rarity){const secret=food.rarity==='hidden'||['lucky_tamago','cat_tamago'].includes(food.id);return{kind:secret?'secret':rarity,title:secret?'✨ 秘密菜单发现！':rarity==='treasure'?'✨ 一口珍藏，遇见啦！':rarity==='select'?'✦ 精选好味，第一次见！':'✧ 新寿司发现！',line:food.name.includes('茶')||food.categoryId==='sweet'?'甜甜的一口，手帐也开心。':food.name.includes('炙')||food.name.includes('焦糖')?'这口香得有点犯规！':'又认识了一种新寿司！'};}
