// Cache version with timestamp - guaranteed to be unique on each registration
// This ensures old cached content is never served after updates
const CACHE_VERSION = `mtg-builder-v${self.registration ? self.registration.scope : 'fallback'}-${Date.now()}`;
const PRECACHE = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // Delete ALL old caches, not just ones that don't match current version
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for everything - ensures fresh content on every request
  // This is critical for dev server where files change frequently
  event.respondWith(
    fetch(request)
      .then((res) => {
        // Clone and cache successful responses
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => {
        // Network failed - try cache as fallback (offline support)
        return caches.match(request);
      })
  );
});
