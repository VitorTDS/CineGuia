// Service worker: lets the app open with a poor or missing connection, or while the server is waking up.
// Everything is fetched from the network first, so updates show up immediately. The cache is used when the
// network fails, or when it takes longer than NETWORK_TIMEOUT_MS (the free Render plan sleeps when idle).
const CACHE = 'cineguia-v2';
const NETWORK_TIMEOUT_MS = 3000;

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
  '/js/progress.js',
  '/js/public-domain.js',
  '/js/reminders.js',
  '/js/reviews.js',
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

// Pages that opened from the cache. Their scripts and styles also come from the cache, so a page never mixes
// files from two versions of the site (the server may have been updated since they were saved).
const cachedPages = new Set();

async function fromNetwork(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

// Saves every app file again in one go once the server answers, so the next visit opens a consistent version.
async function refreshAppShell() {
  const fresh = await caches.open(`${CACHE}-refresh`);
  await fresh.addAll(APP_SHELL);
  const cache = await caches.open(CACHE);
  for (const request of await fresh.keys()) await cache.put(request, await fresh.match(request));
  await caches.delete(`${CACHE}-refresh`);
}

async function cachedCopy(request) {
  const cached = await caches.match(request);
  // A title page (/filme/123) never opened before still gets the app, which then loads the title.
  if (cached || request.mode !== 'navigate') return cached;
  return caches.match('/');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isNavigation = request.mode === 'navigate';
  const isApi = url.pathname.startsWith('/api/');

  // The server is known to be slow for this page: saved data shows at once and is refreshed in the background.
  if (!isNavigation && cachedPages.has(event.clientId)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (!cached) return isApi ? fromNetwork(request) : fetch(request);
      if (isApi) event.waitUntil(fromNetwork(request).catch(() => {}));
      return cached;
    })());
    return;
  }

  event.respondWith((async () => {
    const network = fromNetwork(request);
    const cached = await cachedCopy(request);
    if (!cached) return network;

    const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));
    const response = await Promise.race([network.catch(() => null), timeout]);
    // Server errors (5xx) also fall back to the saved copy; other answers (like 404) are real and pass through.
    if (response && response.status < 500) return response;

    if (isNavigation) {
      if (event.resultingClientId) cachedPages.add(event.resultingClientId);
      event.waitUntil(network.then(refreshAppShell).catch(() => {}));
    } else {
      event.waitUntil(network.catch(() => {}));
    }
    return cached;
  })());
});
