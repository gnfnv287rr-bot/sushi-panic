// Original Sushi Panic composition / synthesis. No recordings, samples or libraries.
// “A Little Table for Two”: 16 bars, 86 BPM, warm major sevenths, brushed bossa.
const RATE=22050,BEAT=60/86,BARS=16,LENGTH=BARS*4*BEAT;
const hz=n=>440*2**((n-69)/12);
function rng(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function pluck(c,dest,midi,at,duration,level,voice='guitar',pan=0){
 const g=c.createGain(),p=c.createStereoPanner(),f=c.createBiquadFilter();p.pan.value=pan;f.type='lowpass';f.frequency.value=voice==='bass'?650:voice==='ep'?2400:3200;
 const partials=voice==='ep'?[1,.26,.06]:voice==='bass'?[1,.2]:[1,.38,.13,.045];
 g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(level,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);g.connect(f);f.connect(p);p.connect(dest);
 partials.forEach((amount,i)=>{const o=c.createOscillator(),v=c.createGain();o.frequency.value=hz(midi)*(i+1);v.gain.value=amount;o.connect(v);v.connect(g);o.start(at);o.stop(at+duration+.015);});
}
export async function renderCafeLoop(){
 const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
 const c=new Offline(2,Math.ceil((LENGTH+2)*RATE),RATE),bus=c.createGain();bus.gain.value=.72;bus.connect(c.destination);
 // A small room reflection, no long or washy reverb.
 const delay=c.createDelay(.3),echo=c.createGain();delay.delayTime.value=.145;echo.gain.value=.12;bus.connect(delay);delay.connect(echo);echo.connect(c.destination);
 const chords=[[48,55,59,64],[45,52,55,60],[50,57,60,64],[43,53,59,62],[48,55,59,64],[45,52,55,60],[53,57,60,64],[43,53,57,62],
  [48,55,59,64],[45,52,55,60],[50,57,60,64],[43,53,59,62],[53,57,60,64],[52,55,59,62],[50,57,60,64],[43,53,59,62]];
 const melody=[76,null,79,74,72,null,71,74,76,null,79,81,76,74,71,null];
 const random=rng(13031),noise=c.createBuffer(1,RATE*.12,RATE);let smooth=0;
 for(let i=0;i<noise.length;i++){smooth+=.2*((random()*2-1)-smooth);noise.getChannelData(0)[i]=smooth*Math.exp(-i/(RATE*.027));}
 for(let bar=0;bar<BARS;bar++){
  const at=bar*4*BEAT,chord=chords[bar];
  // Soft thumb bass and lightly syncopated, staggered guitar triads.
  for(const [b,n] of [[0,chord[0]-12],[1.5,chord[0]-5],[2.5,chord[0]-12]])pluck(c,bus,n,at+b*BEAT,.65,.13,'bass',-.08);
  for(const b of [.5,1.75,2.5,3.5])chord.slice(1).forEach((n,i)=>pluck(c,bus,n,at+b*BEAT+i*.012,.7,.034,'guitar',-.22));
  for(const b of [0,2])chord.slice(1).forEach(n=>pluck(c,bus,n,at+b*BEAT,1.35,.023,'ep',.22));
  if(melody[bar]!=null){pluck(c,bus,melody[bar],at+.25*BEAT,1.05,.039,'ep',.12);if(bar%4===2)pluck(c,bus,melody[bar]-2,at+2.75*BEAT,.6,.026,'ep',.12);}
  if(bar===3||bar===11)for(const [i,n] of [chord[2]+12,chord[1]+12].entries())pluck(c,bus,n,at+(2.5+i*.5)*BEAT,.45,.018,'guitar',.35);
  for(const b of [.5,1.5,2.5,3.5]){const s=c.createBufferSource(),g=c.createGain();s.buffer=noise;g.gain.value=.065;s.connect(g);g.connect(bus);s.start(at+b*BEAT);}
  // Let input/animation run while scheduling a few hundred tiny offline voices.
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 const rendered=await c.startRendering(),frames=Math.round(LENGTH*RATE),loop=c.createBuffer(2,frames,RATE);let peak=0;
 for(let ch=0;ch<2;ch++){const src=rendered.getChannelData(ch),dst=loop.getChannelData(ch);for(let i=0;i<src.length;i++)dst[i%frames]+=src[i];for(const n of dst)peak=Math.max(peak,Math.abs(n));}
 const scale=peak>0?.52/peak:1;for(let ch=0;ch<2;ch++){const d=loop.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]*=scale;}
 return loop;
}
export function effectBuffer(c,kind){
 const paper=kind.startsWith('paper-'),discovery=kind.startsWith('discovery-');
 const duration=paper?(kind==='paper-open'?.4:kind==='paper-close'?.26:.3):discovery?.66:kind==='tea'?.44:kind==='seared'?.31:.22;
 const b=c.createBuffer(1,Math.ceil(duration*RATE),RATE),data=b.getChannelData(0),random=rng([...kind].reduce((s,v)=>s+v.charCodeAt(0),13));let smooth=0,low=0;
 for(let i=0;i<data.length;i++){
  const t=i/RATE,x=t/duration,n=random()*2-1;smooth+=.16*(n-smooth);low+=.055*(n-low);const env=Math.sin(Math.PI*x)**1.4;
  if(paper){const fold=.45+.55*Math.sin(x*Math.PI*2.6)**2;data[i]=smooth*env*fold*.55+low*env*.13;}
  else if(discovery){const notes=[523.25,659.25,783.99];let sum=0;notes.forEach((f,j)=>{const dt=t-j*.095;if(dt>=0)sum+=Math.sin(2*Math.PI*f*dt)*Math.exp(-dt*12)*Math.min(1,dt/.008);});data[i]=sum*.14;}
  else if(kind==='stamp')data[i]=(low*1.7+Math.sin(2*Math.PI*145*t)*.2)*Math.exp(-t*34)*Math.min(1,t/.008);
  else if(kind==='tea')data[i]=(.16*Math.sin(2*Math.PI*740*t)*Math.exp(-t*22)+low*.35*Math.sin(Math.PI*x)**2)*Math.min(1,t/.009);
  else if(kind==='fried'||kind==='vegetable'){const crunch=(kind==='fried'?.36:.22);data[i]=(smooth*crunch+n*.025)*env*(.4+.6*Math.sin(t*95)**2);}
  else if(kind==='seared')data[i]=smooth*.3*env+Math.sin(2*Math.PI*210*t)*.12*Math.exp(-t*23)*Math.min(1,t/.008);
  else{const f=kind==='soft'?230:kind==='dessert'?320:kind==='confirm'?430:265;data[i]=(Math.sin(2*Math.PI*(f*t-60*t*t))*.24+low*.12)*Math.exp(-t*20)*Math.min(1,t/.009);}
  data[i]*=Math.min(1,(duration-t)/.025); // Silence at both edges, no clicks.
 }
 return b;
}
