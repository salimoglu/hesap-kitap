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
      try {
        var rmsg = typeof fbAuthHataMetni === "function" ? fbAuthHataMetni(e) : (e && e.message) || "";
        if (rmsg) sessionStorage.setItem("hk-auth-redirect-err", rmsg);
      } catch (x) {}
    }

    /* Kalici oturum tam oturana kadar bekle (ilk bos snapshot ile RTDB okunmasin). */
    if (firebase.auth && typeof firebase.auth().authStateReady === "function") {
      await firebase.auth().authStateReady();
    } else {
      await new Promise(function(resolve) {
        var t = setTimeout(resolve, 3000);
        firebase.auth().onAuthStateChanged(function() {
          clearTimeout(t);
          resolve();
        });
      });
    }
    window._fbAuthOk = !!firebase.auth().currentUser;
    window._fbReady = Promise.resolve(window._fbAuthOk);
    firebase.auth().onAuthStateChanged(function(user) {
      window._fbAuthOk = !!user;
    });
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
  if (c === "auth/unauthorized-domain")
    return "Bu site adresi Firebase'de yetkili degil. Firebase Console → Authentication → Settings (Ayarlar) → Authorized domains (Yetkili alan adlari) bolumune tam alan adinizi ekleyin (orn. salimoglu.github.io veya kendi domain'iniz). Kaydettikten sonra 1-2 dk bekleyip tekrar deneyin.";
  if (c === "auth/web-storage-unsupported") return "Tarayici depolama / cerezleri kapali veya kisitli. Site icin cerezlere izin verin veya baska tarayici deneyin.";
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
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  var isStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  var isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (isStandalone || isMobileUa) {
    await firebase.auth().signInWithRedirect(provider);
    return;
  }
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    var c = e && e.code ? e.code : "";
    if (
      c === "auth/popup-blocked" ||
      c === "auth/operation-not-supported-in-this-environment" ||
      c === "auth/cancelled-popup-request"
    ) {
      await firebase.auth().signInWithRedirect(provider);
      return;
    }
    throw e;
  }
}

async function fbCikisBulut() {
  await firebase.auth().signOut();
}

/** RTDB cagrisindan once: currentUser + _fbDb (yeniden baglanti). */
async function fbRtdbOturumHazir() {
  if (typeof firebase === "undefined" || !firebase.auth) return;
  var tries = 0;
  while (tries < 60) {
    if (firebase.auth().currentUser) break;
    tries++;
    await new Promise(function(r) { setTimeout(r, 50); });
  }
  if (!_fbDb && firebase.apps && firebase.apps.length) {
    _fbDb = firebase.database();
    window._fbDb = _fbDb;
  }
}

async function fbVerileriYukle() {
  if (!_fbDb) return;
  try { await window._fbReady; } catch (e) {}
  if (!fbMevcutKullanici()) {
    console.warn("fbVerileriYukle: oturum yok; islemler yerel IndexedDB'de birakiliyor.");
    return;
  }
  try {
    const snap = await _fbDb.ref("islemler").once("value");
    const fbData = snap.val();
    await openDB();
    if (!fbData || Object.keys(fbData).length === 0) {
      const mevcut = await IslemlerDB.getAll();
      if (mevcut.length > 0) {
        const obj = {};
        mevcut.forEach(function(item) { obj[String(item.id)] = Object.assign({}, item); });
        await _fbDb.ref("islemler").set(obj);
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
      var req = indexedDB.open("hesap-kitap-db");
      req.onsuccess = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains("islemler")) {
          db.close();
          resolve();
          return;
        }
        var t = db.transaction("islemler", "readwrite");
        t.objectStore("islemler").clear();
        t.oncomplete = resolve; t.onerror = resolve;
      };
      req.onerror = resolve;
    });
    var idb = await new Promise(function(resolve) {
      var req2 = indexedDB.open("hesap-kitap-db");
      req2.onsuccess = function(e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains("islemler")) {
          d.close();
          resolve(null);
          return;
        }
        resolve(d);
      };
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
  if (!_fbDb || !islem || !islem.id) return;
  _fbDb.ref("islemler/" + String(islem.id)).set(Object.assign({}, islem)).catch(function(e){ console.warn("fbIslemEkle:", e); });
}
function fbIslemGuncelle(islem) {
  if (!_fbDb || !islem || !islem.id) return;
  _fbDb.ref("islemler/" + String(islem.id)).set(Object.assign({}, islem)).catch(function(e){ console.warn("fbIslemGuncelle:", e); });
}
function fbIslemSil(id) {
  if (!_fbDb || id === undefined || id === null) return;
  _fbDb.ref("islemler/" + String(id)).remove().catch(function(e){ console.warn("fbIslemSil:", e); });
}
function fbSyncKategoriler(kategoriler) {
  if (!_fbDb || !kategoriler) return;
  _fbDb.ref("kategoriler").set(kategoriler).catch(function(e){ console.warn("fbSyncKategoriler:", e); });
}
