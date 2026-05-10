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

function fbAndroidMi() {
  return /Android/i.test(typeof navigator !== "undefined" ? navigator.userAgent || "" : "");
}

/** Google/Firebase OAuth geri donusinda URL'de gorunen parametreler (SDK islemeden once bakilir). */
function fbOAuthDonusUrlMu() {
  try {
    var s = window.location.search || "";
    var h = window.location.hash || "";
    if (s.indexOf("apiKey=") !== -1) return true;
    if (s.indexOf("authType=") !== -1 || s.indexOf("signInViaRedirect") !== -1) return true;
    if (h.indexOf("__/auth/") !== -1) return true;
    if (/access_token=|id_token=|oauth/.test(h)) return true;
    return false;
  } catch (e) {
    return false;
  }
}

async function fbTumSwKaldir() {
  if (typeof navigator === "undefined" || !navigator.serviceWorker || !navigator.serviceWorker.getRegistrations) return;
  try {
    var regs = await navigator.serviceWorker.getRegistrations();
    for (var ri = 0; ri < regs.length; ri++) await regs[ri].unregister();
  } catch (e) {
    console.warn("fbTumSwKaldir:", e);
  }
}

async function fbInit() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(_fbConfig);
    _fbDb = firebase.database();
    window._fbDb = _fbDb;

    /**
     * OAuth donus sayfasinda Service Worker bazen yanitlari/depoyu bozar; getRedirectResult ONCESI kaldir.
     * Giris baslatmadan SW silmek de bazi cihazlarda bekleyen yonlendirmeyi kaybettirdi — o adim kaldirildi.
     */
    var yakindaGoogleYon = false;
    try {
      var rp0 = sessionStorage.getItem("hk-google-redirect-pending");
      if (rp0) {
        var tp0 = parseInt(rp0, 10);
        yakindaGoogleYon = !isNaN(tp0) && Date.now() - tp0 < 20 * 60 * 1000;
      }
    } catch (e0) {}
    if (fbOAuthDonusUrlMu() || (fbAndroidMi() && yakindaGoogleYon)) {
      await fbTumSwKaldir();
    }

    /**
     * OAuth redirect: once getRedirectResult tamamlanmali; bazi Android/PWA kurulumlarinda
     * setPersistence bundan once cagrildiginda yonlendirme sonucu islenmeyebiliyor.
     */
    var redirectResult = null;
    try {
      redirectResult = await firebase.auth().getRedirectResult();
    } catch (e) {
      console.warn("getRedirectResult:", e);
      try {
        var rmsg0 = typeof fbAuthHataMetni === "function" ? fbAuthHataMetni(e) : (e && e.message) || "";
        if (rmsg0) sessionStorage.setItem("hk-auth-redirect-err", rmsg0);
      } catch (x) {}
    }

    try {
      if (redirectResult && redirectResult.credential && !firebase.auth().currentUser) {
        await firebase.auth().signInWithCredential(redirectResult.credential);
      }
    } catch (ce) {
      console.warn("signInWithCredential (redirect):", ce);
      try {
        var rmsg1 = typeof fbAuthHataMetni === "function" ? fbAuthHataMetni(ce) : (ce && ce.message) || "";
        if (rmsg1) sessionStorage.setItem("hk-auth-redirect-err", rmsg1);
      } catch (x) {}
    }

    try {
      await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (pe) {
      console.warn("Auth persistence:", pe);
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
    /* Google redirect dondu ama oturum yok: genelde Authorized domains veya depolama. */
    try {
      if (firebase.auth().currentUser) {
        sessionStorage.removeItem("hk-google-redirect-pending");
      } else {
        var rawP = sessionStorage.getItem("hk-google-redirect-pending");
        sessionStorage.removeItem("hk-google-redirect-pending");
        if (rawP) {
          var tsP = parseInt(rawP, 10);
          var taze = !isNaN(tsP) && Date.now() - tsP < 15 * 60 * 1000;
          if (taze) {
            var tek = "";
            try {
              if (redirectResult) {
                tek =
                  " [Teşhis: redirectUser=" +
                  (redirectResult.user ? "evet" : "hayir") +
                  ", credential=" +
                  (redirectResult.credential ? "evet" : "hayir") +
                  "]";
              } else {
                tek = " [Teşhis: redirectResult bos]";
              }
            } catch (td) {
              tek = "";
            }
            var onceki = "";
            try {
              onceki = sessionStorage.getItem("hk-auth-redirect-err") || "";
            } catch (e1) {}
            var ana =
              "Google dondu ama oturum acilmadi." +
              tek +
                " Ayni adresi kullanin: https://salimoglu.github.io/hesap-kitap/ (sonda / onemli). 1) Firebase → Authentication → Authorized domains: salimoglu.github.io 2) Google Cloud → OAuth Web client → Authorized JavaScript origins: https://salimoglu.github.io , https://hesap-kitap-234d1.firebaseapp.com 3) Redirect URIs: https://hesap-kitap-234d1.firebaseapp.com/__/auth/handler 4) API key kisitlamasi: None veya https://salimoglu.github.io/*";
            try {
              sessionStorage.setItem(
                "hk-auth-redirect-err",
                onceki ? onceki + " " + ana : ana
              );
            } catch (e2) {}
          }
        }
      }
    } catch (pendEx) {}
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

/**
 * RTDB yolu: kok (varsayilan) veya users/{uid}/ altinda (eski tasima / katı kurallar).
 * fbDetectRtdbScope() oturum acildiktan sonra calisir.
 */
function fbRtdbRef(path) {
  if (!_fbDb) return null;
  var p = String(path || "").replace(/^\/+/, "");
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("hk-rtdb-use-user-prefix") === "1") {
      var u = fbMevcutKullanici();
      if (u && !u.isAnonymous) return _fbDb.ref("users/" + u.uid + "/" + p);
    }
  } catch (e) {}
  return _fbDb.ref(p);
}

async function fbDetectRtdbScope() {
  if (!_fbDb || typeof firebase === "undefined" || !firebase.auth) return;
  var u = fbMevcutKullanici();
  if (!u || u.isAnonymous) {
    try { localStorage.removeItem("hk-rtdb-use-user-prefix"); } catch (e) {}
    return;
  }
  var uid = u.uid;
  function nonempty(val) {
    if (val == null) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.keys(val).length > 0;
    return true;
  }
  async function snap(path) {
    try {
      var s = await _fbDb.ref(path).once("value");
      return { ok: true, val: s.val() };
    } catch (e) {
      return { ok: false };
    }
  }
  var keys = ["urunler", "vefa2", "vefa", "kredi_harcamalar", "kredi_kartlar", "birikim_manuel", "arabam", "alacaklar", "islemler", "kategoriler", "muhtac", "altin_kayitlar"];
  var rootResults = await Promise.all(keys.map(function(k) { return snap(k); }));
  var hasRoot = rootResults.some(function(r) { return r.ok && nonempty(r.val); });
  var userResults = await Promise.all(keys.map(function(k) { return snap("users/" + uid + "/" + k); }));
  var hasUser = userResults.some(function(r) { return r.ok && nonempty(r.val); });
  try {
    if (hasUser && !hasRoot) localStorage.setItem("hk-rtdb-use-user-prefix", "1");
    else localStorage.removeItem("hk-rtdb-use-user-prefix");
  } catch (e) {}
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

  var uaG = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  var isAnd = /Android/i.test(uaG);
  try {
    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  } catch (pe) {
    console.warn("setPersistence (google):", pe);
  }

  /**
   * Android: popup pek cogu cihazda tam ekran / Custom Tab ile kopuk biter; dogrudan redirect kullan.
   * SW'yi burada silmeyin; OAuth donusunde fbInit kaldirilir.
   */
  if (isAnd) {
    try {
      sessionStorage.setItem("hk-google-redirect-pending", String(Date.now()));
    } catch (y) {}
    await firebase.auth().signInWithRedirect(provider);
    return;
  }

  /**
   * Masaustu / iOS: once popup; olmazsa redirect.
   */
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    var c = e && e.code ? e.code : "";
    if (
      c === "auth/popup-blocked" ||
      c === "auth/operation-not-supported-in-this-environment" ||
      c === "auth/cancelled-popup-request"
    ) {
      try {
        sessionStorage.setItem("hk-google-redirect-pending", String(Date.now()));
      } catch (y2) {}
      await firebase.auth().signInWithRedirect(provider);
      return;
    }
    throw e;
  }
}

async function fbCikisBulut() {
  try { localStorage.removeItem("hk-rtdb-use-user-prefix"); } catch (e) {}
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
    var refIs = fbRtdbRef("islemler");
    if (!refIs) return;
    const snap = await refIs.once("value");
    const fbData = snap.val();
    await openDB();
    if (!fbData || Object.keys(fbData).length === 0) {
      const mevcut = await IslemlerDB.getAll();
      if (mevcut.length > 0) {
        const obj = {};
        mevcut.forEach(function(item) { obj[String(item.id)] = Object.assign({}, item); });
        await refIs.set(obj);
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
        try {
          var t = db.transaction("islemler", "readwrite");
          var store = t.objectStore("islemler");
          store.clear();
          for (var i = 0; i < entries.length; i++) {
            var item = entries[i][1];
            if (!item) continue;
            var numId = parseInt(entries[i][0]);
            var kayit = Object.assign({}, item, { id: isNaN(numId) ? undefined : numId });
            if (kayit.id === undefined) delete kayit.id;
            try {
              if (kayit.id !== undefined) store.put(kayit);
              else store.add(kayit);
            } catch (ex) {}
          }
          t.oncomplete = resolve;
          t.onerror = function() { resolve(); };
        } catch (ex) {
          resolve();
        }
      };
      req.onerror = resolve;
    });
  } catch(e) { console.warn("fbVerileriYukle:", e); }
}

function fbIslemEkle(islem) {
  if (!islem || !islem.id) return;
  var r = fbRtdbRef("islemler/" + String(islem.id));
  if (!r) return;
  r.set(Object.assign({}, islem)).catch(function(e){ console.warn("fbIslemEkle:", e); });
}
function fbIslemGuncelle(islem) {
  if (!islem || !islem.id) return;
  var r = fbRtdbRef("islemler/" + String(islem.id));
  if (!r) return;
  r.set(Object.assign({}, islem)).catch(function(e){ console.warn("fbIslemGuncelle:", e); });
}
function fbIslemSil(id) {
  if (id === undefined || id === null) return;
  var r = fbRtdbRef("islemler/" + String(id));
  if (!r) return;
  r.remove().catch(function(e){ console.warn("fbIslemSil:", e); });
}
function fbSyncKategoriler(kategoriler) {
  if (!kategoriler) return;
  var r = fbRtdbRef("kategoriler");
  if (!r) return;
  r.set(kategoriler).catch(function(e){ console.warn("fbSyncKategoriler:", e); });
}
