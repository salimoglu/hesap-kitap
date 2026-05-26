/* db.js — IndexedDB + Firebase sync */
if (typeof window._dbLoaded === "undefined") {
window._dbLoaded = true;

var DB_NAME = "hesap-kitap-db";
/** Eski bozuk / eksik object store kurulumlarini duzeltmek icin artirildi (onupgradeneeded tekrar calir). */
var DB_VERSION = 2;
var STORES = { ISLEMLER: "islemler", KATEGORILER: "kategoriler", AYARLAR: "ayarlar" };
var _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.ISLEMLER)) {
        var s = db.createObjectStore(STORES.ISLEMLER, { keyPath: "id", autoIncrement: true });
        s.createIndex("tarih", "tarih", { unique: false });
        s.createIndex("tip", "tip", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.KATEGORILER)) {
        var s2 = db.createObjectStore(STORES.KATEGORILER, { keyPath: "id", autoIncrement: true });
        s2.createIndex("tip", "tip", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.AYARLAR)) {
        db.createObjectStore(STORES.AYARLAR, { keyPath: "key" });
      }
    };
    req.onsuccess = function(e) {
      _db = e.target.result;
      _db.onversionchange = function() { _db.close(); _db = null; };
      resolve(_db);
    };
    req.onerror = function() { reject(req.error); };
  });
}

function tx(storeName, mode) { return _db.transaction([storeName], mode).objectStore(storeName); }
function promisify(req) {
  return new Promise(function(res, rej) { req.onsuccess = function() { res(req.result); }; req.onerror = function() { rej(req.error); }; });
}
function getAll(store) {
  return new Promise(function(res, rej) { var req = store.getAll(); req.onsuccess = function() { res(req.result); }; req.onerror = function() { rej(req.error); }; });
}

/** Tum kategorileri RTDB'ye yazar (tamamlanana kadar bekler; sekme kapama / mobil geçişlerinde daha guvenilir). */
async function kategorileriBulutaYaz() {
  if (typeof fbSyncKategoriler === "undefined") return;
  try {
    var kats = await KategorilerDB.getAll();
    await fbSyncKategoriler(kats);
  } catch (e) {}
}

var IslemlerDB = {
  getAll: async function() { await openDB(); return getAll(tx(STORES.ISLEMLER, "readonly")); },
  add: async function(islem) {
    await openDB();
    var id = await promisify(tx(STORES.ISLEMLER, "readwrite").add(Object.assign({}, islem, { olusturma: Date.now() })));
    var eklenen = await promisify(tx(STORES.ISLEMLER, "readonly").get(id));
    if (typeof fbIslemEkle !== "undefined") fbIslemEkle(Object.assign({}, eklenen, { id: id }));
    return id;
  },
  update: async function(islem) {
    await openDB();
    var result = await promisify(tx(STORES.ISLEMLER, "readwrite").put(islem));
    if (typeof fbIslemGuncelle !== "undefined") fbIslemGuncelle(islem);
    return result;
  },
  delete: async function(id) {
    await openDB();
    var result = await promisify(tx(STORES.ISLEMLER, "readwrite").delete(id));
    if (typeof fbIslemSil !== "undefined") fbIslemSil(id);
    return result;
  },
  getById: async function(id) { await openDB(); return promisify(tx(STORES.ISLEMLER, "readonly").get(id)); },
};

var KategorilerDB = {
  getAll: async function() { await openDB(); return getAll(tx(STORES.KATEGORILER, "readonly")); },
  /** Yereli silmeden RTDB kayitlarini id uzerinden yerel olarak yazar veya gunceller. */
  mergeUpsertFromRemote: async function(liste) {
    await openDB();
    return new Promise(function(resolve, reject) {
      try {
        var t = _db.transaction([STORES.KATEGORILER], "readwrite");
        var store = t.objectStore(STORES.KATEGORILER);
        t.oncomplete = function() { resolve(); };
        t.onerror = function() { reject(t.error); };
        var idx = 0;
        function next() {
          while (idx < liste.length) {
            var raw = liste[idx++];
            if (!raw || raw.id == null) continue;
            var item = Object.assign({}, raw);
            if (typeof item.id === "string") item.id = parseInt(item.id, 10);
            if (isNaN(item.id)) continue;
            var req = store.put(item);
            req.onerror = function() { reject(req.error); };
            req.onsuccess = next;
            return;
          }
        }
        next();
      } catch (ex) {
        reject(ex);
      }
    });
  },
  /** Yerel kayitlari temizleyip sunucudan gelen liste ile degistirir (id ile put). */
  replaceAll: async function(liste) {
    await openDB();
    return new Promise(function(resolve, reject) {
      try {
        var t = _db.transaction([STORES.KATEGORILER], "readwrite");
        var store = t.objectStore(STORES.KATEGORILER);
        t.oncomplete = function() { resolve(); };
        t.onerror = function() { reject(t.error); };
        var clr = store.clear();
        clr.onerror = function() { reject(clr.error); };
        clr.onsuccess = function() {
          var i = 0;
          function next() {
            while (i < liste.length) {
              var raw = liste[i++];
              if (!raw || raw.id == null) continue;
              var item = Object.assign({}, raw);
              if (typeof item.id === "string") item.id = parseInt(item.id, 10);
              if (isNaN(item.id)) continue;
              var req = store.put(item);
              req.onerror = function() { reject(req.error); };
              req.onsuccess = next;
              return;
            }
          }
          next();
        };
      } catch (ex) {
        reject(ex);
      }
    });
  },
  add: async function(kat) {
    await openDB();
    var id = await promisify(tx(STORES.KATEGORILER, "readwrite").add(kat));
    await kategorileriBulutaYaz();
    return id;
  },
  update: async function(kat) {
    await openDB();
    var result = await promisify(tx(STORES.KATEGORILER, "readwrite").put(kat));
    await kategorileriBulutaYaz();
    return result;
  },
  delete: async function(id) {
    await openDB();
    var result = await promisify(tx(STORES.KATEGORILER, "readwrite").delete(id));
    await kategorileriBulutaYaz();
    return result;
  },
  seedDefaults: async function() {
    await openDB();
    var mevcut = await getAll(tx(STORES.KATEGORILER, "readonly"));
    if (mevcut.length > 0) return;
    var giderler = [
      { grup: "AILE", ad: "Annem" }, { grup: "AILE", ad: "Babam" }, { grup: "AILE", ad: "Talha" },
      { grup: "ARAC", ad: "Bakim-Muayene" }, { grup: "ARAC", ad: "Ceza" }, { grup: "ARAC", ad: "Sigorta" }, { grup: "ARAC", ad: "Vergi" }, { grup: "ARAC", ad: "Yakut" },
      { grup: "BIRIKIM", ad: "Altin" }, { grup: "BIRIKIM", ad: "Bes" }, { grup: "BIRIKIM", ad: "Fon" }, { grup: "BIRIKIM", ad: "Kardes Birikim" }, { grup: "BIRIKIM", ad: "Vefa Dernek" },
      { grup: "BORC", ad: "Borc" }, { grup: "EGLENCE", ad: "Eglence" },
      { grup: "EV GENEL", ad: "Esya" }, { grup: "EV GENEL", ad: "Kirtasiye" }, { grup: "EV GENEL", ad: "Kira" }, { grup: "EV GENEL", ad: "Tadilat-Bakim" },
      { grup: "FATURALAR", ad: "Annem Tel" }, { grup: "FATURALAR", ad: "Babam Tel" }, { grup: "FATURALAR", ad: "Bugra Tel" }, { grup: "FATURALAR", ad: "Dogalgaz" }, { grup: "FATURALAR", ad: "Driver-Youtube-Spotify" }, { grup: "FATURALAR", ad: "Elektrik" }, { grup: "FATURALAR", ad: "Internet" }, { grup: "FATURALAR", ad: "Salim Tel" }, { grup: "FATURALAR", ad: "Su" },
      { grup: "GENEL GIDERLER", ad: "Disardan Yemek" }, { grup: "GENEL GIDERLER", ad: "Egitim-Kitap-Hobi" }, { grup: "GENEL GIDERLER", ad: "Giyim" }, { grup: "GENEL GIDERLER", ad: "Hediye" }, { grup: "GENEL GIDERLER", ad: "Ikram" }, { grup: "GENEL GIDERLER", ad: "Nihai Huma" }, { grup: "GENEL GIDERLER", ad: "Saglik" }, { grup: "GENEL GIDERLER", ad: "Temizlik Malzemesi" },
      { grup: "GEZI", ad: "Gezi" },
      { grup: "IASE", ad: "Bugra IASE" }, { grup: "IASE", ad: "Salim IASE" },
      { grup: "IBADET", ad: "Kurban" }, { grup: "IBADET", ad: "Zekat" },
      { grup: "KAMP-PIKNIK", ad: "Kamp Arac Gerec" }, { grup: "KAMP-PIKNIK", ad: "Kamp Konaklama" }, { grup: "KAMP-PIKNIK", ad: "Kamp Tup" }, { grup: "KAMP-PIKNIK", ad: "Kamp Yiyecek" },
      { grup: "KISISEL", ad: "Bugra Kisisel" }, { grup: "KISISEL", ad: "Salim Kisisel" },
      { grup: "KREDI KARTI", ad: "Kredi Karti" },
      { grup: "MUTFAK", ad: "Aburcubur" }, { grup: "MUTFAK", ad: "Kasap" }, { grup: "MUTFAK", ad: "Manav" }, { grup: "MUTFAK", ad: "Market" }, { grup: "MUTFAK", ad: "Mutfak Malzemesi" }, { grup: "MUTFAK", ad: "Tatli-Kuruyemis" },
      { grup: "PLAN DISI", ad: "Plan Disi" },
    ].map(function(k) { return Object.assign({}, k, { tip: "gider", varsayilan: true }); });
    var gelirler = [
      { grup: "GELIRLER", ad: "Bugra Maas" }, { grup: "GELIRLER", ad: "Bugra Ek Ders" }, { grup: "GELIRLER", ad: "Cekilen Kredi" }, { grup: "GELIRLER", ad: "Salim Maas" },
    ].map(function(k) { return Object.assign({}, k, { tip: "gelir", varsayilan: true }); });
    var s = tx(STORES.KATEGORILER, "readwrite");
    var hepsi = giderler.concat(gelirler);
    for (var i = 0; i < hepsi.length; i++) { await promisify(s.add(hepsi[i])); }
  },
};

var AyarlarDB = {
  get: async function(key) { await openDB(); var r = await promisify(tx(STORES.AYARLAR, "readonly").get(key)); return r ? r.value : null; },
  set: async function(key, value) { await openDB(); return promisify(tx(STORES.AYARLAR, "readwrite").put({ key: key, value: value })); },
};

window.initApp = async function() {
  await openDB();
  await KategorilerDB.seedDefaults();
};

} // end guard

