// Root Service Worker Migration Stub for tools.kaielectrical.com.au
// Safely unregisters legacy root-scoped worker and passes control to /coc/sw.js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      return self.clients.claim();
    })
  );
});
