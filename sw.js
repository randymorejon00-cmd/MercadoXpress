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
  
  // ESTRATEGIA 1: CACHE FIRST para Imágenes (incluyendo Supabase Storage)
  // Esto es bueno para imágenes, ya que sus URLs a menudo cambian si el contenido cambia (versiones)
  if (event.request.destination === 'image' || url.href.includes('supabase.co/storage')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse; // Si está en caché, la devolvemos inmediatamente
          
          // Si no está en caché, vamos a la red y la guardamos para la próxima
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

  // ESTRATEGIA 2: NETWORK FIRST, THEN CACHE para API de Supabase (datos dinámicos)
  // Esto asegura que siempre intentemos obtener los datos más frescos.
  // Si la red falla, usamos la caché como respaldo (para modo offline).
  // Identificamos las llamadas a la API REST de Supabase y a las Edge Functions
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/v1/')) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return fetch(event.request)
          .then((networkResponse) => {
            // Si la red responde con éxito, la usamos y actualizamos la caché
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Si la red falla (offline o error), intentamos servir desde la caché
            return cache.match(event.request);
          });
      })
    );
    return;
  }

  // ESTRATEGIA 3: STALE-WHILE-REVALIDATE para JS, CSS y Fuentes (assets estáticos de la app)
  // Esta estrategia es buena para los assets de la aplicación que no cambian tan a menudo
  // y donde la velocidad de carga inicial es crucial, pero queremos que se actualicen en segundo plano.
  const isStatic = event.request.destination === 'font' || 
                   url.pathname.includes('/assets/') || 
                   url.href.includes('fonts.gstatic.com');
  
  const cacheToUse = isStatic ? STATIC_CACHE : DYNAMIC_CACHE;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then(async (networkResponse) => {
        // Clonar la respuesta *antes* de que sea devuelta y potencialmente consumida
        const responseToCache = networkResponse.clone(); 
        if (networkResponse.status === 200) {
          const cache = await caches.open(cacheToUse);
          await cache.put(event.request, responseToCache);
        }
        return networkResponse; // Devolver la respuesta original al cliente
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
