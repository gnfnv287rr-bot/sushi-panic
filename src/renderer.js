import { FOODS, isAllergic } from './core.js';
const INK = '#293f40';
function round(c,x,y,w,h,r,fill,stroke) { c.beginPath(); c.roundRect(x,y,w,h,r); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.stroke();} }
function oval(c,x,y,rx,ry,fill,stroke) { c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2); if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();} }
function line(c, points, color, width=2) { c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke(); }
function text(c,str,x,y,size=12,color=INK,weight=500) {c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=`${weight} ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;c.fillText(str,x,y);}

/** Original procedural sushi illustration, shared by the board and menu. */
export function drawSushi(c,key,x,y,scale=1) {
  c.save();c.translate(x,y);c.scale(scale,scale);c.lineWidth=1.4;
  if(key==='tea') {
    oval(c,0,17,19,6,'#35453b20');round(c,-17,-19,34,35,[3,3,12,12],'#7f9c76','#526e55');
    for(let i=-9;i<13;i+=7)line(c,[[i,-12],[i,7]],'#b3c4a1',2);
    oval(c,0,-18,17,6,'#d1d8ae','#526e55');oval(c,0,-18,12,3.7,'#6b7b40');
    line(c,[[-7,-32],[-10,-27],[-6,-23]],'#f9f5eaaa',1.5);line(c,[[6,-35],[3,-30],[7,-26]],'#f9f5eaaa',1.5);
  } else if(key==='cucumber'||key==='ikura') {
    const places=key==='cucumber'?[[-11,3],[11,4],[0,-10]]:[[0,0]];
    for(const [px,py] of places) {
      const rx=key==='ikura'?25:13, ry=key==='ikura'?14:8;
      round(c,px-rx,py-3,rx*2,22,7,'#344b40');oval(c,px,py+16,rx,ry,'#263e36');oval(c,px,py,rx,ry,'#f8f3dc','#364c3d');
      oval(c,px,py,rx-4,ry-2,key==='ikura'?'#6d4930':'#95ad69');
      if(key==='ikura') {for(let j=0;j<3;j++)for(let i=0;i<5;i++){const xx=-16+i*8+(j%2)*3,yy=-6+j*6;oval(c,xx,yy,4.3,4,'#ee8743','#b9612d');oval(c,xx-1,yy-1.5,1.4,1.1,'#ffd189');}}
      else {round(c,px-4,py-4,8,7,1,'#d5e5a1');line(c,[[px-6,py],[px+5,py]],'#517642',1.5);}
    }
  } else if(key==='onigiri') {
    c.beginPath();c.moveTo(-23,18);c.quadraticCurveTo(-32,17,-26,5);c.lineTo(-7,-25);c.quadraticCurveTo(0,-34,7,-24);c.lineTo(29,9);c.quadraticCurveTo(34,19,22,22);c.closePath();c.fillStyle='#dbd7bf';c.fill();
    c.beginPath();c.moveTo(-24,13);c.quadraticCurveTo(-30,12,-24,1);c.lineTo(-6,-27);c.quadraticCurveTo(0,-33,7,-24);c.lineTo(26,5);c.quadraticCurveTo(32,15,20,17);c.closePath();c.fillStyle='#fff9e7';c.fill();round(c,-10,1,21,20,2,'#354d3e');
    for(let i=0;i<7;i++) oval(c,-15+(i*13)%33,-6+(i*7)%14,1,1.4,'#d6ceb2');
  } else {
    oval(c,0,15,31,12,'#d4d2bb');round(c,-30,-5,60,23,13,'#fff9e8');oval(c,0,-5,30,11,'#fffdf1');
    for(let i=0;i<14;i++)oval(c,-23+(i*11)%48,2+(i*7)%12,1.8,.9,'#ddd6bc');
    if(key==='tamago') {round(c,-33,-20,66,26,7,'#dab248');round(c,-33,-24,66,25,7,'#f2ce55');line(c,[[-26,-18],[25,-18]],'#ffe992',2);round(c,-6,-25,13,48,2,'#344e40');line(c,[[-2,-20],[-2,15]],'#58705c',1);}
    else if(key==='shrimp') {
      c.beginPath();c.moveTo(-31,-4);c.quadraticCurveTo(-22,-33,20,-20);c.quadraticCurveTo(30,-17,31,1);c.quadraticCurveTo(3,10,-31,-4);c.fillStyle='#f8b18a';c.fill();
      for(let i=0;i<5;i++)line(c,[[-19+i*9,-17],[-15+i*9,-3]],'#e38165',3);
      c.beginPath();c.moveTo(25,-5);c.lineTo(39,-19);c.lineTo(38,-1);c.lineTo(43,7);c.lineTo(27,3);c.fillStyle='#e57a5b';c.fill();
    } else {
      round(c,-34,-23,68,29,11,key==='salmon'?'#d97157':'#b74958');round(c,-34,-27,68,28,11,FOODS[key].color);
      c.save();c.beginPath();c.roundRect(-34,-27,68,28,11);c.clip();
      for(let i=-45;i<50;i+=16)line(c,[[i,-30],[i+16,-8],[i+29,0]],key==='salmon'?'#ffd2ab':'#ed8f98',key==='salmon'?3.4:1.4);c.restore();
    }
  }
  c.restore();
}

export function drawPortrait(canvas,character,emotion='happy') {
  const c=canvas.getContext('2d'),size=canvas.width;c.clearRect(0,0,size,canvas.height);c.save();c.scale(size/100,canvas.height/100);
  const color=character?.color||'#8aab90';oval(c,50,54,47,47,'#dfe7d7');
  round(c,22,72,56,42,18,color);oval(c,50,48,29,32,'#f8d9b5');
  c.beginPath();c.arc(50,38,30,Math.PI,0);c.lineTo(79,51);c.quadraticCurveTo(64,43,58,28);c.quadraticCurveTo(41,51,21,47);c.closePath();c.fillStyle='#344743';c.fill();
  if(character?.id==='momo'){oval(c,22,29,10,10,'#344743');oval(c,78,29,10,10,'#344743');}
  if(character?.id==='taro'){round(c,18,24,64,11,3,color);round(c,39,16,23,14,3,color);}
  if(character?.id==='yuzu'){oval(c,77,26,10,7,'#ecc34a');line(c,[[78,19],[81,14]],'#6b8b58',2);}
  if(character?.id==='nori'){round(c,19,24,62,11,4,color);text(c,'海',50,30,9,'#fff9e9');}
  c.lineWidth=2;oval(c,39,52,2.1,2.8,INK);oval(c,61,52,2.1,2.8,INK);oval(c,30,60,5,2.8,'#edaa92');oval(c,70,60,5,2.8,'#edaa92');
  if(emotion==='sad')line(c,[[44,69],[50,66],[56,69]],INK,2);else{c.beginPath();c.arc(50,59,7,.25,Math.PI-.25);c.strokeStyle=INK;c.stroke();}
  round(c,37,80,26,23,3,'#fff6de');text(c,character?.mark||'食',50,90,13,color,700);c.restore();
}

export function trackGeometry(w,h) {
  const margin=w<500?48:62, left=margin,right=w-margin,top=w<500?96:113,bottom=h-(w<500?60:72);
  const radius=Math.min(67,(right-left)/3,(bottom-top)/3),a=right-left-2*radius,b=bottom-top-2*radius;
  const total=2*a+2*b+2*Math.PI*radius;
  const point=p=>{
    let d=((p%1+1)%1)*total;
    const segments=[a,Math.PI*radius/2,b,Math.PI*radius/2,a,Math.PI*radius/2,b,Math.PI*radius/2];
    let i=0;while(i<7&&d>segments[i]){d-=segments[i];i++;}
    if(i===0)return{x:left+radius+d,y:top,angle:0};
    if(i===2)return{x:right,y:top+radius+d,angle:Math.PI/2};
    if(i===4)return{x:right-radius-d,y:bottom,angle:Math.PI};
    if(i===6)return{x:left,y:bottom-radius-d,angle:-Math.PI/2};
    const centers=[[right-radius,top+radius],[right-radius,bottom-radius],[left+radius,bottom-radius],[left+radius,top+radius]];
    const j=(i-1)/2,angle=-Math.PI/2+j*Math.PI/2+d/radius;
    return{x:centers[j][0]+Math.cos(angle)*radius,y:centers[j][1]+Math.sin(angle)*radius,angle:angle+Math.PI/2};
  };
  return{left,right,top,bottom,radius,total,point};
}

export class Renderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.w=0;this.h=0;this.targets=[];this.effects=[];this.hover=null;this.motion=matchMedia('(prefers-reduced-motion: reduce)').matches;}
  resize(){const b=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(b.width!==this.w||b.height!==this.h||this.dpr!==dpr){this.w=b.width;this.h=b.height;this.dpr=dpr;this.canvas.width=Math.round(b.width*dpr);this.canvas.height=Math.round(b.height*dpr);}}
  hit(x,y){return [...this.targets].reverse().filter(f=>Math.hypot(x-f.x,y-f.y)<f.radius+4).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0];}
  bite(target,event){this.effects.push({x:target.x,y:target.y,text:event.type==='allergy'?'忌口呀！':`${event.change>0?'+':''}${Math.round(event.change)}`,bad:event.type==='allergy',age:0});}
  draw(game,clock,dt=0){
    this.resize(); const c=this.ctx,w=this.w,h=this.h;if(!w||!h)return;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,w,h);
    const mobile=w<500,g=trackGeometry(w,h),cx=w/2,cy=(g.top+g.bottom)/2;
    // Warm maple counter with grain and inset rails.
    c.fillStyle='#ecd6b2';c.fillRect(0,0,w,h);
    for(let y=9;y<h;y+=27){line(c,[[0,y],[w,y]],'#c9a97620',1);for(let x=20;x<w;x+=160)line(c,[[x+(y%53),y+8],[x+83+(y%53),y+8]],'#fff9e928',1);}
    round(c,0,0,w,65,0,'#f4e7cd');line(c,[[0,65],[w,65]],'#b8ac8d',1);
    // Shop noren, deliberately a quiet frame around the moving food.
    for(let i=0;i<5;i++){const ww=mobile?40:51,xx=cx-ww*2.5+i*ww;round(c,xx,0,ww-2,51,[0,0,5,5],i===2?'#38645b':'#4d776a');text(c,['寿','司','腹','八','分'][i],xx+ww/2,26,15,'#f7efd8',600);}
    const lantern=(x)=>{line(c,[[x,0],[x,13]],'#73705b',1);round(c,x-12,13,24,32,9,'#dc7760');for(let i=-6;i<10;i+=6)line(c,[[x+i,17],[x+i,40]],'#edaa7c',1);round(c,x-7,10,14,4,1,'#5b6554');round(c,x-7,44,14,4,1,'#5b6554');};lantern(mobile?29:49);lantern(w-(mobile?29:49));
    const path=()=>{c.beginPath();c.roundRect(g.left,g.top,g.right-g.left,g.bottom-g.top,g.radius);};
    c.save();c.translate(0,8);path();c.lineWidth=mobile?77:91;c.strokeStyle='#b99f7d';c.stroke();c.restore();
    path();c.lineWidth=mobile?82:96;c.strokeStyle='#b9bdae';c.stroke();path();c.lineWidth=mobile?73:87;c.strokeStyle='#e0dfc9';c.stroke();path();c.lineWidth=mobile?64:78;c.strokeStyle='#5d7168';c.stroke();
    const slats=Math.ceil(g.total/13),offset=(game.beltTravel??0)%1;
    for(let i=0;i<slats;i++){const p=g.point(i/slats+offset);c.save();c.translate(p.x,p.y);c.rotate(p.angle);line(c,[[0,-(mobile?31:38)],[0,mobile?31:38]],'#94a18b88',1.6);c.restore();}
    // Chef island.
    const s=mobile?Math.min(.7,Math.max(.42,(g.bottom-g.top-85)/185)):1; c.save();c.translate(cx,cy+8);c.scale(s,s);
    oval(c,0,62,77,15,'#9678531c');round(c,-73,38,146,46,20,'#edd3aa');line(c,[[-61,61],[60,61]],'#c5a37455',1);
    // Lucky cat chef, all original vector drawing.
    c.lineWidth=2;round(c,-42,12,84,58,22,'#f5edda','#c9bfa4');round(c,-27,34,54,36,5,'#d37860');text(c,'寿',0,52,21,'#fff8de',700);
    c.beginPath();c.moveTo(-45,-34);c.lineTo(-42,-61);c.lineTo(-18,-44);c.lineTo(20,-44);c.lineTo(43,-61);c.lineTo(45,-28);c.closePath();c.fillStyle='#fff9e9';c.fill();c.strokeStyle='#bdbaa1';c.stroke();
    oval(c,0,-15,49,39,'#fff9e9','#bdbba3');c.beginPath();c.moveTo(-38,-48);c.lineTo(-36,-37);c.lineTo(-24,-42);c.fillStyle='#e8a88f';c.fill();c.beginPath();c.moveTo(38,-48);c.lineTo(36,-37);c.lineTo(24,-42);c.fill();
    if(game.phase==='gameover'||game.fullness<15){line(c,[[-25,-13],[-15,-8]],INK,2);line(c,[[25,-13],[15,-8]],INK,2);}
    else{line(c,[[-25,-10],[-20,-14],[-15,-10]],INK,2);line(c,[[15,-10],[20,-14],[25,-10]],INK,2);}
    oval(c,-31,0,8,4,'#efb49e');oval(c,31,0,8,4,'#efb49e');oval(c,0,-2,3.5,2.4,'#b37c65');line(c,[[0,0],[0,5],[-5,8]],INK,1.4);line(c,[[0,5],[5,8]],INK,1.4);
    for(const sign of [-1,1]){line(c,[[sign*36,-1],[sign*48,-5]],'#a9a590',1);line(c,[[sign*36,5],[sign*49,6]],'#a9a590',1);}
    round(c,-36,-63,72,18,4,'#fdfbf1','#c6c6b1');oval(c,-21,-66,19,17,'#fdfbf1','#c6c6b1');oval(c,0,-75,21,20,'#fdfbf1','#c6c6b1');oval(c,22,-66,18,17,'#fdfbf1','#c6c6b1');round(c,-34,-65,68,15,2,'#fdfbf1');round(c,-36,-54,72,10,2,'#d77b65');
    oval(c,-46,29,14,10,'#fff9e9','#c5c3a9');oval(c,46,29,14,10,'#fff9e9','#c5c3a9');line(c,[[48,29],[70,-15]],'#856346',3);line(c,[[54,30],[78,-13]],'#856346',3);
    c.restore();
    if(!mobile){text(c,'おいしい。でも、ほどほどに。',cx,cy+114,10,'#9b896b');}
    text(c,'点击盘子 · 刚好就好',cx,h-17,9,'#8f7f63');
    this.targets=[];
    c.lineWidth=1.4; // Belt strokes must not leak into dish/badge outlines.
    const ordered=game.foods.map((f,i)=>({...f,number:i<8?i+1:null,...g.point(f.p)})).sort((a,b)=>a.y-b.y);
    for(const f of ordered){
      const r=mobile?25:35,fs=mobile?.62:.84,allergy=isAllergic(game.character,f.key),hover=this.hover===f.id;
      c.save();c.translate(f.x,f.y);if(hover)c.translate(0,-3);
      oval(c,1,10,r+3,r*.62,'#183c312c');oval(c,0,4,r+3,r*.65,'#c5bda1');oval(c,0,0,r+3,r*.65,allergy?'#f8d8c6':'#fff7dc',allergy?'#ce6852':'#d9cba6');oval(c,0,-1,r-3,r*.49,null,allergy?'#e5a58d':'#d9bd83');
      if(hover){oval(c,0,-1,r+7,r*.77,null,'#fff8e5');}
      drawSushi(c,f.key,0,-10,fs);
      const labelWidth=mobile?58:74;
      round(c,-labelWidth/2,21,labelWidth,16,4,allergy?'#cb604e':'#fff9e9');text(c,`${FOODS[f.key].name} ${FOODS[f.key].fullness>0?'+':''}${Math.round(FOODS[f.key].fullness*(FOODS[f.key].fullness>0?game.character.portion:1))}`,0,29,mobile?8:9,allergy?'#fff8e7':'#485d50',600);
      if(allergy){oval(c,r-4,-24,10,10,'#c95242','#fff6df');text(c,'忌',r-4,-24,10,'#fff9e9',700);}
      if(f.number){oval(c,-r+1,-22,8,8,'#f6efd9');text(c,String(f.number),-r+1,-22,9,'#667765',700);}
      c.restore();this.targets.push({id:f.id,key:f.key,x:f.x,y:f.y,radius:r+3,number:f.number,allergic:allergy});
    }
    this.effects=this.effects.filter(f=>f.age<.8);
    for(const e of this.effects){e.age+=dt;c.save();c.globalAlpha=Math.max(0,1-e.age/.8);text(c,e.text,e.x,e.y-20-e.age*55,18,e.bad?'#ca5141':'#335e47',800);if(!this.motion){for(let i=0;i<6;i++){const a=i*Math.PI/3;oval(c,e.x+Math.cos(a)*e.age*65,e.y+Math.sin(a)*e.age*65,2.5,2.5,e.bad?'#e48369':'#f3cb69');}}c.restore();}
  }
}
