/* firebase.js — Firebase Realtime Database sync */

const FB_CONFIG = {
  apiKey: "AIzaSyAKnw9IVAh65FUCtxVcna7lSvAO3dx_4SM",
  authDomain: "hesap-kitap-234d1.firebaseapp.com",
  databaseURL: "https://hesap-kitap-234d1-default-rtdb.firebaseio.com",
  projectId: "hesap-kitap-234d1",
  storageBucket: "hesap-kitap-234d1.firebasestorage.app",
  messagingSenderId: "444640499049",
  appId: "1:444640499049:web:327244db97f698a69799f8"
};

// Firebase baslatma
let _db = null;
let _fbReady = false;

function fbInit() {
  if (typeof firebase === "undefined") return;
  if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
  _db = firebase.database();
  _fbReady = true;
  console.log("Firebase baglandi");
}

// Tum islemleri Firebase ye yaz
async function fbSyncIslemler(islemler) {
  if (!_fbReady || !_db) return;
  try {
    const data = {};
    for (const i of islemler) {
      data[i.id] = {
        tip: i.tip,
        kategori: i.kategori,
        tutar: i.tutar,
        aciklama: i.aciklama || "",
        tarih: i.tarih,
        olusturma: i.olusturma || Date.now()
      };
    }
    await _db.ref("islemler").set(data);
  } catch(e) {
    console.warn("Firebase sync hatasi:", e.message);
  }
}

// Tek islem ekle
async function fbIslemEkle(islem) {
  if (!_fbReady || !_db) return;
  try {
    await _db.ref("islemler/" + islem.id).set({
      tip: islem.tip,
      kategori: islem.kategori,
      tutar: islem.tutar,
      aciklama: islem.aciklama || "",
      tarih: islem.tarih,
      olusturma: islem.olusturma || Date.now()
    });
  } catch(e) {
    console.warn("Firebase ekle hatasi:", e.message);
  }
}

// Tek islem guncelle
async function fbIslemGuncelle(islem) {
  if (!_fbReady || !_db) return;
  try {
    await _db.ref("islemler/" + islem.id).update({
      tip: islem.tip,
      kategori: islem.kategori,
      tutar: islem.tutar,
      aciklama: islem.aciklama || "",
      tarih: islem.tarih
    });
  } catch(e) {
    console.warn("Firebase guncelle hatasi:", e.message);
  }
}

// Tek islem sil
async function fbIslemSil(id) {
  if (!_fbReady || !_db) return;
  try {
    await _db.ref("islemler/" + id).remove();
  } catch(e) {
    console.warn("Firebase sil hatasi:", e.message);
  }
}

// Kategorileri Firebase ye yaz
async function fbSyncKategoriler(kategoriler) {
  if (!_fbReady || !_db) return;
  try {
    const data = {};
    for (const k of kategoriler) {
      data[k.id] = {
        tip: k.tip,
        grup: k.grup,
        ad: k.ad,
        varsayilan: k.varsayilan || false
      };
    }
    await _db.ref("kategoriler").set(data);
  } catch(e) {
    console.warn("Firebase kategori sync hatasi:", e.message);
  }
}

// Firebase dan tum verileri cek ve IndexedDB ye yukle
async function fbVerileriYukle() {
  if (!_fbReady || !_db) return false;
  try {
    const snap = await _db.ref("/").once("value");
    const data = snap.val();
    if (!data) return false;

    // Islemleri yukle
    if (data.islemler) {
      // Mevcut IndexedDB islemlerini temizle
      const mevcutIslemler = await IslemlerDB.getAll();
      for (const i of mevcutIslemler) {
        await IslemlerDB.delete(i.id);
      }
      // Firebase den gelenleri ekle
      for (const [id, islem] of Object.entries(data.islemler)) {
        await IslemlerDB.add({
          tip: islem.tip,
          kategori: islem.kategori,
          tutar: islem.tutar,
          aciklama: islem.aciklama || "",
          tarih: islem.tarih,
          olusturma: islem.olusturma || Date.now()
        });
      }
    }

    // Kategorileri yukle (varsayilan olmayanlar)
    if (data.kategoriler) {
      const mevcutKats = await KategorilerDB.getAll();
      const mevcutVarsayilan = mevcutKats.filter(k => k.varsayilan);
      // Sadece kullanicinin eklediklerini Firebase den al
      const fbKats = Object.values(data.kategoriler).filter(k => !k.varsayilan);
      for (const k of fbKats) {
        const varMi = mevcutKats.some(m => m.grup === k.grup && m.ad === k.ad && m.tip === k.tip);
        if (!varMi) {
          await KategorilerDB.add({ tip: k.tip, grup: k.grup, ad: k.ad, varsayilan: false });
        }
      }
    }

    return true;
  } catch(e) {
    console.warn("Firebase veri yukle hatasi:", e.message);
    return false;
  }
}

// Sync durumu goster
function fbSyncDurumu(durum) {
  const el = document.getElementById("sync-durum");
  if (!el) return;
  el.textContent = durum;
  el.className = "sync-durum " + (durum === "✓" ? "ok" : "");
}
