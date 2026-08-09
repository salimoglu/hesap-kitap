/* verilen-altinlar.js — verilen altın takıları */
var VerilenAltinlarModule = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var _kayitlar = [];
  var _aktif = null;
  var _gramFiyat = 0;
  var _initPromise = null;
  var VA_LS_KEY = "hk-verilen-altinlar";
  var VA_TOHUM_FLAG = "hk-verilen-altin-tohum";

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
      var ref = typeof fbRtdbRef === "function" ? fbRtdbRef("altin_guncel_fiyat") : null;
      if (ref) await ref.set(f);
    } catch (e) {}
  }

  function kayitNormalize(row, key) {
    if (!row || typeof row !== "object") return null;
    var k = Object.assign({}, row);
    if (!k.id) k.id = key || uid();
    k.kisi = k.kisi || "";
    k.aciklama = k.aciklama || "";
    k.tur = VA_TURLER.indexOf(k.tur) >= 0 ? k.tur : "ceyrek";
    k.adet = parseFloat(k.adet) || 1;
    k.tarih = k.tarih || "";
    if (k.gunDegerTl != null) {
      var gd = parseFloat(k.gunDegerTl);
      if (gd > 0) k.gunDegerTl = gd;
      else delete k.gunDegerTl;
    }
    return k;
  }

  function listeyeCevir(v) {
    var out = [];
    if (!v) return out;
    if (Array.isArray(v)) {
      v.forEach(function (row, i) {
        var n = kayitNormalize(row, row && row.id ? row.id : "va-arr-" + i);
        if (n) out.push(n);
      });
      return out;
    }
    if (typeof v === "object") {
      Object.keys(v).forEach(function (key) {
        var n = kayitNormalize(v[key], key);
        if (n) out.push(n);
      });
    }
    return out;
  }

  function yerelOku() {
    try {
      var raw = localStorage.getItem(VA_LS_KEY);
      if (!raw) return [];
      return listeyeCevir(JSON.parse(raw));
    } catch (e) {
      return [];
    }
  }

  function yerelYaz() {
    try {
      localStorage.setItem(VA_LS_KEY, JSON.stringify(_kayitlar));
    } catch (e) {
      console.warn("[VerilenAltin] yerel yazılamadı", e);
    }
  }

  function tohumBayrakOku() {
    try {
      return localStorage.getItem(VA_TOHUM_FLAG) === "1";
    } catch (e) {
      return false;
    }
  }

  function tohumBayrakYaz() {
    try {
      localStorage.setItem(VA_TOHUM_FLAG, "1");
    } catch (e) {}
  }

  async function fbHazirBekle() {
    if (typeof window._fbReady !== "undefined" && window._fbReady && typeof window._fbReady.then === "function") {
      try {
        await Promise.race([
          window._fbReady,
          new Promise(function (r) {
            setTimeout(r, 2500);
          })
        ]);
      } catch (e) {}
    }
  }

  function fbKullaniciVarMi() {
    try {
      if (typeof fbMevcutKullanici === "function") {
        var u = fbMevcutKullanici();
        return !!(u && !u.isAnonymous);
      }
    } catch (e) {}
    return false;
  }

  async function fbYukle() {
    await fbHazirBekle();
    if (!window._fbDb || typeof fbRtdbOku !== "function") return false;
    try {
      var v = await fbRtdbOku("verilen_altinlar");
      var liste = listeyeCevir(v);
      if (liste.length > 0) {
        _kayitlar = liste;
        vaSirala();
        yerelYaz();
        tohumBayrakYaz();
        return true;
      }
      return false;
    } catch (e) {
      console.error("[VerilenAltin] yukle", e);
      return false;
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
    if (tohumBayrakOku()) return;
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
    tohumBayrakYaz();
    await fbKaydet();
  }

  async function fbKaydet() {
    yerelYaz();
    await fbHazirBekle();
    if (!window._fbDb || typeof fbRtdbRef !== "function") return false;
    if (!fbKullaniciVarMi()) {
      console.warn("[VerilenAltin] oturum yok; veri yerelde saklandı");
      return false;
    }
    try {
      var obj = {};
      _kayitlar.forEach(function (k) {
        if (!k || !k.id) return;
        obj[k.id] = k;
      });
      var ref = fbRtdbRef("verilen_altinlar");
      if (!ref) {
        console.warn("[VerilenAltin] FB ref yok; veri yerelde saklandı");
        return false;
      }
      await ref.set(obj);
      return true;
    } catch (e) {
      console.error("[VerilenAltin] kaydet", e);
      return false;
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
    h += '<div class="va-oz-item"><span class="va-oz-label">Gram</span><span class="va-oz-val va-oz-au">' + agr(topGram) + " gr</span></div>";
    h += '<div class="va-oz-item"><span class="va-oz-label">Güncel</span><span class="va-oz-val va-oz-guncel" id="va-guncel-deger">';
    h += _gramFiyat > 0 ? para(guncelDeger) + " TL" : "—";
    h += "</span></div>";
    if (topGunDeger > 0) {
      h += '<div class="va-oz-item"><span class="va-oz-label">O gün</span><span class="va-oz-val">' + para(topGunDeger) + " TL</span></div>";
    }
    h += '<div class="va-oz-item"><span class="va-oz-label">Kayıt</span><span class="va-oz-val va-oz-sayi">' + _kayitlar.length + "</span></div>";
    h += "</div>";
    h += '<div class="va-fiyat-satir">';
    h += '<span class="va-fiyat-label">Gram</span>';
    h += '<span class="va-fiyat-val" id="va-fiyat-val">' + (_gramFiyat > 0 ? para(_gramFiyat) + " TL" : "…") + "</span>";
    h += '<button type="button" class="va-fiyat-btn" id="va-fiyat-guncelle" title="Fiyatı güncelle">&#8635;</button>';
    h += "</div>";
    h += '<button type="button" class="va-ekle-btn" id="va-ekle-btn">+ Ekle</button>';
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

    h += '<div class="bk-modal-overlay hidden" id="va-detay-modal">';
    h += '<div class="modal-box va-detay-box">';
    h += '<div class="modal-header"><h2 class="modal-title" id="va-detay-baslik">Kayıt</h2>';
    h += '<button type="button" class="modal-close" id="va-detay-kapat">&#10005;</button></div>';
    h += '<div class="modal-body va-detay-body" id="va-detay-body"></div>';
    h += '<div class="modal-footer va-detay-footer">';
    h += '<button type="button" class="btn-secondary" id="va-detay-sil">Sil</button>';
    h += '<button type="button" class="btn-primary" id="va-detay-duzenle">Düzenle</button>';
    h += "</div></div></div>";

    h += "</div>";
    c.innerHTML = h;
    bagla();
  }

  function detayKapat() {
    var m = $("va-detay-modal");
    if (m) m.classList.add("hidden");
    _aktif = null;
  }

  function detayAc(k) {
    if (!k) return;
    _aktif = k;
    var gr = kayitGram(k);
    var adet = parseFloat(k.adet) || 1;
    var satirGuncel = _gramFiyat > 0 ? gr * _gramFiyat : 0;
    var gunD = parseFloat(k.gunDegerTl) || 0;
    var bas = $("va-detay-baslik");
    var body = $("va-detay-body");
    if (bas) bas.textContent = k.kisi || "Kayıt";
    if (body) {
      var h = '<div class="va-detay-grid">';
      h += '<div class="va-detay-item"><span class="va-detay-l">Kişi</span><span class="va-detay-v">' + esc(k.kisi || "—") + "</span></div>";
      h += '<div class="va-detay-item"><span class="va-detay-l">Açıklama</span><span class="va-detay-v">' + esc(k.aciklama || "—") + "</span></div>";
      h += '<div class="va-detay-item"><span class="va-detay-l">Altın</span><span class="va-detay-v va-detay-v--au">' + esc(turEtiket(k.tur));
      if (adet !== 1) h += " ×" + agr(adet);
      h += "</span></div>";
      h += '<div class="va-detay-item"><span class="va-detay-l">Tarih</span><span class="va-detay-v">' + (k.tarih ? tarihFmt(k.tarih) : "—") + "</span></div>";
      h += '<div class="va-detay-item"><span class="va-detay-l">Gram</span><span class="va-detay-v va-detay-v--au">' + agr(gr) + " gr</span></div>";
      h += '<div class="va-detay-item"><span class="va-detay-l">O gün</span><span class="va-detay-v">' + (gunD > 0 ? para(gunD) + " TL" : "—") + "</span></div>";
      h += '<div class="va-detay-item va-detay-item--full"><span class="va-detay-l">Güncel değer</span><span class="va-detay-v va-detay-v--ok">' + (_gramFiyat > 0 ? para(satirGuncel) + " TL" : "—") + "</span></div>";
      h += "</div>";
      body.innerHTML = h;
    }
    var m = $("va-detay-modal");
    if (m) m.classList.remove("hidden");
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

    document.querySelectorAll(".va-satir").forEach(function (tr) {
      tr.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest(".row-action-btn")) return;
        var id = tr.getAttribute("data-id");
        var k = _kayitlar.find(function (x) {
          return x.id === id;
        });
        if (k) detayAc(k);
      });
    });
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

    var detayM = $("va-detay-modal");
    var detayKapatBtn = $("va-detay-kapat");
    var detayDuz = $("va-detay-duzenle");
    var detaySil = $("va-detay-sil");
    if (detayKapatBtn) detayKapatBtn.addEventListener("click", detayKapat);
    if (detayM) {
      detayM.addEventListener("click", function (e) {
        if (e.target === detayM) detayKapat();
      });
      var detayBox = detayM.querySelector(".va-detay-box");
      if (detayBox) detayBox.addEventListener("click", function (e) { e.stopPropagation(); });
    }
    if (detayDuz) {
      detayDuz.addEventListener("click", function () {
        var k = _aktif;
        detayKapat();
        if (k) modalAc(k);
      });
    }
    if (detaySil) {
      detaySil.addEventListener("click", async function () {
        if (!_aktif) return;
        if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
        var id = _aktif.id;
        _kayitlar = _kayitlar.filter(function (x) {
          return x.id !== id;
        });
        await fbKaydet();
        detayKapat();
        render();
      });
    }
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

  async function initOnce() {
    var fbOk = await fbYukle();
    if (!fbOk) {
      var yerel = yerelOku();
      if (yerel.length > 0) {
        _kayitlar = yerel;
        vaSirala();
        /* FB boş/erişilemezken yerelde kalan kayıtları geri yükle */
        await fbKaydet();
        tohumBayrakYaz();
      }
    }
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

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = initOnce().catch(function (e) {
      console.error("[VerilenAltin] init", e);
    }).then(function () {
      _initPromise = null;
    });
    return _initPromise;
  }

  return { init: init };
})();
