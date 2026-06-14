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

function fbMobilMi() {
  var ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  if (/Android/i.test(ua)) return true;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  if (
    typeof navigator !== "undefined" &&
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  )
    return true;
  if (/webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  return false;
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
    if (fbMobilMi()) {
      await fbTumSwKaldir();
    } else if (fbOAuthDonusUrlMu() || yakindaGoogleYon) {
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
 * RTDB yolu: oturum acik kullanici icin users/{uid}/ altinda.
 */
function fbRtdbRef(path) {
  if (!_fbDb) return null;
  var p = String(path || "").replace(/^\/+/, "");
  var u = fbMevcutKullanici();
  if (u && !u.isAnonymous) return _fbDb.ref("users/" + u.uid + "/" + p);
  return _fbDb.ref(p);
}

/** Kok yolu (tasima icin). */
function fbKokRef(path) {
  if (!_fbDb) return null;
  return _fbDb.ref(String(path || "").replace(/^\/+/, ""));
}

var HK_KOK_MODUL_KEYS = [
  "islemler", "kategoriler", "arabam", "alacaklar", "kredi_harcamalar", "kredi_kartlar",
  "urunler", "urun", "altin_kayitlar", "altin_guncel_fiyat", "altin_guncel_fiyat_tarih",
  "vefa2", "vefa", "muhtac", "verilen_altinlar", "birikim_manuel", "butce_sablon"
];

/**
 * users/{uid}/ oku; bos ise yonetici icin kokten kopyala (lazy migrate).
 * Modul yuklemelerinde fbRtdbRef().once yerine bunu kullanin.
 */
async function fbRtdbOku(path) {
  if (!_fbDb) return null;
  var p = String(path || "").replace(/^\/+/, "");
  var u = fbMevcutKullanici();
  if (!u || u.isAnonymous) {
    try {
      var s0 = await fbKokRef(p).once("value");
      return s0.val();
    } catch (e0) {
      return null;
    }
  }
  var userRef = _fbDb.ref("users/" + u.uid + "/" + p);
  try {
    var userSnap = await userRef.once("value");
    if (fbVeriGecerli(p, userSnap.val())) return userSnap.val();
  } catch (eU) {
    console.warn("[HK] fbRtdbOku user:", p, eU.code || eU.message);
  }

  var owner = await fbYoneticiMi(u);
  var storedUid = null;
  try { storedUid = localStorage.getItem("hk-yonetici-uid"); } catch (eSt) {}
  if (!owner && !(storedUid && storedUid === u.uid)) return null;

  try {
    var rootSnap = await fbKokRef(p).once("value");
    var rv = rootSnap.val();
    if (!fbVeriGecerli(p, rv)) return null;
    await userRef.set(rv);
    console.info("[HK] Kokten users/" + u.uid + "/" + p + " kopyalandi.");
    window._hkVeriTasindi = true;
    return rv;
  } catch (eR) {
    if (eR && eR.code === "PERMISSION_DENIED") {
      window._hkKokOkumaKapali = true;
      console.error(
        "[HK] Kok okunamadi (" + p + "). Firebase kurallarini guncelleyin: .\\tools\\deploy-database-rules.ps1"
      );
    } else {
      console.warn("[HK] fbRtdbOku root:", p, eR.code || eR.message);
    }
    return null;
  }
}

async function fbKokAnahtarTasi(uid, key) {
  if (!_fbDb || !uid || !key) return { ok: false };
  var userRef = _fbDb.ref("users/" + uid + "/" + key);
  try {
    var userSnap = await userRef.once("value");
    if (fbVeriGecerli(key, userSnap.val())) return { ok: true, skipped: true, key: key };
  } catch (eU) {
    return { ok: false, key: key, error: eU };
  }
  try {
    var rootSnap = await fbKokRef(key).once("value");
    var rv = rootSnap.val();
    if (!fbVeriGecerli(key, rv)) return { ok: true, skipped: true, key: key, reason: "root-empty" };
    await userRef.set(rv);
    return { ok: true, migrated: true, key: key };
  } catch (eR) {
    if (eR && eR.code === "PERMISSION_DENIED") window._hkKokOkumaKapali = true;
    return { ok: false, key: key, error: eR };
  }
}

async function fbKokModulleriTasi(uid) {
  if (!_fbDb || !uid) return { ok: false, migrated: 0 };
  var cleanKey = "hk-root-cleaned-" + uid;
  try {
    if (localStorage.getItem(cleanKey) === "1") return { ok: true, skipped: true, migrated: 0, reason: "already-clean" };
  } catch (eSkip) {}

  var keys = HK_KOK_MODUL_KEYS.slice();
  try {
    var rootSnap = await _fbDb.ref("/").once("value");
    var root = rootSnap.val() || {};
    if (!fbRootAnahtarlari(root).length) {
      try { localStorage.setItem(cleanKey, "1"); } catch (eClean) {}
      return { ok: true, skipped: true, migrated: 0, reason: "root-empty" };
    }
    Object.keys(root).forEach(function (k) {
      if (k === "users") return;
      if (k.indexOf("butce_") === 0 && keys.indexOf(k) < 0) keys.push(k);
    });
  } catch (eRoot) {
    console.warn("[HK] Kok tam liste okunamadi, bilinen anahtarlar deneniyor:", eRoot.code || eRoot.message);
    if (eRoot && eRoot.code === "PERMISSION_DENIED") window._hkKokOkumaKapali = true;
  }

  var migrated = 0;
  var failed = [];
  for (var i = 0; i < keys.length; i++) {
    var r = await fbKokAnahtarTasi(uid, keys[i]);
    if (r && r.migrated) migrated++;
    if (r && r.error) failed.push(keys[i]);
  }

  if (migrated > 0) {
    window._hkVeriTasindi = true;
    console.info("[HK] Modul verisi tasindi:", migrated, "anahtar");
  }
  if (failed.length) {
    console.warn("[HK] Tasinamayan anahtarlar:", failed.join(", "));
  } else if (migrated === 0) {
    try { localStorage.setItem(cleanKey, "1"); } catch (eDone) {}
  }
  return { ok: failed.length === 0, migrated: migrated, failed: failed };
}

/** Kok veritabanindan users/{uid}/ altina tek seferlik tasima (yalnizca yonetici). */
function fbVeriDolu(val) {
  if (val == null) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return true;
}

/** Tasima/okuma icin anlamli veri var mi (bos placeholder veya sablon degil). */
function fbVeriGecerli(key, val) {
  if (val == null) return false;
  var k = String(key || "");
  if (k === "islemler") {
    if (typeof val !== "object") return false;
    var ikeys = Object.keys(val);
    for (var i = 0; i < ikeys.length; i++) {
      var row = val[ikeys[i]];
      if (row && typeof row === "object" && (row.tarih || row.tutar != null || row.tip)) return true;
    }
    return false;
  }
  if (k === "kategoriler") {
    if (typeof val !== "object") return false;
    var cnt = 0;
    var varsayilanCnt = 0;
    if (Array.isArray(val)) {
      cnt = val.length;
      val.forEach(function (kat) {
        if (kat && kat.varsayilan) varsayilanCnt++;
      });
    } else {
      var kkeys = Object.keys(val);
      cnt = kkeys.length;
      kkeys.forEach(function (kk) {
        if (val[kk] && val[kk].varsayilan) varsayilanCnt++;
      });
    }
    if (cnt === 0) return false;
    if (varsayilanCnt === cnt && cnt <= 55) return false;
    return true;
  }
  if (k === "muhtac") {
    var vals = Array.isArray(val) ? val : Object.values(val);
    for (var j = 0; j < vals.length; j++) {
      if (vals[j] && typeof vals[j] === "object" && (vals[j].ad || vals[j].id)) return true;
    }
    return false;
  }
  if (k === "birikim_manuel") {
    if (typeof val !== "object") return false;
    var mkeys = Object.keys(val);
    for (var m = 0; m < mkeys.length; m++) {
      var lst = val[mkeys[m]];
      if (Array.isArray(lst) && lst.length > 0) return true;
    }
    return false;
  }
  return fbVeriDolu(val);
}

function fbRootAnahtarlari(root) {
  var keys = Object.keys(root || {}).filter(function (k) { return k !== "users"; });
  return keys.filter(function (k) { return fbVeriGecerli(k, root[k]); });
}

async function fbRootTemizle(uid, root) {
  if (!_fbDb || !uid) return { ok: false };
  var cleanKey = "hk-root-cleaned-" + uid;
  try {
    if (localStorage.getItem(cleanKey) === "1") return { ok: true, skipped: true };
  } catch (e) {}

  var rootObj = root;
  if (!rootObj) {
    try {
      var rootSnap = await _fbDb.ref("/").once("value");
      rootObj = rootSnap.val() || {};
    } catch (e1) {
      console.warn("[HK] Kok okunamadi (kurallar: kok okuma auth != null olmali):", e1);
      return { ok: false, error: e1 };
    }
  }

  var keys = fbRootAnahtarlari(rootObj);
  if (!keys.length) {
    try { localStorage.setItem(cleanKey, "1"); } catch (e2) {}
    return { ok: true, skipped: true, reason: "root-empty" };
  }

  try {
    await Promise.all(keys.map(function (k) { return _fbDb.ref(k).remove(); }));
    try { localStorage.setItem(cleanKey, "1"); } catch (e3) {}
    console.info("[HK] Kok eski veriler temizlendi (" + keys.length + " anahtar).");
    return { ok: true, cleaned: keys.length };
  } catch (e4) {
    console.warn("[HK] Kok temizligi basarisiz. Firebase Console → Data → kok klasorlerini silin.", e4);
    return { ok: false, error: e4 };
  }
}

async function fbMigrateRootToUser(uid) {
  if (!_fbDb || !uid) return { ok: false, migrated: 0 };
  var cleanKey = "hk-root-cleaned-" + uid;
  try {
    if (localStorage.getItem(cleanKey) === "1") return { ok: true, skipped: true, reason: "already-clean", migrated: 0 };
  } catch (eSkip) {}

  var userSnap;
  try {
    userSnap = await _fbDb.ref("users/" + uid).once("value");
  } catch (e3) {
    console.warn("fbMigrateRootToUser user check:", e3);
    return { ok: false, error: e3, migrated: 0 };
  }

  var uv = userSnap.val() || {};

  var rootSnap;
  try {
    rootSnap = await _fbDb.ref("/").once("value");
  } catch (e4) {
    console.warn(
      "fbMigrateRootToUser root read:",
      e4,
      "— database.rules.json icinde kok okuma (auth != null) yayinlandi mi?"
    );
    return { ok: false, error: e4, migrated: 0 };
  }

  var root = rootSnap.val() || {};
  var rootKeys = fbRootAnahtarlari(root);
  if (!rootKeys.length) {
    await fbRootTemizle(uid, root);
    return { ok: true, skipped: true, reason: "root-empty", migrated: 0 };
  }

  var updates = {};
  var count = 0;
  var migratedNames = [];
  rootKeys.forEach(function (k) {
    if (fbVeriGecerli(k, uv[k])) return;
    updates["users/" + uid + "/" + k] = root[k];
    count++;
    migratedNames.push(k);
  });

  if (count === 0) {
    var eksik = rootKeys.filter(function (k) { return !fbVeriGecerli(k, uv[k]); });
    if (eksik.length) {
      console.warn("[HK] Kok veri var ama users/" + uid + "/ altina yazilamadi:", eksik);
      return { ok: false, reason: "root-not-migrated", keys: eksik, migrated: 0 };
    }
    await fbRootTemizle(uid, root);
    return { ok: true, skipped: true, reason: "already-migrated", migrated: 0 };
  }

  try {
    try { localStorage.removeItem("hk-root-cleaned-" + uid); } catch (eRm) {}
    await _fbDb.ref().update(updates);
    console.info(
      "[HK] Kok veriler users/" + uid + "/ altina tasindi (" + count + " anahtar):",
      migratedNames.join(", ")
    );
    await fbRootTemizle(uid, root);
    window._hkVeriTasindi = true;
    return { ok: true, migrated: count, keys: migratedNames };
  } catch (e7) {
    console.error("fbMigrateRootToUser write:", e7);
    return { ok: false, error: e7, migrated: 0 };
  }
}

/** Oturum acildiktan sonra kullanici kapsamini hazirla; yonetici icin tasima dene. */
async function fbAuthEpostalariTopla(user) {
  window._hkAuthEmails = [];
  if (!user) return [];
  var list = typeof HK_ERISIM !== "undefined" && HK_ERISIM.kullaniciEpostalari
    ? HK_ERISIM.kullaniciEpostalari(user)
    : (user.email ? [user.email] : []);
  try {
    var tr = await user.getIdTokenResult(true);
    if (tr.claims && tr.claims.email) list.push(tr.claims.email);
  } catch (e) {}
  var uniq = [];
  list.forEach(function (em) {
    var n = String(em || "").trim().toLowerCase();
    if (n && uniq.indexOf(n) < 0) uniq.push(n);
  });
  window._hkAuthEmails = uniq;
  return uniq;
}

async function fbYoneticiMi(user) {
  if (!user || user.isAnonymous) return false;
  if (typeof window !== "undefined" && window._hkRtdbRole === "owner") return true;
  if (typeof HK_ERISIM !== "undefined") {
    if (HK_ERISIM.yoneticiUidMi(user)) return true;
    if (HK_ERISIM.yoneticiEpostaMi(user)) return true;
    var emails = await fbAuthEpostalariTopla(user);
    if (HK_ERISIM.epostaListesindeMi && HK_ERISIM.epostaListesindeMi(emails)) return true;
  }
  return false;
}

/** Oturum basina bir kez tasima dene; tamamlaninca tekrar tarama yapma. */
function fbKullaniciScopeHazirMi(uid) {
  if (!uid) return false;
  try { return localStorage.getItem("hk-root-cleaned-" + uid) === "1"; } catch (e) { return false; }
}

async function fbEnsureUserDataScope() {
  if (!_fbDb) return;
  var u = fbMevcutKullanici();
  if (!u || u.isAnonymous) return;
  try { localStorage.setItem("hk-rtdb-use-user-prefix", "1"); } catch (e) {}

  try {
    var roleSnap = await _fbDb.ref("users/" + u.uid + "/meta/hkRole").once("value");
    if (roleSnap.val() === "owner") window._hkRtdbRole = "owner";
  } catch (eR) {
    console.warn("fbEnsureUserDataScope role read:", eR);
  }

  var yonetici = await fbYoneticiMi(u);
  var storedUid = null;
  try { storedUid = localStorage.getItem("hk-yonetici-uid"); } catch (eSt) {}
  var ownerByUid = storedUid && storedUid === u.uid;
  if (yonetici || ownerByUid) {
    if (yonetici) {
      try {
        await _fbDb.ref("users/" + u.uid + "/meta/hkRole").set("owner");
        window._hkRtdbRole = "owner";
        try { localStorage.setItem("hk-yonetici-uid", u.uid); } catch (eLs) {}
      } catch (eW) {
        console.warn("fbEnsureUserDataScope role write:", eW);
      }
    }
    if (!fbKullaniciScopeHazirMi(u.uid)) {
      var mig1 = await fbKokModulleriTasi(u.uid);
      var mig2 = await fbMigrateRootToUser(u.uid);
      if ((mig1 && mig1.migrated > 0) || (mig2 && mig2.migrated > 0)) window._hkVeriTasindi = true;
    }
    if (window._hkKokOkumaKapali) {
      console.error(
        "[HK] Eski veriler kokte duruyor ama uygulama okuyamiyor. PowerShell: .\\tools\\deploy-database-rules.ps1"
      );
    }
  }
}

/** @deprecated fbEnsureUserDataScope kullanin */
async function fbDetectRtdbScope() {
  return fbEnsureUserDataScope();
}

/** RTDB isteklerinden once cagirin; gereksiz token yenilemesi yapma. */
async function fbKimlikTokenAl(force) {
  try {
    var u = firebase.auth().currentUser;
    if (u) await u.getIdToken(!!force);
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

  try {
    await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  } catch (pe) {
    console.warn("setPersistence (google):", pe);
  }

  /**
   * Telefonda redirectUser=hayir: yonlendirme depo baglamini yitiriyor. Masaustunde calisan
   * popup akisini mobilde de kullan; yalnizca popup acilmazsa redirect'e dus.
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

function fbSyncKategoriler(kategoriler) {
  if (!Array.isArray(kategoriler)) return Promise.resolve();
  var r = fbRtdbRef("kategoriler");
  if (!r) return Promise.resolve();
  var obj = {};
  for (var i = 0; i < kategoriler.length; i++) {
    var k = kategoriler[i];
    if (!k || k.id === undefined || k.id === null) continue;
    var idNum = typeof k.id === "string" ? parseInt(k.id, 10) : Number(k.id);
    if (isNaN(idNum)) continue;
    obj[String(idNum)] = Object.assign({}, k, { id: idNum });
  }
  if (Object.keys(obj).length === 0) return Promise.resolve();
  return r.set(obj).catch(function(e) { console.warn("fbSyncKategoriler:", e); });
}

/** RTDB'deki kategoriler nesnesini / eski dizi formatini dizi kayitlarina cevirir */
function fbKategorilerRemoteToArray(val) {
  if (!val) return [];
  var out = [];
  if (Array.isArray(val)) {
    for (var i = 0; i < val.length; i++) {
      var k = val[i];
      if (!k || typeof k !== "object") continue;
      var copy = Object.assign({}, k);
      if (copy.id == null) copy.id = i;
      if (typeof copy.id === "string") copy.id = parseInt(copy.id, 10);
      if (!isNaN(copy.id)) out.push(copy);
    }
    return out;
  }
  var keys = Object.keys(val);
  for (var j = 0; j < keys.length; j++) {
    var key = keys[j];
    var row = val[key];
    if (!row || typeof row !== "object") continue;
    var copy = Object.assign({}, row);
    if (copy.id == null) {
      var nk = parseInt(key, 10);
      if (!isNaN(nk)) copy.id = nk;
    }
    if (typeof copy.id === "string") copy.id = parseInt(copy.id, 10);
    if (copy.id != null && !isNaN(copy.id)) out.push(copy);
  }
  return out;
}

async function fbKategorileriYukle() {
  if (!_fbDb) return;
  try {
    await window._fbReady;
  } catch (e) {}
  if (!fbMevcutKullanici()) return;
  if (typeof KategorilerDB === "undefined" || typeof openDB === "undefined") return;
  try {
    var val = await fbRtdbOku("kategoriler");
    await openDB();
    var yerel = await KategorilerDB.getAll();
    var uzak = fbKategorilerRemoteToArray(val);
    if (uzak.length === 0 || !fbVeriGecerli("kategoriler", val)) {
      if (yerel.length > 0) {
        fbSyncKategoriler(yerel);
      }
      return;
    }
    await KategorilerDB.mergeUpsertFromRemote(uzak);
    if (typeof KategorilerDB.dedupeNormalizeAll === "function" && !window._hkDedupeDone) {
      await KategorilerDB.dedupeNormalizeAll();
      window._hkDedupeDone = true;
    }
  } catch (e) {
    console.warn("fbKategorileriYukle:", e);
  }
}

async function fbIslemleriBuludanOku() {
  if (!_fbDb || !fbMevcutKullanici()) return null;
  var u = fbMevcutKullanici();
  if (fbKullaniciScopeHazirMi(u.uid)) {
    try {
      var ref = fbRtdbRef("islemler");
      if (!ref) return null;
      var snap = await ref.once("value");
      return snap.val();
    } catch (eDirect) {
      console.warn("fbIslemleriBuludanOku:", eDirect);
    }
  }
  return fbRtdbOku("islemler");
}

async function fbVerileriYukle() {
  if (!_fbDb) return;
  try { await window._fbReady; } catch (e) {}
  if (!fbMevcutKullanici()) {
    console.warn("fbVerileriYukle: oturum yok; islemler yerel IndexedDB'de birakiliyor.");
    return;
  }
  try {
    var fbData = await fbIslemleriBuludanOku();
    await openDB();
    if (!fbData || !fbVeriGecerli("islemler", fbData)) {
      const mevcut = await IslemlerDB.getAll();
      if (mevcut.length > 0) {
        const obj = {};
        mevcut.forEach(function(item) { obj[String(item.id)] = Object.assign({}, item); });
        var refIs = fbRtdbRef("islemler");
        if (refIs) await refIs.set(obj);
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
    try { window.dispatchEvent(new CustomEvent("hk-islemler-degisti")); } catch (eEv) {}
  } catch(e) { console.warn("fbVerileriYukle:", e); }
  finally {
    try { await fbKategorileriYukle(); } catch (e2) { console.warn("fbKategorileriYukle:", e2); }
  }
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
