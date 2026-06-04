const CACHE_NAME = 'mx-dynamic-v1';
const STATIC_CACHE = 'mx-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo peticiones GET y que no sean de extensiones de Chrome
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Devolvemos lo que hay en caché pero intentamos actualizarlo en segundo plano
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        const cacheToUse = (event.request.destination === 'font' || event.request.url.includes('assets/')) 
          ? STATIC_CACHE 
          : CACHE_NAME;

        caches.open(cacheToUse).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Si falla todo y es una navegación, podrías devolver el index.html
        return caches.match('/');
      });
    })
  );
});