// Taste is cosmetic: use each original rule's ordinary-food scoring and fullness.
import {CasualGame as Previous} from './casual-v14.js';
export const TASTE_MARKER=-1;
export function enableTaste(game){if(game.tasteMode)return game;const original=game.eat;game.eat=function(id){const allergy=this.character.allergy;this.character={...this.character,allergy:Symbol('no-random-taboo')};try{return original.call(this,id);}finally{this.character={...this.character,allergy};}};game.tasteMode=true;return game;}
export class CasualGame extends Previous{constructor(options){super(options);this.rulesVersion='1.4.1';enableTaste(this);}snapshot(){return{...super.snapshot(),version:this.rulesVersion,tasteMode:true};}}
