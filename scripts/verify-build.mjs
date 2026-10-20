import assert from 'node:assert/strict';import {readFile,access} from 'node:fs/promises';
const build=JSON.parse(await readFile('dist/build.json','utf8')),html=await readFile('dist/index.html','utf8');assert.match(build.releaseId,/^[0-9a-f]{12}$/);const base='assets/'+build.releaseId;
assert.ok(html.includes('./'+base+'/src/main.js'));assert.ok(html.includes('./'+base+'/style.css'));
for(const file of ['friends-special.js','friends-art.js','menus-v14.js','casual-v14.js','run-lease.js','run-state-v14.js','audio-manager.js','audio-score.js','main.js','core.js','renderer.js','renderer-cozy.js','cozy-scene.js','config.js','identity.js','storage.js','run-state.js','social.js','casual-engine.js','casual-v121.js','menu-catalog-v2.js','menus-v2.js','collection-feedback.js','shop-experience.js'])await access(`dist/${base}/src/${file}`);
const config=await readFile(`dist/${base}/src/config.js`,'utf8');assert.ok(config.includes('./'+base+'/'));assert.ok(!/sb_secret_[A-Za-z0-9_-]{24,}/.test(config));await access(`dist/${base}/vendor/supabase.js`);
await access(`dist/${base}/assets/fonts/sushi-menu.woff2`);await access(`dist/${base}/assets/fonts/OFL-ChillRound.txt`);
console.log('Immutable browser release verified: '+build.releaseId);

await access(`dist/${base}/assets/cozy/cozy-round.woff2`);await access(`dist/${base}/assets/cozy/chef.svg`);assert.ok(html.includes('./'+base+'/assets/cozy/chef.svg'));
const offline=await readFile('dist/play.html','utf8');assert.ok(offline.includes('data:font/woff2;base64,'));assert.ok(offline.includes('data:image/svg+xml,'));assert.ok(!offline.includes('src="./assets/cozy/chef.svg"'));
console.log('Cozy visuals and offline assets verified.');
