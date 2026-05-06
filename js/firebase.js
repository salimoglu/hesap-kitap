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
  await firebase.auth().signOut();
}

function _kokDoluSay(v) {
  if (v == null) return false;
  if (typeof v !== "object") return true;
  var ks = Object.keys(v);
  if (!ks.length) return false;
  var g = 0;
  for (var i = 0; i < ks.length; i++) {
    if (v[ks[i]]) g++;
  }
  return g > 0;
}

function _islemlerAdet(v) {
  if (!v || typeof v !== "object") return 0;
  var ks = Object.keys(v),
    n = 0;
  for (var i = 0; i < ks.length; i++) {
    if (v[ks[i]]) n++;
  }
  return n;
}

/**
 * Kok dusuk veya bos, users/{uid} daha zengin ise koke tasir (Google / e-posta farkli UID).
 */
async function fbUsersAltindaVarsaKokeTasi() {
  var u = fbMevcutKullanici();
  if (!_fbDb || !u || u.isAnonymous) return;

  var pickUid = u.uid;
  var bestN = 0;
  try {
    var usSnap = await _fbDb.ref("users").once("value");
    var uv = usSnap.val();
    if (uv && typeof uv === "object") {
      for (var uid in uv) {
        var isl = uv[uid] && uv[uid].islemler;
        var n = _islemlerAdet(isl);
        if (n > bestN) {
          bestN = n;
          pickUid = uid;
        }
      }
    }
  } catch (e) {
    console.warn("[KokeTasi] users listesi", e);
  }

  var rootIslSnap = await _fbDb.ref("islemler").once("value");
  var rootN = _islemlerAdet(rootIslSnap.val());
  var pfx = "users/" + pickUid + "/";

  if (bestN > rootN && bestN > 0) {
    try {
      var islSrc = await _fbDb.ref(pfx + "islemler").once("value");
      var islVal = islSrc.val();
      if (islVal != null) await _fbDb.ref("islemler").set(islVal);
    } catch (e2) {
      console.warn("[KokeTasi] islemler", e2);
    }
  }

  var anahtarlar = [
    "kategoriler", "vefa2", "urunler", "alacaklar", "arabam", "muhtac",
    "kredi_harcamalar", "kredi_kartlar", "altin_kayitlar", "altin_guncel_fiyat",
    "altin_guncel_fiyat_tarih", "birikim_manuel"
  ];
  for (var i = 0; i < anahtarlar.length; i++) {
    var k = anahtarlar[i];
    try {
      var rs = await _fbDb.ref(k).once("value");
      if (_kokDoluSay(rs.val())) continue;
      var us = await _fbDb.ref(pfx + k).once("value");
      var val = us.val();
      if (val != null) await _fbDb.ref(k).set(val);
    } catch (e3) {
      console.warn("[KokeTasi] " + k, e3);
    }
  }
  for (var y = 2018; y <= 2035; y++) {
    for (var mo = 1; mo <= 12; mo++) {
      var bk = "butce_" + y + "_" + mo;
      try {
        var r0 = await _fbDb.ref(bk).once("value");
        if (_kokDoluSay(r0.val())) continue;
        var u0 = await _fbDb.ref(pfx + bk).once("value");
        var bv = u0.val();
        if (bv != null) await _fbDb.ref(bk).set(bv);
      } catch (e4) {}
    }
  }
  if (bestN > rootN && bestN > 0) {
    console.log("[KokeTasi] Islemler: kok " + rootN + " -> users/" + pickUid + " (" + bestN + ") ile guncellendi.");
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
    await fbUsersAltindaVarsaKokeTasi();
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
