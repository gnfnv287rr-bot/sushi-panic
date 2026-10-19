// Real Supabase staging acceptance. Uses public key only. Never run against production.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from '@playwright/test';
const project='ujejpprlmpjmmbodhqdj';
const supabaseUrl=process.env.SUSHI_TEST_URL,publishableKey=process.env.SUSHI_TEST_PUBLISHABLE_KEY;
assert.equal(supabaseUrl,`https://${project}.supabase.co`,'This script is restricted to the separate staging project');
assert.ok(publishableKey?.startsWith('sb_publishable_'));
const prefix=process.env.SUSHI_REPORT_PREFIX||'v1';
const origin='https://gnfnv287rr-bot.github.io',root=origin+'/sushi-panic/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={environment:'separate Supabase Free staging',project,assets:'local release dist under production origin using Playwright routing; real Supabase Auth/Edge/PostgreSQL, no API stubs',startedAt:new Date().toISOString(),checks:[]};
const check=(name,details)=>{report.checks.push({name,status:'passed',details});console.log('PASS '+name);};
const clients=[];const errors=[];
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1100},isMobile:mobile,hasTouch:mobile});
  await context.route(root+'**',async r=>{const u=new URL(r.request().url()),relative=decodeURIComponent(u.pathname.slice('/sushi-panic/'.length))||'index.html';const path=resolve('dist',relative);if(!path.startsWith(resolve('dist')+'/'))return r.abort();
   if(relative.endsWith('src/config.js'))return r.fulfill({contentType:'text/javascript',body:`export const PUBLIC_CONFIG=${JSON.stringify({supabaseUrl,publishableKey,edgeFunction:'sushi-api'})};`});
   const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};return r.fulfill({contentType:types[extname(path)]||'text/plain',body:await readFile(path)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));clients.push({context,page});
 }
 async function api(page,path,body,rest=false){return page.evaluate(async({path,body,supabaseUrl,publishableKey,rest})=>{
  const {authClient}=await import(new URL('./identity.js',document.querySelector('script[src$="/src/main.js"]').src).href);const c=await authClient(),{data}=await c.auth.getSession();
  const r=await fetch(supabaseUrl+(rest?'/rest/v1/':'/functions/v1/sushi-api')+path,{method:body===undefined?'GET':'POST',headers:{apikey:publishableKey,...(data.session?{authorization:'Bearer '+data.session.access_token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:await r.json()};
 },{path,body,supabaseUrl,publishableKey,rest});}
 for(let i=0;i<clients.length;i++){
  const {page}=clients[i];await page.goto(root+'?test=1');assert.equal(await page.evaluate(async()=>{const m=await import(new URL('./config.js',document.querySelector('script[src$="/src/main.js"]').src).href);return m.PUBLIC_CONFIG.supabaseUrl;}),supabaseUrl,'Staging routing is mandatory before creating any player');await page.locator('#player-id-input').fill('同名食客');await page.getByRole('button',{name:'入座，开吃！'}).click();await page.getByRole('button',{name:'记住了，开始！'}).click();
  const mine=await api(page,'/api/identity');assert.equal(mine.status,200);clients[i].id=mine.data.profile.id;
  assert.ok(!await page.locator('#character-title').innerText().then(t=>t.includes('练习局')));
  check(`player ${i+1} anonymous login + nickname`,{playerId:clients[i].id,mobile:i===1});
  let first=true,failed=false,finishRequest,receipt;
  await page.route('**/functions/v1/sushi-api/api/runs/*/finish',async r=>{finishRequest={path:new URL(r.request().url()).pathname.split('/sushi-api')[1],body:r.request().postDataJSON()};if(i===0&&first){first=false;failed=true;return r.abort();}return r.continue();});
  page.on('response',async r=>{if(r.url().endsWith('/finish')&&r.status()===200)receipt=await r.json();});
  const deadline=Date.now()+50000;
  while(Date.now()<deadline){const s=await page.evaluate(()=>({phase:window.__sushi.game.phase,target:window.__sushi.renderer.targets.filter(t=>t.number&&t.key!=='tea').sort((a,b)=>Number(b.allergic)-Number(a.allergic))[0]?.number}));if(s.phase==='gameover')break;if(s.phase==='paused')await page.getByRole('button',{name:'继续开吃',exact:true}).click();else if(s.target)await page.keyboard.press(String(s.target));await page.waitForTimeout(220);}
  assert.equal(await page.evaluate(()=>window.__sushi.game.phase),'gameover');
  const score=await page.evaluate(()=>window.__sushi.game.score);
  if(i===0){await page.waitForFunction(()=>document.querySelector('#rank-result').textContent.includes('等待重试'));assert.ok(failed);await page.reload();await page.getByRole('button',{name:'今日排行榜',exact:true}).click();}
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('sushi.pending.v1')||'[]').length===0,null,{timeout:25000});
  for(let wait=0;!receipt?.result&&wait<100;wait++)await page.waitForTimeout(100);assert.ok(receipt?.result,'Server confirmed finish');assert.equal(receipt.result.score,score);assert.ok(receipt.result.rank>=1);clients[i].score=score;
  check(`player ${i+1} real run verified by Edge replay`,{score,rank:receipt.result.rank,retried:i===0});
  const duplicate=await api(page,finishRequest.path,finishRequest.body);assert.equal(duplicate.status,200);assert.equal(duplicate.data.result.duplicate,true);
  assert.equal((await api(page,'/api/identity')).data.profile.playCount,1);check(`player ${i+1} retry does not count twice`);
  await page.screenshot({path:`artifacts/${prefix}-cloud-player-${i+1}.png`,fullPage:true});
 }
 assert.notEqual(clients[0].id,clients[1].id);
 for(const {page,id} of clients){const b=await api(page,'/api/leaderboard');assert.equal(b.status,200);assert.ok(b.data.entries.length>=2);assert.equal(b.data.me.playerId,id);assert.ok(b.data.entries[0].score>=b.data.entries[1].score);for(const c of clients)assert.ok(b.data.entries.some(e=>e.playerId===c.id&&e.score===c.score));}
 check('two independent players see both scores, ordered ranks, own rows');
 const a=clients[0];assert.equal((await api(a.page,'/api/identity',{nickname:'改名保留成绩'})).status,200);await a.page.reload();await a.page.waitForFunction(()=>document.querySelector('#player-id-input')?.value==='改名保留成绩');assert.equal(await a.page.locator('#player-id-input').inputValue(),'改名保留成绩');const profile=(await api(a.page,'/api/identity')).data.profile;assert.equal(profile.id,a.id);assert.equal(profile.playCount,1);assert.equal(profile.bestScore,a.score);check('identity persists across reload; rename preserves score');assert.ok(profile.totalSushi>0);assert.equal(profile.collection.reduce((n,c)=>n+c.tasteCount,0),profile.totalSushi);assert.ok(profile.themeProgress[0].unlocked>0);check('server-confirmed sushi archive persists across reload and rename',{totalSushi:profile.totalSushi,unlocked:profile.collection.length});
 const own=await api(a.page,'sushi_players?select=id',undefined,true);assert.equal(own.status,200);assert.deepEqual(own.data.map(x=>x.id),[a.id]);
 const forbidden=await api(a.page,'rpc/sushi_complete',{p_player:a.id,p_id:crypto.randomUUID(),p_digest:'forged',p_score:999999999,p_ticks:1,p_sushi:1},true);assert.ok([401,403,404].includes(forbidden.status));
 const insert=await api(a.page,'sushi_players',{id:clients[1].id,nickname:'非法修改',best_score:99999999},true);assert.ok([401,403].includes(insert.status));check('live PostgreSQL RLS own-only reads and denied writes/RPC');await a.page.goto(root+'?test=1#access_token=forged&refresh_token=forged');await a.page.waitForFunction(()=>location.hash==='');assert.equal((await api(a.page,'/api/identity')).data.profile.id,a.id);check('incoming auth fragment cannot replace an existing identity or archive');
 assert.deepEqual(errors,[]);check('desktop and mobile emulation no JavaScript errors');report.status='passed';
}catch(e){report.status='failed';report.error=String(e.stack||e);console.error(report.error);process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await mkdir('artifacts',{recursive:true});await writeFile(`artifacts/${prefix}-cloud-acceptance.json`,JSON.stringify(report,null,2));await browser.close();}
