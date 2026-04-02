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
    if (!firebase.apps.length) {
      firebase.initializeApp(_fbConfig);
    }
    _fbDb = firebase.database();
    window._fbDb = _fbDb;
  } catch (e) {
    console.warn("Firebase init hatasi:", e);
  }
}

// Firebase TEK kaynak — islemler her zaman Firebase'den yukle
// IndexedDB karismasini onle: Firebase'den gelen veriyi dogrudan kullan
async function fbVerileriYukle() {
  if (!_fbDb) return;
  try {
    const snap = await _fbDb.ref("islemler").once("value");
    const fbData = snap.val();

    if (!fbData || Object.keys(fbData).length === 0) {
      // Firebase bos — IndexedDB'deki verileri Firebase'e yukle (ilk cihaz)
      const idbIslemler = await getAllFromIDB();
      if (idbIslemler && idbIslemler.length > 0) {
        // ID bazinda dedupe yaparak Firebase'e yaz
        const obj = {};
        idbIslemler.forEach(function(item) {
          if (item.id) obj[item.id] = item;
        });
        await _fbDb.ref("islemler").set(obj);
      }
    } else {
      // Firebase dolu — Firebase'i tek kaynak kabul et
      // IndexedDB'yi Firebase verileriyle REPLACE et (ekle degil)
      const fbIslemler = Object.values(fbData);

      // Once IndexedDB'yi temizle, sonra Firebase'den yaz
      await clearIDB();
      for (const item of fbIslemler) {
        if (item && item.id) {
          await putToIDB(item);
        }
      }
    }
  } catch (e) {
    console.warn("fbVerileriYukle hatasi:", e);
  }
}

// Firebase'e islem kaydet (tekrar kontrollu)
async function fbIslemKaydet(islem) {
  if (!_fbDb || !islem || !islem.id) return;
  try {
    await _fbDb.ref("islemler/" + islem.id).set(islem);
  } catch (e) {
    console.warn("fbIslemKaydet hatasi:", e);
  }
}

// Firebase'den islem sil
async function fbIslemSil(id) {
  if (!_fbDb || !id) return;
  try {
    await _fbDb.ref("islemler/" + id).remove();
  } catch (e) {
    console.warn("fbIslemSil hatasi:", e);
  }
}

// IndexedDB yardimci fonksiyonlari
function getAllFromIDB() {
  return new Promise(function(resolve) {
    try {
      const req = indexedDB.open("HesapKitap", 1);
      req.onsuccess = function(e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("islemler")) { resolve([]); return; }
        const tx = db.transaction("islemler", "readonly");
        const store = tx.objectStore("islemler");
        const all = store.getAll();
        all.onsuccess = function() { resolve(all.result || []); };
        all.onerror = function() { resolve([]); };
      };
      req.onerror = function() { resolve([]); };
    } catch(e) { resolve([]); }
  });
}

function clearIDB() {
  return new Promise(function(resolve) {
    try {
      const req = indexedDB.open("HesapKitap", 1);
      req.onsuccess = function(e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("islemler")) { resolve(); return; }
        const tx = db.transaction("islemler", "readwrite");
        tx.objectStore("islemler").clear();
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { resolve(); };
      };
      req.onerror = function() { resolve(); };
    } catch(e) { resolve(); }
  });
}

function putToIDB(item) {
  return new Promise(function(resolve) {
    try {
      const req = indexedDB.open("HesapKitap", 1);
      req.onsuccess = function(e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("islemler")) { resolve(); return; }
        const tx = db.transaction("islemler", "readwrite");
        tx.objectStore("islemler").put(item);
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { resolve(); };
      };
      req.onerror = function() { resolve(); };
    } catch(e) { resolve(); }
  });
}
