// Original vector assets: seven foods, seven perspective-matched plates. Shared everywhere.
import{friendForFood}from'./friends-special.js';
const ink='#806856';
function ellipse(c,x,y,rx,ry,fill,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function box(c,x,y,w,h,r,fill,stroke=ink){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
function path(c,pts,color=ink,width=1.3){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();c.lineWidth=1.3;}
function star(c,x,y,r,color){c.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,d=i%2?r*.45:r;c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();c.fillStyle=color;c.fill();}
function face(c,x,y){ellipse(c,x-5,y,1,1.4,ink);ellipse(c,x+5,y,1,1.4,ink);c.beginPath();c.arc(x,y+1,2.8,0,Math.PI);c.strokeStyle=ink;c.stroke();}
function plate(c,f){const colors={nian:['#90bb85','#d9ecd1'],orange:['#df9d5e','#fff0ce'],rabbit:['#d998ac','#ffe1e6'],red:['#668d62','#deead4'],uu:['#84b8cc','#e4f6fb'],mum:['#c6aa66','#fff2cd'],fitness:['#cf7b6e','#ffe5dc']},[rim,fill]=colors[f.id];
 ellipse(c,0,24,46,17,'#80685618');ellipse(c,0,20,47,20,rim);ellipse(c,0,16,47,20,'#fffbed',rim);ellipse(c,0,16,39,15,fill,rim);
 if(f.id==='rabbit')for(const x of [-32,32]){ellipse(c,x,-4,6,18,'#ffe1e6',rim);ellipse(c,x,-5,2,10,'#eea6b9');}
 if(f.id==='nian')for(let i=0;i<12;i++){const a=i*Math.PI/6;ellipse(c,43*Math.cos(a),16+17*Math.sin(a),1.9,1.4,'#76a36f');}
 if(f.id==='orange')for(const x of [-33,32])path(c,[[x-6,18],[x,8],[x+6,18],[x-6,18]],rim,1.6);
 if(f.id==='red')for(const x of [-34,34]){ellipse(c,x,16,4,4.7,'#da8f88');path(c,[[x-4,12],[x,10],[x+3,12]],'#668d62',1.6);for(const d of [-1,1])ellipse(c,x+d*1.5,16, .55,.8,'#ffedc7');}
 if(f.id==='uu')for(const [x,y,r]of[[-35,11,4],[33,17,4],[-23,28,3]])star(c,x,y,r,'#9dc9d9');
 if(f.id==='mum')for(let i=0;i<22;i++){const a=i*Math.PI/11;ellipse(c,43*Math.cos(a),16+17*Math.sin(a),3,1.8,'#fff5dd',rim);}
 if(f.id==='fitness')for(const x of [-34,34]){path(c,[[x-6,15],[x+6,15]],rim,2.3);path(c,[[x-5,11],[x-5,19]],rim,2.8);path(c,[[x+5,11],[x+5,19]],rim,2.8);}
 path(c,[[-32,7],[-23,2],[-13,0]],'#fffef8',2.2);
}
function rice(c){ellipse(c,0,9,28,10,'#ded4b9');box(c,-27,-8,54,22,11,'#fffbed','#d6c9aa');ellipse(c,0,-7,26,9,'#fffdf5');for(let i=0;i<12;i++)ellipse(c,-21+(i*11)%43,1+(i*7)%8,1.4,.65,'#ded3b6');}
export function drawFriendDish(c,key,x,y,scale=1){const f=friendForFood(key);if(!f)return false;c.save();c.translate(x,y);c.scale(scale,scale);c.lineWidth=1.3;plate(c,f);
 if(['nian','uu'].includes(f.id)){
  const coffee=f.id==='uu';box(c,-17,-34,34,49,[4,4,10,10],coffee?'#f2fbfa':'#edf7e8','#a4b8a5');
  box(c,-14,-21,28,33,[0,0,8,8],coffee?'#715044':'#7a9d64',null);ellipse(c,0,-21,14,5,coffee?'#543c33':'#66894d');
  if(coffee){for(const[xx,yy]of[[-9,-21],[4,-18],[-3,-6]]){c.save();c.translate(xx,yy);c.rotate(-.15);box(c,-4,-4,9,8,2,'#d7ece6cc','#a8c9c6');path(c,[[-2,-2],[2,-3]],'#fffaf1',1);c.restore();}path(c,[[9,2],[9,-34],[15,-41]],'#e6ad95',3.2);}
  else{ellipse(c,0,-26,14,6,'#fcfbef','#dfdfc6');for(const[xx,yy]of[[-8,-27],[0,-30],[8,-27]])ellipse(c,xx,yy,5,4,'#fffef4');face(c,0,-5);}
  path(c,[[-11,-12],[-11,5]],'#ffffff77',2);ellipse(c,0,-34,17,5,null,'#afc5b4');
 }else if(f.id==='orange'){
  box(c,-31,-13,62,24,5,'#79503d');box(c,-28,-11,38,18,3,'#b77a45');box(c,-27,-9,35,5,2,'#e6b16c',null);for(let i=0;i<6;i++)ellipse(c,-24+i*6,-1+(i%2)*4,3,2,'#ead29e','#b18758');
  box(c,3,-17,29,32,3,'#e9a16a');path(c,[[4,-16],[9,-12],[13,-17],[18,-12],[23,-17],[30,-13]],'#ffe8bd',2);path(c,[[8,2],[16,-7],[25,2]],'#fff1d3',2);c.fillStyle='#694e3b';c.font='700 6px sans-serif';c.textAlign='center';c.fillText('TRAIL',18,10);
 }else if(f.id==='rabbit'){
  rice(c);box(c,-30,-23,60,23,10,'#dce5df','#94aaa7');box(c,-29,-24,58,7,5,'#86a3a3',null);for(let i=0;i<6;i++)path(c,[[-23+i*9,-17],[-19+i*9,-3]],'#f7fbef',1.8);face(c,14,-10);ellipse(c,-19,-10,2,1,'#b9c9c1');
 }else if(f.id==='red'){
  box(c,-25,-25,50,38,3,'#63804f');for(const yy of [-13,-3,7])box(c,-25,yy,50,3,0,'#bec99a',null);box(c,-25,-29,50,8,3,'#465f39');ellipse(c,9,-29,9,4,'#faf5df');ellipse(c,8,-33,5,4,'#fffbed');ellipse(c,12,-35,3,3,'#fffbed');path(c,[[-19,-25],[0,-25]],'#819868',1.2);
 }else if(f.id==='mum'){
  rice(c);box(c,-31,-24,62,24,8,'#b98042');box(c,-31,-27,62,23,8,'#e5b76c');for(let i=0;i<6;i++)path(c,[[-25+i*10,-23],[-20+i*10,-9]],'#af7945',2);for(let i=0;i<7;i++)ellipse(c,-22+i*7,-21+(i%2)*11,1.8,1.2,'#f6d596');path(c,[[-24,-24],[-9,-25]],'#ffe7ac',2);
 }else{
  rice(c);box(c,-33,-26,66,28,10,'#8b5540');box(c,-33,-29,66,24,9,'#b37b57');for(let i=0;i<6;i++)path(c,[[-26+i*10,-26],[-17+i*10,-8]],'#694737',2.2);for(let i=0;i<4;i++)path(c,[[-25+i*16,-22],[-18+i*16,-22]],'#dfbb91',1.5);ellipse(c,19,-25,5,2,'#92a36c');
 }
 c.restore();return true;
}
