import {PUBLIC_CONFIG} from './config.js';
let clientPromise;
export async function authClient(){
 if(!PUBLIC_CONFIG.supabaseUrl||!PUBLIC_CONFIG.publishableKey)throw new Error('在线身份服务尚未配置，可先进行练习');
 clientPromise??=import(new URL('./vendor/supabase.js',document.baseURI).href).then(({createClient})=>createClient(PUBLIC_CONFIG.supabaseUrl,PUBLIC_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}})).catch(error=>{clientPromise=null;throw error;});
 return clientPromise;
}
export async function sessionToken({create=false}={}){
 const client=await authClient();let {data,error}=await client.auth.getSession();if(error)throw error;
 if(!data.session&&create){({data,error}=await client.auth.signInAnonymously());if(error)throw Object.assign(new Error('游客身份创建失败：'+error.message),{status:error.status});}
 return data.session?.access_token||null;
}
export async function emailWithClient(client,email,recover,redirectTo){
 const value=String(email).trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('请输入有效邮箱地址');
 const {error}=recover?await client.auth.signInWithOtp({email:value,options:{emailRedirectTo:redirectTo,shouldCreateUser:false}}):await client.auth.updateUser({email:value},{emailRedirectTo:redirectTo});
 if(error)throw new Error('邮件未能发送：'+error.message);return true;
}
export async function emailAction(email,recover=false){return emailWithClient(await authClient(),email,recover,new URL('./',document.baseURI).href);}
