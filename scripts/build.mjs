import {build as esbuild} from 'esbuild';
import { mkdir, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {createHash} from 'node:crypto';
import {PUBLIC_CONFIG} from '../src/config.js';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(root, 'dist');
await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
for (const file of ['index.html', 'style.css', 'src', 'favicon.svg', 'assets']) await cp(resolve(root, file), resolve(out, file), { recursive: true });
// A tiny project-specific concatenation, not a general JS bundler. Module boundaries stay in src/.
const modules=await Promise.all(['friends-special.js','friends-art.js','menus-v14.js','casual-v14.js','run-lease.js','run-state-v14.js','audio-manager.js','audio-score.js','config.js','identity.js','storage.js','core.js','menus-v1.js','menus-v2.js','menu-catalog-v2.js','casual-v12.js','casual-v121.js','casual-engine.js','run-state.js','renderer.js','renderer-v12.js','renderer-cozy.js','cozy-scene.js','social.js','collection-feedback.js','shop-experience.js','main.js'].map(f=>readFile(resolve(root,'src',f),'utf8')));
const bundled=await esbuild({entryPoints:[resolve(root,'src/main.js')],bundle:true,write:false,format:'esm',platform:'browser',target:['es2020']});
const script=bundled.outputFiles[0].text;
const css=await readFile(resolve(root,'style.css'),'utf8'),icon=await readFile(resolve(root,'favicon.svg'),'utf8');
const menuFont=await readFile(resolve(root,'assets/fonts/sushi-menu.woff2'));
const cozyFont=await readFile(resolve(root,'assets/cozy/cozy-round.woff2'));
const chef=await readFile(resolve(root,'assets/cozy/chef.svg'),'utf8');
const offlineCss=css.replace('./assets/fonts/sushi-menu.woff2','data:font/woff2;base64,'+menuFont.toString('base64')).replace('./assets/cozy/cozy-round.woff2','data:font/woff2;base64,'+cozyFont.toString('base64'));
const html=(await readFile(resolve(root,'index.html'),'utf8'))
  .replace('<link rel="stylesheet" href="./style.css" />',()=>`<style>${offlineCss}</style>`)
  .replace('src="./assets/cozy/chef.svg"',()=>`src="data:image/svg+xml,${encodeURIComponent(chef)}"`)
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
// New HTML points to one immutable release directory, preventing mixed cached modules on Pages.
const releaseId=createHash('sha256').update(modules.join('\n')+css+html).update(menuFont).update(cozyFont).update(chef).digest('hex').slice(0,12);
const releaseRoot=resolve(out,'assets',releaseId);await mkdir(releaseRoot,{recursive:true});
for(const file of ['src','vendor','style.css'])await cp(resolve(out,file),resolve(releaseRoot,file),{recursive:true});
await cp(resolve(root,'assets'),resolve(releaseRoot,'assets'),{recursive:true});
await writeFile(resolve(releaseRoot,'src/config.js'),'export const PUBLIC_CONFIG=Object.freeze('+JSON.stringify({...PUBLIC_CONFIG,assetBase:'./assets/'+releaseId+'/'})+');\n');
const entry=await readFile(resolve(out,'index.html'),'utf8');
await writeFile(resolve(out,'index.html'),entry.replace('./style.css','./assets/'+releaseId+'/style.css').replace('./src/main.js','./assets/'+releaseId+'/src/main.js').replaceAll('./assets/cozy/','./assets/'+releaseId+'/assets/cozy/'));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
await writeFile(resolve(out,'build.json'),JSON.stringify({version:pkg.version,releaseId,rulesVersion:'1.4.0'}));
const shared=resolve(root,'supabase/functions/_shared');await mkdir(shared,{recursive:true});
await cp(resolve(root,'src/core.js'),resolve(shared,'core.js'));
const legacy=await readFile(resolve(root,'server/api.js'),'utf8');
const replay="import {Game,STEP} from './core.js';\nclass ApiError extends Error{constructor(status,message){super(message);this.status=status;}}\nconst MAX_TICKS=6*3600*60,MAX_ACTIONS=25000;\n"+legacy.slice(legacy.indexOf('export function replayRun'),legacy.indexOf('async function leaderboard'));
await writeFile(resolve(shared,'replay.js'),replay);
for(const file of ['friends-special.js','menus-v14.js','casual-v14.js','casual-v12.js','menus-v1.js','menus-v2.js','menu-catalog-v2.js','casual-v121.js','casual-engine.js'])await cp(resolve(root,'src',file),resolve(shared,file));
for(const file of ['app.js','common.js','cloud.js']){let code=await readFile(resolve(root,'server/v1',file),'utf8');code=code.replace("'../../src/core.js'","'./core.js'").replace("'../api.js'","'./replay.js'").replace("'../../src/casual-v12.js'","'./casual-v12.js'").replace("'../../src/menus-v1.js'","'./menus-v1.js'").replace("'../../src/menus-v2.js'","'./menus-v2.js'").replace("'../../src/casual-engine.js'","'./casual-engine.js'").replace("'../../src/menus-v14.js'","'./menus-v14.js'").replace("'../../src/friends-special.js'","'./friends-special.js'").replace("'@supabase/supabase-js'","'npm:@supabase/supabase-js@2.118.0'");await writeFile(resolve(shared,file),code);}
// Keep the previously shared preview link useful after the production switch.
await mkdir(resolve(out,'v1'),{recursive:true});
await writeFile(resolve(out,'v1/index.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../"><title>寿司转转！</title><a href="../">进入寿司转转！</a></html>');
console.log('Ready: dist/ for GitHub Pages, Supabase Edge shared modules, play.html offline practice.');
