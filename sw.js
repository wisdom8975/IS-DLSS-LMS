const CACHE = 'isdlss-v20260822-17';
const ASSESSMENT_VERSION = '20260822-module-assessment-v10';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './module-assessment.js',
  './assessment-loader.js',
  './assessment-review-fix.js',
  './teacher-feedback-fix.js',
  './assessment-runtime-guard.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({type:'window',includeUncontrolled:true}))
      .then(clients => Promise.all(clients.map(client => {
        if(client.url.startsWith(self.location.origin) && 'navigate' in client) return client.navigate(client.url).catch(() => null);
        return null;
      })));
  );
});

self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;

  if(url.pathname.endsWith('/sw.js')){
    event.respondWith(fetch(request,{cache:'no-store'}));
    return;
  }

  if(request.mode==='navigate' || url.pathname.endsWith('/index.html')){
    event.respondWith(
      fetch(request,{cache:'no-store'}).then(async response=>{
        const text=await response.clone().text();
        let html=text;
        const scripts=[
          '<script src="assessment-review-fix.js?v='+ASSESSMENT_VERSION+'" defer data-assessment-review-fix></script>',
          '<script src="teacher-feedback-fix.js?v='+ASSESSMENT_VERSION+'" defer data-teacher-feedback-fix></script>',
          '<script src="assessment-runtime-guard.js?v='+ASSESSMENT_VERSION+'" defer data-assessment-runtime-guard></script>',
          '<script src="assessment-loader.js?v='+ASSESSMENT_VERSION+'" defer data-assessment-loader></script>'
        ].join('');
        if(!html.includes('data-assessment-review-fix')) html=html.replace('</head>',scripts+'</head>');
        const headers=new Headers(response.headers);
        headers.set('content-type','text/html; charset=utf-8');
        headers.delete('content-length');
        return new Response(html,{status:response.status,statusText:response.statusText,headers});
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  if(url.pathname.endsWith('/module-assessment.js') || url.pathname.endsWith('/assessment-loader.js') || url.pathname.endsWith('/assessment-review-fix.js') || url.pathname.endsWith('/teacher-feedback-fix.js') || url.pathname.endsWith('/assessment-runtime-guard.js')){
    event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
      if(response.ok) caches.open(CACHE).then(cache=>cache.put(request,response.clone())).catch(()=>{});
      return response;
    }).catch(()=>caches.match(request)));
    return;
  }

  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok) caches.open(CACHE).then(cache=>cache.put(request,response.clone())).catch(()=>{});
    return response;
  }).catch(()=>cached)));
});
