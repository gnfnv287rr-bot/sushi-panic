import {CATALOG as OLD,THEMES as OLD_THEMES} from './menus-v1.js';
import {MENU_ROWS} from './menu-catalog-v2.js';
export const MENU_EDITION='2026-10-catalog2';
export const RARITIES=Object.freeze({common:{name:'日常',chance:.72,color:'#66886d'},select:{name:'精选',chance:.23,color:'#668fa9'},treasure:{name:'珍藏',chance:.05,color:'#b89343'}});
export const rarityOf=f=>f.rarity==='hidden'?'treasure':f.rarity==='rare'?'select':f.rarity;
export const CATALOG=Object.freeze({...OLD,...Object.fromEntries(MENU_ROWS.map(f=>[f.id,Object.freeze(f)]))});
export const PERMANENT=Object.freeze(MENU_ROWS.filter(f=>f.themeId==='classic').map(f=>f.id));
export const FEATURED=Object.freeze(MENU_ROWS.filter(f=>f.themeId==='first-taste').map(f=>f.id));
export const THEMES=Object.freeze([
 {id:'first-taste',name:'第02期 · 一测百味放题',description:'188款常驻＋28款特色同台回转。冷吃兔、焦糖三文鱼、抹茶布丁，慢慢找下一口。',opensAt:'2026-10-18T16:00:00Z',closesAt:'2026-11-01T16:00:00Z',permanent:false,color:'#9b7656',foods:[...PERMANENT,...FEATURED,'tea'],collectionFoods:FEATURED,featured:FEATURED},
 {id:'classic',name:'常驻百味菜单',description:'188款常驻菜，分为15个系列；乌龙茶另备，不计收藏盘数。',permanent:true,opensAt:null,closesAt:null,color:'#527e6a',foods:[...PERMANENT,'tea'],collectionFoods:PERMANENT},
 ...OLD_THEMES.filter(t=>t.id==='autumn').map(t=>({...t,archiveOnly:true,name:'往期 · 秋日小食堂'}))
].map(t=>Object.freeze(t)));
export function themeById(id){const t=THEMES.find(t=>t.id===id);if(!t)throw new Error('未知主题菜单');return t;}
export function menuState(t,serverTime){if(t.archiveOnly)return'archive';if(t.permanent)return'permanent';const n=Date.parse(serverTime);if(!Number.isFinite(n))return'time_unconfirmed';return n<Date.parse(t.opensAt)?'upcoming':t.closesAt&&n>=Date.parse(t.closesAt)?'archive':'current';}
export function menuPayload(serverTime){return{edition:MENU_EDITION,themes:THEMES.map(t=>({...t,state:menuState(t,serverTime)})),catalog:Object.values(CATALOG),rarities:RARITIES};}
