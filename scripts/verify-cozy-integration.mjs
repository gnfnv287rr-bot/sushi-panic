import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const baseline=JSON.parse(await readFile('docs/v13/BASELINE.json','utf8'));
for(const[path,expected]of Object.entries(baseline.protectedHashes))assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'),expected,`${path}: business logic changed`);
const html=await readFile('index.html','utf8'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'duplicate DOM IDs');
for(const id of baseline.businessIds)assert.ok(ids.includes(id),`missing original business element ${id}`);
for(const name of ['chef.svg','icons.svg','cozy-round.woff2','OFL-ChillRound.txt']){
 const actual=await readFile('assets/cozy/'+name),approved=await readFile('design-preview/v1.3/assets/'+name);
 // OFL has only a whitespace normalization in its accepted commit.
 assert.deepEqual(actual,approved,`approved art changed: ${name}`);
}
const approved=(await readFile('design-preview/v1.3/cozy.css','utf8')).replace("url('./assets/cozy-round.woff2')","url('./assets/cozy/cozy-round.woff2')");
assert.ok((await readFile('style.css','utf8')).includes(approved),'approved component stylesheet changed');
assert.ok(!html.includes('demo.js'),'simulation must never be a live entry');
assert.ok(html.includes('./src/main.js'));
console.log(`Preserved ${Object.keys(baseline.protectedHashes).length} business modules, ${baseline.businessIds.length} original controls, accepted artwork/font/components.`);
