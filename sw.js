// Service Worker for PEA Car Report PWA
const CACHE_NAME = 'car-report-shell-v2';
const DATA_CACHE_NAME = 'car-report-data-v2';

const APP_SHELL_URLS = [
  './',
  './index.html',
  './form.html',
  './pwa-install.css',
  './pwa-install.js',
  './manifest.webmanifest',
  './manifest.json',
  './icons/favicon.svg',
  './icons/favicon.ico',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// Install: Cache core application shell & skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching App Shell v2');
      return cache.addAll(APP_SHELL_URLS).catch((err) => {
        console.warn('[SW] Shell asset cache warning:', err);
      });
    })
  );
});

// Activate: Immediately claim clients & purge all older caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!currentCaches.includes(name)) {
            console.log('[SW] Purging old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for HTML/CSS/JS (Always fresh, offline fallback)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  // 1. Google Sheets live data: Network-First with cache fallback
  if (url.hostname.includes('docs.google.com') && url.pathname.includes('/spreadsheets/')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => {
          console.log('[SW] Serving cached sheet data for:', req.url);
          return caches.match(req);
        })
    );
    return;
  }

  // 2. Navigation & App Shell Assets (HTML, CSS, JS): Network-First
  const isAppShellAsset =
    req.mode === 'navigate' ||
    url.origin === location.origin ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css');

  if (isAppShellAsset) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => {
          console.log('[SW] Network failed, serving cached shell for:', req.url);
          return caches.match(req).then((cached) => cached || caches.match('./index.html'));
        })
    );
    return;
  }

  // 3. Fonts & CDN (Stale-While-Revalidate)
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return networkRes;
        })
        .catch(() => null);
      return cachedRes || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
