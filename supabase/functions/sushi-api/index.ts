// Shared modules are generated from protected game rules and server/v1 by npm run build.
import {cloudApp} from '../_shared/cloud.js';
const app=cloudApp(Deno.env.toObject());
Deno.serve((request:Request)=>{
 const url=new URL(request.url);const marker='/sushi-api';const index=url.pathname.indexOf(marker);if(index>=0)url.pathname=url.pathname.slice(index+marker.length)||'/api/health';
 return app(new Request(url,request),{ip:request.headers.get('x-forwarded-for')?.split(',').pop()?.trim()||'unknown'});
});
