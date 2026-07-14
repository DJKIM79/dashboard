const CACHE_NAME = "onto-pwa-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.ico",
  "./favicon.svg",
  "./onto.png",
  "./assets/css/style.css?v=2.0.0",
  "./assets/js/utils.js?v=2.0.0",
  "./assets/js/i18n.js?v=2.0.0",
  "./assets/js/ui.js?v=2.0.0",
  "./assets/js/modules/clock.js?v=2.0.0",
  "./assets/js/modules/calendar.js?v=2.0.0",
  "./assets/js/modules/search.js?v=2.0.0",
  "./assets/js/modules/weather.js?v=2.0.0",
  "./assets/js/modules/shortcuts.js?v=2.0.0",
  "./assets/js/modules/memo.js?v=2.0.0",
  "./assets/js/modules/noti.js?v=2.0.0",
  "./assets/js/modules/quote.js?v=2.0.0",
  "./assets/js/modules/settings.js?v=2.0.0",
  "./assets/js/modules/ai.js?v=2.0.0",
  "./assets/js/modules/files.js?v=2.0.0",
  "./assets/js/modules/stock.js?v=2.0.0",
  "./assets/js/modules/tutorial.js?v=2.0.0",
  "./assets/js/app.js?v=2.0.0",
  "./icons/icon-144.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  
  // Localization files
  "./assets/lang/ko.json",
  "./assets/lang/en.json",
  "./assets/lang/ja.json",
  "./assets/lang/zh-CN.json",
  "./assets/lang/zh-TW.json",
  "./assets/lang/fr.json",
  "./assets/lang/de.json",
  "./assets/lang/es.json",
  "./assets/lang/pt.json",
  "./assets/lang/id.json",
  "./assets/lang/th.json",
  "./assets/lang/hi.json",
  "./assets/lang/ar.json",

  // External CDNs
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js",
  "https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css",
  "https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.js.iife.js",
  "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js",
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Exclude API calls or dynamically generated sync logic from cache
  if (
    url.origin !== location.origin ||
    url.pathname.includes("/sync") ||
    url.pathname.includes(".php")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Network first strategy with offline cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
