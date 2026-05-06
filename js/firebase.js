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

/**
 * Tek seferlik: RTDB kokundaki (eski) veriyi bu UID ile users/{uid}/ altina kopyalar.
 * Bos birakirsaniz tasima calismaz. UID: Firebase Console → Authentication → kullanici → User UID.
 * Tasima tamamlaninca (konsolda [Tasima] logu) bu sabiti tekrar "" yapip yayinlayin;
 * sonra database.rules.strict.json icerigini database.rules.json yapip kurallari yeniden deploy edin
 * ve kokteki ESKI dugumleri Console'dan silin.
 */
const _fbEskiKokTasimaUid = "";

let _fbDb = null;
window._fbAuthOk = false;
window._fbReady = Promise.resolve(false);

async function fbInit() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(_fbConfig);
    _fbDb = firebase.database();
    window._fbDb = _fbDb;

    try {
      await firebase.auth().getRedirectResult();
    } catch (e) {
      console.warn("getRedirectResult:", e);
    }

    /* Persistence ilk snapshot'ini bekle; 8sn timeout yok — zaman asiminda erken false verip
       yetkisiz okuma / bos senkron tetiklenmesin */
    window._fbReady = new Promise(function(resolve) {
      var ilk = true;
      firebase.auth().onAuthStateChanged(function(user) {
        window._fbAuthOk = !!user;
        if (ilk) {
          ilk = false;
          resolve(!!user);
        }
      });
    });

    await window._fbReady;
  } catch (e) {
    console.warn("Firebase init:", e);
    window._fbAuthOk = false;
    window._fbReady = Promise.resolve(false);
  }
}

function fbMevcutKullanici() {
  try {
    return firebase.auth().currentUser || null;
  } catch (e) {
    return null;
  }
}

/** Oturum acmis kullanicinin RTDB alt yolu: users/{uid}/... */
function fbUserRef(relPath) {
  if (!_fbDb) return null;
  try {
    var u = firebase.auth().currentUser;
    if (!u || u.isAnonymous) return null;
    var p = String(relPath || "").replace(/^\/+/, "");
    return _fbDb.ref("users/" + u.uid + "/" + p);
  } catch (e) {
    return null;
  }
}
window.fbUserRef = fbUserRef;

/** Kokte kalan eski veriyi (sadece _fbEskiKokTasimaUid) bir kez users altina tasir. */
async function fbEskiKoktenTasimaDene() {
  if (!_fbDb || !_fbEskiKokTasimaUid) return;
  var u = fbMevcutKullanici();
  if (!u || u.uid !== _fbEskiKokTasimaUid) return;
  var isaret = fbUserRef("_kok_tasima_tamam");
  if (!isaret) return;
  try {
    var z = await isaret.once("value");
    if (z.val()) return;
  } catch (e1) {
    return;
  }
  var anahtarlar = [
    "islemler", "kategoriler", "vefa2", "urunler", "alacaklar", "arabam", "muhtac",
    "kredi_harcamalar", "kredi_kartlar", "altin_kayitlar", "altin_guncel_fiyat",
    "altin_guncel_fiyat_tarih", "birikim_manuel"
  ];
  for (var i = 0; i < anahtarlar.length; i++) {
    var k = anahtarlar[i];
    try {
      var snap = await _fbDb.ref(k).once("value");
      var val = snap.val();
      if (val != null) {
        var hedef = fbUserRef(k);
        if (hedef) await hedef.set(val);
      }
    } catch (e2) {
      console.warn("[Tasima] " + k, e2);
    }
  }
  var yBas = 2018, yBit = 2035;
  for (var y = yBas; y <= yBit; y++) {
    for (var ay = 1; ay <= 12; ay++) {
      var bk = "butce_" + y + "_" + ay;
      try {
        var bs = await _fbDb.ref(bk).once("value");
        var bv = bs.val();
        if (bv != null) {
          var bh = fbUserRef(bk);
          if (bh) await bh.set(bv);
        }
      } catch (e3) {}
    }
  }
  try {
    await isaret.set(true);
    console.log("[Tasima] Eski kok verisi users/" + u.uid + "/ altina kopyalandi.");
  } catch (e4) {
    console.warn("[Tasima] tamam isareti yazilamadi", e4);
  }
}

/** RTDB isteklerinden once cagirin; yeni oturumda tokenin yazilmamasini onler. */
async function fbKimlikTokenAl() {
  try {
    var u = firebase.auth().currentUser;
    if (u) await u.getIdToken(true);
  } catch (e) {
    console.warn("fbKimlikTokenAl:", e);
  }
}

function fbAuthHataMetni(err) {
  var c = err && err.code ? err.code : "";
  if (c === "auth/invalid-email") return "Gecersiz e-posta adresi.";
  if (c === "auth/user-disabled") return "Bu hesap kullanima kapatilmis.";
  if (c === "auth/user-not-found") return "Bu e-posta ile kayit bulunamadi.";
  if (c === "auth/wrong-password") return "Sifre hatali.";
  if (c === "auth/invalid-credential") return "E-posta veya sifre hatali.";
  if (c === "auth/email-already-in-use") return "Bu e-posta adresi zaten kullaniliyor.";
  if (c === "auth/weak-password") return "Sifre en az 6 karakter olmali.";
  if (c === "auth/operation-not-allowed")
    return "Bu oturum acma yontemi kapali. Firebase Console → Authentication → Sign-in method: E-posta/Şifre veya Google'ı etkinlestirin.";
  if (c === "auth/popup-closed-by-user") return "";
  if (c === "auth/cancelled-popup-request") return "";
  if (c === "auth/account-exists-with-different-credential")
    return "Bu e-posta baska bir oturum yontemiyle kayitli. Once o yontemle giris yapin.";
  if (c === "auth/requires-recent-login") return "Guvenlik icin cikis yapip tekrar girin.";
  if (c === "auth/credential-already-in-use") return "Bu e-posta baska hesaba bagli.";
  return err && err.message ? err.message : "Giris yapilamadi.";
}

async function fbGirisEmail(email, sifre) {
  await firebase.auth().signInWithEmailAndPassword(String(email).trim(), sifre);
}

async function fbKayitEmail(email, sifre) {
  await firebase.auth().createUserWithEmailAndPassword(String(email).trim(), sifre);
}

async function fbGirisGoogle() {
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    var c = e && e.code ? e.code : "";
    if (c === "auth/popup-blocked" || c === "auth/operation-not-supported-in-this-environment") {
      await firebase.auth().signInWithRedirect(provider);
      return;
    }
    throw e;
  }
}

async function fbCikisBulut() {
  try {
    try {
      localStorage.removeItem("hk_last_cloud_uid");
    } catch (e0) {}
    if (typeof yerelCachedVeriyiSil === "function") await yerelCachedVeriyiSil();
  } catch (e) {}
  await firebase.auth().signOut();
}

async function fbVerileriYukle() {
  if (!_fbDb) return;
  try { await window._fbReady; } catch (e) {}
  if (!fbMevcutKullanici()) {
    console.warn("fbVerileriYukle: oturum yok; islemler yerel IndexedDB'de birakiliyor.");
    return;
  }
  try {
    await fbEskiKoktenTasimaDene();
    var islemRef = typeof fbUserRef === "function" ? fbUserRef("islemler") : null;
    if (!islemRef) {
      console.warn("fbVerileriYukle: fbUserRef yok veya oturum yok.");
      return;
    }
    const snap = await islemRef.once("value");
    const fbData = snap.val();
    await openDB();
    if (!fbData || Object.keys(fbData).length === 0) {
      const mevcut = await IslemlerDB.getAll();
      if (mevcut.length > 0) {
        const obj = {};
        mevcut.forEach(function(item) { obj[String(item.id)] = Object.assign({}, item); });
        await islemRef.set(obj);
      }
      return;
    }
    var entries = Object.entries(fbData);
    var gecerli = 0;
    for (var gi = 0; gi < entries.length; gi++) {
      if (entries[gi][1]) gecerli++;
    }
    if (gecerli === 0) {
      console.warn("fbVerileriYukle: islemler sunucuda bos veya gecersiz; IndexedDB korunuyor.");
      return;
    }
    await new Promise(function(resolve) {
      var req = indexedDB.open("hesap-kitap-db", 1);
      req.onsuccess = function(e) {
        var db = e.target.result;
        var t = db.transaction("islemler", "readwrite");
        t.objectStore("islemler").clear();
        t.oncomplete = resolve; t.onerror = resolve;
      };
      req.onerror = resolve;
    });
    var idb = await new Promise(function(resolve) {
      var req2 = indexedDB.open("hesap-kitap-db", 1);
      req2.onsuccess = function(e) { resolve(e.target.result); };
      req2.onerror = function() { resolve(null); };
    });
    if (!idb) return;
    for (var i = 0; i < entries.length; i++) {
      var item = entries[i][1];
      if (!item) continue;
      var numId = parseInt(entries[i][0]);
      var kayit = Object.assign({}, item, { id: isNaN(numId) ? undefined : numId });
      if (kayit.id === undefined) delete kayit.id;
      await new Promise(function(resolve) {
        try {
          var t2 = idb.transaction("islemler", "readwrite");
          var store = t2.objectStore("islemler");
          kayit.id !== undefined ? store.put(kayit) : store.add(kayit);
          t2.oncomplete = resolve; t2.onerror = resolve;
        } catch(ex) { resolve(); }
      });
    }
  } catch(e) { console.warn("fbVerileriYukle:", e); }
}

function fbIslemEkle(islem) {
  if (!islem || !islem.id) return;
  var r = typeof fbUserRef === "function" ? fbUserRef("islemler/" + String(islem.id)) : null;
  if (!r) return;
  r.set(Object.assign({}, islem)).catch(function(e){ console.warn("fbIslemEkle:", e); });
}
function fbIslemGuncelle(islem) {
  if (!islem || !islem.id) return;
  var r = typeof fbUserRef === "function" ? fbUserRef("islemler/" + String(islem.id)) : null;
  if (!r) return;
  r.set(Object.assign({}, islem)).catch(function(e){ console.warn("fbIslemGuncelle:", e); });
}
function fbIslemSil(id) {
  if (id === undefined || id === null) return;
  var r = typeof fbUserRef === "function" ? fbUserRef("islemler/" + String(id)) : null;
  if (!r) return;
  r.remove().catch(function(e){ console.warn("fbIslemSil:", e); });
}
function fbSyncKategoriler(kategoriler) {
  if (!kategoriler) return;
  var r = typeof fbUserRef === "function" ? fbUserRef("kategoriler") : null;
  if (!r) return;
  r.set(kategoriler).catch(function(e){ console.warn("fbSyncKategoriler:", e); });
}
