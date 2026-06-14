/**
 * Hesap Kitap — modül erişim yapılandırması
 * Yönetici e-postası: tüm sekmeler. Diğer kullanıcılar: yalnızca MISAFIR_SEKMELER.
 */
var HK_ERISIM = (function () {
  /** Tam erişim — kendi e-postanızı buraya yazın (küçük/büyük harf fark etmez) */
  var YONETICI_EPOSTALAR = [
    "salimoglu61@gmail.com"
  ];

  /**
   * Yedek: Firebase Authentication → Users → User UID
   * E-posta tanınmazsa buraya yapıştırın (tek tırnak içinde).
   */
  var YONETICI_UIDS = [];

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

  function epostaListesindeMi(emails) {
    if (!emails || !emails.length) return false;
    for (var i = 0; i < YONETICI_EPOSTALAR.length; i++) {
      var hedef = epostaNorm(YONETICI_EPOSTALAR[i]);
      for (var j = 0; j < emails.length; j++) {
        if (emails[j] === hedef) return true;
      }
    }
    return false;
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
    if (typeof window !== "undefined" && window._hkAuthEmails && window._hkAuthEmails.length) {
      window._hkAuthEmails.forEach(function (e) {
        list.push(epostaNorm(e));
      });
    }
    var uniq = [];
    list.forEach(function (e) {
      if (e && uniq.indexOf(e) < 0) uniq.push(e);
    });
    return uniq;
  }

  function yoneticiUidMi(user) {
    if (!user || !user.uid) return false;
    for (var i = 0; i < YONETICI_UIDS.length; i++) {
      if (YONETICI_UIDS[i] === user.uid) return true;
    }
    try {
      if (localStorage.getItem("hk-yonetici-uid") === user.uid) return true;
    } catch (e) {}
    return false;
  }

  function yoneticiEpostaMi(user) {
    if (!user || user.isAnonymous) return false;
    return epostaListesindeMi(kullaniciEpostalari(user));
  }

  function yoneticiMi(user) {
    if (!user || user.isAnonymous) return false;
    if (typeof window !== "undefined" && window._hkRtdbRole === "owner") return true;
    if (yoneticiUidMi(user)) return true;
    if (yoneticiEpostaMi(user)) {
      try { localStorage.setItem("hk-yonetici-uid", user.uid); } catch (e) {}
      return true;
    }
    return false;
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
    user = user || (typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null);
    var izinli = izinliSekmeler(user);
    var yonetici = yoneticiMi(user);
    document.querySelectorAll(".tab-btn[data-tab]").forEach(function (btn) {
      var id = btn.dataset.tab;
      var ok = izinli.indexOf(id) >= 0;
      btn.classList.toggle("hidden", !ok);
      btn.style.display = ok ? "" : "none";
      btn.setAttribute("aria-hidden", ok ? "false" : "true");
    });
    var aktifBtn = document.querySelector(".tab-btn.active:not(.hidden)");
    var aktifId = aktifBtn && aktifBtn.dataset.tab;
    if (!aktifId || izinli.indexOf(aktifId) < 0) {
      var ilkId = izinli[0] || "islemler";
      document.querySelectorAll(".tab-btn").forEach(function (btn) {
        var show = izinli.indexOf(btn.dataset.tab) >= 0;
        btn.classList.toggle("active", show && btn.dataset.tab === ilkId);
      });
      document.querySelectorAll(".tab-panel").forEach(function (panel) {
        panel.classList.toggle("active", panel.id === "tab-" + ilkId);
      });
    }
    var syncEl = document.getElementById("sync-durum");
    if (syncEl) {
      syncEl.title = yonetici
        ? "Yonetici — " + izinli.length + " modul"
        : "Standart — " + izinli.length + " modul";
    }
    console.info(
      "[HK] Erisim:",
      yonetici ? "yonetici" : "misafir",
      "| modul:",
      izinli.length,
      "| eposta:",
      kullaniciEpostalari(user).join(", ") || "(yok)",
      "| uid:",
      user ? user.uid : "(yok)"
    );
    return izinli;
  }

  function misafirBilgiGoster(user) {
    var el = document.getElementById("hk-misafir-banner");
    if (!el) return;
    if (yoneticiMi(user)) {
      el.classList.add("hidden");
      return;
    }
    try {
      if (sessionStorage.getItem("hk-misafir-banner-kapali") === "1") {
        el.classList.add("hidden");
        return;
      }
    } catch (e) {}
    el.classList.remove("hidden");
  }

  return {
    yoneticiMi: yoneticiMi,
    yoneticiEpostaMi: yoneticiEpostaMi,
    yoneticiUidMi: yoneticiUidMi,
    epostaListesindeMi: epostaListesindeMi,
    kullaniciEpostalari: kullaniciEpostalari,
    izinliSekmeler: izinliSekmeler,
    modulErisilebilir: modulErisilebilir,
    sekmeleriUygula: sekmeleriUygula,
    misafirBilgiGoster: misafirBilgiGoster,
    tumSekmeler: TUM_SEKMELER
  };
})();
