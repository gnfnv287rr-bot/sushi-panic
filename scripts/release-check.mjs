import {readFile} from 'node:fs/promises';
import {PUBLIC_CONFIG} from '../src/config.js';
if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(PUBLIC_CONFIG.supabaseUrl)||!PUBLIC_CONFIG.publishableKey.startsWith('sb_publishable_'))throw new Error('Production publication blocked: configure and verify the real Supabase project first.');
const response=await fetch(PUBLIC_CONFIG.supabaseUrl+'/functions/v1/'+PUBLIC_CONFIG.edgeFunction+'/api/health',{headers:{apikey:PUBLIC_CONFIG.publishableKey},signal:AbortSignal.timeout(10000)});
const health=await response.json();if(!response.ok||health.mode!=='production'||!health.clock?.day)throw new Error('Production Edge health check failed');
console.log('Production configuration and Edge health verified. Full two-player acceptance is recorded separately, not implied by health.');

const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));if(pkg.version.startsWith('1.2.')&&!pkg.version.includes('-p0')){const gate=JSON.parse(await readFile(new URL('../docs/v12/P0_GATE.json',import.meta.url),'utf8'));if(gate.passed!==true)throw new Error('P1 publication blocked until real P0 email and sync acceptance passes.');}
