// IS-DLSS production service worker retirement.
// The LMS does not use a service-worker cache. Network delivery from Vercel is authoritative.
// This worker only removes older workers/caches and NEVER navigates or reloads an open page.
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    // Deliberately do not call client.navigate().
  })());
});
