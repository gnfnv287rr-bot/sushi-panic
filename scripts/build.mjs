import { mkdir, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(root, 'dist');
await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
for (const file of ['index.html', 'style.css', 'src', 'favicon.svg']) await cp(resolve(root, file), resolve(out, file), { recursive: true });
// A tiny project-specific concatenation, not a general JS bundler. Module boundaries stay in src/.
const modules=await Promise.all(['core.js','renderer.js','social.js','main.js'].map(f=>readFile(resolve(root,'src',f),'utf8')));
const script=modules.map(s=>s.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
const css=await readFile(resolve(root,'style.css'),'utf8'),icon=await readFile(resolve(root,'favicon.svg'),'utf8');
const html=(await readFile(resolve(root,'index.html'),'utf8'))
  .replace('<link rel="stylesheet" href="./style.css" />',()=>`<style>${css}</style>`)
  .replace('href="./favicon.svg"',()=>`href="data:image/svg+xml,${encodeURIComponent(icon)}"`)
  .replace('<script type="module" src="./src/main.js"></script>',()=>`<script type="module">\n${script}\n</script>`);
await writeFile(resolve(root,'play.html'),html);await writeFile(resolve(out,'play.html'),html);
try{
  const manifest=JSON.parse(await readFile(resolve(root,'.openai/hosting.json'),'utf8'));
  if(manifest.d1){
    const core=(await readFile(resolve(root,'src/core.js'),'utf8')).replace(/^export /gm,'');
    const api=(await readFile(resolve(root,'server/api.js'),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
    const worker=(await readFile(resolve(root,'worker/index.js'),'utf8')).replace(/^import .*;\r?\n/gm,'').replace("'__BUILD_GAME_HTML__'",()=>JSON.stringify(html));
    await mkdir(resolve(out,'server'),{recursive:true});await writeFile(resolve(out,'server/index.js'),core+'\n'+api+'\n'+worker);
    await mkdir(resolve(out,'.openai'),{recursive:true});await writeFile(resolve(out,'.openai/hosting.json'),JSON.stringify(manifest,null,2)+'\n');
    await cp(resolve(root,'drizzle'),resolve(out,'.openai/drizzle'),{recursive:true});
  }
}catch(error){if(error.code!=='ENOENT')throw error;}
console.log('Ready: dist/ for static hosting; play.html for double-click offline play (no server).');
