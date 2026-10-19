// Supabase Edge server only. Anonymous login and voluntary email binding use Auth in the browser.
import {createClient} from '@supabase/supabase-js';
import {createApp} from './app.js';
import {HttpError} from './common.js';
export function cloudApp(env,{makeClient=createClient}={}){
 const url=env.SUPABASE_URL,secret=env.SUSHI_SECRET_KEY;
 if(!url||!secret||!env.RATE_LIMIT_SECRET)throw new Error('Cloud environment is incomplete');
 if(!secret.startsWith('sb_secret_'))throw new Error('Use a server secret API key');
 const db=makeClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const store={async rpc(name,args={}){const {data,error}=await db.rpc(name,args);if(error)throw new Error('Database unavailable');return data;}};
 const auth={async resolve(request,{create=false}={}){
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token){if(create)throw new HttpError(401,'请先建立游客身份','identity_lost');return{id:null,cookies:[]};}
  const {data,error}=await db.auth.getUser(token);
  if(error||!data.user)throw new HttpError(error?.status>=500?503:401,error?.status>=500?'身份服务暂不可用':'游客身份已失效，可恢复邮箱账号或建立新身份','identity_lost');
  return{id:data.user.id,cookies:[]};
 }};
 return createApp({store,auth,ipSecret:env.RATE_LIMIT_SECRET,cronSecret:env.CRON_SECRET,allowedOrigins:(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)});
}
