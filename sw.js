// Minimal offline shell. Network-first, cache-fallback — deliberately NOT
// cache-first: this is a no-build-step site with no hashed filenames, so
// there's no way to bust a stale cache automatically. Cache-first would risk
// serving a stale data/schedule.js (and thus a wrong "today's puzzle")
// indefinitely to a returning visitor. Network-first sacrifices some offline
// capability for correctness, which is the right trade for a daily puzzle.
//
// CACHE_VERSION is stamped by scripts/stamp-cache-version.mjs — it's a hash
// of every file listed below, so it changes exactly when they do. Don't edit
// it by hand; run the script (see README's "PWA" section).
const CACHE_VERSION = "2eb80151e442";
const CACHE_NAME = `micle-${CACHE_VERSION}`;

// Photos live in their own cache, deliberately NOT stamped with
// CACHE_VERSION. CACHE_NAME changes on every content edit — a mic price, a
// schedule rebase — and activate() below deletes every cache that isn't the
// current one. Sharing that cache would re-download ~2MB of photos on every
// deploy. This key only changes if the image scheme itself does.
const PHOTO_CACHE = "micle-photos-v1";
const PHOTO_PREFIX = "/images/mics/";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/css/styles.css",
  "/data/mics.js",
  "/data/schedule.js",
  "/data/worldmap.js",
  "/js/storage.js",
  "/js/compare.js",
  "/js/autocomplete.js",
  "/js/schedule.js",
  "/js/devtools.js",
  "/js/app.js",
  "/js/pwa.js",
  "/training/",
  "/training/index.html",
  // The manifest only, never the images themselves: cache.addAll is
  // all-or-nothing, so one missing photo would kill offline entirely, and
  // precaching ~2MB would make install slow for a feature most visitors to
  // the daily game never open. The fetch handler caches photos as they're
  // viewed instead.
  "/data/photos.js",
  "/css/training.css",
  "/js/quiz.js",
  "/js/order.js",
  "/js/match.js",
  "/js/worldmap.js",
  "/js/training.js",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
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
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== PHOTO_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only same-origin GETs — never intercept the Umami analytics beacon or
  // any other cross-origin request.
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;

  // Photos are routed to the long-lived cache, but still network-first like
  // everything else: filenames aren't content-hashed, so cache-first would
  // serve a re-shot photo stale forever with no way to bust it.
  const target = url.pathname.startsWith(PHOTO_PREFIX) ? PHOTO_CACHE : CACHE_NAME;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(target).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
