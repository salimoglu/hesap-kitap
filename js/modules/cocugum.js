/* cocugum.js — doğan çocuğa takılan takı ve verilen paralar */
var CocugumModule = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var _kayitlar = [];
  var _cocuklar = [];
  var _aktifCocukId = "";
  var _aktif = null;
  var _cocukDuzenle = null;
  var _gramFiyat = 0;
  var _initPromise = null;
  var _modalKoruma = 0;
  var _filtre = "tumu";
  var LS_KEY = "hk-cocugum";

  var CG_GRAM = { gram: 1, ceyrek: 1.75, yarim: 3.5, tam: 7, ata: 7.2, bilezik: 1 };
  var CG_LABEL = { gram: "Gram", ceyrek: "Çeyrek", yarim: "Yarım", tam: "Tam", ata: "Ata", bilezik: "Bilezik" };
  var CG_TURLER = ["gram", "ceyrek", "yarim", "tam", "ata", "bilezik"];
  var CG_CINSIYET = {
    erkek: { id: "erkek", emoji: "\uD83D\uDC66", label: "Erkek" },
    kiz: { id: "kiz", emoji: "\uD83D\uDC67", label: "Kız" }
  };

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
    return "cg" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
  }
  function cocukUid() {
    return "cc" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
  }
  function cinsiyetNorm(v) {
    return v === "kiz" ? "kiz" : "erkek";
  }
  function cinsiyetBilgi(v) {
    return CG_CINSIYET[cinsiyetNorm(v)] || CG_CINSIYET.erkek;
  }
  function cocukBul(id) {
    if (!id) return null;
    return _cocuklar.find(function (c) { return c.id === id; }) || null;
  }
  function cocukEtiket(c) {
    if (!c) return "—";
    return cinsiyetBilgi(c.cinsiyet).emoji + " " + (c.ad || "Çocuk");
  }
  function cocukNormalize(row, key) {
    if (!row || typeof row !== "object") return null;
    var ad = String(row.ad || row.isim || row.adSoyad || "").trim();
    if (!ad && row.kisi) ad = String(row.kisi).trim();
    if (!ad) return null;
    return {
      id: row.id || key || cocukUid(),
      ad: ad.slice(0, 40),
      cinsiyet: cinsiyetNorm(row.cinsiyet || row.gender)
    };
  }
  function cocukListeyeCevir(v) {
    var out = [];
    if (!v) return out;
    if (Array.isArray(v)) {
      v.forEach(function (row, i) {
        var n = cocukNormalize(row, row && row.id ? row.id : "cc-arr-" + i);
        if (n) out.push(n);
      });
      return out;
    }
    if (typeof v === "object") {
      Object.keys(v).forEach(function (key) {
        if (key === "kayitlar" || key === "v") return;
        var n = cocukNormalize(v[key], key);
        if (n) out.push(n);
      });
    }
    return out;
  }
  function cocuklariSirala() {
    _cocuklar.sort(function (a, b) {
      return (a.ad || "").localeCompare(b.ad || "", "tr");
    });
  }
  function aktifCocukSec(id) {
    if (id === "tumu" || id === "diger") {
      _aktifCocukId = id;
      return;
    }
    if (id && cocukBul(id)) {
      _aktifCocukId = id;
      return;
    }
    _aktifCocukId = "";
  }
  function atanmamisKayitlariIlkCocugaBagla(cocukId) {
    if (!cocukId) return;
    var degisti = false;
    _kayitlar.forEach(function (k) {
      if (k && !k.cocukId) {
        k.cocukId = cocukId;
        degisti = true;
      }
    });
    return degisti;
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
    if (tur === "bilezik") return "Bilezik";
    var g = CG_GRAM[tur] || 0;
    return (CG_LABEL[tur] || tur) + " (" + agr(g) + " gr)";
  }
  function kayitGram(k) {
    if (!k || k.cins === "para") return 0;
    if (k.tur === "bilezik") return parseFloat(k.gram) || parseFloat(k.adet) || 0;
    return (CG_GRAM[k.tur] || 0) * (parseFloat(k.adet) || 0);
  }
  function kayitTutar(k) {
    if (!k || k.cins !== "para") return 0;
    return parseFloat(k.tutar) || 0;
  }
  function kayitGuncel(k) {
    if (!k) return 0;
    if (k.cins === "para") return kayitTutar(k);
    return _gramFiyat > 0 ? kayitGram(k) * _gramFiyat : 0;
  }
  function turSecenekHtml(secili) {
    var h = "";
    CG_TURLER.forEach(function (t) {
      h += '<option value="' + t + '"' + (secili === t ? " selected" : "") + ">" + esc(turEtiket(t)) + "</option>";
    });
    return h;
  }

  async function gramFiyatYukle() {
    _gramFiyat = 0;
    if (typeof fbAltinFiyatOku === "function") {
      try {
        var cached = await fbAltinFiyatOku();
        if (cached && cached > 0) _gramFiyat = cached;
      } catch (e) {}
    } else if (typeof window._fbDb !== "undefined" && window._fbDb) {
      try {
        var v = parseFloat(await fbRtdbOku("altin_guncel_fiyat"));
        if (v && v > 0) _gramFiyat = v;
      } catch (e) {}
    }
    if (_gramFiyat <= 0) _gramFiyat = await gramFiyatCek();
    if (_gramFiyat > 0 && typeof fbAltinFiyatCacheYaz === "function") fbAltinFiyatCacheYaz(_gramFiyat);
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
      if (typeof fbAltinFiyatCacheYaz === "function") fbAltinFiyatCacheYaz(f);
    } catch (e) {}
  }

  function kayitNormalize(row, key) {
    if (!row || typeof row !== "object") return null;
    if ((row.ad || row.cinsiyet) && !row.kisi && !row.tarih && row.tutar == null && !row.tur && !row.cins) return null;
    var k = Object.assign({}, row);
    if (!k.id) k.id = key || uid();
    k.kisi = k.kisi || "";
    k.tarih = k.tarih || "";
    k.cocukId = k.cocukId || k.cocuk || "";
    k.cins = k.cins === "para" ? "para" : "altin";
    if (k.cins === "para") {
      k.tutar = parseFloat(k.tutar) || 0;
      delete k.tur;
      delete k.adet;
      delete k.gram;
    } else {
      k.tur = CG_TURLER.indexOf(k.tur) >= 0 ? k.tur : "ceyrek";
      if (k.tur === "bilezik") {
        k.gram = parseFloat(k.gram != null ? k.gram : k.adet) || 0;
        k.adet = 1;
      } else {
        k.adet = parseFloat(k.adet) || 1;
        k.gram = kayitGram(k);
      }
      delete k.tutar;
    }
    return k;
  }

  function sariliVeriMi(v) {
    return !!(v && typeof v === "object" && !Array.isArray(v) && (v.kayitlar || v.cocuklar));
  }

  function listeyeCevir(v) {
    var out = [];
    if (!v) return out;
    if (sariliVeriMi(v)) return listeyeCevir(v.kayitlar);
    if (Array.isArray(v)) {
      v.forEach(function (row, i) {
        var n = kayitNormalize(row, row && row.id ? row.id : "cg-arr-" + i);
        if (n) out.push(n);
      });
      return out;
    }
    if (typeof v === "object") {
      Object.keys(v).forEach(function (key) {
        if (key === "cocuklar" || key === "kayitlar" || key === "v" || key === "aktifCocukId") return;
        var n = kayitNormalize(v[key], key);
        if (n) out.push(n);
      });
    }
    return out;
  }

  function yerelPaketOku() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return { kayitlar: [], cocuklar: [], aktifCocukId: "" };
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return { kayitlar: listeyeCevir(parsed), cocuklar: [], aktifCocukId: "" };
      }
      return {
        kayitlar: listeyeCevir(parsed && parsed.kayitlar != null ? parsed.kayitlar : parsed),
        cocuklar: cocukListeyeCevir(parsed && parsed.cocuklar),
        aktifCocukId: parsed && parsed.aktifCocukId ? String(parsed.aktifCocukId) : ""
      };
    } catch (e) {
      return { kayitlar: [], cocuklar: [], aktifCocukId: "" };
    }
  }

  function yerelYaz() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        v: 2,
        kayitlar: _kayitlar,
        cocuklar: _cocuklar,
        aktifCocukId: _aktifCocukId
      }));
    } catch (e) {
      console.warn("[Cocugum] yerel yazılamadı", e);
    }
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
      var v = await fbRtdbOku("cocugum");
      var vCocuk = await fbRtdbOku("cocugum_cocuklar");
      var yerel = yerelPaketOku();
      var liste = listeyeCevir(v);
      var cocuklar = cocukListeyeCevir(vCocuk);
      if (sariliVeriMi(v) && !cocuklar.length) {
        cocuklar = cocukListeyeCevir(v.cocuklar);
      }
      if (!liste.length && yerel.kayitlar.length) liste = yerel.kayitlar;
      if (!cocuklar.length && yerel.cocuklar.length) cocuklar = yerel.cocuklar;
      if (liste.length > 0 || cocuklar.length > 0) {
        _kayitlar = liste;
        _cocuklar = cocuklar;
        cgSirala();
        cocuklariSirala();
        aktifCocukSec(yerel.aktifCocukId);
        yerelYaz();
        return true;
      }
      return false;
    } catch (e) {
      console.error("[Cocugum] yukle", e);
      return false;
    }
  }

  function cgSirala() {
    _kayitlar.sort(function (a, b) {
      var ta = a.tarih || "";
      var tb = b.tarih || "";
      if (!ta && !tb) return (a.kisi || "").localeCompare(b.kisi || "", "tr");
      if (!ta) return 1;
      if (!tb) return -1;
      return tb.localeCompare(ta);
    });
  }

  async function fbKaydet() {
    yerelYaz();
    await fbHazirBekle();
    if (!window._fbDb || typeof fbRtdbRef !== "function") return false;
    if (!fbKullaniciVarMi()) {
      console.warn("[Cocugum] oturum yok; veri yerelde saklandı");
      return false;
    }
    try {
      var obj = {};
      _kayitlar.forEach(function (k) {
        if (!k || !k.id) return;
        obj[k.id] = k;
      });
      var cocukObj = {};
      _cocuklar.forEach(function (c) {
        if (!c || !c.id) return;
        cocukObj[c.id] = { id: c.id, ad: c.ad, cinsiyet: c.cinsiyet };
      });
      var ref = fbRtdbRef("cocugum");
      var refCocuk = typeof fbRtdbRef === "function" ? fbRtdbRef("cocugum_cocuklar") : null;
      if (!ref) {
        console.warn("[Cocugum] FB ref yok; veri yerelde saklandı");
        return false;
      }
      await ref.set(obj);
      if (refCocuk) await refCocuk.set(cocukObj);
      return true;
    } catch (e) {
      console.error("[Cocugum] kaydet", e);
      return false;
    }
  }

  function formCins() {
    var aktif = document.querySelector(".cg-cins-btn.active");
    return aktif && aktif.dataset.cins === "para" ? "para" : "altin";
  }

  function formTurBilezikMi() {
    return (($("cg-tur") || {}).value || "") === "bilezik";
  }

  function formGramOnizleme() {
    var el = $("cg-gram-oniz");
    if (!el) return;
    if (formCins() === "para") {
      el.textContent = "—";
      return;
    }
    var tur = ($("cg-tur") || {}).value || "ceyrek";
    var miktar = parseFloat(($("cg-miktar") || {}).value) || 0;
    var gr = tur === "bilezik" ? miktar : (CG_GRAM[tur] || 0) * miktar;
    el.textContent = agr(gr) + " gr";
  }

  function cinsGoster(cins) {
    document.querySelectorAll(".cg-cins-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.cins === cins);
    });
    var altinAlan = $("cg-altin-alan");
    var paraAlan = $("cg-para-alan");
    var oniz = $("cg-gram-oniz-wrap");
    if (altinAlan) altinAlan.classList.toggle("hidden", cins !== "altin");
    if (paraAlan) paraAlan.classList.toggle("hidden", cins !== "para");
    if (oniz) oniz.classList.toggle("hidden", cins !== "altin");
    if (cins === "altin") miktarEtiketGuncelle();
  }

  function miktarEtiketGuncelle() {
    var lbl = $("cg-miktar-label");
    var inp = $("cg-miktar");
    var bilezik = formTurBilezikMi();
    if (lbl) lbl.textContent = bilezik ? "Gram" : "Adet";
    if (inp) {
      inp.placeholder = bilezik ? "9.90" : "1";
      inp.min = bilezik ? "0.01" : "0.01";
    }
    formGramOnizleme();
  }

  function modalAcikMi() {
    var m = $("cg-modal");
    return !!(m && !m.classList.contains("hidden"));
  }

  function detayAcikMi() {
    var m = $("cg-detay-modal");
    return !!(m && !m.classList.contains("hidden"));
  }

  function cocukModalAcikMi() {
    var m = $("cg-cocuk-modal");
    return !!(m && !m.classList.contains("hidden"));
  }

  function herhangiModalAcikMi() {
    return modalAcikMi() || detayAcikMi() || cocukModalAcikMi();
  }

  function ozetDegerYazi(oz) {
    var top = (oz && oz.altinGuncel || 0) + (oz && oz.para || 0);
    return {
      gram: agr(oz && oz.gram) + " gr",
      taki: _gramFiyat > 0 ? para(oz && oz.altinGuncel) + " TL" : "—",
      para: para(oz && oz.para) + " TL",
      toplam: (_gramFiyat > 0 || (oz && oz.para > 0)) ? para(top) + " TL" : "—",
      kayit: String(oz && oz.kayit || 0)
    };
  }

  function ozetListeForSatir(id) {
    if (id === "tumu") return _kayitlar;
    if (id === "diger" || !id) return cocukKayitlari("");
    return cocukKayitlari(id);
  }

  function fiyatGosterGuncelle() {
    var fiyatEl = $("cg-fiyat-val");
    if (fiyatEl) fiyatEl.textContent = _gramFiyat > 0 ? para(_gramFiyat) + " TL" : "…";
    document.querySelectorAll(".cg-kart[data-cocuk-id]").forEach(function (kart) {
      var y = ozetDegerYazi(ozetHesapla(ozetListeForSatir(kart.getAttribute("data-cocuk-id"))));
      var gram = kart.querySelector('[data-oz="gram"]');
      var taki = kart.querySelector('[data-oz="taki"]');
      var paraEl = kart.querySelector('[data-oz="para"]');
      var toplam = kart.querySelector('[data-oz="toplam"]');
      if (gram) gram.textContent = y.gram;
      if (taki) taki.textContent = y.taki;
      if (paraEl) paraEl.textContent = y.para;
      if (toplam) toplam.textContent = y.toplam;
    });
    formGramOnizleme();
  }

  function cocukKayitlari(cocukId) {
    if (!cocukId) {
      return _kayitlar.filter(function (k) { return !k.cocukId || !cocukBul(k.cocukId); });
    }
    return _kayitlar.filter(function (k) { return k.cocukId === cocukId; });
  }

  function filtrelenmis() {
    var kaynak;
    if (!_cocuklar.length || _aktifCocukId === "tumu") kaynak = _kayitlar.slice();
    else if (_aktifCocukId === "diger") kaynak = cocukKayitlari("");
    else kaynak = cocukKayitlari(_aktifCocukId);
    if (_filtre === "altin") return kaynak.filter(function (k) { return k.cins !== "para"; });
    if (_filtre === "para") return kaynak.filter(function (k) { return k.cins === "para"; });
    return kaynak;
  }

  function ozetHesapla(liste) {
    var topGram = 0, paraToplam = 0, altinSayi = 0, paraSayi = 0;
    liste.forEach(function (k) {
      if (k.cins === "para") {
        paraToplam += kayitTutar(k);
        paraSayi += 1;
      } else {
        topGram += kayitGram(k);
        altinSayi += 1;
      }
    });
    return {
      gram: topGram,
      para: paraToplam,
      altinGuncel: _gramFiyat > 0 ? topGram * _gramFiyat : 0,
      altinSayi: altinSayi,
      paraSayi: paraSayi,
      kayit: liste.length
    };
  }

  function guvenliRender() {
    if (herhangiModalAcikMi()) {
      fiyatGosterGuncelle();
      return;
    }
    render();
  }

  function miktarGoster(k) {
    if (k.cins === "para") return para(kayitTutar(k)) + " TL";
    if (k.tur === "bilezik") return agr(kayitGram(k)) + " gr";
    var adet = parseFloat(k.adet) || 1;
    return agr(adet) + " × " + (CG_LABEL[k.tur] || k.tur);
  }

  function turGoster(k) {
    if (k.cins === "para") return "Para";
    return turEtiket(k.tur);
  }

  function render() {
    var c = $("cocugum-container");
    if (!c) return;

    var h = '<div class="va-wrap cg-wrap">';
    h += '<div class="cg-arac">';
    h += '<div class="va-fiyat-satir">';
    h += '<span class="va-fiyat-label">Gram</span>';
    h += '<span class="va-fiyat-val" id="cg-fiyat-val">' + (_gramFiyat > 0 ? para(_gramFiyat) + " TL" : "…") + "</span>";
    h += '<button type="button" class="va-fiyat-btn" id="cg-fiyat-guncelle" title="Fiyatı güncelle">&#8635;</button>';
    h += "</div>";
    h += '<div class="cg-arac-sag">';
    h += '<button type="button" class="cg-cocuk-ekle" id="cg-cocuk-ekle">+ Çocuk</button>';
    h += '<button type="button" class="va-ekle-btn" id="cg-ekle-btn">+ Hediye</button>';
    h += "</div></div>";
    h += ozetKartlarHtml();
    h += detayPanelHtml();

    h += '<div class="bk-modal-overlay hidden" id="cg-modal"><div class="modal-box va-form-modal">';
    h += '<div class="modal-header"><h2 class="modal-title" id="cg-modal-baslik">Çocuğum</h2>';
    h += '<button type="button" class="modal-close" id="cg-modal-kapat">&#10005;</button></div>';
    h += '<div class="modal-body va-form-body">';
    h += cocukFormSecimHtml();
    h += '<div class="va-form-cift">';
    h += '<div class="field-group"><label class="field-label">Kişi</label>';
    h += '<input type="text" id="cg-kisi" class="field-input" placeholder="Kim taktı / verdi..." maxlength="80"/></div>';
    h += '<div class="field-group va-fg-tarih"><label class="field-label">Tarih</label>';
    h += '<input type="date" id="cg-tarih" class="field-input"/></div>';
    h += "</div>";
    h += '<div class="field-group"><label class="field-label">Kayıt türü</label>';
    h += '<div class="cg-cins-sec">';
    h += '<button type="button" class="cg-cins-btn active" data-cins="altin">Altın / Takı</button>';
    h += '<button type="button" class="cg-cins-btn" data-cins="para">Para</button>';
    h += "</div></div>";
    h += '<div id="cg-altin-alan">';
    h += '<div class="va-form-cift">';
    h += '<div class="field-group"><label class="field-label">Tür</label>';
    h += '<select id="cg-tur" class="field-input">' + turSecenekHtml("ceyrek") + "</select></div>";
    h += '<div class="field-group va-fg-adet"><label class="field-label" id="cg-miktar-label">Adet</label>';
    h += '<input type="number" id="cg-miktar" class="field-input" value="1" min="0.01" step="0.01" inputmode="decimal"/></div>';
    h += "</div>";
    h += '<div class="va-gram-oniz-wrap" id="cg-gram-oniz-wrap">Toplam: <strong id="cg-gram-oniz">1,75 gr</strong></div>';
    h += "</div>";
    h += '<div id="cg-para-alan" class="hidden">';
    h += '<div class="field-group"><label class="field-label">Tutar (TL)</label>';
    h += '<input type="number" id="cg-tutar" class="field-input" placeholder="0,00" min="0" step="0.01" inputmode="decimal"/></div>';
    h += "</div>";
    h += "</div>";
    h += '<div class="modal-footer"><button type="button" class="btn-secondary" id="cg-iptal">İptal</button>';
    h += '<button type="button" class="btn-primary" id="cg-kaydet">Kaydet</button></div>';
    h += "</div></div>";

    h += '<div class="bk-modal-overlay hidden" id="cg-detay-modal">';
    h += '<div class="modal-box va-detay-box">';
    h += '<div class="modal-header"><h2 class="modal-title" id="cg-detay-baslik">Kayıt</h2>';
    h += '<button type="button" class="modal-close" id="cg-detay-kapat">&#10005;</button></div>';
    h += '<div class="modal-body va-detay-body" id="cg-detay-body"></div>';
    h += '<div class="modal-footer va-detay-footer">';
    h += '<button type="button" class="btn-secondary" id="cg-detay-sil">Sil</button>';
    h += '<button type="button" class="btn-primary" id="cg-detay-duzenle">Düzenle</button>';
    h += "</div></div></div>";

    h += cocukModalHtml();

    h += "</div>";
    c.innerHTML = h;
    bagla();
  }

  function kartMetrikHtml(oz, toplamGoster) {
    var y = ozetDegerYazi(oz);
    var h = '<div class="cg-kart-metrikler">';
    h += '<div class="cg-kart-metrik">';
    h += '<span class="cg-kart-lbl">Altın</span>';
    h += '<span class="cg-kart-val cg-kart-val--au" data-oz="gram">' + y.gram + "</span>";
    h += '<span class="cg-kart-alt" data-oz="taki">' + y.taki + "</span>";
    h += "</div>";
    h += '<div class="cg-kart-metrik">';
    h += '<span class="cg-kart-lbl">Para</span>';
    h += '<span class="cg-kart-val cg-kart-val--para" data-oz="para">' + y.para + "</span>";
    h += "</div>";
    if (toplamGoster) {
      h += '<div class="cg-kart-metrik cg-kart-metrik--top">';
      h += '<span class="cg-kart-lbl">Toplam</span>';
      h += '<span class="cg-kart-val cg-kart-val--top" data-oz="toplam">' + y.toplam + "</span>";
      h += "</div>";
    }
    h += "</div>";
    return h;
  }

  function ozetKartHtml(opts) {
    var cls = "cg-kart";
    if (opts.toplamMi) cls += " cg-kart--toplam";
    if (opts.aktif) cls += " active";
    var h = '<button type="button" class="' + cls + '" data-cocuk-id="' + esc(opts.id) + '">';
    h += '<div class="cg-kart-ust">';
    h += '<span class="cg-kart-ikon">' + (opts.ikon || "") + "</span>";
    h += '<span class="cg-kart-ad">' + opts.ad + "</span>";
    if (opts.duzenId) {
      h += '<span class="cg-kart-duzen" data-cocuk-duzen="' + esc(opts.duzenId) + '" title="Düzenle">&#9998;</span>';
    }
    h += "</div>";
    h += kartMetrikHtml(opts.oz, !!opts.toplamMi);
    h += '<div class="cg-kart-not">' + (opts.kayit || 0) + " kayıt · detay için dokun</div>";
    h += "</button>";
    return h;
  }

  function ozetKartlarHtml() {
    if (!_cocuklar.length && !_kayitlar.length) {
      var bos = '<div class="va-bos"><div class="va-bos-ikon">&#128118;</div><div>Önce çocuk ekleyin, sonra takı ve para kaydı girin</div>';
      bos += '<button type="button" class="va-ekle-btn cg-bos-cocuk-btn" id="cg-bos-cocuk">+ Çocuk ekle</button></div>';
      return bos;
    }
    var genel = ozetHesapla(_kayitlar);
    var h = '<div class="cg-kartlar">';
    h += ozetKartHtml({
      id: "tumu",
      ikon: "&#128176;",
      ad: "Tüm özet",
      oz: genel,
      kayit: genel.kayit,
      toplamMi: true,
      aktif: _aktifCocukId === "tumu"
    });
    h += '<div class="cg-kart-grid">';
    if (_cocuklar.length) {
      _cocuklar.forEach(function (c) {
        var oz = ozetHesapla(cocukKayitlari(c.id));
        h += ozetKartHtml({
          id: c.id,
          ikon: cinsiyetBilgi(c.cinsiyet).emoji,
          ad: esc(c.ad),
          oz: oz,
          kayit: oz.kayit,
          duzenId: c.id,
          aktif: _aktifCocukId === c.id
        });
      });
      var atanmamis = cocukKayitlari("");
      if (atanmamis.length) {
        var dOz = ozetHesapla(atanmamis);
        h += ozetKartHtml({
          id: "diger",
          ikon: "&#128118;",
          ad: "Diğer",
          oz: dOz,
          kayit: dOz.kayit,
          aktif: _aktifCocukId === "diger"
        });
      }
    }
    h += "</div></div>";
    return h;
  }

  function detayBaslik() {
    if (_aktifCocukId === "tumu") return "Tüm çocuklar";
    if (_aktifCocukId === "diger") return "Diğer kayıtlar";
    var c = cocukBul(_aktifCocukId);
    return c ? cocukEtiket(c) : "Detay";
  }

  function hediyeKartHtml(k) {
    var paraMi = k.cins === "para";
    var gr = kayitGram(k);
    var guncel = kayitGuncel(k);
    var cocuk = cocukBul(k.cocukId);
    var h = '<article class="cg-hediye cg-satir" data-id="' + k.id + '">';
    h += '<div class="cg-hediye-ust">';
    h += '<strong class="cg-hediye-kisi">' + esc(k.kisi || "—") + "</strong>";
    h += '<span class="cg-hediye-tarih">' + (k.tarih ? tarihFmt(k.tarih) : "—") + "</span>";
    h += "</div>";
    if (_aktifCocukId === "tumu" && cocuk) {
      h += '<div class="cg-hediye-cocuk">' + esc(cocukEtiket(cocuk)) + "</div>";
    }
    h += '<div class="cg-hediye-alt">';
    h += '<span class="' + (paraMi ? "cg-hediye-para" : "cg-hediye-taki") + '">';
    h += esc(miktarGoster(k));
    if (!paraMi) h += " · " + agr(gr) + " gr";
    h += "</span>";
    h += '<span class="' + (paraMi ? "cg-hediye-para" : "cg-hediye-guncel") + '">';
    h += paraMi || _gramFiyat > 0 ? para(guncel) + " TL" : "—";
    h += "</span></div>";
    h += '<div class="cg-hediye-aks">';
    h += '<button type="button" class="cg-duz-btn row-action-btn duzenle" data-id="' + k.id + '" title="Düzenle">&#9998;</button>';
    h += '<button type="button" class="cg-sil-btn row-action-btn sil" data-id="' + k.id + '" title="Sil">&#10005;</button>';
    h += "</div></article>";
    return h;
  }

  function detayPanelHtml() {
    if (!_aktifCocukId) {
      if (_cocuklar.length || _kayitlar.length) {
        return '<div class="cg-detay-ipucu">Bir karta dokunarak kim, ne zaman, ne taktı detayını görün</div>';
      }
      return "";
    }
    var liste = filtrelenmis();
    var h = '<div class="cg-detay-panel">';
    h += '<div class="cg-detay-head">';
    h += '<div class="cg-detay-title">' + esc(detayBaslik()) + " — kim ne zaman ne taktı</div>";
    h += '<div class="cg-filtre">';
    [["tumu", "Tümü"], ["altin", "Altın / Takı"], ["para", "Para"]].forEach(function (f) {
      h += '<button type="button" class="cg-filtre-btn' + (_filtre === f[0] ? " active" : "") + '" data-filtre="' + f[0] + '">' + f[1] + "</button>";
    });
    h += "</div></div>";
    if (!liste.length) {
      h += '<div class="va-bos cg-detay-bos">Bu seçimde kayıt yok</div>';
    } else {
      h += '<div class="cg-hediye-list">';
      liste.forEach(function (k) {
        h += hediyeKartHtml(k);
      });
      h += "</div>";
    }
    h += "</div>";
    return h;
  }

  function hediyeCocukSeciliId() {
    if (_aktifCocukId && cocukBul(_aktifCocukId)) return _aktifCocukId;
    return _cocuklar.length ? _cocuklar[0].id : "";
  }

  function cocukFormSecimHtml() {
    if (_cocuklar.length < 2) return "";
    var secili = hediyeCocukSeciliId();
    var h = '<div class="field-group"><label class="field-label">Çocuk</label>';
    h += '<select id="cg-hediye-cocuk" class="field-input">';
    _cocuklar.forEach(function (c) {
      var sec = c.id === secili ? " selected" : "";
      h += '<option value="' + esc(c.id) + '"' + sec + ">" + esc(cocukEtiket(c)) + "</option>";
    });
    h += "</select></div>";
    return h;
  }

  function cocukModalHtml() {
    var h = '<div class="bk-modal-overlay hidden" id="cg-cocuk-modal"><div class="modal-box va-form-modal cg-cocuk-modal-box">';
    h += '<div class="modal-header"><h2 class="modal-title" id="cg-cocuk-baslik">Çocuk Ekle</h2>';
    h += '<button type="button" class="modal-close" id="cg-cocuk-kapat">&#10005;</button></div>';
    h += '<div class="modal-body va-form-body">';
    h += '<div class="field-group"><label class="field-label">İsim</label>';
    h += '<input type="text" id="cg-cocuk-ad" class="field-input" placeholder="Çocuğun adı..." maxlength="40" autocomplete="off"/></div>';
    h += '<div class="field-group"><label class="field-label">Cinsiyet</label>';
    h += '<div class="cg-cinsiyet-sec" id="cg-cinsiyet-sec">';
    ["erkek", "kiz"].forEach(function (id) {
      var info = CG_CINSIYET[id];
      h += '<button type="button" class="cg-cinsiyet-btn' + (id === "erkek" ? " active" : "") + '" data-cinsiyet="' + id + '">';
      h += '<span class="cg-cinsiyet-emoji">' + info.emoji + "</span>";
      h += '<span class="cg-cinsiyet-label">' + esc(info.label) + "</span>";
      h += "</button>";
    });
    h += "</div></div>";
    h += "</div>";
    h += '<div class="modal-footer cg-cocuk-footer">';
    h += '<button type="button" class="btn-secondary hidden" id="cg-cocuk-sil">Sil</button>';
    h += '<button type="button" class="btn-secondary" id="cg-cocuk-iptal">İptal</button>';
    h += '<button type="button" class="btn-primary" id="cg-cocuk-kaydet">Kaydet</button>';
    h += "</div></div></div>";
    return h;
  }

  function detayKapat() {
    var m = $("cg-detay-modal");
    if (m) m.classList.add("hidden");
    _aktif = null;
  }

  function detayAc(k) {
    if (!k) return;
    _aktif = k;
    var paraMi = k.cins === "para";
    var gr = kayitGram(k);
    var guncel = kayitGuncel(k);
    var bas = $("cg-detay-baslik");
    var body = $("cg-detay-body");
    if (bas) bas.textContent = k.kisi || "Kayıt";
    if (body) {
      var h = '<div class="va-detay-grid">';
      var cocuk = cocukBul(k.cocukId);
      if (cocuk) {
        h += '<div class="va-detay-item"><span class="va-detay-l">Çocuk</span><span class="va-detay-v">' + esc(cocukEtiket(cocuk)) + "</span></div>";
      }
      h += '<div class="va-detay-item"><span class="va-detay-l">Kişi</span><span class="va-detay-v">' + esc(k.kisi || "—") + "</span></div>";
      h += '<div class="va-detay-item"><span class="va-detay-l">Tarih</span><span class="va-detay-v">' + (k.tarih ? tarihFmt(k.tarih) : "—") + "</span></div>";
      h += '<div class="va-detay-item"><span class="va-detay-l">Tür</span><span class="va-detay-v ' + (paraMi ? "va-detay-v--ok" : "va-detay-v--au") + '">' + esc(turGoster(k)) + "</span></div>";
      h += '<div class="va-detay-item"><span class="va-detay-l">Miktar</span><span class="va-detay-v ' + (paraMi ? "va-detay-v--ok" : "va-detay-v--au") + '">' + esc(miktarGoster(k)) + "</span></div>";
      if (!paraMi) {
        h += '<div class="va-detay-item"><span class="va-detay-l">Gram</span><span class="va-detay-v va-detay-v--au">' + agr(gr) + " gr</span></div>";
      }
      h += '<div class="va-detay-item' + (paraMi ? " va-detay-item--full" : "") + '"><span class="va-detay-l">' + (paraMi ? "Tutar" : "Güncel değer") + '</span><span class="va-detay-v va-detay-v--ok">' + (paraMi || _gramFiyat > 0 ? para(guncel) + " TL" : "—") + "</span></div>";
      h += "</div>";
      body.innerHTML = h;
    }
    _modalKoruma = Date.now() + 450;
    var m = $("cg-detay-modal");
    if (m) {
      m.classList.remove("hidden");
      m.style.pointerEvents = "none";
      setTimeout(function () {
        var dm = $("cg-detay-modal");
        if (dm && !dm.classList.contains("hidden")) dm.style.pointerEvents = "";
      }, 350);
    }
  }

  function modalKapat() {
    var m = $("cg-modal");
    if (m) {
      m.classList.add("hidden");
      m.style.pointerEvents = "";
    }
    _aktif = null;
    _modalKoruma = 0;
  }

  function formCocukId() {
    var sel = $("cg-hediye-cocuk");
    if (sel && sel.value) return sel.value;
    if (_aktif && _aktif.cocukId && cocukBul(_aktif.cocukId)) return _aktif.cocukId;
    return hediyeCocukSeciliId();
  }

  function cinsiyetSec(id) {
    document.querySelectorAll(".cg-cinsiyet-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.cinsiyet === id);
    });
  }

  function formCinsiyet() {
    var aktif = document.querySelector(".cg-cinsiyet-btn.active");
    return cinsiyetNorm(aktif && aktif.dataset.cinsiyet);
  }

  function cocukModalKapat() {
    var m = $("cg-cocuk-modal");
    if (m) {
      m.classList.add("hidden");
      m.style.pointerEvents = "";
    }
    _cocukDuzenle = null;
  }

  function cocukModalAc(c) {
    _cocukDuzenle = c || null;
    var bas = $("cg-cocuk-baslik");
    var ad = $("cg-cocuk-ad");
    var sil = $("cg-cocuk-sil");
    if (bas) bas.textContent = c ? "Çocuğu Düzenle" : "Çocuk Ekle";
    if (ad) ad.value = c ? c.ad || "" : "";
    cinsiyetSec(c ? cinsiyetNorm(c.cinsiyet) : "erkek");
    if (sil) sil.classList.toggle("hidden", !c);
    _modalKoruma = Date.now() + 450;
    var modal = $("cg-cocuk-modal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.style.pointerEvents = "none";
    }
    setTimeout(function () {
      var m = $("cg-cocuk-modal");
      if (m && !m.classList.contains("hidden")) m.style.pointerEvents = "";
      if (ad) ad.focus();
    }, 350);
  }

  async function cocukKaydet() {
    var adEl = $("cg-cocuk-ad");
    var ad = (adEl && adEl.value || "").trim();
    if (!ad) {
      if (adEl) adEl.focus();
      return;
    }
    var cinsiyet = formCinsiyet();
    var ilkCocuk = !_cocuklar.length;
    if (_cocukDuzenle) {
      var i = _cocuklar.findIndex(function (x) { return x.id === _cocukDuzenle.id; });
      if (i >= 0) {
        _cocuklar[i] = { id: _cocukDuzenle.id, ad: ad.slice(0, 40), cinsiyet: cinsiyet };
        _aktifCocukId = _cocukDuzenle.id;
      }
    } else {
      var yeni = { id: cocukUid(), ad: ad.slice(0, 40), cinsiyet: cinsiyet };
      _cocuklar.push(yeni);
      _aktifCocukId = yeni.id;
      if (ilkCocuk) atanmamisKayitlariIlkCocugaBagla(yeni.id);
    }
    cocuklariSirala();
    await fbKaydet();
    cocukModalKapat();
    render();
  }

  async function cocukSil() {
    if (!_cocukDuzenle) return;
    var id = _cocukDuzenle.id;
    var sayi = cocukKayitlari(id).length;
    var mesaj = sayi
      ? "Bu çocuğu silmek, ona ait " + sayi + " hediye kaydını da siler. Devam?"
      : "Bu çocuğu silmek istiyor musunuz?";
    if (!confirm(mesaj)) return;
    _cocuklar = _cocuklar.filter(function (c) { return c.id !== id; });
    _kayitlar = _kayitlar.filter(function (k) { return k.cocukId !== id; });
    aktifCocukSec("");
    await fbKaydet();
    cocukModalKapat();
    render();
  }

  function modalAc(k) {
    if (!k && !_cocuklar.length) {
      cocukModalAc(null);
      return;
    }
    _aktif = k || null;
    $("cg-modal-baslik").textContent = k ? "Kaydı Düzenle" : "Hediye Ekle";
    var hediyeCocuk = $("cg-hediye-cocuk");
    if (hediyeCocuk) hediyeCocuk.value = k && k.cocukId && cocukBul(k.cocukId) ? k.cocukId : hediyeCocukSeciliId();
    $("cg-kisi").value = k ? k.kisi || "" : "";
    $("cg-tarih").value = k ? k.tarih || bugun() : bugun();
    var cins = k && k.cins === "para" ? "para" : "altin";
    cinsGoster(cins);
    if (cins === "para") {
      $("cg-tutar").value = k && k.tutar ? String(k.tutar) : "";
      $("cg-tur").value = "ceyrek";
      $("cg-miktar").value = "1";
    } else {
      var tur = k && CG_TURLER.indexOf(k.tur) >= 0 ? k.tur : "ceyrek";
      $("cg-tur").value = tur;
      if (tur === "bilezik") $("cg-miktar").value = k && k.gram ? String(k.gram) : "";
      else $("cg-miktar").value = k ? String(k.adet || 1) : "1";
      $("cg-tutar").value = "";
    }
    miktarEtiketGuncelle();
    _modalKoruma = Date.now() + 450;
    var modal = $("cg-modal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.style.pointerEvents = "none";
    }
    setTimeout(function () {
      var m = $("cg-modal");
      if (m && !m.classList.contains("hidden")) m.style.pointerEvents = "";
      var kisi = $("cg-kisi");
      if (kisi) kisi.focus();
    }, 350);
  }

  function bagla() {
    var ekleBtn = $("cg-ekle-btn");
    if (ekleBtn) {
      ekleBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        modalAc(null);
      });
    }
    var bosCocuk = $("cg-bos-cocuk");
    if (bosCocuk) {
      bosCocuk.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        cocukModalAc(null);
      });
    }
    var cocukEkle = $("cg-cocuk-ekle");
    if (cocukEkle) {
      cocukEkle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        cocukModalAc(null);
      });
    }
    document.querySelectorAll(".cg-kart[data-cocuk-id]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        var duzen = e.target.closest && e.target.closest("[data-cocuk-duzen]");
        if (duzen) {
          e.preventDefault();
          e.stopPropagation();
          var c = cocukBul(duzen.getAttribute("data-cocuk-duzen"));
          if (c) cocukModalAc(c);
          return;
        }
        var id = btn.getAttribute("data-cocuk-id") || "tumu";
        if (id === _aktifCocukId) aktifCocukSec("");
        else aktifCocukSec(id);
        yerelYaz();
        render();
        var panel = document.querySelector(".cg-detay-panel");
        if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    var cocukModal = $("cg-cocuk-modal");
    var cocukKapat = $("cg-cocuk-kapat");
    var cocukIptal = $("cg-cocuk-iptal");
    var cocukKaydetBtn = $("cg-cocuk-kaydet");
    var cocukSilBtn = $("cg-cocuk-sil");
    if (cocukKapat) cocukKapat.addEventListener("click", cocukModalKapat);
    if (cocukIptal) cocukIptal.addEventListener("click", cocukModalKapat);
    if (cocukKaydetBtn) cocukKaydetBtn.addEventListener("click", cocukKaydet);
    if (cocukSilBtn) cocukSilBtn.addEventListener("click", cocukSil);
    if (cocukModal) {
      cocukModal.addEventListener("click", function (e) {
        if (e.target !== cocukModal) return;
        if (Date.now() < _modalKoruma) return;
        cocukModalKapat();
      });
      var cocukBox = cocukModal.querySelector(".cg-cocuk-modal-box");
      if (cocukBox) cocukBox.addEventListener("click", function (e) { e.stopPropagation(); });
    }
    document.querySelectorAll(".cg-cinsiyet-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cinsiyetSec(btn.dataset.cinsiyet);
      });
    });
    var adInput = $("cg-cocuk-ad");
    if (adInput) {
      adInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          cocukKaydet();
        }
      });
    }
    $("cg-modal-kapat").addEventListener("click", modalKapat);
    $("cg-iptal").addEventListener("click", modalKapat);
    $("cg-modal").addEventListener("click", function (e) {
      if (e.target !== $("cg-modal")) return;
      if (Date.now() < _modalKoruma) return;
      modalKapat();
    });
    var modalBox = $("cg-modal") && $("cg-modal").querySelector(".va-form-modal");
    if (modalBox) {
      modalBox.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }
    $("cg-kaydet").addEventListener("click", kaydet);
    $("cg-tur").addEventListener("change", miktarEtiketGuncelle);
    $("cg-miktar").addEventListener("input", formGramOnizleme);
    document.querySelectorAll(".cg-cins-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        cinsGoster(btn.dataset.cins);
      });
    });
    document.querySelectorAll(".cg-filtre-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        _filtre = btn.dataset.filtre || "tumu";
        render();
      });
    });

    var fbtn = $("cg-fiyat-guncelle");
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
          guvenliRender();
        } else {
          alert("Fiyat alınamadı, lütfen tekrar deneyin.");
        }
      });
    }

    document.querySelectorAll(".cg-satir").forEach(function (tr) {
      tr.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest(".row-action-btn")) return;
        var id = tr.getAttribute("data-id");
        var k = _kayitlar.find(function (x) {
          return x.id === id;
        });
        if (k) detayAc(k);
      });
    });
    document.querySelectorAll(".cg-duz-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var k = _kayitlar.find(function (x) {
          return x.id === btn.dataset.id;
        });
        if (k) modalAc(k);
      });
    });
    document.querySelectorAll(".cg-sil-btn").forEach(function (btn) {
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

    var detayM = $("cg-detay-modal");
    var detayKapatBtn = $("cg-detay-kapat");
    var detayDuz = $("cg-detay-duzenle");
    var detaySil = $("cg-detay-sil");
    if (detayKapatBtn) detayKapatBtn.addEventListener("click", detayKapat);
    if (detayM) {
      detayM.addEventListener("click", function (e) {
        if (e.target !== detayM) return;
        if (Date.now() < _modalKoruma) return;
        detayKapat();
      });
      var detayBox = detayM.querySelector(".va-detay-box");
      if (detayBox) detayBox.addEventListener("click", function (e) { e.stopPropagation(); });
    }
    if (detayDuz) {
      detayDuz.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
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
    var kisi = ($("cg-kisi").value || "").trim();
    var tarih = ($("cg-tarih").value || "").trim();
    var cins = formCins();
    if (!kisi) {
      $("cg-kisi").focus();
      return;
    }
    if (!tarih) {
      $("cg-tarih").focus();
      return;
    }
    var kayit = {
      id: _aktif ? _aktif.id : uid(),
      kisi: kisi,
      tarih: tarih,
      cins: cins,
      cocukId: formCocukId() || _aktifCocukId || ""
    };
    if (cins === "para") {
      var tutar = parseFloat($("cg-tutar").value) || 0;
      if (tutar <= 0) {
        $("cg-tutar").focus();
        return;
      }
      kayit.tutar = tutar;
    } else {
      var tur = $("cg-tur").value;
      var miktar = parseFloat($("cg-miktar").value) || 0;
      if (CG_TURLER.indexOf(tur) < 0) {
        alert("Altın türü seçiniz.");
        return;
      }
      if (miktar <= 0) {
        $("cg-miktar").focus();
        return;
      }
      kayit.tur = tur;
      if (tur === "bilezik") {
        kayit.adet = 1;
        kayit.gram = miktar;
      } else {
        kayit.adet = miktar;
        kayit.gram = (CG_GRAM[tur] || 0) * miktar;
      }
    }
    if (_aktif) {
      var i = _kayitlar.findIndex(function (x) {
        return x.id === _aktif.id;
      });
      if (i >= 0) _kayitlar[i] = kayit;
    } else {
      _kayitlar.push(kayit);
    }
    if (kayit.cocukId) aktifCocukSec(kayit.cocukId);
    cgSirala();
    await fbKaydet();
    _filtre = "tumu";
    modalKapat();
    render();
  }

  async function initOnce() {
    var fbOk = await fbYukle();
    if (!fbOk) {
      var yerel = yerelPaketOku();
      if (yerel.kayitlar.length > 0 || yerel.cocuklar.length > 0) {
        _kayitlar = yerel.kayitlar;
        _cocuklar = yerel.cocuklar;
        cgSirala();
        cocuklariSirala();
        aktifCocukSec(yerel.aktifCocukId);
        await fbKaydet();
      }
    }
    await gramFiyatYukle();
    guvenliRender();
    gramFiyatCek().then(function (f) {
      if (f > 0) {
        _gramFiyat = f;
        guvenliRender();
        gramFiyatKaydet(f);
      }
    });
  }

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = initOnce().catch(function (e) {
      console.error("[Cocugum] init", e);
    }).then(function () {
      _initPromise = null;
    });
    return _initPromise;
  }

  return { init: init };
})();
