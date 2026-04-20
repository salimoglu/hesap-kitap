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
  } catch(e) { console.warn("Firebase init:", e); }
}

async function fbVerileriYukle() {
  if (!_fbDb) return;
  try {
    const snap = await _fbDb.ref("islemler").once("value");
    const fbData = snap.val();

    await openDB();

    if (!fbData || Object.keys(fbData).length === 0) {
      // Firebase bos — IDB'den Firebase'e yukle
      const mevcut = await IslemlerDB.getAll();
      if (mevcut.length > 0) {
        const obj = {};
        mevcut.forEach(function(item) {
          obj[String(item.id)] = Object.assign({}, item);
        });
        await _fbDb.ref("islemler").set(obj);
      }
      return;
    }

    // Firebase dolu — IDB'yi Firebase ile eslestir
    // IDB'yi once temizle
    await new Promise(function(resolve) {
      var req = indexedDB.open("hesap-kitap-db", 1);
      req.onsuccess = function(e) {
        var db = e.target.result;
        var t = db.transaction("islemler", "readwrite");
        t.objectStore("islemler").clear();
        t.oncomplete = resolve;
        t.onerror = resolve;
      };
      req.onerror = resolve;
    });

    // Firebase verilerini IDB'ye yaz
    // KRITIK: her kayda id ekle (Firebase key'inden al, numeric yap)
    var idb = await new Promise(function(resolve) {
      var req2 = indexedDB.open("hesap-kitap-db", 1);
      req2.onsuccess = function(e) { resolve(e.target.result); };
      req2.onerror = function() { resolve(null); };
    });
    if (!idb) return;

    var entries = Object.entries(fbData);
    for (var i = 0; i < entries.length; i++) {
      var fbKey = entries[i][0];
      var item = entries[i][1];
      if (!item) continue;

      // id'yi numeric yap — IDB keyPath: "id", autoIncrement
      var numId = parseInt(fbKey);
      var kayit = Object.assign({}, item, {
        id: isNaN(numId) ? undefined : numId
      });
      // id undefined ise delete (add kullan), varsa put
      if (kayit.id === undefined) delete kayit.id;

      await new Promise(function(resolve) {
        try {
          var t2 = idb.transaction("islemler", "readwrite");
          var store = t2.objectStore("islemler");
          if (kayit.id !== undefined) {
            store.put(kayit);
          } else {
            store.add(kayit);
          }
          t2.oncomplete = resolve;
          t2.onerror = resolve;
        } catch(ex) { resolve(); }
      });
    }

  } catch(e) { console.warn("fbVerileriYukle:", e); }
}

// db.js tarafindan otomatik cagirilir
function fbIslemEkle(islem) {
  if (!_fbDb || !islem || !islem.id) return;
  _fbDb.ref("islemler/" + String(islem.id))
    .set(Object.assign({}, islem))
    .catch(function(e){ console.warn("fbIslemEkle:", e); });
}

function fbIslemGuncelle(islem) {
  if (!_fbDb || !islem || !islem.id) return;
  _fbDb.ref("islemler/" + String(islem.id))
    .set(Object.assign({}, islem))
    .catch(function(e){ console.warn("fbIslemGuncelle:", e); });
}

function fbIslemSil(id) {
  if (!_fbDb || id === undefined || id === null) return;
  _fbDb.ref("islemler/" + String(id)).remove()
    .catch(function(e){ console.warn("fbIslemSil:", e); });
}

function fbSyncKategoriler(kategoriler) {
  if (!_fbDb || !kategoriler) return;
  _fbDb.ref("kategoriler").set(kategoriler)
    .catch(function(e){ console.warn("fbSyncKategoriler:", e); });
}
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
  } catch(e) { console.warn("Firebase init:", e); }
}

async function fbVerileriYukle() {
  if (!_fbDb) return;
  try {
    const snap = await _fbDb.ref("islemler").once("value");
    const fbData = snap.val();

    await openDB();

    if (!fbData || Object.keys(fbData).length === 0) {
      // Firebase bos — IDB'den Firebase'e yukle
      const mevcut = await IslemlerDB.getAll();
      if (mevcut.length > 0) {
        const obj = {};
        mevcut.forEach(function(item) {
          obj[String(item.id)] = Object.assign({}, item);
        });
        await _fbDb.ref("islemler").set(obj);
      }
      return;
    }

    // Firebase dolu — IDB'yi Firebase ile eslestir
    // IDB'yi once temizle
    await new Promise(function(resolve) {
      var req = indexedDB.open("hesap-kitap-db", 1);
      req.onsuccess = function(e) {
        var db = e.target.result;
        var t = db.transaction("islemler", "readwrite");
        t.objectStore("islemler").clear();
        t.oncomplete = resolve;
        t.onerror = resolve;
      };
      req.onerror = resolve;
    });

    // Firebase verilerini IDB'ye yaz
    // KRITIK: her kayda id ekle (Firebase key'inden al, numeric yap)
    var idb = await new Promise(function(resolve) {
      var req2 = indexedDB.open("hesap-kitap-db", 1);
      req2.onsuccess = function(e) { resolve(e.target.result); };
      req2.onerror = function() { resolve(null); };
    });
    if (!idb) return;

    var entries = Object.entries(fbData);
    for (var i = 0; i < entries.length; i++) {
      var fbKey = entries[i][0];
      var item = entries[i][1];
      if (!item) continue;

      // id'yi numeric yap — IDB keyPath: "id", autoIncrement
      var numId = parseInt(fbKey);
      var kayit = Object.assign({}, item, {
        id: isNaN(numId) ? undefined : numId
      });
      // id undefined ise delete (add kullan), varsa put
      if (kayit.id === undefined) delete kayit.id;

      await new Promise(function(resolve) {
        try {
          var t2 = idb.transaction("islemler", "readwrite");
          var store = t2.objectStore("islemler");
          if (kayit.id !== undefined) {
            store.put(kayit);
          } else {
            store.add(kayit);
          }
          t2.oncomplete = resolve;
          t2.onerror = resolve;
        } catch(ex) { resolve(); }
      });
    }

  } catch(e) { console.warn("fbVerileriYukle:", e); }
}

// db.js tarafindan otomatik cagirilir
function fbIslemEkle(islem) {
  if (!_fbDb || !islem || !islem.id) return;
  _fbDb.ref("islemler/" + String(islem.id))
    .set(Object.assign({}, islem))
    .catch(function(e){ console.warn("fbIslemEkle:", e); });
}

function fbIslemGuncelle(islem) {
  if (!_fbDb || !islem || !islem.id) return;
  _fbDb.ref("islemler/" + String(islem.id))
    .set(Object.assign({}, islem))
    .catch(function(e){ console.warn("fbIslemGuncelle:", e); });
}

function fbIslemSil(id) {
  if (!_fbDb || id === undefined || id === null) return;
  _fbDb.ref("islemler/" + String(id)).remove()
    .catch(function(e){ console.warn("fbIslemSil:", e); });
}

function fbSyncKategoriler(kategoriler) {
  if (!_fbDb || !kategoriler) return;
  _fbDb.ref("kategoriler").set(kategoriler)
    .catch(function(e){ console.warn("fbSyncKategoriler:", e); });
}
