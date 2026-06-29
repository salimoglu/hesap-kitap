// sw.js — Network First: her zaman gunceli al, cache sadece fallback
const CACHE = "hesap-kitap-v195";
const BASE = self.location.pathname.replace(/\/?sw\.js$/i, "");
const ASSETS = [
  BASE + "/",
  BASE + "/index.html",
  BASE + "/css/style.css?v=20260615oturum-flash",
  BASE + "/js/hk-erisim.js?v=20260531multi-final",
  BASE + "/js/hk-tanitim.js?v=20260531tanitim",
  BASE + "/js/hk-ayarlar.js?v=20260531temiz",
  BASE + "/js/app.js?v=20260615oturum-flash",
  BASE + "/js/firebase.js?v=20260615oturum-flash",
  BASE + "/js/db.js?v=20260615hizli-ac",
  BASE + "/js/modules/islemler.js?v=20260615hizli-ac",
  BASE + "/js/modules/birikim.js?v=20260531kok-tasima",
  BASE + "/js/modules/verilen-altinlar.js?v=20260531kok-tasima",
  BASE + "/js/modules/yukle.js?v=20260615hizli-ac",
  BASE + "/js/modules/alacaklar.js?v=20260615alborc2",
  BASE + "/js/modules/urun.js?v=20260531kok-tasima",
  BASE + "/js/modules/arabam.js?v=20260531ar-kayit",
  BASE + "/manifest.json?v=20260209desk",
  BASE + "/icons/favicon.ico?v=20260209desk",
  BASE + "/icons/icon-180.png?v=20260209desk",
  BASE + "/icons/icon-192.png?v=20260209desk",
  BASE + "/icons/icon-256.png?v=20260209desk",
  BASE + "/icons/icon-512.png?v=20260209desk",
  BASE + "/icons/pwa-win-180.png?v=20260209desk",
  BASE + "/icons/pwa-win-192.png?v=20260209desk",
  BASE + "/icons/pwa-win-256.png?v=20260209desk",
  BASE + "/icons/pwa-win-512.png?v=20260209desk"
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

  var isDoc =
    e.request.mode === "navigate" ||
    (e.request.destination === "document") ||
    ((e.request.headers.get("accept") || "").indexOf("text/html") !== -1);

  e.respondWith(
    fetch(e.request, { cache: "no-store" })
      .then(response => {
        if (!isDoc && response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
