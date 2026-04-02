// firebase.js
const _fbConfig = {
  apiKey: "AIzaSyAKnw9IVAh65FUCtxVcna7lSvAO3dx_4SM",
  authDomain: "hesap-kitap-234d1.firebaseapp.com",
  databaseURL: "https://hesap-kitap-234d1-default-rtdb.firebaseio.com",
  projectId: "hesap-kitap-234d1",
  storageBucket: "hesap-kitap-234d1.firebasestorage.app",
  messagingSenderId: "444640499049",
  appId: "1:444640499049:web:327244db97f698a69799f8"
};

let _fbDb = null;

function fbInit() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(_fbConfig);
    _fbDb = firebase.database();
    window._fbDb = _fbDb;
  } catch(e) { console.warn("Firebase init hatasi:", e); }
}

// Firebase -> IndexedDB sync
// Firebase key'lerini numeric id'ye donusturur (IDB autoIncrement uyumu)
async function fbVerileriYukle() {
  if (!_fbDb) return;
  try {
    const snap = await _fbDb.ref("islemler").once("value");
    const fbData = snap.val();

    await openDB();
    const idbIslemler = await IslemlerDB.getAll();

    if (!fbData || Object.keys(fbData).length === 0) {
      // Firebase bos: IDB'deki verileri Firebase'e gonder
      if (idbIslemler.length > 0) {
        const obj = {};
        idbIslemler.forEach(function(item) {
          obj[String(item.id)] = Object.assign({}, item);
        });
        await _fbDb.ref("islemler").set(obj);
      }
      return;
    }

    // Firebase dolu: IDB bos veya farkli ise Firebase'den yukle
    // IDB'yi tamamen firebase ile esitle
    // Once IDB temizle
    const idb = await new Promise(function(resolve, reject) {
      const req = indexedDB.open("hesap-kitap-db", 1);
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function() { reject(); };
    });

    await new Promise(function(resolve) {
      const t = idb.transaction("islemler", "readwrite");
      t.objectStore("islemler").clear();
      t.oncomplete = resolve;
      t.onerror = resolve;
    });

    // Firebase verilerini IDB'ye ekle
    // IDB autoIncrement=true, keyPath="id" (numeric)
    // Firebase key'i numeric ise id olarak kullan, degilse id olmadan ekle
    const entries = Object.entries(fbData);
    for (const [fbKey, item] of entries) {
      if (!item) continue;
      await new Promise(function(resolve) {
        const t2 = idb.transaction("islemler", "readwrite");
        const store = t2.objectStore("islemler");
        const numId = parseInt(fbKey);
        // Temiz kayit olustur — id numeric ise koy, degilse cikar (autoIncrement)
        const kayit = Object.assign({}, item);
        if (!isNaN(numId) && numId > 0) {
          kayit.id = numId;
          store.put(kayit);
        } else {
          delete kayit.id;
          store.add(kayit);
        }
        t2.oncomplete = resolve;
        t2.onerror = resolve;
      });
    }

  } catch(e) { console.warn("fbVerileriYukle hatasi:", e); }
}

// db.js tarafindan otomatik cagirilir
function fbIslemEkle(islem) {
  if (!_fbDb || !islem || !islem.id) return;
  _fbDb.ref("islemler/" + islem.id).set(Object.assign({}, islem))
    .catch(function(e){ console.warn("fbIslemEkle:", e); });
}

function fbIslemGuncelle(islem) {
  if (!_fbDb || !islem || !islem.id) return;
  _fbDb.ref("islemler/" + islem.id).set(Object.assign({}, islem))
    .catch(function(e){ console.warn("fbIslemGuncelle:", e); });
}

function fbIslemSil(id) {
  if (!_fbDb || id === undefined || id === null) return;
  _fbDb.ref("islemler/" + id).remove()
    .catch(function(e){ console.warn("fbIslemSil:", e); });
}

function fbSyncKategoriler(kategoriler) {
  if (!_fbDb || !kategoriler) return;
  _fbDb.ref("kategoriler").set(kategoriler)
    .catch(function(e){ console.warn("fbSyncKategoriler:", e); });
}
