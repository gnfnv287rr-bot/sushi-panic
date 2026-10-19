import {build as esbuild} from 'esbuild';
import { mkdir, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(root, 'dist');
await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
for (const file of ['index.html', 'style.css', 'src', 'favicon.svg']) await cp(resolve(root, file), resolve(out, file), { recursive: true });
// A tiny project-specific concatenation, not a general JS bundler. Module boundaries stay in src/.
const modules=await Promise.all(['config.js','identity.js','core.js','renderer.js','social.js','main.js'].map(f=>readFile(resolve(root,'src',f),'utf8')));
const script=modules.map(s=>s.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
const css=await readFile(resolve(root,'style.css'),'utf8'),icon=await readFile(resolve(root,'favicon.svg'),'utf8');
const html=(await readFile(resolve(root,'index.html'),'utf8'))
  .replace('<link rel="stylesheet" href="./style.css" />',()=>`<style>${css}</style>`)
  .replace('href="./favicon.svg"',()=>`href="data:image/svg+xml,${encodeURIComponent(icon)}"`)
  .replace('<script type="module" src="./src/main.js"></script>',()=>`<script type="module">\n${script}\n</script>`);
await writeFile(resolve(root,'play.html'),html);await writeFile(resolve(out,'play.html'),html);
// Vendor the official Auth SDK: no runtime CDN dependency, loaded only for online identity.
await mkdir(resolve(root,'vendor'),{recursive:true});
await esbuild({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:root},bundle:true,minify:true,format:'esm',platform:'browser',target:['es2020'],outfile:resolve(root,'vendor/supabase.js')});
const notices=[];
for(const packageName of ['@supabase/supabase-js','@supabase/auth-js','@supabase/functions-js','@supabase/postgrest-js','@supabase/realtime-js','@supabase/storage-js','@supabase/phoenix','iceberg-js']){for(const license of ['LICENSE','LICENSE.md']){try{notices.push(packageName+'\n'+await readFile(resolve(root,'node_modules',packageName,license),'utf8'));break;}catch(error){if(error.code!=='ENOENT')throw error;}}}
await writeFile(resolve(root,'vendor/NOTICES.txt'),notices.join('\n\n'));
await cp(resolve(root,'vendor'),resolve(out,'vendor'),{recursive:true});
const shared=resolve(root,'supabase/functions/_shared');await mkdir(shared,{recursive:true});
await cp(resolve(root,'src/core.js'),resolve(shared,'core.js'));
const legacy=await readFile(resolve(root,'server/api.js'),'utf8');
const replay="import {Game,STEP} from './core.js';\nclass ApiError extends Error{constructor(status,message){super(message);this.status=status;}}\nconst MAX_TICKS=6*3600*60,MAX_ACTIONS=25000;\n"+legacy.slice(legacy.indexOf('export function replayRun'),legacy.indexOf('async function leaderboard'));
await writeFile(resolve(shared,'replay.js'),replay);
for(const file of ['app.js','common.js','cloud.js']){let code=await readFile(resolve(root,'server/v1',file),'utf8');code=code.replace("'../../src/core.js'","'./core.js'").replace("'../api.js'","'./replay.js'").replace("'@supabase/supabase-js'","'npm:@supabase/supabase-js@2.118.0'");await writeFile(resolve(shared,file),code);}
console.log('Ready: dist/ for GitHub Pages, Supabase Edge shared modules, play.html offline practice.');
