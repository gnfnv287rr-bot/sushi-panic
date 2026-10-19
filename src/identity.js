import {PUBLIC_CONFIG} from './config.js';
let clientPromise;
export async function authClient(){
 if(!PUBLIC_CONFIG.supabaseUrl||!PUBLIC_CONFIG.publishableKey)throw new Error('在线身份服务尚未配置，可先进行练习');
 clientPromise??=import(new URL((PUBLIC_CONFIG.assetBase||'./')+'vendor/supabase.js',document.baseURI).href).then(({createClient})=>createClient(PUBLIC_CONFIG.supabaseUrl,PUBLIC_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}})).catch(error=>{clientPromise=null;throw error;});
 return clientPromise;
}
export async function sessionToken({create=false}={}){
 const client=await authClient();let {data,error}=await client.auth.getSession();if(error)throw error;
 if(!data.session&&create){({data,error}=await client.auth.signInAnonymously());if(error)throw Object.assign(new Error('游客身份创建失败：'+error.message),{status:error.status});}
 return data.session?.access_token||null;
}
export async function currentIdentity(){const c=await authClient();const {data,error}=await c.auth.getSession();if(error)throw error;return data.session?.user||null;}
export async function emailWithClient(client,email,recover,redirectTo){
 const value=String(email).trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('请输入有效邮箱地址');
 const {error}=recover?await client.auth.signInWithOtp({email:value,options:{emailRedirectTo:redirectTo,shouldCreateUser:false}}):await client.auth.updateUser({email:value},{emailRedirectTo:redirectTo});
 if(error)throw new Error('邮件未能发送：'+error.message);return true;
}
export async function emailAction(email,recover=false,{enabled=PUBLIC_CONFIG.emailEnabled}={}){if(!enabled)throw new Error('邮箱存档暂未开放；当前浏览器仍会自动保存游客身份，请勿清除网站数据。');return emailWithClient(await authClient(),email,recover,new URL('./',document.baseURI).href);}
export async function verifyEmailWithClient(client,email,token,recover=false){
 const value=String(email).trim(),code=String(token).trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)||!/^\d{6,8}$/.test(code))throw new Error('请输入邮箱和邮件中的6–8位验证码');
 const before=recover?null:(await client.auth.getSession()).data.session?.user?.id;
 if(!recover&&!before)throw new Error('当前游客身份已失效，请先重新连接');
 const {data,error}=await client.auth.verifyOtp({email:value,token:code,type:recover?'email':'email_change'});
 if(error)throw new Error('验证未完成：'+error.message);
 if(!data.user||(!recover&&data.user.id!==before))throw new Error('身份验证结果不一致，请重新连接；未合并或覆盖档案');
 return data.user;
}
export async function verifyEmailAction(email,token,recover=false){if(!PUBLIC_CONFIG.emailEnabled)throw new Error('邮箱存档暂未开放');return verifyEmailWithClient(await authClient(),email,token,recover);}
export async function watchIdentity(listener){const c=await authClient();return c.auth.onAuthStateChange((event,session)=>{setTimeout(()=>listener(event,session?.user?.id||null),0);}).data.subscription;}
