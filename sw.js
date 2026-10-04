// Service Worker for QLD CoC Generator (tools.kaielectrical.com.au)
const CACHE_NAME = 'qld-coc-cache-v1.1.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/pdf-generator.js',
  './js/suburbs.js',
  './js/lib/pdf-lib.min.js',
  './js/lib/pdf.min.js',
  './js/lib/pdf.worker.min.js',
  './assets/template_cot.pdf',
  './assets/logo.png',
  './assets/logo.svg',
  './assets/og-preview.png',
  './assets/apple-touch-icon.png',
  './assets/favicon.ico',
  './assets/favicon.png',
  './assets/favicon.svg',
  './assets/favicon-16x16.png',
  './assets/favicon-32x32.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './manifest.json',
  './robots.txt',
  './sitemap.xml',
  './llms.txt',
  './llms-full.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Network-first for Photon / OSM external geocoding requests
  if (url.hostname.includes('photon.komoot.io') || url.hostname.includes('openstreetmap')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 1. Navigation requests (HTML document): Network-First with Cache Fallback
  // This guarantees that any new deployment of index.html is fetched immediately when online!
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('./index.html', copy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match('./index.html').then((cached) => {
            return cached || caches.match('./');
          });
        })
    );
    return;
  }

  // 2. Static Assets (CSS, JS, PDF, Images): Stale-While-Revalidate
  // Fast local response with background network revalidation & cache update
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failure (offline) - do nothing if we already have cache
      });

      return cachedResponse || fetchPromise;
    })
  );
});
