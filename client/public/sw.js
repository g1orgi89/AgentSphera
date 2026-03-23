/* === Service Worker — АгентСфера === */

const CACHE_NAME = 'agentsfera-v1';
const OFFLINE_URL = '/offline.html';

/* Ресурсы для кеширования при установке */
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/icon.svg'
];

/* Установка: кешируем shell */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* Активация: чистим старые кеши */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch: network-first для всего, offline fallback */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* API-запросы — только сеть, без кеша */
  if (request.url.includes('/api/')) {
    return;
  }

  /* Навигация (HTML) — network-first с offline fallback */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  /* Статика — stale-while-revalidate */
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
