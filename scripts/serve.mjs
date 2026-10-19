import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {localStore,localAuth} from '../server/v1/local.mjs';
import {createApp} from '../server/v1/app.js';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {handleApi} from '../server/api.js';
import {localDatabase} from '../server/local-db.mjs';
const legacy=process.argv.includes('--legacy'),projectRoot=fileURLToPath(new URL('..',import.meta.url));
let database,app,store;
if(legacy)database=await localDatabase(process.env.SUSHI_DB_FILE||resolve(projectRoot,'.data/local.sqlite'));
else{
 await mkdir(resolve(projectRoot,'.data'),{recursive:true});let secret;
 try{secret=await readFile(resolve(projectRoot,'.data/dev-auth-key'),'utf8');}catch{secret=randomBytes(32).toString('hex');await writeFile(resolve(projectRoot,'.data/dev-auth-key'),secret,{mode:0o600});}
 store=await localStore(process.env.SUSHI_DB_FILE===':memory:'?undefined:resolve(projectRoot,'.data/v1-postgres'));
 app=createApp({store,auth:localAuth(store,secret),ipSecret:secret,mode:'local'});
}
const root = resolve(fileURLToPath(new URL('..', import.meta.url)), process.argv.includes('--dist') ? 'dist' : '.');
const portArg = process.argv.indexOf('--port');
const port = Number(portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT || 5173);
const host = process.argv.includes('--host') ? '0.0.0.0' : '127.0.0.1';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.md': 'text/plain', '.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if(url.pathname.startsWith('/api/')){
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1000000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
      const body=Buffer.concat(chunks),headers=new Headers();for(const [name,value] of Object.entries(req.headers))if(value)headers.set(name,Array.isArray(value)?value.join(','):value);
      const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body})});
      const fixturePeer=process.env.SUSHI_TEST_PEERS==='1'&&process.env.SUSHI_DB_FILE===':memory:'&&/^[a-z-]{1,24}$/.test(req.headers['x-sushi-test-peer']||'')?req.headers['x-sushi-test-peer']:null;
      const response=legacy?await handleApi(request,{DB:database}):await app(request,{ip:fixturePeer?'local-fixture:'+fixturePeer:req.socket.remoteAddress||'local'});const responseHeaders=Object.fromEntries(response.headers);const responseCookies=response.headers.getSetCookie();if(responseCookies.length)responseHeaders['set-cookie']=responseCookies;res.writeHead(response.status,responseHeaders);res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    const relative = path.slice(root.length + 1);
    if (!path.startsWith(root + sep) || relative.split(sep).some(p => p.startsWith('.')) || relative.startsWith('node_modules')) { res.writeHead(403); res.end('Forbidden'); return; }
    if (!(await stat(path)).isFile()) throw new Error('not file');
    const data = await readFile(path); res.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', e => { console.error(`Cannot start: ${e.message}`); process.exitCode = 1; });
server.listen(port, host, () => console.log(`SUSHI PANIC → http://localhost:${port}${host === '0.0.0.0' ? ' (LAN enabled)' : ''}`));
