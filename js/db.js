const DB_NAME = "hesap-kitap-db";
const DB_VERSION = 1;
const STORES = { ISLEMLER: "islemler", KATEGORILER: "kategoriler", AYARLAR: "ayarlar" };
let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.ISLEMLER)) {
        const s = db.createObjectStore(STORES.ISLEMLER, { keyPath: "id", autoIncrement: true });
        s.createIndex("tarih", "tarih", { unique: false });
        s.createIndex("tip", "tip", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.KATEGORILER)) {
        const s = db.createObjectStore(STORES.KATEGORILER, { keyPath: "id", autoIncrement: true });
        s.createIndex("tip", "tip", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.AYARLAR)) {
        db.createObjectStore(STORES.AYARLAR, { keyPath: "key" });
      }
    };
    req.onsuccess = (e) => {
      _db = e.target.result;
      _db.onversionchange = () => { _db.close(); _db = null; };
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode) { return _db.transaction([storeName], mode).objectStore(storeName); }
function promisify(req) { return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }
function getAll(store) { return new Promise((res, rej) => { const req = store.getAll(); req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); }

const IslemlerDB = {
  async getAll() { await openDB(); return getAll(tx(STORES.ISLEMLER, "readonly")); },

  async add(islem) {
    await openDB();
    const id = await promisify(tx(STORES.ISLEMLER, "readwrite").add({ ...islem, olusturma: Date.now() }));
    // Firebase sync
    const eklenen = await promisify(tx(STORES.ISLEMLER, "readonly").get(id));
    if (typeof fbIslemEkle !== "undefined") fbIslemEkle({ ...eklenen, id }).catch(()=>{});
    return id;
  },

  async update(islem) {
    await openDB();
    const result = await promisify(tx(STORES.ISLEMLER, "readwrite").put(islem));
    // Firebase sync
    if (typeof fbIslemGuncelle !== "undefined") fbIslemGuncelle(islem).catch(()=>{});
    return result;
  },

  async delete(id) {
    await openDB();
    const result = await promisify(tx(STORES.ISLEMLER, "readwrite").delete(id));
    // Firebase sync
    if (typeof fbIslemSil !== "undefined") fbIslemSil(id).catch(()=>{});
    return result;
  },

  async getById(id) { await openDB(); return promisify(tx(STORES.ISLEMLER, "readonly").get(id)); },
};

const KategorilerDB = {
  async getAll() { await openDB(); return getAll(tx(STORES.KATEGORILER, "readonly")); },

  async add(kat) {
    await openDB();
    const id = await promisify(tx(STORES.KATEGORILER, "readwrite").add(kat));
    // Kullanici kategorisiyse Firebase e sync et
    if (!kat.varsayilan && typeof fbSyncKategoriler !== "undefined") {
      KategorilerDB.getAll().then(kats => fbSyncKategoriler(kats.filter(k=>!k.varsayilan))).catch(()=>{});
    }
    return id;
  },

  async update(kat) {
    await openDB();
    const result = await promisify(tx(STORES.KATEGORILER, "readwrite").put(kat));
    if (typeof fbSyncKategoriler !== "undefined") {
      KategorilerDB.getAll().then(kats => fbSyncKategoriler(kats.filter(k=>!k.varsayilan))).catch(()=>{});
    }
    return result;
  },

  async delete(id) { await openDB(); return promisify(tx(STORES.KATEGORILER, "readwrite").delete(id)); },

  async seedDefaults() {
    await openDB();
    const mevcut = await getAll(tx(STORES.KATEGORILER, "readonly"));
    if (mevcut.length > 0) return;
    const giderler = [
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
    ].map(k => ({ ...k, tip: "gider", varsayilan: true }));
    const gelirler = [
      { grup: "GELIRLER", ad: "Bugra Maas" }, { grup: "GELIRLER", ad: "Bugra Ek Ders" }, { grup: "GELIRLER", ad: "Cekilen Kredi" }, { grup: "GELIRLER", ad: "Salim Maas" },
    ].map(k => ({ ...k, tip: "gelir", varsayilan: true }));
    const s = tx(STORES.KATEGORILER, "readwrite");
    for (const k of [...giderler, ...gelirler]) { await promisify(s.add(k)); }
  },
};

const AyarlarDB = {
  async get(key) { await openDB(); const r = await promisify(tx(STORES.AYARLAR, "readonly").get(key)); return r ? r.value : null; },
  async set(key, value) { await openDB(); return promisify(tx(STORES.AYARLAR, "readwrite").put({ key, value })); },
};

async function initApp() {
  await openDB();
  const sifre = await AyarlarDB.get("sifre");
  if (!sifre) await AyarlarDB.set("sifre", "1234");
  await KategorilerDB.seedDefaults();
}
