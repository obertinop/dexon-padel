// DEXON PADEL — Service Worker
// Strategy:
//   • API requests (/api/*, Supabase, weather) → network-only, never cached
//   • Hashed static assets (/static/*) → cache-first (immutable)
//   • App shell (HTML, /, manifest, logos) → network-first with cache fallback

const CACHE_VERSION = 'dexon-v3';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin (Supabase, Open-Meteo, etc.) — let them go straight to network
  if (url.origin !== self.location.origin) return;

  // Skip our own API routes — must always hit the network for fresh data
  if (url.pathname.startsWith('/api/')) return;

  // Skip the service worker file itself
  if (url.pathname === '/service-worker.js') return;

  // Hashed static assets (CRA outputs /static/js/main.<hash>.js) — cache-first
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // App shell + everything else (HTML, images, fonts) — network-first, cache fallback
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req).then(cached => cached || caches.match('/index.html')))
  );
});

// Allow the page to tell the SW to skip waiting (used after deploy)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
