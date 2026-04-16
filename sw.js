// sw.js — Network First: her zaman gunceli al, cache sadece fallback
const CACHE = "hesap-kitap-v7";
const ASSETS = [
  "/hesap-kitap/",
  "/hesap-kitap/index.html",
  "/hesap-kitap/css/style.css",
  "/hesap-kitap/js/app.js",
  "/hesap-kitap/js/db.js",
  "/hesap-kitap/js/firebase.js",
  "/hesap-kitap/js/modules/islemler.js",
  "/hesap-kitap/js/modules/birikim.js",
  "/hesap-kitap/js/modules/yukle.js",
  "/hesap-kitap/js/modules/alacaklar.js?v=20260416a",
  "/hesap-kitap/js/modules/urun.js",
  "/hesap-kitap/manifest.json"
];

// Install: cache'e al
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
});

// Activate: eski cache'leri temizle
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// SKIP_WAITING mesaji
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Fetch: NETWORK FIRST — once networkten dene, fail olursa cache
self.addEventListener("fetch", (e) => {
  // Firebase ve dis API isteklerini bypass et
  if (!e.request.url.startsWith(self.location.origin)) return;
  // POST isteklerini bypass et
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request, {cache: "no-store"})
      .then(response => {
        // Basarili ise cache'i guncelle
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network fail: cache'den don
        return caches.match(e.request);
      })
  );
});
