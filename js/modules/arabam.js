/* arabam.js — Araç takibi + araç giderleri */
var ArabamModule = (function () {
  var $ = function (id) { return document.getElementById(id); };

  var GIDER_KALEMLER = [
    { key: "yakit", label: "Yakıt" },
    { key: "bakim", label: "Bakım & onarım" },
    { key: "sigorta", label: "Sigorta (Trafik)" },
    { key: "kasko", label: "Kasko" },
    { key: "mtv", label: "MTV" },
    { key: "lastik", label: "Lastik" },
    { key: "otopark", label: "Otopark / HGS / köprü" },
    { key: "yikama", label: "Yıkama & detay" },
    { key: "diger", label: "Diğer" }
  ];

  var _araclar = [];
  var _aktifAracId = null;

  function mp(n) {
    return Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function muid() {
    return "ar" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
  }
  function mTarih(t) {
    if (!t) return "—";
    var p = t.split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : t;
  }
  function kalemLabel(key) {
    var f = GIDER_KALEMLER.find(function (x) { return x.key === key; });
    return f ? f.label : key || "—";
  }

  async function fbYukle() {
    if (typeof window._fbDb === "undefined" || !window._fbDb) return;
    try {
      var s = await window._fbDb.ref("arabam").once("value");
      var v = s.val();
      _araclar = v ? Object.values(v) : [];
    } catch (e) {
      _araclar = [];
    }
  }

  async function fbKaydet() {
    if (typeof window._fbDb === "undefined" || !window._fbDb) return;
    try {
      var obj = {};
      _araclar.forEach(function (a) { obj[a.id] = a; });
      await window._fbDb.ref("arabam").set(obj);
    } catch (e) {}
  }

  function aracBul(id) {
    return _araclar.find(function (a) { return a.id === id; });
  }

  function aracToplam(a) {
    if (!a || !a.giderler || !a.giderler.length) return 0;
    return a.giderler.reduce(function (s, g) { return s + (Number(g.tutar) || 0); }, 0);
  }

  function ozetToplamTumu() {
    return _araclar.reduce(function (s, a) { return s + aracToplam(a); }, 0);
  }

  function render() {
    var c = $("arabam-container");
    if (!c) return;

    var topGenel = ozetToplamTumu();
    var bugun = new Date().toISOString().split("T")[0];

    var h = '<div class="ar-wrap">';
    h += '<div class="ar-header">';
    h += '<div class="ar-ozet">';
    h += '<div class="ar-oz-item"><span class="ar-oz-label">Kayıtlı araç</span><span class="ar-oz-val">' + _araclar.length + "</span></div>";
    h += '<div class="ar-oz-item ar-oz-item--vurgu"><span class="ar-oz-label">Toplam gider</span><span class="ar-oz-val ar-oz-val--tl">' + mp(topGenel) + " TL</span></div>";
    h += "</div>";
    h += '<button type="button" class="ar-ekle-btn" id="ar-arac-ekle-btn">+ Araç ekle</button>';
    h += "</div>";

    if (!_araclar.length) {
      h += '<div class="ar-bos">&#128663;<br><br>Henüz araç eklenmemiş</div>';
    } else {
      h += '<div class="ar-liste">';
      _araclar.slice().sort(function (a, b) { return (a.plaka || "").localeCompare(b.plaka || "", "tr"); }).forEach(function (a) {
        var t = aracToplam(a);
        h += '<div class="ar-kart" data-id="' + a.id + '" role="button" tabindex="0">';
        h += '<div class="ar-kart-sol">';
        h += '<div class="ar-plaka">' + (a.plaka || "—") + "</div>";
        h += '<div class="ar-marka-model">' + (a.marka || "") + " " + (a.model || "") + "</div>";
        h += '<div class="ar-kart-meta"><span class="ar-pill">' + (a.giderler ? a.giderler.length : 0) + " gider</span></div>";
        h += "</div>";
        h += '<div class="ar-kart-sag">';
        h += '<div class="ar-kart-tutar">' + mp(t) + "</div>";
        h += '<div class="ar-kart-tutar-lbl">TL</div>';
        h += '<button type="button" class="ar-sil-arac-btn row-action-btn sil" data-id="' + a.id + '" title="Araç kaydını sil" aria-label="Sil">&#10005;</button>';
        h += "</div></div>";
      });
      h += "</div>";
    }

    /* Araç ekle/düzenle modal */
    h += '<div class="bk-modal-overlay hidden" id="ar-arac-modal">';
    h += '<div class="modal-box modal-sm ar-arac-modal-kutu">';
    h += '<div class="modal-header"><h2 class="modal-title" id="ar-arac-modal-baslik">Araç ekle</h2>';
    h += '<button type="button" class="modal-close" id="ar-arac-modal-kapat" aria-label="Kapat">&#10005;</button></div>';
    h += '<div class="modal-body">';
    h += '<input type="hidden" id="ar-arac-id" value=""/>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-plaka">Plaka</label>';
    h += '<input type="text" id="ar-inp-plaka" class="field-input" placeholder="34 ABC 123" maxlength="20" autocomplete="off"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-marka">Marka</label>';
    h += '<input type="text" id="ar-inp-marka" class="field-input" placeholder="Örn. Toyota" maxlength="40"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-model">Model</label>';
    h += '<input type="text" id="ar-inp-model" class="field-input" placeholder="Örn. Corolla" maxlength="40"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-sigorta">Sigorta yenileme / bitiş</label>';
    h += '<input type="date" id="ar-inp-sigorta" class="field-input"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-muayene">Muayene bitiş <span class="ar-label-hint">isteğe bağlı</span></label>';
    h += '<input type="date" id="ar-inp-muayene" class="field-input"/></div>';
    h += "</div>";
    h += '<div class="modal-footer"><button type="button" class="btn-secondary" id="ar-arac-iptal">İptal</button>';
    h += '<button type="button" class="btn-primary" id="ar-arac-kaydet">Kaydet</button></div>';
    h += "</div></div>";

    /* Detay + giderler */
    h += '<div class="bk-modal-overlay hidden" id="ar-detay-modal">';
    h += '<div class="modal-box ar-detay-kutu">';
    h += '<div class="modal-header ar-detay-head">';
    h += '<div class="ar-detay-ust">';
    h += '<div class="ar-detay-baslik-blok">';
    h += '<div class="ar-detay-plaka" id="ar-d-plaka"></div>';
    h += '<div class="ar-detay-marka" id="ar-d-marka"></div>';
    h += '<div class="ar-detay-tarihler"><div id="ar-d-sigorta"></div><div id="ar-d-muayene"></div></div>';
    h += "</div>";
    h += '<div class="ar-detay-toplam-blok"><div class="ar-detay-toplam-rakam" id="ar-d-toplam"></div><div class="ar-detay-toplam-lbl">gider</div></div>';
    h += "</div>";
    h += '<div class="ar-detay-ak">';
    h += '<button type="button" class="ar-btn-duzenle" id="ar-bilgi-duzenle">Aracı düzenle</button>';
    h += '<button type="button" class="modal-close" id="ar-detay-kapat" aria-label="Kapat">&#10005;</button>';
    h += "</div></div>";

    h += '<div class="ar-gider-form">';
    h += '<div class="ar-gider-form-baslik">Gider ekle</div>';
    h += '<div class="ar-gider-grid">';
    h += '<div class="field-group"><label class="field-label" for="ar-g-tarih">Tarih</label><input type="date" id="ar-g-tarih" class="field-input" value="' + bugun + '"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-g-tutar">Tutar (TL)</label><input type="number" id="ar-g-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
    h += '<div class="field-group ar-gider-grid-full"><label class="field-label" for="ar-g-kalem">Kalem</label><select id="ar-g-kalem" class="field-select"></select></div>';
    h += '<div class="field-group ar-gider-grid-full"><label class="field-label" for="ar-g-aciklama">Not</label><input type="text" id="ar-g-aciklama" class="field-input" placeholder="İsteğe bağlı" maxlength="120"/></div>';
    h += '<button type="button" class="ar-gider-ekle-btn" id="ar-gider-kaydet-btn">Ekle</button>';
    h += "</div></div>";
    h += '<div class="ar-gider-liste" id="ar-d-liste"></div>';
    h += "</div></div>";

    h += "</div>";

    c.innerHTML = h;

    var sel = $("ar-g-kalem");
    if (sel) {
      GIDER_KALEMLER.forEach(function (k) {
        var o = document.createElement("option");
        o.value = k.key;
        o.textContent = k.label;
        sel.appendChild(o);
      });
    }

    bagla();
  }

  function detayGuncelle(aid) {
    var a = aracBul(aid);
    if (!a) return;
    $("ar-d-plaka").textContent = a.plaka || "—";
    $("ar-d-marka").textContent = ((a.marka || "") + " " + (a.model || "")).trim() || "—";
    var sg = a.sigortaTarih ? "Sigorta bitiş: " + mTarih(a.sigortaTarih) : "";
    var my = a.muayeneTarih ? "Muayene bitiş: " + mTarih(a.muayeneTarih) : "";
    $("ar-d-sigorta").textContent = sg || (my ? "" : "Sigorta / muayene tarihi girilmedi");
    $("ar-d-muayene").textContent = my;
    var tt = aracToplam(a);
    $("ar-d-toplam").textContent = mp(tt) + " TL";

    var liste = $("ar-d-liste");
    if (!liste) return;
    if (!a.giderler || !a.giderler.length) {
      liste.innerHTML = '<div class="ar-bos-kucuk">Henüz bu araç için gider yok</div>';
      return;
    }
    var satirlar = a.giderler.slice().sort(function (x, y) { return (y.tarih || "").localeCompare(x.tarih || ""); });
    var t = '<table class="ar-tablo"><thead><tr><th>Tarih</th><th>Kalem</th><th>Tutar</th><th>Not</th><th></th></tr></thead><tbody>';
    satirlar.forEach(function (g) {
      t += "<tr>";
      t += "<td>" + mTarih(g.tarih) + "</td>";
      t += "<td>" + kalemLabel(g.kalem) + "</td>";
      t += "<td class=\"ar-td-tutar\">" + mp(g.tutar) + " TL</td>";
      t += "<td>" + (g.aciklama ? String(g.aciklama).slice(0, 80) : "—") + "</td>";
      t += "<td><button type=\"button\" class=\"ar-sil-gider-btn row-action-btn sil\" data-gid=\"" + g.id + "\" data-aid=\"" + aid + "\">&#10005;</button></td>";
      t += "</tr>";
    });
    t += "</tbody></table>";
    liste.innerHTML = t;

    liste.querySelectorAll(".ar-sil-gider-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var gida = btn.dataset.gid;
        var arid = btn.dataset.aid;
        var ar = aracBul(arid);
        if (!ar || !ar.giderler) return;
        ar.giderler = ar.giderler.filter(function (g) { return g.id !== gida; });
        await fbKaydet();
        render();
        _aktifAracId = arid;
        $("ar-detay-modal").classList.remove("hidden");
        detayGuncelle(arid);
      });
    });
  }

  function aracModalAc(id) {
    $("ar-arac-id").value = id || "";
    if (id) {
      var a = aracBul(id);
      if (a) {
        $("ar-inp-plaka").value = a.plaka || "";
        $("ar-inp-marka").value = a.marka || "";
        $("ar-inp-model").value = a.model || "";
        $("ar-inp-sigorta").value = a.sigortaTarih || "";
        $("ar-inp-muayene").value = a.muayeneTarih || "";
      }
      $("ar-arac-modal-baslik").textContent = "Aracı düzenle";
    } else {
      $("ar-inp-plaka").value = "";
      $("ar-inp-marka").value = "";
      $("ar-inp-model").value = "";
      $("ar-inp-sigorta").value = "";
      $("ar-inp-muayene").value = "";
      $("ar-arac-modal-baslik").textContent = "Araç ekle";
    }
    $("ar-arac-modal").classList.remove("hidden");
    setTimeout(function () { $("ar-inp-plaka").focus(); }, 80);
  }

  function bagla() {
    $("ar-arac-ekle-btn") && $("ar-arac-ekle-btn").addEventListener("click", function () { aracModalAc(null); });
    $("ar-arac-modal-kapat") && $("ar-arac-modal-kapat").addEventListener("click", function () { $("ar-arac-modal").classList.add("hidden"); });
    $("ar-arac-iptal") && $("ar-arac-iptal").addEventListener("click", function () { $("ar-arac-modal").classList.add("hidden"); });
    $("ar-arac-modal") && $("ar-arac-modal").addEventListener("click", function (e) { if (e.target === $("ar-arac-modal")) $("ar-arac-modal").classList.add("hidden"); });
    $("ar-arac-kaydet") && $("ar-arac-kaydet").addEventListener("click", async function () {
      var kId = $("ar-arac-id").value;
      var plaka = ($("ar-inp-plaka").value || "").trim().toUpperCase();
      var marka = ($("ar-inp-marka").value || "").trim();
      var model = ($("ar-inp-model").value || "").trim();
      var sigorta = $("ar-inp-sigorta").value || "";
      var muayene = $("ar-inp-muayene").value || "";
      if (!plaka) {
        $("ar-inp-plaka").focus();
        return;
      }
      var geriDetay = null;
      if (kId) {
        var ex = aracBul(kId);
        if (ex) {
          ex.plaka = plaka;
          ex.marka = marka;
          ex.model = model;
          ex.sigortaTarih = sigorta;
          ex.muayeneTarih = muayene || "";
          geriDetay = kId;
        }
      } else {
        _araclar.push({
          id: muid(),
          plaka: plaka,
          marka: marka,
          model: model,
          sigortaTarih: sigorta,
          muayeneTarih: muayene || "",
          giderler: []
        });
      }
      await fbKaydet();
      $("ar-arac-modal").classList.add("hidden");
      render();
      if (geriDetay) {
        _aktifAracId = geriDetay;
        detayGuncelle(geriDetay);
        $("ar-detay-modal").classList.remove("hidden");
      }
    });

    document.querySelectorAll(".ar-kart").forEach(function (el) {
      el.addEventListener("click", function (e) {
        if (e.target.closest(".ar-sil-arac-btn")) return;
        _aktifAracId = el.dataset.id;
        detayGuncelle(_aktifAracId);
        $("ar-detay-modal").classList.remove("hidden");
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          el.click();
        }
      });
    });

    document.querySelectorAll(".ar-sil-arac-btn").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation();
        if (!confirm("Bu aracı ve tüm gider kayıtlarını silmek istiyor musunuz?")) return;
        _araclar = _araclar.filter(function (x) { return x.id !== btn.dataset.id; });
        if (_aktifAracId === btn.dataset.id) {
          $("ar-detay-modal").classList.add("hidden");
          _aktifAracId = null;
        }
        await fbKaydet();
        render();
      });
    });

    $("ar-detay-kapat") && $("ar-detay-kapat").addEventListener("click", function () {
      $("ar-detay-modal").classList.add("hidden");
      _aktifAracId = null;
    });
    $("ar-detay-modal") && $("ar-detay-modal").addEventListener("click", function (e) {
      if (e.target === $("ar-detay-modal")) {
        $("ar-detay-modal").classList.add("hidden");
        _aktifAracId = null;
      }
    });

    $("ar-bilgi-duzenle") && $("ar-bilgi-duzenle").addEventListener("click", function () {
      if (!_aktifAracId) return;
      $("ar-detay-modal").classList.add("hidden");
      aracModalAc(_aktifAracId);
    });

    $("ar-gider-kaydet-btn") && $("ar-gider-kaydet-btn").addEventListener("click", async function () {
      if (!_aktifAracId) return;
      var ar = aracBul(_aktifAracId);
      if (!ar) return;
      var tarih = $("ar-g-tarih").value;
      var tut = parseFloat($("ar-g-tutar").value) || 0;
      var kalem = $("ar-g-kalem").value;
      var acik = ($("ar-g-aciklama").value || "").trim();
      if (!tarih || tut <= 0) {
        $("ar-g-tutar").focus();
        return;
      }
      if (!ar.giderler) ar.giderler = [];
      ar.giderler.push({ id: muid(), tarih: tarih, tutar: tut, kalem: kalem, aciklama: acik });
      await fbKaydet();
      var keepId = _aktifAracId;
      render();
      _aktifAracId = keepId;
      if (keepId) {
        $("ar-detay-modal").classList.remove("hidden");
        $("ar-g-tutar").value = "";
        $("ar-g-aciklama").value = "";
        detayGuncelle(keepId);
      }
    });
  }

  async function ainit() {
    await fbYukle();
    render();
  }

  return { init: ainit };
})();
