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
  
  // ESTRATEGIA: CACHE FIRST para Imágenes (especialmente Supabase)
  if (event.request.destination === 'image' || url.href.includes('supabase.co/storage')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Si existe en caché, la devolvemos y PUNTO. No hay petición de red.
          if (cachedResponse) return cachedResponse;

          // Si no existe, la buscamos y la guardamos
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

  // ESTRATEGIA: STALE-WHILE-REVALIDATE para JS, CSS y Fuentes (lo que ya tenías)
  const isStatic = event.request.destination === 'font' || 
                   url.pathname.includes('/assets/') || 
                   url.href.includes('fonts.gstatic.com');
  
  const cacheToUse = isStatic ? STATIC_CACHE : DYNAMIC_CACHE;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          caches.open(cacheToUse).then((cache) => cache.put(event.request, networkResponse));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});