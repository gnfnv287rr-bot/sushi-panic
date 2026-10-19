// Immutable menu edition. Add a new edition instead of changing an active run's recipes.
import {FOODS as CLASSIC} from './core.js';
export const MENU_EDITION='2026-10-v1';
const descriptions={salmon:'柔软鲜香，回转台上的经典一口。',tuna:'红润鱼片，清爽又满足。',shrimp:'翘起的小虾尾，藏着海的鲜甜。',tamago:'金灿灿的玉子，温柔微甜。',cucumber:'咔嚓一口，胃里也清爽起来。',ikura:'一颗颗橙色小珍珠。',onigiri:'扎实的米香，记得慢慢吃。'};
const catalog=Object.fromEntries(Object.entries(CLASSIC).map(([id,f],i)=>[id,{...f,id,number:i+1,themeId:'classic',rarity:'common',visualKey:id,description:descriptions[id]||'热乎乎的茶，吃撑时抿一口。',collectible:id!=='tea',weight:id==='tea'?3:6}]));
catalog.lucky_tamago={...catalog.tamago,id:'lucky_tamago',name:'福气玉子',number:9,rarity:'hidden',weight:1,points:160,description:'厨师悄悄放上回转台的小福气。每份菜单都会再见，不用赶时间。',accent:'#e5b74e'};
const autumn=[['maple_salmon','枫叶三文鱼','salmon','秋日的一片暖橙。'],['harvest_tamago','丰收玉子','tamago','把金黄的秋天卷进一口玉子里。'],['garden_roll','小院黄瓜卷','cucumber','午后的院子，清清爽爽。'],['moon_onigiri','月见饭团','onigiri','圆圆的米香，陪你慢慢坐一会儿。'],['pearl_ikura','琥珀鱼子','ikura','像秋光一样透亮的小珍珠。'],['cat_tamago','招财猫玉子','tamago','猫师傅留下的惊喜，今天遇见就很好。']];
autumn.forEach(([id,name,visualKey,description],i)=>{catalog[id]={...catalog[visualKey],id,name,number:10+i,themeId:'autumn',rarity:i===5?'hidden':i===4?'rare':'common',weight:i===5?1:i===4?3:6,points:catalog[visualKey].points+(i===5?50:0),description,accent:i===5?'#b88c46':'#ca835c'};});
export const CATALOG=Object.freeze(Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,Object.freeze(v)])));
export const THEMES=Object.freeze([
 Object.freeze({id:'classic',name:'经典寿司放题',description:'熟悉的味道，随时回来慢慢吃。',opensAt:null,closesAt:null,permanent:true,color:'#527e6a',foods:['salmon','tuna','shrimp','tamago','cucumber','ikura','onigiri','lucky_tamago','tea']}),
 Object.freeze({id:'autumn',name:'第01期 · 秋日小食堂',description:'五份暖心寿司，还有猫师傅的一点小惊喜。过期后仍可在往期菜单品尝。',opensAt:'2026-10-18T16:00:00Z',closesAt:'2026-10-25T16:00:00Z',permanent:false,color:'#b97d54',foods:[...autumn.map(x=>x[0]),'tea']})
]);
export function themeById(id){const t=THEMES.find(t=>t.id===id);if(!t)throw new Error('未知主题菜单');return t;}
export function menuState(theme,serverTime){const now=Date.parse(serverTime);if(!Number.isFinite(now))return theme.permanent?'permanent':'time_unconfirmed';return theme.permanent?'permanent':now<Date.parse(theme.opensAt)?'upcoming':now>=Date.parse(theme.closesAt)?'archive':'current';}
export function menuPayload(serverTime){return{edition:MENU_EDITION,themes:THEMES.map(t=>({...t,state:menuState(t,serverTime)})),catalog:Object.values(CATALOG)};}
