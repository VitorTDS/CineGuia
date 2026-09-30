// Service worker: lets the installed app open with a poor or missing connection.
// Everything is fetched from the network first, so updates show up immediately; the cache is only a fallback.
const CACHE = 'cineguia-v1';

// Keep in sync with public/js (the test suite checks this list against the folder).
const APP_SHELL = [
  '/',
  '/styles.css',
  '/theme.js',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/js/api.js',
  '/js/backup.js',
  '/js/calendar.js',
  '/js/cards.js',
  '/js/details.js',
  '/js/dom.js',
  '/js/favorites.js',
  '/js/for-you.js',
  '/js/install.js',
  '/js/list.js',
  '/js/main.js',
  '/js/mylist.js',
  '/js/platforms.js',
  '/js/public-domain.js',
  '/js/reminders.js',
  '/js/router.js',
  '/js/sagas.js',
  '/js/state.js',
  '/js/theme-toggle.js',
  '/js/utils.js',
  '/js/watched.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) return cached;
      // Offline on a title page (/filme/123): the app shell still opens and shows what it can.
      if (request.mode === 'navigate') {
        const shell = await caches.match('/');
        if (shell) return shell;
      }
      throw error;
    }
  })());
});
