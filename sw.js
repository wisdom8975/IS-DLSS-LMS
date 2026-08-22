// IS-DLSS emergency stability service worker.
// The LMS is currently served directly by Vercel. Do not cache or inject
// application JavaScript here: stale/duplicated runtime code can prevent
// the mobile browser from completing startup.
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      try { client.navigate(client.url); } catch (_) {}
    }
  })());
});

// Intentionally no fetch handler. Browser/Vercel network delivery is authoritative.
