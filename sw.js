const DYNAMIC_CACHE = 'mx-dynamic-v1';
const STATIC_CACHE = 'mx-static-v1';
const IMAGE_CACHE = 'mx-images-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (![DYNAMIC_CACHE, STATIC_CACHE, IMAGE_CACHE].includes(key)) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // 🚫 No interceptar llamadas de autenticación Supabase
  if (url.href.includes('supabase.co/auth/v1')) {
    return; // dejar que vayan directo a la red
  }

  // 📷 CACHE FIRST para imágenes (incluyendo Supabase Storage)
  if (event.request.destination === 'image' || url.href.includes('supabase.co/storage')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200 || networkResponse.status === 0) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 📦 STALE-WHILE-REVALIDATE para JS, CSS y fuentes
  const isStatic = event.request.destination === 'font' ||
                   url.pathname.includes('/assets/') ||
                   url.href.includes('fonts.gstatic.com');

  const cacheToUse = isStatic ? STATIC_CACHE : DYNAMIC_CACHE;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          event.waitUntil(
            caches.open(cacheToUse).then((cache) => cache.put(event.request, responseClone))
          );
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
