/* firebase.js — Firebase Realtime Database sync */
/* Guard: cift yuklemeyi engelle */
if (typeof window._fbLoaded === "undefined") {
window._fbLoaded = true;

var _fbDb = null;
var _fbReady = false;

function fbInit() {
  if (typeof firebase === "undefined") return;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: "AIzaSyAKnw9IVAh65FUCtxVcna7lSvAO3dx_4SM",
        authDomain: "hesap-kitap-234d1.firebaseapp.com",
        databaseURL: "https://hesap-kitap-234d1-default-rtdb.firebaseio.com",
        projectId: "hesap-kitap-234d1",
        storageBucket: "hesap-kitap-234d1.firebasestorage.app",
        messagingSenderId: "444640499049",
        appId: "1:444640499049:web:327244db97f698a69799f8"
      });
    }
    _fbDb = firebase.database();
    _fbReady = true;
    console.log("Firebase baglandi");
  } catch(e) {
    console.warn("Firebase baslama hatasi:", e.message);
  }
}

function fbIslemEkle(islem) {
  if (!_fbReady || !_fbDb || !islem.id) return Promise.resolve();
  return _fbDb.ref("islemler/" + islem.id).set({
    tip: islem.tip, kategori: islem.kategori,
    tutar: islem.tutar, aciklama: islem.aciklama || "",
    tarih: islem.tarih, olusturma: islem.olusturma || Date.now()
  }).catch(e => console.warn("FB ekle:", e.message));
}

function fbIslemGuncelle(islem) {
  if (!_fbReady || !_fbDb || !islem.id) return Promise.resolve();
  return _fbDb.ref("islemler/" + islem.id).update({
    tip: islem.tip, kategori: islem.kategori,
    tutar: islem.tutar, aciklama: islem.aciklama || "", tarih: islem.tarih
  }).catch(e => console.warn("FB guncelle:", e.message));
}

function fbIslemSil(id) {
  if (!_fbReady || !_fbDb) return Promise.resolve();
  return _fbDb.ref("islemler/" + id).remove()
    .catch(e => console.warn("FB sil:", e.message));
}

function fbSyncKategoriler(kategoriler) {
  if (!_fbReady || !_fbDb) return Promise.resolve();
  var data = {};
  kategoriler.forEach(function(k) {
    if (k.id) data[k.id] = { tip: k.tip, grup: k.grup, ad: k.ad, varsayilan: false };
  });
  return _fbDb.ref("kategoriler").set(data)
    .catch(e => console.warn("FB kat sync:", e.message));
}

function fbVerileriYukle() {
  if (!_fbReady || !_fbDb) return Promise.resolve(false);
  // Önce IndexedDB'de kayıt var mı bak
  return IslemlerDB.getAll().then(function(mevcutlar) {
    // IndexedDB doluysa Firebase'den yükleme yapma — veri silme riski var
    if (mevcutlar.length > 0) return false;
    // IndexedDB boşsa (yeni cihaz) Firebase'den yükle
    return _fbDb.ref("/").once("value").then(function(snap) {
      var data = snap.val();
      if (!data) return false;
      var zincir = Promise.resolve();
      if (data.islemler) {
        zincir = zincir.then(function() {
          var eklemeler = Object.values(data.islemler).map(function(i) {
            return IslemlerDB.add({
              tip: i.tip, kategori: i.kategori, tutar: i.tutar,
              aciklama: i.aciklama || "", tarih: i.tarih,
              olusturma: i.olusturma || Date.now()
            });
          });
          return Promise.all(eklemeler);
        });
      }
      return zincir.then(function() { return true; });
    });
  }).catch(function(e) {
    console.warn("FB yukle hatasi:", e.message);
    return false;
  });
}

} // end guard
