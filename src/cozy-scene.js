// Approved V1.3 scenery, copied from the Owner-accepted visual demo. No game state is changed.
import {trackGeometry} from './renderer-v12.js';
const oval=(c,x,y,rx,ry,color)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();};
const line=(c,points,color,width=1)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.stroke();};
const round=(c,x,y,w,h,r,color)=>{c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();};
export function paintRoom(canvas,travel){
 const box=canvas.getBoundingClientRect(),w=box.width,h=box.height,dpr=Math.min(devicePixelRatio||1,2);if(!w||!h)return null;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);const small=w<500,g=trackGeometry(w,h);
 c.fillStyle='#f8edd7';c.fillRect(0,0,w,h);c.fillStyle='#fff8e8';c.fillRect(0,0,w,72);
 line(c,[[0,72],[w,72]],'#dbcaa841',2);
 // Sparse timber grain gives the same tabletop a little life, not a material filter.
 for(let y=98;y<h;y+=39){line(c,[[0,y],[w,y]],'#cfb38313',1);for(let x=17;x<w;x+=203)line(c,[[x+(y%19),y+7],[x+68+(y%19),y+7]],'#fffdf333',1.5);}
 // One ceramic teapot on the left; a tiny kitchen herb on the right. Both outside the rail.
 const tx=small?31:63;c.save();c.translate(tx,37);c.scale(small?.75:1,small?.75:1);
 oval(c,0,18,24,5,'#b6a17b16');round(c,-16,-5,32,27,12,'#c9d8b5');oval(c,0,-6,14,4,'#dfebc7');round(c,-7,-12,14,5,3,'#b6c9a0');oval(c,0,-14,4,3,'#acbf96');line(c,[[14,1],[24,-7],[28,-5],[20,9]],'#b1c296',4);line(c,[[-17,1],[-24,1],[-24,13],[-15,13]],'#b1c296',3);line(c,[[-4,-23],[-7,-28],[-3,-34]],'#b5c3a975',1.5);c.restore();
 const px=w-(small?32:66);c.save();c.translate(px,39);c.scale(small?.75:1,small?.75:1);oval(c,0,19,23,5,'#b6a17b16');round(c,-12,2,24,20,[2,2,7,7],'#e9c1a6');line(c,[[0,5],[0,-25]],'#88a783',2);for(const [x,y,r]of[[-9,-9,-.6],[10,-17,.6],[-8,-22,-.5],[8,-1,.6]]){c.save();c.translate(x,y);c.rotate(r);oval(c,0,0,5,10,'#a3be8e');c.restore();}c.restore();
 // The original rounded racetrack, with a celadon belt and a warm ceramic rim.
 const path=()=>{c.beginPath();c.roundRect(g.left,g.top,g.right-g.left,g.bottom-g.top,g.radius);};
 c.save();c.translate(0,6);path();c.lineWidth=small?82:104;c.strokeStyle='#c8ad841f';c.stroke();c.restore();
 for(const[width,color]of[[small?87:106,'#d9c4a0'],[small?82:101,'#fff5db'],[small?68:85,'#aac6ad']]){path();c.lineWidth=width;c.strokeStyle=color;c.stroke();}
 for(let i=0;i<Math.ceil(g.total/29);i++){const p=g.point(i*29/g.total+travel);c.save();c.translate(p.x,p.y);c.rotate(p.angle);line(c,[[0,small?-30:-38],[0,small?30:38]],'#e2ebd93a',1);c.restore();}
 return g;
}
