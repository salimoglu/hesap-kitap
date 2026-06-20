/**
 * Hesap Kitap — modul modul tanitim / karsilama (orta seviye)
 */
var HK_TANITIM = (function () {
  var SURUM = "v1";

  var GIRIS = {
    tip: "giris",
    ikon: "📒",
    baslik: "Hesap Kitap'a Ho\u015f Geldiniz",
    ozet:
      "Ki\u015fisel finansinizi tek yerden y\u00f6netin. Gelir-gider kayd\u0131, b\u00fct\u00e7e plan\u0131 ve birikim takibi i\u00e7in haz\u0131r kategorilerle ba\u015flayabilirsiniz.",
    ipuclari: [
      "Verileriniz bulutta yaln\u0131zca sizin hesab\u0131n\u0131zda saklan\u0131r.",
      "A\u015fa\u011f\u0131daki mod\u00fclleri tek tek tan\u0131yacaks\u0131n\u0131z; her ad\u0131mda ilgili sekmeye ge\u00e7ilir.",
      "Tan\u0131t\u0131m\u0131 istedi\u011finiz zaman \u00fcst bardaki ? d\u00fc\u011fmesinden tekrar a\u00e7abilirsiniz.",
    ],
  };

  var BITIS = {
    tip: "bitis",
    ikon: "🚀",
    baslik: "Haz\u0131rs\u0131n\u0131z!",
    ozet:
      "\u0130lk i\u015fleminizi eklemek i\u00e7in \u0130\u015flemler sekmesinde alttaki h\u0131zl\u0131 giri\u015f sat\u0131r\u0131n\u0131 kullan\u0131n. Kategorileri ihtiyac\u0131n\u0131za g\u00f6re d\u00fczenleyebilirsiniz.",
    ipuclari: [
      "Mobilde sekmeler aras\u0131 ge\u00e7mek i\u00e7in i\u00e7eri\u011fi sa\u011fa-sola kayd\u0131rabilirsiniz.",
      "B\u00fct\u00e7e plan\u0131n\u0131z\u0131 \u0130\u015flemler > B\u00fct\u00e7e b\u00f6l\u00fcm\u00fcnden ay ay doldurun.",
      "Sorular\u0131n\u0131z i\u00e7in y\u00f6netici ile ileti\u015fime ge\u00e7ebilirsiniz.",
    ],
  };

  var MODULLER = {
    islemler: {
      ikon: "💸",
      baslik: "Islemler",
      ozet:
        "Gunluk gelir ve giderlerinizi kategorilere gore kaydedin. Liste, ozet grafikleri ve aylik butce plani bu modulde bir arada.",
      ipuclari: [
        "Alttaki satirdan hizli gider/gelir ekleyin; kategori menusunden secim yapin.",
        "Kategoriler dugmesi ile kendi gruplarinizi ekleyip duzenleyebilirsiniz.",
        "Butce sekmesinde aylik hedeflerinizi gerceklesenle karsilastirin.",
      ],
    },
    birikim: {
      ikon: "🏦",
      baslik: "Birikim",
      ozet:
        "BIRIKIM grubundaki islemleriniz burada toplanir. Altin, BES, fon ve nakit birikimlerinizi tek ekranda izleyin.",
      ipuclari: [
        "Birikim kalemi eklemek icin once Islemeler'den BIRIKIM kategorisine islem girin.",
        "Kategori yonetiminden yeni birikim turleri tanimlayabilirsiniz.",
      ],
    },
    arabam: {
      ikon: "🚗",
      baslik: "Arabam",
      ozet:
        "Arac giderlerinizi (yakit, sigorta, bakim, vergi) ve arac bilgilerinizi takip edin. Yillik maliyet ozetini gorun.",
      ipuclari: [
        "Her arac icin plaka ve model bilgisi ekleyerek ayri takip yapin.",
        "Giderleri ilgili kategorilerden veya bu modulden kaydedebilirsiniz.",
      ],
    },
    kredi: {
      ikon: "💳",
      baslik: "Kredi Karti",
      ozet:
        "Kredi karti harcamalarinizi ve odeme planinizi izleyin. Donem bazli ozetlerle borcunuzu kontrol altinda tutun.",
      ipuclari: [
        "Alisveris taksiti: toplam tutari taksit sayisina bolun.",
        "Duzenli odeme: abonelik ve aylik sabit odemeler icin aylik tutar girin.",
      ],
    },
    alacaklar: {
      ikon: "🤝",
      baslik: "Alacaklar / Borclar",
      ozet:
        "Solda size olan alacaklari, sagda sizin borclarinizi takip edin. Pesin, taksitli ve altin kayitlari; doviz destegi.",
      ipuclari: [
        "Alacaklar: size borclu kisiler; Borclarim: sizin borclu oldugunuz kisiler.",
        "Odeme aldiginizda veya odediginizde daire simgesine tiklayin.",
      ],
    },
    urun: {
      ikon: "📦",
      baslik: "Urun",
      ozet:
        "Evdeki veya istediginiz urun envanterini listeleyin. Miktar, fiyat ve not bilgilerini tek yerde tutun.",
      ipuclari: [
        "Urun ekleyerek stok veya alis listesi mantiginda kullanabilirsiniz.",
        "Arama ve filtre ile uzun listelerde hizli bulun.",
      ],
    },
    altin: {
      ikon: "🥇",
      baslik: "Altin",
      ozet:
        "Sahip oldugunuz altinlari gram, ceyrek, yarim ve tam olarak kaydedin. Guncel gram fiyati ile anlik deger hesaplanir.",
      ipuclari: [
        "Fiyat guncelle dugmesi ile piyasa fiyatini cekebilirsiniz.",
        "Toplam gram ve TL deger ozetini ust bardan takip edin.",
      ],
    },
    "verilen-altin": {
      ikon: "🎁",
      baslik: "Verilen Altinlar",
      ozet:
        "Hediye veya vefa amacli verdginiz altinlari kisi ve tarih bazinda kaydedin. Geri odeme veya takip icin kullanin.",
      ipuclari: [
        "Her kayitta kisi, miktar ve altin tipi bilgisi tutulur.",
        "Tablo gorunumu ile gecmis verileri inceleyin.",
      ],
    },
    vefa: {
      ikon: "🕊",
      baslik: "Vefa",
      ozet:
        "Grup halinde birikim ve vefa odemelerini yonetin. Uye bazli paylasim ve altin veya nakit katkilari takip edilir.",
      ipuclari: [
        "Uyeleri ekleyip aylik odeme plani olusturun.",
        "Altin tipleri gram karsiligina cevrilerek guncel deger hesaplanir.",
      ],
    },
    muhtac: {
      ikon: "🤲",
      baslik: "Muhtac",
      ozet:
        "Yardim alan kisileri ve zekat dagitimini yillik bazda kaydedin. Gelir ve dagitim ozetlerini raporlayin.",
      ipuclari: [
        "Her kisi icin zekat ve yardim gecmisini ayri tutun.",
        "Yillik gelir ve dagitim karsilastirmasi ile plan yapin.",
      ],
    },
  };

  var SIRA = [
    "islemler",
    "birikim",
    "arabam",
    "kredi",
    "alacaklar",
    "urun",
    "altin",
    "verilen-altin",
    "vefa",
    "muhtac",
  ];

  var _overlay = null;
  var _adimlar = [];
  var _indeks = 0;
  var _uid = "";
  var _bitince = null;
  var _vurguTabId = null;

  function depoAnahtar(uid) {
    return "hk-tanitim-" + SURUM + ":" + (uid || "anon");
  }

  function tamamlandiMi(uid) {
    if (!uid) return true;
    try {
      return localStorage.getItem(depoAnahtar(uid)) === "1";
    } catch (e) {
      return false;
    }
  }

  function tamamlandiIsaretle(uid) {
    if (!uid) return;
    try {
      localStorage.setItem(depoAnahtar(uid), "1");
    } catch (e) {}
  }

  function izinliModulSira(user) {
    var izinli =
      typeof HK_ERISIM !== "undefined" && user
        ? HK_ERISIM.izinliSekmeler(user)
        : SIRA.slice();
    var out = [];
    SIRA.forEach(function (id) {
      if (izinli.indexOf(id) >= 0 && MODULLER[id]) out.push(id);
    });
    return out;
  }

  function adimlariOlustur(user) {
    var adimlar = [GIRIS];
    izinliModulSira(user).forEach(function (id) {
      var m = MODULLER[id];
      adimlar.push({
        tip: "modul",
        id: id,
        ikon: m.ikon,
        baslik: m.baslik,
        ozet: m.ozet,
        ipuclari: m.ipuclari,
      });
    });
    adimlar.push(BITIS);
    return adimlar;
  }

  function domOlustur() {
    if (_overlay) return;
    _overlay = document.createElement("div");
    _overlay.id = "hk-tanitim-overlay";
    _overlay.className = "hk-tanitim-overlay hidden";
    _overlay.setAttribute("role", "dialog");
    _overlay.setAttribute("aria-modal", "true");
    _overlay.setAttribute("aria-labelledby", "hk-tanitim-baslik");
    _overlay.innerHTML =
      '<div class="hk-tanitim-kutu">' +
      '  <div class="hk-tanitim-ust">' +
      '    <span class="hk-tanitim-ilerleme" id="hk-tanitim-ilerleme"></span>' +
      '    <button type="button" class="hk-tanitim-kapat" id="hk-tanitim-kapat" aria-label="Kapat">&#10005;</button>' +
      "  </div>" +
      '  <div class="hk-tanitim-ikon" id="hk-tanitim-ikon"></div>' +
      '  <h2 class="hk-tanitim-baslik" id="hk-tanitim-baslik"></h2>' +
      '  <p class="hk-tanitim-ozet" id="hk-tanitim-ozet"></p>' +
      '  <ul class="hk-tanitim-ipucu-list" id="hk-tanitim-ipucu-list"></ul>' +
      '  <label class="hk-tanitim-tekrar hidden" id="hk-tanitim-tekrar-wrap">' +
      '    <input type="checkbox" id="hk-tanitim-tekrar" checked /> Bir daha g\u00f6sterme' +
      "  </label>" +
      '  <div class="hk-tanitim-alt">' +
      '    <button type="button" class="btn-secondary hk-tanitim-geri" id="hk-tanitim-geri">Geri</button>' +
      '    <button type="button" class="btn-secondary hk-tanitim-atla" id="hk-tanitim-atla">Atla</button>' +
      '    <button type="button" class="btn-primary hk-tanitim-ileri" id="hk-tanitim-ileri">\u0130leri</button>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(_overlay);

    document.getElementById("hk-tanitim-kapat").addEventListener("click", kapatVeKaydet);
    document.getElementById("hk-tanitim-atla").addEventListener("click", kapatVeKaydet);
    document.getElementById("hk-tanitim-geri").addEventListener("click", function () {
      adimGoster(_indeks - 1);
    });
    document.getElementById("hk-tanitim-ileri").addEventListener("click", function () {
      if (_indeks >= _adimlar.length - 1) kapatVeKaydet();
      else adimGoster(_indeks + 1);
    });
  }

  function vurguKaldir() {
    if (!_vurguTabId) return;
    var eski = document.querySelector('.tab-btn[data-tab="' + _vurguTabId + '"]');
    if (eski) eski.classList.remove("hk-tanitim-sekme-vurgu");
    _vurguTabId = null;
  }

  function sekmeyiGoster(tabId) {
    vurguKaldir();
    if (!tabId) return;
    var btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]:not(.hidden)');
    if (!btn) return;
    btn.click();
    btn.classList.add("hk-tanitim-sekme-vurgu");
    _vurguTabId = tabId;
    if (btn.scrollIntoView) btn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  function adimGoster(i) {
    if (!_overlay || !_adimlar.length) return;
    if (i < 0) i = 0;
    if (i >= _adimlar.length) i = _adimlar.length - 1;
    _indeks = i;

    var adim = _adimlar[i];
    var ikonEl = document.getElementById("hk-tanitim-ikon");
    var baslikEl = document.getElementById("hk-tanitim-baslik");
    var ozetEl = document.getElementById("hk-tanitim-ozet");
    var listeEl = document.getElementById("hk-tanitim-ipucu-list");
    var ilerlemeEl = document.getElementById("hk-tanitim-ilerleme");
    var geriBtn = document.getElementById("hk-tanitim-geri");
    var atlaBtn = document.getElementById("hk-tanitim-atla");
    var ileriBtn = document.getElementById("hk-tanitim-ileri");
    var tekrarWrap = document.getElementById("hk-tanitim-tekrar-wrap");

    if (ikonEl) ikonEl.textContent = adim.ikon || "";
    if (baslikEl) baslikEl.textContent = adim.baslik || "";
    if (ozetEl) ozetEl.textContent = adim.ozet || "";
    if (ilerlemeEl) ilerlemeEl.textContent = i + 1 + " / " + _adimlar.length;

    if (listeEl) {
      listeEl.innerHTML = "";
      (adim.ipuclari || []).forEach(function (metin) {
        var li = document.createElement("li");
        li.textContent = metin;
        listeEl.appendChild(li);
      });
    }

    if (adim.tip === "modul" && adim.id) sekmeyiGoster(adim.id);
    else vurguKaldir();

    if (geriBtn) geriBtn.classList.toggle("hidden", i === 0);
    if (atlaBtn) atlaBtn.classList.toggle("hidden", i === _adimlar.length - 1);
    if (ileriBtn) {
      ileriBtn.textContent = i === _adimlar.length - 1 ? "Ba\u015fla" : "\u0130leri";
    }
    if (tekrarWrap) tekrarWrap.classList.toggle("hidden", adim.tip !== "bitis");
  }

  function kapatVeKaydet() {
    var tekrar = document.getElementById("hk-tanitim-tekrar");
    if (!tekrar || tekrar.checked) tamamlandiIsaretle(_uid);
    kapat();
  }

  function kapat() {
    vurguKaldir();
    if (_overlay) _overlay.classList.add("hidden");
    document.body.classList.remove("hk-tanitim-acik");
    if (typeof HK_ERISIM !== "undefined" && typeof fbMevcutKullanici === "function") {
      var u = fbMevcutKullanici();
      if (u) HK_ERISIM.misafirBilgiGoster(u);
    }
    if (_bitince) {
      var fn = _bitince;
      _bitince = null;
      fn();
    }
  }

  function goster(user, zorla) {
    if (!user || user.isAnonymous) return Promise.resolve();
    domOlustur();
    _uid = user.uid || "";
    if (!zorla && tamamlandiMi(_uid)) return Promise.resolve();

    _adimlar = adimlariOlustur(user);
    if (_adimlar.length <= 2) return Promise.resolve();

    var banner = document.getElementById("hk-misafir-banner");
    if (banner) banner.classList.add("hidden");

    _indeks = 0;
    document.body.classList.add("hk-tanitim-acik");
    _overlay.classList.remove("hidden");
    adimGoster(0);

    return new Promise(function (resolve) {
      _bitince = resolve;
    });
  }

  function belkiGoster(user) {
    return goster(user, false);
  }

  return {
    belkiGoster: belkiGoster,
    goster: goster,
    tamamlandiMi: tamamlandiMi,
  };
})();
