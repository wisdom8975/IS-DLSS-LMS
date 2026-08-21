const CACHE='isdlss-lms-v13-is-dlss';
const APP_SHELL=['./','./index.html','./manifest.webmanifest'];
const OLD_SUPABASE='https://mnypxpwcfydyqeiyigom.supabase.co';
const NEW_SUPABASE='https://vahkwyetointavhzwfef.supabase.co';
async function normalizeResponse(req,res){
  if(!res || !res.ok)return res;
  const url=new URL(req.url);
  const type=res.headers.get('content-type')||'';
  if(url.origin===location.origin && type.includes('text/html')){
    const text=(await res.text()).replaceAll(OLD_SUPABASE,NEW_SUPABASE);
    return new Response(text,{status:res.status,statusText:res.statusText,headers:res.headers});
  }
  return res;
}
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting())});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    event.respondWith(
      caches.match(req).then(async cached=>{
        if(cached)return normalizeResponse(req,cached);
        try{
          const res=await fetch(req);
          const normalized=await normalizeResponse(req,res.clone());
          const copy=normalized.clone();
          caches.open(CACHE).then(c=>c.put(req,copy));
          return normalized;
        }catch{return caches.match('./index.html')}
      })
    );
  }
});
