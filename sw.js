const CACHE='isdlss-v20260821-2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./formative-assessment.js','./assessment-loader.js'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;

  // Always prefer the network for the application shell so a deployment
  // cannot leave students stuck on an old cached assessment UI.
  if(req.mode==='navigate' || url.pathname.endsWith('/index.html')){
    event.respondWith(fetch(req,{cache:'no-store'}).then(async response=>{
      const copy=response.clone();
      caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});
      return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }

  event.respondWith(caches.match(req).then(cached=>cached || fetch(req).then(response=>{
    if(response.ok) caches.open(CACHE).then(c=>c.put(req,response.clone())).catch(()=>{});
    return response;
  }).catch(()=>cached)));
});
