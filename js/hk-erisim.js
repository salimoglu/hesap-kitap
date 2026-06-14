/**
 * Hesap Kitap — modül erişim yapılandırması
 * Yönetici e-postası: tüm sekmeler. Diğer kullanıcılar: yalnızca MISAFIR_SEKMELER.
 */
var HK_ERISIM = (function () {
  /** Tam erişim — kendi e-postanızı buraya yazın (küçük/büyük harf fark etmez) */
  var YONETICI_EPOSTALAR = [
    "salimoglu@gmail.com"
  ];

  /** Diğer kullanıcılara açık modüller */
  var MISAFIR_SEKMELER = [
    "islemler",
    "birikim",
    "arabam",
    "kredi",
    "alacaklar"
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
    return String(em || "").trim().toLowerCase();
  }

  function yoneticiMi(user) {
    if (!user || user.isAnonymous) return false;
    var em = epostaNorm(user.email);
    if (!em) return false;
    for (var i = 0; i < YONETICI_EPOSTALAR.length; i++) {
      if (epostaNorm(YONETICI_EPOSTALAR[i]) === em) return true;
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
    return izinli;
  }

  return {
    yoneticiMi: yoneticiMi,
    izinliSekmeler: izinliSekmeler,
    modulErisilebilir: modulErisilebilir,
    sekmeleriUygula: sekmeleriUygula,
    tumSekmeler: TUM_SEKMELER
  };
})();
