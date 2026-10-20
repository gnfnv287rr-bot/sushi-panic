// Presentation adapter only. Positions, foods, roles and outcomes come from the existing engine.
import {Renderer as BaseRenderer, drawSushi as drawOriginalSushi, drawPortrait, trackGeometry} from './renderer-v12.js';
import {CATALOG, rarityOf, RARITIES} from './menus-v14.js';
import {isCasualVersion} from './casual-engine.js';
import {paintRoom} from './cozy-scene.js';
import {drawFriendDish} from './friends-art.js';
export {drawPortrait,trackGeometry};
export function drawSushi(c,key,x,y,scale=1){if(!drawFriendDish(c,key,x,y,scale))drawOriginalSushi(c,key,x,y,scale);}

// The plate SVG and proportions are copied from the accepted V1.3 demo.
function dishSvg(i) {
  const rim=['#b4c6ad','#dcb5a2','#c3d3d7','#d8c28c'][i%4];
  return `<svg class="dish-svg" viewBox="0 0 102 65" aria-hidden="true"><ellipse cx="51" cy="43" rx="48" ry="20" fill="#806856" opacity=".10"/><ellipse cx="51" cy="36" rx="49" ry="23" fill="#dfd1b5"/><ellipse cx="51" cy="32" rx="49" ry="23" fill="#fffbef" stroke="${rim}" stroke-width="2.2"/><ellipse cx="51" cy="31" rx="41" ry="17" fill="#fbf5e3" stroke="${rim}" stroke-width="1.1"/><path d="M13 31q4-13 26-15" stroke="#fffefa" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="23" cy="45" r="1.2" fill="${rim}"/><circle cx="30" cy="48" r="1" fill="${rim}"/><circle cx="80" cy="21" r="1.2" fill="${rim}"/></svg>`;
}

export class Renderer extends BaseRenderer {
  constructor(canvas) {
    super(canvas);
    this.plates=document.getElementById('live-plates');
    this.nodes=new Map();
    this.plates.addEventListener('click',event=>{
      const button=event.target.closest('button[data-id]');
      if(button&&!button.disabled)this.onEat?.(this.targets.find(t=>String(t.id)===button.dataset.id));
    });
  }
  bite(target,event) {
    super.bite(target,event);
    const chef=document.getElementById('chef');
    chef.classList.remove('is-eating');
    void chef.offsetWidth;
    chef.classList.add('is-eating');
  }
  draw(game,clock,dt=0) {
    this.resize();
    const g=paintRoom(this.canvas,(game.beltTravel??0)+(game.restTravel||0));
    if(!g)return;
    const small=this.w<800, liveIds=new Set(game.foods.map(f=>f.id));
    for(const[id,node]of this.nodes)if(!liveIds.has(id)){node.remove();this.nodes.delete(id);}
    this.targets=[];
    game.foods.forEach((food,index)=>{
      const spec=CATALOG[food.key],point=g.point(food.p+(game.restTravel||0)),allergic=spec.allergen===game.character.allergy;
      let button=this.nodes.get(food.id);
      if(!button){
        button=document.createElement('button');button.type='button';button.className='plate';button.dataset.id=food.id;
        button.innerHTML=dishSvg(index)+'<span class="dish-number" aria-hidden="true"></span><canvas width="126" height="101" aria-hidden="true"></canvas><span class="dish-name"></span><span class="allergen" aria-hidden="true" hidden>忌</span><span class="plate-rarity" aria-hidden="true"></span>';

        this.nodes.set(food.id,button);this.plates.append(button);
      }
      if(button.dataset.key!==food.key){const canvas=button.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);drawSushi(ctx,food.key,63,53,.91);button.dataset.key=food.key;button.classList.toggle('friend-plate',!!spec.friendId);}
      const number=index<8?index+1:null,grade=rarityOf(spec);
      button.querySelector('.dish-number').textContent=number??'';button.querySelector('.dish-number').hidden=!number;
      button.querySelector('.dish-name').textContent=spec.name;
      button.querySelector('.allergen').hidden=!allergic;
      const rarity=button.querySelector('.plate-rarity');rarity.textContent=grade==='treasure'?'珍':grade==='select'?'选':'';rarity.hidden=allergic||grade==='common';rarity.dataset.rarity=grade;
      const change=Math.round(spec.fullness*(spec.fullness>0?game.character.portion*(isCasualVersion(game.rulesVersion)?.65:1):1));
      button.setAttribute('aria-label',`品尝${spec.name}${allergic?'，本局忌口':''}，饱腹${change>0?'+':''}${change}${spec.collectible?'，'+RARITIES[grade].name:''}`);
      button.title=button.getAttribute('aria-label');button.disabled=game.phase!=='playing'&&!(isCasualVersion(game.rulesVersion)&&game.phase==='paused'&&game.autoRest);
      button.style.left=point.x+'px';button.style.top=point.y+'px';button.style.zIndex=String(Math.round(point.y));
      this.targets.push({id:food.id,key:food.key,...point,radius:small?35:47,number,allergic});
    });
    const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);
    this.effects=this.effects.filter(e=>e.age<.8);
    for(const e of this.effects){e.age+=dt;c.save();c.globalAlpha=Math.max(0,1-e.age/.8);c.font='600 16px "PingFang SC",sans-serif';c.textAlign='center';c.fillStyle=e.bad?'#9a4936':'#426b59';c.fillText(e.text,e.x,e.y-36-e.age*35);c.restore();}
  }
}
