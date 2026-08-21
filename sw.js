const CACHE='isdlss-v20260821-8';
const ASSETS=['./','./index.html','./manifest.webmanifest','./formative-assessment.js','./assessment-loader.js','./lesson-formative.js'];
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
  if(req.mode==='navigate' || url.pathname.endsWith('/index.html')){
    event.respondWith(fetch(req,{cache:'no-store'}).then(async response=>{
      const text=await response.clone().text();
      let injected=text;
      if(!injected.includes('lesson-formative.js?v=20260821-8')){
        injected=injected.replace('</head>','<script src="formative-assessment.js?v=20260821-8" defer data-direct-formative-assessment></script><script src="lesson-formative.js?v=20260821-8" defer data-lesson-formative></script></head>');
      }
      const headers=new Headers(response.headers);headers.set('content-type','text/html; charset=utf-8');
      return new Response(injected,{status:response.status,statusText:response.statusText,headers});
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{if(response.ok)caches.open(CACHE).then(c=>c.put(req,response.clone())).catch(()=>{});return response;}).catch(()=>cached)));
});
