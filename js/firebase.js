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

// Firebase TEK kaynak — her zaman Firebase'i esas al
// Basit yaklaşım: Firebase doluysa doğrudan Firebase'den oku, IndexedDB sync
async function fbVerileriYukle() {
  if (!_fbDb) return;
  try {
    // Firebase'deki işlemleri çek
    const snap = await _fbDb.ref("islemler").once("value");
    const fbData = snap.val();

    // Firebase boşsa: IndexedDB'deki verileri Firebase'e yükle (ilk kurulum)
    if (!fbData || Object.keys(fbData).length === 0) {
      await openDB();
      const idbIslemler = await IslemlerDB.getAll();
      if (idbIslemler && idbIslemler.length > 0) {
        const obj = {};
        idbIslemler.forEach(function(item) {
          const key = String(item.id);
          obj[key] = Object.assign({}, item, {id: key});
        });
        await _fbDb.ref("islemler").set(obj);
      }
      return;
    }

    // Firebase doluysa: Firebase'i tek kaynak kabul et
    // IndexedDB'yi temizle ve Firebase verisini yaz
    await openDB();
    await new Promise(function(resolve) {
      var req = indexedDB.open("hesap-kitap-db", 1);
      req.onsuccess = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains("islemler")) { resolve(); return; }
        var t = db.transaction("islemler", "readwrite");
        t.objectStore("islemler").clear();
        t.oncomplete = resolve;
        t.onerror = resolve;
      };
      req.onerror = resolve;
    });

    // Firebase verilerini IndexedDB'ye yaz
    const fbIslemler = Object.values(fbData);
    await openDB();
    for (const item of fbIslemler) {
      if (!item) continue;
      try {
        await new Promise(function(resolve) {
          var req2 = indexedDB.open("hesap-kitap-db", 1);
          req2.onsuccess = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains("islemler")) { resolve(); return; }
            var numId = parseInt(item.id);
            var kayit = Object.assign({}, item, {id: isNaN(numId) ? item.id : numId});
            var t = db.transaction("islemler", "readwrite");
            t.objectStore("islemler").put(kayit);
            t.oncomplete = resolve;
            t.onerror = resolve;
          };
          req2.onerror = resolve;
        });
      } catch(e) {}
    }

    // Kategorileri de sync et
    const snapKat = await _fbDb.ref("kategoriler").once("value");
    const fbKatData = snapKat.val();
    if (fbKatData && Array.isArray(fbKatData)) {
      await new Promise(function(resolve) {
        var req = indexedDB.open("hesap-kitap-db", 1);
        req.onsuccess = function(e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains("kategoriler")) { resolve(); return; }
          var t = db.transaction("kategoriler", "readwrite");
          // Sadece custom (varsayilan olmayan) kategorileri temizle, sonra Firebase'den ekle
          var store = t.objectStore("kategoriler");
          var getReq = store.getAll();
          getReq.onsuccess = function() {
            var mevcutlar = getReq.result || [];
            var customlar = mevcutlar.filter(function(k) { return !k.varsayilan; });
            customlar.forEach(function(k) { store.delete(k.id); });
          };
          t.oncomplete = resolve;
          t.onerror = resolve;
        };
        req.onerror = resolve;
      });
    }

  } catch(e) { console.warn("fbVerileriYukle hatasi:", e); }
}

// İşlem Firebase'e kaydet — db.js'den çağrılır (fbIslemEkle/fbIslemGuncelle)
function fbIslemEkle(islem) {
  if (!_fbDb || !islem) return;
  const key = String(islem.id);
  _fbDb.ref("islemler/" + key).set(Object.assign({}, islem, {id: key}))
    .catch(function(e){ console.warn("fbIslemEkle:", e); });
}

function fbIslemGuncelle(islem) {
  if (!_fbDb || !islem) return;
  const key = String(islem.id);
  _fbDb.ref("islemler/" + key).set(Object.assign({}, islem, {id: key}))
    .catch(function(e){ console.warn("fbIslemGuncelle:", e); });
}

// İşlem Firebase'den sil — db.js'den çağrılır
function fbIslemSil(id) {
  if (!_fbDb || !id) return;
  _fbDb.ref("islemler/" + String(id)).remove()
    .catch(function(e){ console.warn("fbIslemSil:", e); });
}

// Kategorileri Firebase'e sync et
function fbSyncKategoriler(kategoriler) {
  if (!_fbDb || !kategoriler) return;
  _fbDb.ref("kategoriler").set(kategoriler)
    .catch(function(e){ console.warn("fbSyncKategoriler:", e); });
}
