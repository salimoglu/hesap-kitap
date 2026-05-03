// sw.js — Network First: her zaman gunceli al, cache sadece fallback
const CACHE = "hesap-kitap-v50";
const ASSETS = [
  "/hesap-kitap/",
  "/hesap-kitap/index.html",
  "/hesap-kitap/css/style.css?v=20260502vf2bt",
  "/hesap-kitap/js/app.js",
  "/hesap-kitap/js/db.js",
  "/hesap-kitap/js/firebase.js",
  "/hesap-kitap/js/modules/islemler.js",
  "/hesap-kitap/js/modules/birikim.js",
  "/hesap-kitap/js/modules/yukle.js",
  "/hesap-kitap/js/modules/alacaklar.js",
  "/hesap-kitap/js/modules/arabam.js",
  "/hesap-kitap/js/modules/urun.js?v=20260212urscroll",
  "/hesap-kitap/manifest.json?v=20260209desk",
  "/hesap-kitap/icons/favicon.ico?v=20260209desk",
  "/hesap-kitap/icons/icon-180.png?v=20260209desk",
  "/hesap-kitap/icons/icon-192.png?v=20260209desk",
  "/hesap-kitap/icons/icon-256.png?v=20260209desk",
  "/hesap-kitap/icons/icon-512.png?v=20260209desk",
  "/hesap-kitap/icons/pwa-win-180.png?v=20260209desk",
  "/hesap-kitap/icons/pwa-win-192.png?v=20260209desk",
  "/hesap-kitap/icons/pwa-win-256.png?v=20260209desk",
  "/hesap-kitap/icons/pwa-win-512.png?v=20260209desk"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request, { cache: "no-store" })
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
