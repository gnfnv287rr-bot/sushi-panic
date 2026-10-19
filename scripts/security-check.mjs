import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const baseline=JSON.parse(await readFile('docs/v1/BASELINE.json','utf8'));
for(const [file,key] of [['src/core.js','coreSha256'],['src/renderer.js','rendererSha256']]){
 const actual=createHash('sha256').update(await readFile(file)).digest('hex');if(actual!==baseline[key])throw new Error('Protected gameplay file changed: '+file);
}
const patterns=[/sb_secret_[A-Za-z0-9_-]{24,}/,/gh[pousr]_[A-Za-z0-9]{30,}/,/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/];
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n');
for(const file of files){if(!file)continue;const content=await readFile(file,'utf8');if(patterns.some(p=>p.test(content)))throw new Error('Potential secret in '+file);}
const commits=execFileSync('git',['rev-list','--all'],{encoding:'utf8'}).trim().split('\n');for(const sha of commits){const text=execFileSync('git',['show',sha,'--format=','--no-ext-diff'],{encoding:'utf8',maxBuffer:16*1024*1024});if(patterns.some(p=>p.test(text)))throw new Error('Potential secret in git history '+sha);}
for(const file of ['src/social.js','src/main.js']){const text=await readFile(file,'utf8');if(/chatgpt\.site|SUPABASE_SECRET_KEY|RATE_LIMIT_SECRET/.test(text))throw new Error('Old hosting dependency or server configuration in client');}
const sql=(await Promise.all((await readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).map(n=>readFile('supabase/migrations/'+n,'utf8')))).join('\n');const tableCount=(sql.match(/create table public\.sushi_/g)||[]).length,rlsCount=(sql.match(/enable row level security/g)||[]).length;if(tableCount<6||rlsCount!==tableCount)throw new Error('Missing RLS');
console.log(JSON.stringify({protectedGameHashes:'unchanged',trackedAndNewFilesScanned:files.length,commitsScanned:commits.length,credentialPatternMatches:0,clientOldDomainDependencies:0,rlsTables:rlsCount},null,2));
