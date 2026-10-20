import {CATALOG} from './menus-v14.js';
import {FOOD_TAGS} from './food-tags-v141.js';
export {FOOD_TAGS};
export const TASTE_TAGS=Object.freeze([['matcha','抹茶'],['raw-fish','生鱼与腌渍鱼'],['shellfish','虾蟹贝类'],['beef','牛肉'],['spicy','辣味与山葵'],['vegetable','蔬菜'],['foie','鹅肝'],['coffee','咖啡'],['dessert','甜品'],['roe','鱼籽'],['egg','鸡蛋'],['fried','炸物'],['mushroom','蘑菇'],['nuts','坚果']].filter(([id])=>Object.values(FOOD_TAGS).some(tags=>tags.includes(id))).map(([id,name])=>Object.freeze({id,name})));
const tagIds=new Set(TASTE_TAGS.map(t=>t.id));
export function normalizeTaste(value,{strict=false}={}){
 const fail=()=>{throw new Error('口味选项有误，请重新选择（心头好最多3道）');};
 if(!value||typeof value!=='object'||Array.isArray(value)){if(strict)fail();value={};}
 const list=(key,valid,max)=>{const items=value[key]??[];if(!Array.isArray(items)||items.length>max){if(strict)fail();return[];}if(strict&&items.some(id=>typeof id!=='string'||!valid(id)))fail();return [...new Set(items.filter(id=>typeof id==='string'&&valid(id)))].slice(0,max);};
 const dislikedFoods=list('dislikedFoods',id=>Object.hasOwn(CATALOG,id),230),dislikedTags=list('dislikedTags',id=>tagIds.has(id),TASTE_TAGS.length);
 const favorites=list('favorites',id=>Object.hasOwn(CATALOG,id),3).filter(id=>!dislikedFoods.includes(id));
 return{version:1,favorites,dislikedFoods,dislikedTags,configured:value.configured===true};
}
export const emptyTaste=()=>normalizeTaste({});
export function tasteOf(foodId,preferences){const p=preferences||emptyTaste();if(p.dislikedFoods.includes(foodId)||p.dislikedTags.some(t=>FOOD_TAGS[foodId]?.includes(t)))return'dislike';return p.favorites.includes(foodId)?'favorite':'neutral';}
export function chooseTaste(value,kind,id){const p=normalizeTaste(value);let message='';if(kind==='favorite'){if(p.favorites.includes(id))p.favorites=p.favorites.filter(x=>x!==id);else{if(p.favorites.length>=3)return{value:p,message:'心头好最多3道，先放下一道再选吧。'};if(p.dislikedFoods.includes(id)){p.dislikedFoods=p.dislikedFoods.filter(x=>x!==id);message='已从挑食清单移出这道菜。';}p.favorites.push(id);if(tasteOf(id,p)==='dislike')message='这道也命中挑食分类，会优先按不喜欢反馈。';}}else if(kind==='food'){if(p.dislikedFoods.includes(id))p.dislikedFoods=p.dislikedFoods.filter(x=>x!==id);else{p.dislikedFoods.push(id);if(p.favorites.includes(id)){p.favorites=p.favorites.filter(x=>x!==id);message='已从心头好移出这道菜。';}}}else if(kind==='tag'){p.dislikedTags=p.dislikedTags.includes(id)?p.dislikedTags.filter(x=>x!==id):[...p.dislikedTags,id];if(p.favorites.some(f=>tasteOf(f,p)==='dislike'))message='同时命中心头好与挑食分类时，优先按不喜欢反馈。';}return{value:normalizeTaste(p),message};}
const HAPPY=['嘿嘿，是我最爱的！','这口幸福感拉满！','再来一盘也不是不行～'];
const PICKY=['呜呜，这个真的不爱吃！','是谁把这个放上来的！','虽然不喜欢……但也不是不能吃。','我就勉强吃一口！','下一盘可以来点好吃的吗？'];
const AGAIN=['怎么又是这个啊！','今天的菜单是不是针对我！','救命，我真的挑食！'];
export class TasteFeedback{constructor(random=Math.random){this.random=random;this.streak=0;}bite(kind){this.streak=kind==='dislike'?this.streak+1:0;const lines=kind==='favorite'?HAPPY:kind==='dislike'?(this.streak>=2?AGAIN:PICKY):null;return lines?lines[Math.min(lines.length-1,Math.floor(this.random()*lines.length))]:'';}}
