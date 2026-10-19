import {handleApi} from '../server/api.js';
const GAME_HTML='__BUILD_GAME_HTML__';
export default{async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/'))return handleApi(request,env);
  if(url.pathname==='/'||url.pathname==='/index.html'||url.pathname==='/play.html')return new Response(GAME_HTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
  return new Response('Not found',{status:404});
}};
