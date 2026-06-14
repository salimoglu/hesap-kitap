/**
 * Hesap Kitap — modül erişim yapılandırması
 * Yönetici e-postası: tüm sekmeler. Diğer kullanıcılar: yalnızca MISAFIR_SEKMELER.
 */
var HK_ERISIM = (function () {
  /** Tam erişim — kendi e-postanızı buraya yazın (küçük/büyük harf fark etmez) */
  var YONETICI_EPOSTALAR = [
    "salimoglu@gmail.com"
  ];

  /** Diğer kullanıcılara açık modüller (kapalı: urun, verilen-altin, vefa, muhtac) */
  var MISAFIR_SEKMELER = [
    "islemler",
    "birikim",
    "arabam",
    "kredi",
    "alacaklar",
    "altin"
  ];

  /** Yöneticide görünen tüm sekmeler (sıra korunur) */
  var TUM_SEKMELER = [
    "islemler",
    "birikim",
    "arabam",
    "kredi",
    "alacaklar",
    "urun",
    "altin",
    "verilen-altin",
    "vefa",
    "muhtac"
  ];

  function epostaNorm(em) {
    var s = String(em || "").trim().toLowerCase();
    var at = s.indexOf("@");
    if (at <= 0) return s;
    var local = s.slice(0, at);
    var domain = s.slice(at + 1);
    if (domain === "googlemail.com") domain = "gmail.com";
    if (domain === "gmail.com") local = local.replace(/\./g, "");
    return local + "@" + domain;
  }

  function kullaniciEpostalari(user) {
    var list = [];
    if (!user) return list;
    if (user.email) list.push(epostaNorm(user.email));
    if (user.providerData && user.providerData.length) {
      user.providerData.forEach(function (p) {
        if (p && p.email) list.push(epostaNorm(p.email));
      });
    }
    var uniq = [];
    list.forEach(function (e) {
      if (e && uniq.indexOf(e) < 0) uniq.push(e);
    });
    return uniq;
  }

  function yoneticiEpostaMi(user) {
    if (!user || user.isAnonymous) return false;
    var emails = kullaniciEpostalari(user);
    if (!emails.length) return false;
    for (var i = 0; i < YONETICI_EPOSTALAR.length; i++) {
      var hedef = epostaNorm(YONETICI_EPOSTALAR[i]);
      for (var j = 0; j < emails.length; j++) {
        if (emails[j] === hedef) return true;
      }
    }
    return false;
  }

  function yoneticiMi(user) {
    if (!user || user.isAnonymous) return false;
    if (typeof window !== "undefined" && window._hkRtdbRole === "owner") return true;
    return yoneticiEpostaMi(user);
  }

  function izinliSekmeler(user) {
    if (yoneticiMi(user)) return TUM_SEKMELER.slice();
    return MISAFIR_SEKMELER.filter(function (id) {
      return TUM_SEKMELER.indexOf(id) >= 0;
    });
  }

  function modulErisilebilir(tabId, user) {
    return izinliSekmeler(user).indexOf(tabId) >= 0;
  }

  function sekmeleriUygula(user) {
    var izinli = izinliSekmeler(user);
    document.querySelectorAll(".tab-btn[data-tab]").forEach(function (btn) {
      var id = btn.dataset.tab;
      var ok = izinli.indexOf(id) >= 0;
      btn.classList.toggle("hidden", !ok);
      btn.setAttribute("aria-hidden", ok ? "false" : "true");
    });
    var aktifBtn = document.querySelector(".tab-btn.active");
    var aktifId = aktifBtn && aktifBtn.dataset.tab;
    if (!aktifId || izinli.indexOf(aktifId) < 0) {
      var ilkId = izinli[0] || "islemler";
      document.querySelectorAll(".tab-btn").forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.tab === ilkId);
      });
      document.querySelectorAll(".tab-panel").forEach(function (panel) {
        panel.classList.toggle("active", panel.id === "tab-" + ilkId);
      });
    }
    if (yoneticiMi(user)) {
      console.info("[HK] Yonetici erisimi aktif:", kullaniciEpostalari(user).join(", ") || user.uid);
    }
    return izinli;
  }

  return {
    yoneticiMi: yoneticiMi,
    yoneticiEpostaMi: yoneticiEpostaMi,
    kullaniciEpostalari: kullaniciEpostalari,
    izinliSekmeler: izinliSekmeler,
    modulErisilebilir: modulErisilebilir,
    sekmeleriUygula: sekmeleriUygula,
    tumSekmeler: TUM_SEKMELER
  };
})();
