import{CATALOG as OLD,THEMES as OLD_THEMES,MENU_EDITION as OLD_EDITION,menuState as stateOf}from'./menus-v2.js';
import{FRIEND_FOODS}from'./friends-special.js';
export {RARITIES,rarityOf,PERMANENT,FEATURED,menuState}from'./menus-v2.js';
export const MENU_EDITION='2026-10-friends1';
export const CATALOG=Object.freeze({...OLD,...FRIEND_FOODS});
export const FRIEND_THEME=Object.freeze({id:'friends-special',name:'UU和她的朋友们',description:'七位朋友，七份心头好。每个人都能品尝、收藏，想念时随时回来。',permanent:true,opensAt:null,closesAt:null,color:'#86bba1',foods:[...Object.keys(FRIEND_FOODS),'tea'],collectionFoods:Object.keys(FRIEND_FOODS),featured:Object.keys(FRIEND_FOODS)});
export const THEMES=Object.freeze([FRIEND_THEME,...OLD_THEMES]);
export function themeById(id){const t=THEMES.find(t=>t.id===id);if(!t)throw new Error('未知主题菜单');return t;}
export function menuPayload(serverTime){return{edition:MENU_EDITION,themes:THEMES.map(t=>({...t,state:stateOf(t,serverTime)})),catalog:Object.values(CATALOG),compatibleEditions:[OLD_EDITION],serverTime};}
