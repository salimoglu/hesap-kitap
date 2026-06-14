/* verilen-altinlar.js — verilen altın takıları */
var VerilenAltinlarModule = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var _kayitlar = [];
  var _aktif = null;
  var _gramFiyat = 0;

  var VA_GRAM = { gram: 1, ceyrek: 1.75, yarim: 3.5, tam: 7, ata: 7.2 };
  var VA_LABEL = { gram: "Gram", ceyrek: "Çeyrek", yarim: "Yarım", tam: "Tam", ata: "Ata" };
  var VA_TURLER = ["gram", "ceyrek", "yarim", "tam", "ata"];

  /* İlk kurulum — tablodan aktarılan kayıtlar (liste boşken bir kez yüklenir) */
  var VA_TOHUM = [
    { id: "va-tohum-01", kisi: "FEYZİ", aciklama: "Düğün", tur: "yarim", adet: 1 },
    { id: "va-tohum-02", kisi: "MUSTAFA SARKIR", aciklama: "Çocuğu için", tur: "ceyrek", adet: 1 },
    { id: "va-tohum-03", kisi: "MESUT İNCE", aciklama: "Düğün", tur: "ceyrek", adet: 1 },
    { id: "va-tohum-04", kisi: "İSMAİL ALTAN", aciklama: "Düğün", tur: "ata", adet: 1 },
    { id: "va-tohum-05", kisi: "SÜMEYRA ABLAM", aciklama: "Çocuğu için", tur: "ceyrek", adet: 1 },
    { id: "va-tohum-06", kisi: "YILMAZ KARABULUT", aciklama: "Düğün", tur: "ata", adet: 1, tarih: "2023-05-16", gunDegerTl: 9450 },
    { id: "va-tohum-07", kisi: "FERHAT BOZOK", aciklama: "Çocuğu için", tur: "ceyrek", adet: 1 },
    { id: "va-tohum-08", kisi: "GÜLŞAH", aciklama: "Düğün için (çocuğun altını verildi)", tur: "ceyrek", adet: 1 },
    { id: "va-tohum-09", kisi: "İSMAİL ALTAN", aciklama: "Çocuğu için", tur: "ceyrek", adet: 1 },
    { id: "va-tohum-10", kisi: "ZELİHA", aciklama: "Düğün için", tur: "yarim", adet: 1 },
    { id: "va-tohum-11", kisi: "YILMAZ KARABULUT", aciklama: "Çocuğu için", tur: "ceyrek", adet: 1 },
    { id: "va-tohum-12", kisi: "BEKİR EROĞLU", aciklama: "Düğün", tur: "ceyrek", adet: 1, tarih: "2025-05-20", gunDegerTl: 6600 },
    { id: "va-tohum-13", kisi: "SÜHEYLA", aciklama: "Çocuğu için", tur: "ceyrek", adet: 1, tarih: "2025-05-20", gunDegerTl: 6600 },
    { id: "va-tohum-14", kisi: "ZELİHA", aciklama: "Çocuğu için", tur: "ceyrek", adet: 1, tarih: "2025-08-20" },
    { id: "va-tohum-15", kisi: "FEYZİ", aciklama: "Çocuğu için", tur: "ceyrek", adet: 1, tarih: "2025-10-02", gunDegerTl: 10000 },
    { id: "va-tohum-16", kisi: "SÜMEYRA ABLAM", aciklama: "Çocuğu için", tur: "ceyrek", adet: 1, tarih: "2026-04-01", gunDegerTl: 11000 }
  ];

  var ALTIN_FIYAT_URLS = [
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json",
    "https://latest.currency-api.pages.dev/v1/currencies/xau.json"
  ];
  var TROY_ONS_GRAM = 31.1034768;

  function para(n) {
    return Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function agr(n) {
    return Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function uid() {
    return "va" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
  }
  function bugun() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function tarihFmt(t) {
    if (!t) return "";
    var p = t.split("-");
    return p[2] + "." + p[1] + "." + p[0];
  }
  function turEtiket(tur) {
    var g = VA_GRAM[tur] || 0;
    return (VA_LABEL[tur] || tur) + " (" + agr(g) + " gr)";
  }
  function kayitGram(k) {
    return (VA_GRAM[k.tur] || 0) * (parseFloat(k.adet) || 1);
  }
  function turSecenekHtml(secili) {
    var h = "";
    VA_TURLER.forEach(function (t) {
      h += '<option value="' + t + '"' + (secili === t ? " selected" : "") + ">" + esc(turEtiket(t)) + "</option>";
    });
    return h;
  }

  async function gramFiyatYukle() {
    _gramFiyat = 0;
    if (typeof window._fbDb !== "undefined" && window._fbDb) {
      try {
        var v = parseFloat(await fbRtdbOku("altin_guncel_fiyat"));
        if (v && v > 0) _gramFiyat = v;
      } catch (e) {}
    }
    if (_gramFiyat <= 0) _gramFiyat = await gramFiyatCek();
    return _gramFiyat;
  }

  async function gramFiyatCek() {
    var i, r, d, x, tryPerOz, gram;
    for (i = 0; i < ALTIN_FIYAT_URLS.length; i++) {
      try {
        r = await fetch(ALTIN_FIYAT_URLS[i], { cache: "no-store" });
        if (!r.ok) continue;
        d = await r.json();
        x = d && d.xau;
        if (!x || typeof x !== "object") continue;
        tryPerOz = parseFloat(x.try);
        if (isFinite(tryPerOz) && tryPerOz > 100) {
          gram = tryPerOz / TROY_ONS_GRAM;
          _gramFiyat = gram;
          return gram;
        }
      } catch (e) {}
    }
    return _gramFiyat || 0;
  }

  async function gramFiyatKaydet(f) {
    if (!(f > 0) || typeof window._fbDb === "undefined" || !window._fbDb) return;
    try {
      await fbRtdbRef("altin_guncel_fiyat").set(f);
    } catch (e) {}
  }

  async function fbYukle() {
    if (!window._fbDb) return;
    try {
      var v = await fbRtdbOku("verilen_altinlar");
      _kayitlar = v ? Object.values(v) : [];
      vaSirala();
    } catch (e) {
      _kayitlar = [];
      console.error("[VerilenAltin] yukle", e);
    }
  }

  function vaSirala() {
    _kayitlar.sort(function (a, b) {
      var ta = a.tarih || "";
      var tb = b.tarih || "";
      if (!ta && !tb) return (a.kisi || "").localeCompare(b.kisi || "", "tr");
      if (!ta) return 1;
      if (!tb) return -1;
      return tb.localeCompare(ta);
    });
  }

  async function tohumYukle() {
    if (_kayitlar.length > 0) return;
    VA_TOHUM.forEach(function (r) {
      _kayitlar.push({
        id: r.id,
        kisi: r.kisi,
        aciklama: r.aciklama || "",
        tur: r.tur,
        adet: r.adet || 1,
        tarih: r.tarih || "",
        gunDegerTl: r.gunDegerTl
      });
    });
    vaSirala();
    await fbKaydet();
  }

  async function fbKaydet() {
    if (!window._fbDb) return;
    try {
      var obj = {};
      _kayitlar.forEach(function (k) {
        obj[k.id] = k;
      });
      await fbRtdbRef("verilen_altinlar").set(obj);
    } catch (e) {
      console.error("[VerilenAltin] kaydet", e);
    }
  }

  function formGramOnizleme() {
    var tur = ($("va-tur") || {}).value || "gram";
    var adet = parseFloat(($("va-adet") || {}).value) || 1;
    var el = $("va-gram-oniz");
    if (el) el.textContent = agr((VA_GRAM[tur] || 0) * adet) + " gr";
  }

  function render() {
    var c = $("verilen-altin-container");
    if (!c) return;

    var topGram = _kayitlar.reduce(function (s, k) {
      return s + kayitGram(k);
    }, 0);
    var topGunDeger = _kayitlar.reduce(function (s, k) {
      return s + (parseFloat(k.gunDegerTl) || 0);
    }, 0);
    var guncelDeger = _gramFiyat > 0 ? topGram * _gramFiyat : 0;

    var h = '<div class="va-wrap">';
    h += '<div class="va-header">';
    h += '<div class="va-ozet">';
    h += '<div class="va-oz-item"><span class="va-oz-label">Toplam gram</span><span class="va-oz-val va-oz-au">' + agr(topGram) + " gr</span></div>";
    h += '<div class="va-oz-item"><span class="va-oz-label">Güncel değer</span><span class="va-oz-val va-oz-guncel" id="va-guncel-deger">';
    h += _gramFiyat > 0 ? para(guncelDeger) + " TL" : "—";
    h += "</span></div>";
    if (topGunDeger > 0) {
      h += '<div class="va-oz-item"><span class="va-oz-label">Kayıtlı gün değeri</span><span class="va-oz-val">' + para(topGunDeger) + " TL</span></div>";
    }
    h += '<div class="va-oz-item"><span class="va-oz-label">Kayıt</span><span class="va-oz-val va-oz-sayi">' + _kayitlar.length + "</span></div>";
    h += "</div>";
    h += '<div class="va-fiyat-satir">';
    h += '<span class="va-fiyat-label">Gram altın</span>';
    h += '<span class="va-fiyat-val" id="va-fiyat-val">' + (_gramFiyat > 0 ? para(_gramFiyat) + " TL" : "Yükleniyor...") + "</span>";
    h += '<button type="button" class="va-fiyat-btn" id="va-fiyat-guncelle" title="Fiyatı güncelle">&#8635;</button>';
    h += "</div>";
    h += '<button type="button" class="va-ekle-btn" id="va-ekle-btn">+ Kayıt Ekle</button>';
    h += "</div>";

    if (!_kayitlar.length) {
      h += '<div class="va-bos"><div class="va-bos-ikon">&#129351;</div><div>Henüz verilen altın kaydı yok</div></div>';
    } else {
      h += '<div class="va-tablo-dis"><table class="va-tablo"><thead><tr>';
      h += "<th>KİŞİ</th><th>AÇIKLAMA</th><th>ALTIN</th><th>TARİH</th><th>GRAM</th><th>O GÜN</th><th>GÜNCEL</th><th></th>";
      h += "</tr></thead><tbody>";
      _kayitlar.forEach(function (k) {
        var gr = kayitGram(k);
        var adet = parseFloat(k.adet) || 1;
        var satirGuncel = _gramFiyat > 0 ? gr * _gramFiyat : 0;
        var gunD = parseFloat(k.gunDegerTl) || 0;
        h += '<tr class="va-satir" data-id="' + k.id + '">';
        h += '<td class="va-td-kisi">' + esc(k.kisi || "—") + "</td>";
        h += '<td class="va-td-aciklama">' + esc(k.aciklama || "—") + "</td>";
        h += '<td class="va-td-tur">' + esc(turEtiket(k.tur));
        if (adet !== 1) h += ' <span class="va-td-adet">×' + agr(adet) + "</span>";
        h += "</td>";
        h += '<td class="va-td-tarih">' + (k.tarih ? tarihFmt(k.tarih) : "—") + "</td>";
        h += '<td class="va-td-gram">' + agr(gr) + " gr</td>";
        h += '<td class="va-td-gun">' + (gunD > 0 ? para(gunD) + " TL" : "—") + "</td>";
        h += '<td class="va-td-guncel">' + (_gramFiyat > 0 ? para(satirGuncel) + " TL" : "—") + "</td>";
        h += '<td class="va-td-aks">';
        h += '<button type="button" class="va-duz-btn row-action-btn duzenle" data-id="' + k.id + '" title="Düzenle">&#9998;</button> ';
        h += '<button type="button" class="va-sil-btn row-action-btn sil" data-id="' + k.id + '" title="Sil">&#10005;</button>';
        h += "</td></tr>";
      });
      h += "</tbody></table></div>";
    }

    h += '<div class="bk-modal-overlay hidden" id="va-modal"><div class="modal-box modal-sm">';
    h += '<div class="modal-header"><h2 class="modal-title" id="va-modal-baslik">Verilen Altın</h2>';
    h += '<button type="button" class="modal-close" id="va-modal-kapat">&#10005;</button></div>';
    h += '<div class="modal-body">';
    h += '<div class="field-group"><label class="field-label">Kime verildi</label>';
    h += '<input type="text" id="va-kisi" class="field-input" placeholder="Ad soyad..." maxlength="80"/></div>';
    h += '<div class="field-group"><label class="field-label">Açıklama (düğün, çocuğu için…)</label>';
    h += '<input type="text" id="va-aciklama" class="field-input" placeholder="İsteğe bağlı" maxlength="120"/></div>';
    h += '<div class="field-group"><label class="field-label">Veriliş tarihi (isteğe bağlı)</label>';
    h += '<input type="date" id="va-tarih" class="field-input"/></div>';
    h += '<div class="va-form-iki">';
    h += '<div class="field-group"><label class="field-label">Altın türü</label>';
    h += '<select id="va-tur" class="field-input">' + turSecenekHtml("ceyrek") + "</select></div>";
    h += '<div class="field-group"><label class="field-label">Adet</label>';
    h += '<input type="number" id="va-adet" class="field-input" value="1" min="0.01" step="0.01" inputmode="decimal"/></div>';
    h += "</div>";
    h += '<div class="va-gram-oniz-wrap">Toplam: <strong id="va-gram-oniz">1,75 gr</strong></div>';
    h += '<div class="field-group"><label class="field-label">O günkü değer (TL, isteğe bağlı)</label>';
    h += '<input type="number" id="va-gun-deger" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
    h += "</div>";
    h += '<div class="modal-footer"><button type="button" class="btn-secondary" id="va-iptal">İptal</button>';
    h += '<button type="button" class="btn-primary" id="va-kaydet">Kaydet</button></div>';
    h += "</div></div>";

    h += "</div>";
    c.innerHTML = h;
    bagla();
  }

  function modalAc(k) {
    _aktif = k || null;
    $("va-modal-baslik").textContent = k ? "Kaydı Düzenle" : "Verilen Altın Ekle";
    $("va-kisi").value = k ? k.kisi || "" : "";
    $("va-aciklama").value = k ? k.aciklama || "" : "";
    $("va-tarih").value = k ? k.tarih || "" : "";
    $("va-tur").value = k && VA_TURLER.indexOf(k.tur) >= 0 ? k.tur : "ceyrek";
    $("va-adet").value = k ? String(k.adet || 1) : "1";
    $("va-gun-deger").value = k && k.gunDegerTl ? String(k.gunDegerTl) : "";
    formGramOnizleme();
    $("va-modal").classList.remove("hidden");
    setTimeout(function () {
      $("va-kisi").focus();
    }, 80);
  }

  function bagla() {
    $("va-ekle-btn").addEventListener("click", function () {
      modalAc(null);
    });
    $("va-modal-kapat").addEventListener("click", function () {
      $("va-modal").classList.add("hidden");
    });
    $("va-iptal").addEventListener("click", function () {
      $("va-modal").classList.add("hidden");
    });
    $("va-modal").addEventListener("click", function (e) {
      if (e.target === $("va-modal")) $("va-modal").classList.add("hidden");
    });
    $("va-kaydet").addEventListener("click", kaydet);
    $("va-tur").addEventListener("change", formGramOnizleme);
    $("va-adet").addEventListener("input", formGramOnizleme);

    var fbtn = $("va-fiyat-guncelle");
    if (fbtn) {
      fbtn.addEventListener("click", async function () {
        if (fbtn._busy) return;
        fbtn._busy = true;
        fbtn.disabled = true;
        fbtn.style.animation = "spin 1s linear infinite";
        var f = await gramFiyatCek();
        fbtn.style.animation = "";
        fbtn.disabled = false;
        fbtn._busy = false;
        if (f > 0) {
          await gramFiyatKaydet(f);
          render();
        } else {
          alert("Fiyat alınamadı, lütfen tekrar deneyin.");
        }
      });
    }

    document.querySelectorAll(".va-duz-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var k = _kayitlar.find(function (x) {
          return x.id === btn.dataset.id;
        });
        if (k) modalAc(k);
      });
    });
    document.querySelectorAll(".va-sil-btn").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation();
        if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
        _kayitlar = _kayitlar.filter(function (x) {
          return x.id !== btn.dataset.id;
        });
        await fbKaydet();
        render();
      });
    });
  }

  async function kaydet() {
    var kisi = ($("va-kisi").value || "").trim();
    var aciklama = ($("va-aciklama").value || "").trim();
    var tarih = ($("va-tarih").value || "").trim();
    var tur = $("va-tur").value;
    var adet = parseFloat($("va-adet").value) || 0;
    var gunDeger = parseFloat($("va-gun-deger").value) || 0;
    if (!kisi) {
      $("va-kisi").focus();
      return;
    }
    if (VA_TURLER.indexOf(tur) < 0) {
      alert("Altın türü seçiniz.");
      return;
    }
    if (adet <= 0) {
      $("va-adet").focus();
      return;
    }
    var kayit = {
      id: _aktif ? _aktif.id : uid(),
      kisi: kisi,
      aciklama: aciklama,
      tarih: tarih,
      tur: tur,
      adet: adet
    };
    if (gunDeger > 0) kayit.gunDegerTl = gunDeger;
    if (_aktif) {
      var i = _kayitlar.findIndex(function (x) {
        return x.id === _aktif.id;
      });
      if (i >= 0) _kayitlar[i] = kayit;
    } else {
      _kayitlar.push(kayit);
    }
    vaSirala();
    await fbKaydet();
    $("va-modal").classList.add("hidden");
    render();
  }

  async function init() {
    await fbYukle();
    await tohumYukle();
    await gramFiyatYukle();
    render();
    gramFiyatCek().then(function (f) {
      if (f > 0) {
        _gramFiyat = f;
        render();
        gramFiyatKaydet(f);
      }
    });
  }

  return { init: init };
})();
