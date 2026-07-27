// Minimal offline shell. Network-first, cache-fallback — deliberately NOT
// cache-first: this is a no-build-step site with no hashed filenames, so
// there's no way to bust a stale cache automatically. Cache-first would risk
// serving a stale data/schedule.js (and thus a wrong "today's puzzle")
// indefinitely to a returning visitor. Network-first sacrifices some offline
// capability for correctness, which is the right trade for a daily puzzle.
//
// Bump CACHE_VERSION whenever any cached file below changes — nothing else
// invalidates the cache automatically (see README's "PWA" section).
const CACHE_VERSION = "v1";
const CACHE_NAME = `micle-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/data/mics.js",
  "/data/schedule.js",
  "/js/storage.js",
  "/js/compare.js",
  "/js/autocomplete.js",
  "/js/schedule.js",
  "/js/devtools.js",
  "/js/app.js",
  "/js/pwa.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only same-origin GETs — never intercept the Umami analytics beacon or
  // any other cross-origin request.
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
