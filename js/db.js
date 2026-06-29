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

/* —— Kategori normalizasyonu: ayni kalem farkli yazimla bolunmesin (IASE/İAŞE, Karti/Kartı) —— */
var HK_GRUP_ALIAS = {
  "İAŞE": "IASE",
  "IAŞE": "IASE",
  "IASE": "IASE",
  "BİRİKİM": "BIRIKIM",
  "BIRIKIM": "BIRIKIM",
  "KREDİ KARTI": "KREDI KARTI",
  "KREDI KARTI": "KREDI KARTI"
};

function hkNormSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function hkFoldTr(s) {
  return hkNormSpaces(s)
    .toLocaleLowerCase("tr")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u");
}

function hkNormGrupKaydet(g) {
  return hkNormSpaces(g).toLocaleUpperCase("tr");
}

/** Eslestirme / birlestirme icin (BIRIKIM=BİRİKİM, IASE=İAŞE) — kayda yazilmaz. */
function hkNormGrupEslestir(g) {
  var u = hkNormGrupKaydet(g);
  return HK_GRUP_ALIAS[u] || u;
}

/** Geriye uyumluluk: gorunen / kaydedilen grup adi (alias uygulanmaz). */
function hkNormGrup(g) {
  return hkNormGrupKaydet(g);
}

/** BIRIKIM / BİRİKİM / birikim — birikim modulu eslesmesi (grup adi degisse de). */
function hkIsBirikimGrup(g) {
  if (hkNormGrupEslestir(g) === "BIRIKIM") return true;
  return hkFoldTr(hkNormSpaces(g)) === "birikim";
}

function hkNormAd(ad) {
  return hkNormSpaces(ad);
}

function hkKatNormKey(grup, ad) {
  return hkNormGrupEslestir(grup) + "\0" + hkFoldTr(ad);
}

function hkKatCanonicalEtiket(grup, ad) {
  return hkNormGrupKaydet(grup) + " - " + hkNormAd(ad);
}

function hkKatNormKeyFromTam(tam) {
  var raw = hkNormSpaces(tam);
  if (!raw) return "";
  var d = raw.indexOf(" - ");
  if (d < 0) return "\0ad:" + hkFoldTr(raw);
  return hkKatNormKey(raw.slice(0, d), raw.slice(d + 3));
}

function hkResolveCanonicalEtiket(katStr, kategoriler) {
  var tam = hkNormSpaces(katStr);
  if (!tam) return "";
  var key = hkKatNormKeyFromTam(tam);
  var i, k, canon = null;
  for (i = 0; i < (kategoriler || []).length; i++) {
    k = kategoriler[i];
    if (hkKatNormKey(k.grup, k.ad) === key) {
      canon = hkKatCanonicalEtiket(k.grup, k.ad);
      break;
    }
  }
  if (canon) return canon;
  if (tam.indexOf(" - ") < 0 && kategoriler && kategoriler.length) {
    var adFold = hkFoldTr(tam);
    var matches = [];
    for (i = 0; i < kategoriler.length; i++) {
      k = kategoriler[i];
      if (hkFoldTr(k.ad) === adFold) matches.push(k);
    }
    if (matches.length === 1) return hkKatCanonicalEtiket(matches[0].grup, matches[0].ad);
  }
  return tam;
}

window.HKKategori = {
  normKey: hkKatNormKeyFromTam,
  canonicalEtiket: hkKatCanonicalEtiket,
  resolve: hkResolveCanonicalEtiket,
  normGrup: hkNormGrupKaydet,
  normGrupEslestir: hkNormGrupEslestir,
  normAd: hkNormAd,
  isBirikimGrup: hkIsBirikimGrup
};

/** Islemler listesi degisti — birikim modulu dinleyebilir. */
function hkIslemlerBildir() {
  try { window.dispatchEvent(new CustomEvent("hk-islemler-degisti")); } catch (e) {}
}

/** Kategori listesi degisti — birikim vb. moduller dinleyebilir. */
function hkKategorilerBildir() {
  try { window.dispatchEvent(new CustomEvent("hk-kategoriler-degisti")); } catch (e) {}
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
    hkIslemlerBildir();
    return id;
  },
  update: async function(islem) {
    await openDB();
    var result = await promisify(tx(STORES.ISLEMLER, "readwrite").put(islem));
    if (typeof fbIslemGuncelle !== "undefined") fbIslemGuncelle(islem);
    hkIslemlerBildir();
    return result;
  },
  delete: async function(id) {
    await openDB();
    var result = await promisify(tx(STORES.ISLEMLER, "readwrite").delete(id));
    if (typeof fbIslemSil !== "undefined") fbIslemSil(id);
    hkIslemlerBildir();
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
    var g = hkNormGrupKaydet(kat.grup);
    var a = hkNormAd(kat.ad);
    var mevcut = await getAll(tx(STORES.KATEGORILER, "readonly"));
    var key = hkKatNormKey(g, a);
    var dup = null;
    for (var i = 0; i < mevcut.length; i++) {
      if (hkKatNormKey(mevcut[i].grup, mevcut[i].ad) === key) {
        dup = mevcut[i];
        break;
      }
    }
    if (dup) return dup.id;
    var kayit = Object.assign({}, kat, { grup: g, ad: a });
    var id = await promisify(tx(STORES.KATEGORILER, "readwrite").add(kayit));
    await kategorileriBulutaYaz();
    hkKategorilerBildir();
    return id;
  },
  update: async function(kat) {
    await openDB();
    var kayit = Object.assign({}, kat, { grup: hkNormGrupKaydet(kat.grup), ad: hkNormAd(kat.ad) });
    var result = await promisify(tx(STORES.KATEGORILER, "readwrite").put(kayit));
    await kategorileriBulutaYaz();
    hkKategorilerBildir();
    return result;
  },
  /** Ayni anlama gelen kategorileri birlestirir; islem etiketlerini tek canonical forma ceker. */
  dedupeNormalizeAll: async function() {
    await openDB();
    try {
      if (localStorage.getItem("hk-dedupe-done") === "1") {
        window._hkDedupeDone = true;
        return { merged: 0, islemGuncelle: 0, skipped: true };
      }
    } catch (eSkip) {}
    var kats = await getAll(tx(STORES.KATEGORILER, "readonly"));
    if (!kats.length) return { merged: 0, islemGuncelle: 0 };
    var byKey = {};
    var i, k, key, list, winner, canon, deleteIds = [], normToCanon = {}, merged = 0, islemGuncelle = 0;
    for (i = 0; i < kats.length; i++) {
      k = kats[i];
      key = hkKatNormKey(k.grup, k.ad);
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(k);
    }
    var normFixNeeded = false;
    for (key in byKey) {
      if (!Object.prototype.hasOwnProperty.call(byKey, key)) continue;
      list = byKey[key];
      if (list.length > 1) { normFixNeeded = true; break; }
      winner = list[0];
      if (winner.grup !== hkNormGrupKaydet(winner.grup) || winner.ad !== hkNormAd(winner.ad)) {
        normFixNeeded = true;
        break;
      }
    }
    if (!normFixNeeded) {
      window._hkDedupeDone = true;
      try { localStorage.setItem("hk-dedupe-done", "1"); } catch (eDone) {}
      return { merged: 0, islemGuncelle: 0, skipped: true };
    }
    for (key in byKey) {
      if (!Object.prototype.hasOwnProperty.call(byKey, key)) continue;
      list = byKey[key];
      list.sort(function(a, b) {
        if (a.varsayilan && !b.varsayilan) return -1;
        if (!a.varsayilan && b.varsayilan) return 1;
        return (a.id || 0) - (b.id || 0);
      });
      winner = list[0];
      canon = hkKatCanonicalEtiket(winner.grup, winner.ad);
      normToCanon[key] = canon;
      if (winner.grup !== hkNormGrupKaydet(winner.grup) || winner.ad !== hkNormAd(winner.ad)) {
        await promisify(tx(STORES.KATEGORILER, "readwrite").put(Object.assign({}, winner, {
          grup: hkNormGrupKaydet(winner.grup),
          ad: hkNormAd(winner.ad)
        })));
      }
      for (i = 1; i < list.length; i++) {
        deleteIds.push(list[i].id);
        merged++;
      }
    }
    var islemler = await getAll(tx(STORES.ISLEMLER, "readonly"));
    var eskiToYeni = {};
    for (i = 0; i < kats.length; i++) {
      k = kats[i];
      key = hkKatNormKey(k.grup, k.ad);
      canon = normToCanon[key];
      if (!canon) continue;
      eskiToYeni[hkNormSpaces(k.grup + " - " + k.ad)] = canon;
      eskiToYeni[hkNormSpaces(k.grup + " - " + k.ad).toLocaleUpperCase("tr")] = canon;
      eskiToYeni[hkKatCanonicalEtiket(k.grup, k.ad)] = canon;
    }
    for (i = 0; i < islemler.length; i++) {
      var islem = islemler[i];
      var eski = hkNormSpaces(islem.kategori);
      var yeni = eskiToYeni[eski] || normToCanon[hkKatNormKeyFromTam(eski)] || hkResolveCanonicalEtiket(eski, kats);
      if (yeni && hkFoldTr(eski) !== hkFoldTr(yeni)) {
        await promisify(tx(STORES.ISLEMLER, "readwrite").put(Object.assign({}, islem, { kategori: yeni })));
        if (typeof fbIslemGuncelle !== "undefined") fbIslemGuncelle(Object.assign({}, islem, { kategori: yeni }));
        islemGuncelle++;
      }
    }
    for (i = 0; i < deleteIds.length; i++) {
      await promisify(tx(STORES.KATEGORILER, "readwrite").delete(deleteIds[i]));
    }
    if (merged > 0 || islemGuncelle > 0) await kategorileriBulutaYaz();
    window._hkDedupeDone = true;
    try { localStorage.setItem("hk-dedupe-done", "1"); } catch (eFin) {}
    return { merged: merged, islemGuncelle: islemGuncelle };
  },
  delete: async function(id) {
    await openDB();
    var result = await promisify(tx(STORES.KATEGORILER, "readwrite").delete(id));
    await kategorileriBulutaYaz();
    hkKategorilerBildir();
    return result;
  },
  seedDefaults: async function() {
    await openDB();
    var mevcut = await getAll(tx(STORES.KATEGORILER, "readonly"));
    if (mevcut.length > 0) return;
    /** Yeni kullanicilar icin genel sablon (kisisel isimler yok). BIRIKIM grubu birikim modulu ile eslesir. */
    var giderler = [
      { grup: "AILE", ad: "Aile" }, { grup: "AILE", ad: "Cocuk" },
      { grup: "ARAC", ad: "Bakim-Muayene" }, { grup: "ARAC", ad: "Ceza-Otopark" }, { grup: "ARAC", ad: "Sigorta" }, { grup: "ARAC", ad: "Vergi-MTV" }, { grup: "ARAC", ad: "Yakit" },
      { grup: "BIRIKIM", ad: "Altin" }, { grup: "BIRIKIM", ad: "Bes" }, { grup: "BIRIKIM", ad: "Diger Birikim" }, { grup: "BIRIKIM", ad: "Fon" }, { grup: "BIRIKIM", ad: "Nakit" },
      { grup: "BORC", ad: "Borc Odeme" },
      { grup: "EV", ad: "Esya" }, { grup: "EV", ad: "Kira" }, { grup: "EV", ad: "Tadilat-Bakim" }, { grup: "EV", ad: "Temizlik" },
      { grup: "ABONELIKLER", ad: "Bulut Depolama" }, { grup: "ABONELIKLER", ad: "Diger Abonelik" }, { grup: "ABONELIKLER", ad: "Disney+" }, { grup: "ABONELIKLER", ad: "Netflix" }, { grup: "ABONELIKLER", ad: "Oyun Aboneligi" }, { grup: "ABONELIKLER", ad: "Spotify" }, { grup: "ABONELIKLER", ad: "YouTube Premium" },
      { grup: "FATURALAR", ad: "Dogalgaz" }, { grup: "FATURALAR", ad: "Elektrik" }, { grup: "FATURALAR", ad: "Internet" }, { grup: "FATURALAR", ad: "Su" }, { grup: "FATURALAR", ad: "Telefon" },
      { grup: "GENEL GIDERLER", ad: "Disardan Yemek" }, { grup: "GENEL GIDERLER", ad: "Egitim-Kitap-Hobi" }, { grup: "GENEL GIDERLER", ad: "Eglence" }, { grup: "GENEL GIDERLER", ad: "Giyim" }, { grup: "GENEL GIDERLER", ad: "Hediye" }, { grup: "GENEL GIDERLER", ad: "Ikram" },
      { grup: "GEZI", ad: "Gezi" }, { grup: "GEZI", ad: "Konaklama" },
      { grup: "IBADET", ad: "Kurban" }, { grup: "IBADET", ad: "Zekat" },
      { grup: "KISISEL", ad: "Kisisel Harcama" },
      { grup: "KREDI KARTI", ad: "Kredi Karti" },
      { grup: "MUTFAK", ad: "Aburcubur" }, { grup: "MUTFAK", ad: "Kasap" }, { grup: "MUTFAK", ad: "Manav" }, { grup: "MUTFAK", ad: "Market" }, { grup: "MUTFAK", ad: "Mutfak Malzemesi" },
      { grup: "PLAN DISI", ad: "Plan Disi" },
      { grup: "SAGLIK", ad: "Saglik" },
    ].map(function(k) { return Object.assign({}, k, { tip: "gider", varsayilan: true }); });
    var gelirler = [
      { grup: "GELIRLER", ad: "Diger Gelir" }, { grup: "GELIRLER", ad: "Ek Gelir" }, { grup: "GELIRLER", ad: "Maas" }, { grup: "GELIRLER", ad: "Satis-Faiz" },
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

window.initApp = async function(opt) {
  opt = opt || {};
  await openDB();
  if (opt.hizli) {
    setTimeout(function() {
      KategorilerDB.seedDefaults().catch(function() {});
    }, 0);
    hkDedupeErtele();
    return;
  }
  await KategorilerDB.seedDefaults();
  hkDedupeErtele();
};

/** Kategori birlestirme acilista UI'yi bloklamasin; bir kez tamamlaninca tekrar calismaz. */
function hkDedupeErtele() {
  if (window._hkDedupeDone) return;
  try {
    if (localStorage.getItem("hk-dedupe-done") === "1") {
      window._hkDedupeDone = true;
      return;
    }
  } catch (e) {}
  var calistir = function() {
    if (window._hkDedupeDone || typeof KategorilerDB.dedupeNormalizeAll !== "function") return;
    KategorilerDB.dedupeNormalizeAll().then(function(r) {
      window._hkDedupeDone = true;
      try { localStorage.setItem("hk-dedupe-done", "1"); } catch (e2) {}
      if (r && r.islemGuncelle > 0 && typeof window.dispatchEvent === "function") {
        try { window.dispatchEvent(new CustomEvent("hk-islemler-degisti")); } catch (e3) {}
      }
    }).catch(function() {});
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(function() { calistir(); }, { timeout: 12000 });
  } else {
    setTimeout(calistir, 800);
  }
}

} // end guard

