const CACHE = 'isdlss-v20260822-13';
const ASSESSMENT_VERSION = '20260822-module-assessment-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './module-assessment.js',
  './assessment-loader.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => Promise.all(
        clients.map(client => {
          // The existing document was loaded before this worker could intercept
          // its navigation. Reload it once so the HTML response is passed through
          // the assessment-loader injection path. This runs once per SW version.
          if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
            return client.navigate(client.url).catch(() => null);
          }
          return null;
        })
      ))
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(async response => {
          const text = await response.clone().text();
          let html = text;
          const loader = '<script src="assessment-loader.js?v=' + ASSESSMENT_VERSION + '" defer data-assessment-loader></script>';
          if (!html.includes('data-assessment-loader')) {
            html = html.replace('</head>', loader + '</head>');
          }
          const headers = new Headers(response.headers);
          headers.set('content-type', 'text/html; charset=utf-8');
          headers.delete('content-length');
          return new Response(html, {
            status: response.status,
            statusText: response.statusText,
            headers
          });
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (
    url.pathname.endsWith('/module-assessment.js') ||
    url.pathname.endsWith('/assessment-loader.js')
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            caches.open(CACHE)
              .then(cache => cache.put(request, response.clone()))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE)
              .then(cache => cache.put(request, response.clone()))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
