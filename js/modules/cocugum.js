/* cocugum.js — doğan çocuğa takılan takı ve verilen paralar */
var CocugumModule = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var _kayitlar = [];
  var _aktif = null;
  var _gramFiyat = 0;
  var _initPromise = null;
  var _modalKoruma = 0;
  var _filtre = "tumu";
  var LS_KEY = "hk-cocugum";

  var CG_GRAM = { gram: 1, ceyrek: 1.75, yarim: 3.5, tam: 7, ata: 7.2, bilezik: 1 };
  var CG_LABEL = { gram: "Gram", ceyrek: "Çeyrek", yarim: "Yarım", tam: "Tam", ata: "Ata", bilezik: "Bilezik" };
  var CG_TURLER = ["gram", "ceyrek", "yarim", "tam", "ata", "bilezik"];

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
    var k = Object.assign({}, row);
    if (!k.id) k.id = key || uid();
    k.kisi = k.kisi || "";
    k.tarih = k.tarih || "";
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

  function listeyeCevir(v) {
    var out = [];
    if (!v) return out;
    if (Array.isArray(v)) {
      v.forEach(function (row, i) {
        var n = kayitNormalize(row, row && row.id ? row.id : "cg-arr-" + i);
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
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      return listeyeCevir(JSON.parse(raw));
    } catch (e) {
      return [];
    }
  }

  function yerelYaz() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(_kayitlar));
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
      var liste = listeyeCevir(v);
      if (liste.length > 0) {
        _kayitlar = liste;
        cgSirala();
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
      var ref = fbRtdbRef("cocugum");
      if (!ref) {
        console.warn("[Cocugum] FB ref yok; veri yerelde saklandı");
        return false;
      }
      await ref.set(obj);
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

  function herhangiModalAcikMi() {
    return modalAcikMi() || detayAcikMi();
  }

  function fiyatGosterGuncelle() {
    var ozet = ozetHesapla(filtrelenmis());
    var fiyatEl = $("cg-fiyat-val");
    if (fiyatEl) fiyatEl.textContent = _gramFiyat > 0 ? para(_gramFiyat) + " TL" : "…";
    var guncelEl = $("cg-guncel-deger");
    if (guncelEl) guncelEl.textContent = _gramFiyat > 0 ? para(ozet.altinGuncel) + " TL" : "—";
    var toplamEl = $("cg-toplam-deger");
    if (toplamEl) {
      var top = ozet.altinGuncel + ozet.para;
      toplamEl.textContent = (_gramFiyat > 0 || ozet.para > 0) ? para(top) + " TL" : "—";
    }
    formGramOnizleme();
  }

  function filtrelenmis() {
    if (_filtre === "altin") return _kayitlar.filter(function (k) { return k.cins !== "para"; });
    if (_filtre === "para") return _kayitlar.filter(function (k) { return k.cins === "para"; });
    return _kayitlar.slice();
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

    var liste = filtrelenmis();
    var oz = ozetHesapla(liste);
    var genelToplam = oz.altinGuncel + oz.para;

    var h = '<div class="va-wrap cg-wrap">';
    h += '<div class="va-header">';
    h += '<div class="va-ozet">';
    h += '<div class="va-oz-item"><span class="va-oz-label">Gram</span><span class="va-oz-val va-oz-au">' + agr(oz.gram) + " gr</span></div>";
    h += '<div class="va-oz-item"><span class="va-oz-label">Altın</span><span class="va-oz-val va-oz-guncel" id="cg-guncel-deger">';
    h += _gramFiyat > 0 ? para(oz.altinGuncel) + " TL" : "—";
    h += "</span></div>";
    h += '<div class="va-oz-item"><span class="va-oz-label">Para</span><span class="va-oz-val va-oz-para">' + para(oz.para) + " TL</span></div>";
    h += '<div class="va-oz-item"><span class="va-oz-label">Toplam</span><span class="va-oz-val" id="cg-toplam-deger" style="color:var(--gold)">';
    h += (_gramFiyat > 0 || oz.para > 0) ? para(genelToplam) + " TL" : "—";
    h += "</span></div>";
    h += '<div class="va-oz-item"><span class="va-oz-label">Kayıt</span><span class="va-oz-val va-oz-sayi">' + oz.kayit + "</span></div>";
    h += "</div>";
    h += '<div class="va-fiyat-satir">';
    h += '<span class="va-fiyat-label">Gram</span>';
    h += '<span class="va-fiyat-val" id="cg-fiyat-val">' + (_gramFiyat > 0 ? para(_gramFiyat) + " TL" : "…") + "</span>";
    h += '<button type="button" class="va-fiyat-btn" id="cg-fiyat-guncelle" title="Fiyatı güncelle">&#8635;</button>';
    h += "</div>";
    h += '<button type="button" class="va-ekle-btn" id="cg-ekle-btn">+ Ekle</button>';
    h += "</div>";

    h += '<div class="cg-filtre">';
    [["tumu", "Tümü"], ["altin", "Altın / Takı"], ["para", "Para"]].forEach(function (f) {
      h += '<button type="button" class="cg-filtre-btn' + (_filtre === f[0] ? " active" : "") + '" data-filtre="' + f[0] + '">' + f[1] + "</button>";
    });
    h += "</div>";

    if (!liste.length) {
      var bosMetin = _kayitlar.length && _filtre !== "tumu"
        ? "Bu filtrede kayıt yok"
        : "Henüz çocuk hediyesi kaydı yok";
      h += '<div class="va-bos"><div class="va-bos-ikon">&#128118;</div><div>' + bosMetin + "</div></div>";
    } else {
      h += '<div class="va-tablo-dis"><table class="va-tablo"><thead><tr>';
      h += "<th>KİŞİ</th><th>TARİH</th><th>TÜR</th><th>MİKTAR</th><th>GRAM</th><th>GÜNCEL</th><th></th>";
      h += "</tr></thead><tbody>";
      liste.forEach(function (k) {
        var paraMi = k.cins === "para";
        var gr = kayitGram(k);
        var guncel = kayitGuncel(k);
        h += '<tr class="va-satir cg-satir" data-id="' + k.id + '">';
        h += '<td class="va-td-kisi">' + esc(k.kisi || "—") + "</td>";
        h += '<td class="va-td-tarih">' + (k.tarih ? tarihFmt(k.tarih) : "—") + "</td>";
        h += '<td class="' + (paraMi ? "va-td-para" : "va-td-tur") + '">' + esc(turGoster(k)) + "</td>";
        h += '<td class="' + (paraMi ? "va-td-para" : "va-td-tur") + '">' + esc(miktarGoster(k)) + "</td>";
        h += '<td class="va-td-gram">' + (paraMi ? "—" : agr(gr) + " gr") + "</td>";
        h += '<td class="' + (paraMi ? "va-td-para" : "va-td-guncel") + '">';
        h += paraMi || _gramFiyat > 0 ? para(guncel) + " TL" : "—";
        h += "</td>";
        h += '<td class="va-td-aks">';
        h += '<button type="button" class="cg-duz-btn row-action-btn duzenle" data-id="' + k.id + '" title="Düzenle">&#9998;</button> ';
        h += '<button type="button" class="cg-sil-btn row-action-btn sil" data-id="' + k.id + '" title="Sil">&#10005;</button>';
        h += "</td></tr>";
      });
      h += "</tbody></table></div>";
    }

    h += '<div class="bk-modal-overlay hidden" id="cg-modal"><div class="modal-box va-form-modal">';
    h += '<div class="modal-header"><h2 class="modal-title" id="cg-modal-baslik">Çocuğum</h2>';
    h += '<button type="button" class="modal-close" id="cg-modal-kapat">&#10005;</button></div>';
    h += '<div class="modal-body va-form-body">';
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

    h += "</div>";
    c.innerHTML = h;
    bagla();
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

  function modalAc(k) {
    _aktif = k || null;
    $("cg-modal-baslik").textContent = k ? "Kaydı Düzenle" : "Hediye Ekle";
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
    $("cg-ekle-btn").addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      modalAc(null);
    });
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
    var kayit = { id: _aktif ? _aktif.id : uid(), kisi: kisi, tarih: tarih, cins: cins };
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
    cgSirala();
    await fbKaydet();
    _filtre = "tumu";
    modalKapat();
    render();
  }

  async function initOnce() {
    var fbOk = await fbYukle();
    if (!fbOk) {
      var yerel = yerelOku();
      if (yerel.length > 0) {
        _kayitlar = yerel;
        cgSirala();
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
