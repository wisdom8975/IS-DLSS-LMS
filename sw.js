// IS-DLSS production service worker.
// Network delivery is authoritative. No HTML caching and no page navigation/reload.
// Production-finalizer is augmented with small post-auth stability patches.
const LOGIN_FIX='/login-stability-fix.js';
const ASSESSMENT_FIX='/assessment-stability-fix.js';

self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim());});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(!url.pathname.endsWith('/production-finalizer.js'))return;
  event.respondWith((async()=>{
    try{
      const original=await fetch(req,{cache:'no-store'});
      if(!original.ok)return original;
      const source=await original.text();
      const [loginFix,assessmentFix]=await Promise.all([
        fetch(new URL(LOGIN_FIX,self.location.origin),{cache:'no-store'}).then(r=>r.ok?r.text():'').catch(()=>''),
        fetch(new URL(ASSESSMENT_FIX,self.location.origin),{cache:'no-store'}).then(r=>r.ok?r.text():'').catch(()=>'' )
      ]);
      return new Response(source+'\n'+loginFix+'\n'+assessmentFix,{status:original.status,statusText:original.statusText,headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store'}});
    }catch(_){return fetch(req);}
  })());
});
