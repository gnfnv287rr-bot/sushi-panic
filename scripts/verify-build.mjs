import assert from 'node:assert/strict';import {readFile,access} from 'node:fs/promises';
const build=JSON.parse(await readFile('dist/build.json','utf8')),html=await readFile('dist/index.html','utf8');assert.match(build.releaseId,/^[0-9a-f]{12}$/);const base='assets/'+build.releaseId;
assert.ok(html.includes('./'+base+'/src/main.js'));assert.ok(html.includes('./'+base+'/style.css'));
for(const file of ['main.js','core.js','renderer.js','config.js','identity.js','storage.js','run-state.js','social.js','casual-engine.js','casual-v121.js','menu-catalog-v2.js','menus-v2.js'])await access(`dist/${base}/src/${file}`);
const config=await readFile(`dist/${base}/src/config.js`,'utf8');assert.ok(config.includes('./'+base+'/'));assert.ok(!/sb_secret_[A-Za-z0-9_-]{24,}/.test(config));await access(`dist/${base}/vendor/supabase.js`);
console.log('Immutable browser release verified: '+build.releaseId);
