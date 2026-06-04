const DYNAMIC_CACHE = 'mx-dynamic-v1';
const STATIC_CACHE = 'mx-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== DYNAMIC_CACHE && key !== STATIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo peticiones GET y que sean de nuestra app (http/https)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  
  // Decidir en qué caja guardar según el tipo de archivo
  const isStatic = event.request.destination === 'font' || 
                   url.pathname.includes('/assets/') || 
                   url.href.includes('fonts.gstatic.com');
  
  const cacheToUse = isStatic ? STATIC_CACHE : DYNAMIC_CACHE;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si está en caché, lo devolvemos de inmediato para velocidad máxima
      if (cachedResponse) {
        // Pero actualizamos la caché en segundo plano para la próxima vez
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(cacheToUse).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        
        return cachedResponse;
      }

      // Si no está en caché, vamos a la red
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(cacheToUse).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Si falla la red y es una navegación de página, devolvemos el index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return null;
      });
    })
  );
});