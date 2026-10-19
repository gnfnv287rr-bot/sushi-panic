import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function localDatabase(filename=':memory:'){
  const root=fileURLToPath(new URL('..',import.meta.url));
  if(filename!==':memory:')await mkdir(resolve(root,'.data'),{recursive:true});
  const sqlite=new DatabaseSync(filename);sqlite.exec('PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS _local_migrations(name TEXT PRIMARY KEY);');
  const migrations=(await readdir(resolve(root,'drizzle'))).filter(n=>n.endsWith('.sql')).sort();
  for(const name of migrations){if(sqlite.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name))continue;sqlite.exec('BEGIN');try{sqlite.exec(await readFile(resolve(root,'drizzle',name),'utf8'));sqlite.prepare('INSERT INTO _local_migrations VALUES(?)').run(name);sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}
  const prepare=sql=>({values:[],bind(...v){this.values=v;return this;},async first(){return sqlite.prepare(sql).get(...this.values)||null;},async all(){return{results:sqlite.prepare(sql).all(...this.values)};},async run(){const r=sqlite.prepare(sql).run(...this.values);return{meta:{changes:Number(r.changes)}};}});
  return{prepare,async batch(statements){sqlite.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close:()=>sqlite.close()};
}
