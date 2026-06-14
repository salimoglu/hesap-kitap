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

  var ARAC_TIPLER = [
    { key: "otomobil", label: "Otomobil", emoji: "🚗" },
    { key: "suv", label: "SUV / crossover", emoji: "🚙" },
    { key: "panelvan", label: "Kompakt panelvan (Berlingo, Kangoo, Partner…)", emoji: "🚐" },
    { key: "kamyonet", label: "Kamyonet", emoji: "🚚" },
    { key: "pickup", label: "Pick-up", emoji: "🛻" },
    { key: "kamyon", label: "Çekici / kamyon", emoji: "🚛" },
    { key: "minibus", label: "Minibüs", emoji: "🚐" },
    { key: "otobus", label: "Otobüs", emoji: "🚌" },
    { key: "motosiklet", label: "Motosiklet", emoji: "🏍️" },
    { key: "elektrikli", label: "Elektrikli", emoji: "🔋" },
    { key: "diger", label: "Diğer", emoji: "🚗" }
  ];

  var EMOJI_LIST = (function () {
    var u = [];
    var ek = [
      "🚕", "🚓", "🚔", "🚒", "🚑", "🏎️", "🚎", "🚍", "🚌", "🚙",
      "🚚", "🚛", "🚜", "🛻", "🛺", "🏍️", "🛵", "🛴", "🚲", "⛽",
      "🔋", "⚡", "🅿️", "🛣️", "✨"
    ];
    ARAC_TIPLER.forEach(function (t) {
      if (u.indexOf(t.emoji) < 0) u.push(t.emoji);
    });
    ek.forEach(function (e) {
      if (u.indexOf(e) < 0) u.push(e);
    });
    return u;
  })();

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

  function tipLabel(key) {
    var f = ARAC_TIPLER.find(function (x) { return x.key === key; });
    return f ? f.label : "Otomobil";
  }

  function tipVarsayilanEmoji(key) {
    var f = ARAC_TIPLER.find(function (x) { return x.key === key; });
    return f ? f.emoji : "🚗";
  }

  function aracEmojiGoster(a) {
    if (!a) return "🚗";
    var e = a.aracEmoji;
    if (e && String(e).trim()) return String(e).trim().slice(0, 12);
    return tipVarsayilanEmoji(a.aracTip || "otomobil");
  }

  function parseYmd(str) {
    if (!str || typeof str !== "string") return null;
    var p = str.split("-");
    if (p.length !== 3) return null;
    var y = parseInt(p[0], 10);
    var m = parseInt(p[1], 10) - 1;
    var d = parseInt(p[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
  }

  function ymdFromDate(d) {
    if (!d || isNaN(d.getTime())) return "";
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /** Bitiş tarihine kalan gün (negatif = süresi geçmiş). */
  function gunKaldi(tarihStr) {
    var hedef = parseYmd(tarihStr);
    if (!hedef) return null;
    var bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    hedef.setHours(0, 0, 0, 0);
    return Math.round((hedef - bugun) / 86400000);
  }

  function durumSinifiGun(gun) {
    if (gun === null || gun === undefined) return "";
    if (gun < 0) return "ar-durum--gec";
    if (gun <= 30) return "ar-durum--yakin";
    return "ar-durum--ok";
  }

  function durumSinifiKm(km) {
    if (km === null || km === undefined) return "";
    if (km < 0) return "ar-durum--gec";
    if (km <= 1000) return "ar-durum--yakin";
    return "ar-durum--ok";
  }

  function gunDurumMetni(gun, etiket) {
    if (gun === null) return etiket + " girilmedi";
    if (gun < 0) return etiket + ": " + Math.abs(gun) + " gün gecikmiş";
    if (gun === 0) return etiket + ": bugün bitiyor";
    return etiket + ": " + gun + " gün kaldı";
  }

  function kmDurumMetni(km) {
    if (km === null) return "Km bilgisi eksik";
    if (km < 0) return Math.abs(km).toLocaleString("tr-TR") + " km gecikmiş";
    if (km === 0) return "Bakım km'si doldu";
    return km.toLocaleString("tr-TR") + " km kaldı";
  }

  function bakimSonrakiKm(a) {
    if (!a) return null;
    var son = Number(a.bakimSonKm);
    var per = Number(a.bakimPeriyodKm);
    if (isNaN(per) || per <= 0) per = 10000;
    if (isNaN(son) || son < 0) return null;
    return son + per;
  }

  function bakimSonrakiTarih(a) {
    if (!a || !a.bakimSonTarih) return null;
    var d = parseYmd(a.bakimSonTarih);
    if (!d) return null;
    var ay = Number(a.bakimPeriyodAy);
    if (isNaN(ay) || ay <= 0) ay = 12;
    var hedef = new Date(d.getFullYear(), d.getMonth() + ay, d.getDate());
    return ymdFromDate(hedef);
  }

  function kmKaldiBakim(a) {
    var hedef = bakimSonrakiKm(a);
    var guncel = Number(a.guncelKm);
    if (hedef === null || isNaN(guncel) || guncel < 0) return null;
    return Math.round(hedef - guncel);
  }

  function aracHatirlatmalar(a) {
    var list = [];
    var gMu = gunKaldi(a.muayeneTarih);
    if (gMu !== null) list.push({ tip: "muayene", gun: gMu, lbl: "Muayene" });
    var gSi = gunKaldi(a.sigortaTarih);
    if (gSi !== null) list.push({ tip: "sigorta", gun: gSi, lbl: "Sigorta" });
    var gKa = gunKaldi(a.kaskoTarih);
    if (gKa !== null) list.push({ tip: "kasko", gun: gKa, lbl: "Kasko" });
    var kmB = kmKaldiBakim(a);
    if (kmB !== null) list.push({ tip: "bakim-km", km: kmB, lbl: "Bakım km" });
    var gBa = gunKaldi(bakimSonrakiTarih(a));
    if (gBa !== null) list.push({ tip: "bakim-tarih", gun: gBa, lbl: "Bakım tarih" });
    return list;
  }

  function hatirlatmaKartHtml(opts) {
    var sinif = "";
    var metin = "";
    if (opts.km !== undefined && opts.km !== null) {
      sinif = durumSinifiKm(opts.km);
      metin = opts.lbl + " · " + kmDurumMetni(opts.km);
    } else if (opts.gun !== undefined && opts.gun !== null) {
      sinif = durumSinifiGun(opts.gun);
      metin = gunDurumMetni(opts.gun, opts.lbl);
    } else {
      return "";
    }
    return '<span class="ar-hatir ' + sinif + '">' + metin + "</span>";
  }

  function bakimMuayeneOzetHtml(a) {
    var h = '<div class="ar-bakim-ozet-baslik">Bakım & muayene</div><div class="ar-bakim-ozet-grid">';
    var gKm = Number(a.guncelKm);
    h += '<div class="ar-bakim-kutu"><span class="ar-bakim-kutu-l">Güncel km</span><span class="ar-bakim-kutu-v">' +
      (!isNaN(gKm) && gKm > 0 ? gKm.toLocaleString("tr-TR") + " km" : "—") + "</span></div>";

    if (a.bakimSonTarih) {
      h += '<div class="ar-bakim-kutu"><span class="ar-bakim-kutu-l">Son bakım</span><span class="ar-bakim-kutu-v">' +
        mTarih(a.bakimSonTarih) +
        (a.bakimSonKm ? " · " + Number(a.bakimSonKm).toLocaleString("tr-TR") + " km" : "") +
        "</span></div>";
    }

    var snKm = bakimSonrakiKm(a);
    if (snKm !== null) {
      h += '<div class="ar-bakim-kutu"><span class="ar-bakim-kutu-l">Sonraki bakım (km)</span><span class="ar-bakim-kutu-v">' +
        snKm.toLocaleString("tr-TR") + " km</span></div>";
    }

    var snTar = bakimSonrakiTarih(a);
    if (snTar) {
      h += '<div class="ar-bakim-kutu"><span class="ar-bakim-kutu-l">Sonraki bakım (tarih)</span><span class="ar-bakim-kutu-v">' +
        mTarih(snTar) + "</span></div>";
    }

    h += '</div><div class="ar-bakim-durumlar">';

    var kmB = kmKaldiBakim(a);
    if (kmB !== null) h += hatirlatmaKartHtml({ lbl: "Periyodik bakım (km)", km: kmB });
    var gBa = gunKaldi(snTar);
    if (gBa !== null) h += hatirlatmaKartHtml({ lbl: "Periyodik bakım (tarih)", gun: gBa });
    if (a.muayeneTarih) h += hatirlatmaKartHtml({ lbl: "Muayene", gun: gunKaldi(a.muayeneTarih) });
    if (a.sigortaTarih) h += hatirlatmaKartHtml({ lbl: "Trafik sigortası", gun: gunKaldi(a.sigortaTarih) });
    if (a.kaskoTarih) h += hatirlatmaKartHtml({ lbl: "Kasko", gun: gunKaldi(a.kaskoTarih) });

    if (!a.bakimSonTarih && !a.muayeneTarih && !a.sigortaTarih && kmB === null) {
      h += '<div class="ar-bakim-bos-not">Bakım ve muayene bilgilerini araç düzenle ekranından girebilirsiniz.</div>';
    }

    h += "</div>";
    return h;
  }

  function syncAracEmojiUI() {
    var hid = $("ar-inp-emoji");
    if (!hid) return;
    var cur = hid.value.trim();
    document.querySelectorAll(".ar-emoji-btn").forEach(function (b) {
      b.classList.toggle("selected", b.textContent.trim() === cur);
    });
  }

  /** Gider tarihinden takvim yılı (YYYY-MM-DD); yoksa "_" */
  function giderYilStr(tarih) {
    if (!tarih || typeof tarih !== "string") return "_";
    var m = tarih.match(/^(\d{4})/);
    return m ? m[1] : "_";
  }

  function aracToplamYil(arac, yil) {
    if (!arac || !arac.giderler || !arac.giderler.length) return 0;
    var y = String(yil);
    return arac.giderler.reduce(function (s, g) {
      return giderYilStr(g.tarih) === y ? s + (Number(g.tutar) || 0) : s;
    }, 0);
  }

  function buguneKadarYilGunSayisi(yilStr) {
    var n = new Date();
    var y = n.getFullYear();
    if (String(yilStr) !== String(y)) return 0;
    var ilk = new Date(y, 0, 1);
    var bugun = new Date(y, n.getMonth(), n.getDate());
    return Math.max(1, Math.round((bugun - ilk) / 86400000) + 1);
  }

  function aracYillikOzet(arac) {
    var by = {};
    if (!arac || !arac.giderler || !arac.giderler.length) return [];
    arac.giderler.forEach(function (g) {
      var y = giderYilStr(g.tarih);
      if (!by[y]) by[y] = { yil: y, toplam: 0, adet: 0 };
      by[y].toplam += Number(g.tutar) || 0;
      by[y].adet += 1;
    });
    return Object.values(by).sort(function (x, y) {
      if (x.yil === "_") return 1;
      if (y.yil === "_") return -1;
      return String(y.yil).localeCompare(String(x.yil));
    });
  }

  function yillikOzetHtml(arac) {
    var yilSimdi = String(new Date().getFullYear());
    var satirlar = aracYillikOzet(arac);
    if (!satirlar.length) {
      return (
        '<div class="ar-yil-baslik"><span class="ar-yil-emoji">' +
        aracEmojiGoster(arac) +
        '</span> Yıllık özet <span class="ar-yil-aciklama">(gider tarihine göre)</span></div>' +
        '<div class="ar-yil-bos">Bu araç için gider eklediğinizde, her kaydın <strong>tarih</strong> alanına göre yıllık toplamlar burada listelenir.</div>'
      );
    }
    var h =
      '<div class="ar-yil-baslik"><span class="ar-yil-emoji">' +
      aracEmojiGoster(arac) +
      '</span> Yıllık özet <span class="ar-yil-aciklama">(gider tarihine göre)</span></div>' +
      '<div class="ar-yil-grid">';
    satirlar.forEach(function (r) {
      var yEtiket = r.yil === "_" ? "Tarih eksik" : r.yil;
      var buYil = r.yil !== "_" && r.yil === yilSimdi;
      h += '<div class="ar-yil-kart' + (buYil ? " ar-yil-kart--bu-yil" : "") + '">';
      if (buYil) h += '<span class="ar-yil-etiket">Bu yıl</span>';
      h += '<div class="ar-yil-y">' + yEtiket + "</div>";
      h += '<div class="ar-yil-t">' + mp(r.toplam) + " TL</div>";
      h += '<div class="ar-yil-n">' + r.adet + " kayıt</div>";
      if (buYil) {
        var gun = buguneKadarYilGunSayisi(r.yil);
        var ort = gun > 0 ? r.toplam / gun : 0;
        h +=
          "<div class=\"ar-yil-gun-ort\">" +
          "<span class=\"ar-yil-gun-ort-l\">Günlük ort.</span> " +
          "<span class=\"ar-yil-gun-ort-v\">" +
          mp(ort) +
          " TL</span>" +
          "<span class=\"ar-yil-gun-ort-hint\"> (yılın " +
          gun +
          ". gününe kadar)</span></div>";
      }
      h += "</div>";
    });
    h += "</div>";
    return h;
  }

  async function fbYukle() {
    if (typeof window._fbDb === "undefined" || !window._fbDb) {
      return;
    }
    try {
      var s = await fbRtdbRef("arabam").once("value");
      var v = s.val();
      _araclar = v ? Object.values(v) : [];
    } catch (e) {
      _araclar = [];
      console.error("[Arabam] yukle", (e && e.code) || e.message || e);
    }
  }

  async function fbKaydet() {
    if (typeof window._fbDb === "undefined" || !window._fbDb) return;
    try {
      var obj = {};
      _araclar.forEach(function (a) { obj[a.id] = a; });
      await fbRtdbRef("arabam").set(obj);
    } catch (e) {
      console.error("[Arabam] kaydet", e);
    }
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
    var yBu = String(new Date().getFullYear());
    var yGecen = String(Number(yBu) - 1);

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
        var tb = aracToplamYil(a, yBu);
        var tg = aracToplamYil(a, yGecen);
        var gunYil = buguneKadarYilGunSayisi(yBu);
        var ortGun = gunYil > 0 ? tb / gunYil : 0;
        h += '<div class="ar-kart" data-id="' + a.id + '" role="button" tabindex="0">';
        h += '<div class="ar-kart-sol">';
        h += '<div class="ar-kart-ust">';
        h += '<span class="ar-kart-emoji" aria-hidden="true">' + aracEmojiGoster(a) + "</span>";
        h += '<div class="ar-kart-metin">';
        h += '<div class="ar-plaka">' + (a.plaka || "—") + "</div>";
        h += '<div class="ar-arac-tip">' + tipLabel(a.aracTip || "otomobil") + "</div>";
        h += '<div class="ar-marka-model">' + (a.marka || "") + " " + (a.model || "") + "</div>";
        h += "</div></div>";
        h += '<div class="ar-kart-meta">';
        h += '<span class="ar-pill">' + (a.giderler ? a.giderler.length : 0) + " gider</span>";
        var hat = aracHatirlatmalar(a).filter(function (x) {
          if (x.km !== undefined) return x.km <= 1000;
          return x.gun !== null && x.gun <= 30;
        });
        if (hat.length) {
          h += '<div class="ar-kart-hatirlatma">';
          hat.slice(0, 3).forEach(function (x) {
            if (x.km !== undefined) h += hatirlatmaKartHtml({ lbl: x.lbl, km: x.km });
            else h += hatirlatmaKartHtml({ lbl: x.lbl, gun: x.gun });
          });
          h += "</div>";
        }
        h += '<span class="ar-kart-mini-yil">';
        h += '<span class="ar-mini-yil ar-mini-yil--bu"><span class="ar-mini-yil-l">Bu yıl</span><span class="ar-mini-yil-v">' + mp(tb) + " TL</span></span>";
        h += '<span class="ar-mini-yil"><span class="ar-mini-yil-l">Geçen yıl</span><span class="ar-mini-yil-v">' + mp(tg) + " TL</span></span>";
        h +=
          '</span><div class="ar-kart-mini-ort"><span class="ar-kart-mini-ort-l">G\u00fcnl\u00fck ort.</span><span class="ar-kart-mini-ort-v">' +
          mp(ortGun) +
          ' TL</span> <span class="ar-mini-hint">(y\u0131l\u0131n ' +
          gunYil +
          ". g\u00fcn\u00fc)</span></div></div>";
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
    h += '<input type="hidden" id="ar-inp-emoji" value="🚗"/>';
    h += '<div class="ar-form-bolum"><div class="ar-form-bolum-baslik">Araç bilgisi</div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-plaka">Plaka</label>';
    h += '<input type="text" id="ar-inp-plaka" class="field-input" placeholder="34 ABC 123" maxlength="20" autocomplete="off"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-marka">Marka</label>';
    h += '<input type="text" id="ar-inp-marka" class="field-input" placeholder="Örn. Toyota" maxlength="40"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-model">Model</label>';
    h += '<input type="text" id="ar-inp-model" class="field-input" placeholder="Örn. Corolla" maxlength="40"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-tipi">Araç tipi</label>';
    h += '<select id="ar-inp-tipi" class="field-select">';
    ARAC_TIPLER.forEach(function (t) {
      h += '<option value="' + t.key + '">' + t.label + "</option>";
    });
    h += "</select></div>";
    h += '<div class="field-group ar-emoji-field"><label class="field-label">Emoji</label><div class="ar-emoji-grid" id="ar-emoji-grid">';
    EMOJI_LIST.forEach(function (em) {
      h += '<button type="button" class="ar-emoji-btn">' + em + "</button>";
    });
    h += "</div></div></div>";
    h += '<div class="ar-form-bolum"><div class="ar-form-bolum-baslik">Bakım takibi</div>';
    h += '<div class="ar-form-grid-2">';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-km">Güncel km</label>';
    h += '<input type="number" id="ar-inp-km" class="field-input" placeholder="125000" min="0" step="1" inputmode="numeric"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-bakim-tarih">Son bakım tarihi</label>';
    h += '<input type="date" id="ar-inp-bakim-tarih" class="field-input"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-bakim-km">Son bakımdaki km</label>';
    h += '<input type="number" id="ar-inp-bakim-km" class="field-input" placeholder="120000" min="0" step="1" inputmode="numeric"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-bakim-per-km">Bakım aralığı (km)</label>';
    h += '<input type="number" id="ar-inp-bakim-per-km" class="field-input" value="10000" min="1000" step="500" inputmode="numeric"/></div>';
    h += '<div class="field-group ar-form-grid-full"><label class="field-label" for="ar-inp-bakim-per-ay">Bakım aralığı (ay)</label>';
    h += '<input type="number" id="ar-inp-bakim-per-ay" class="field-input" value="12" min="1" max="36" step="1" inputmode="numeric"/></div>';
    h += "</div></div>";
    h += '<div class="ar-form-bolum"><div class="ar-form-bolum-baslik">Muayene & sigorta</div>';
    h += '<div class="ar-form-grid-2">';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-muayene">Muayene geçerlilik bitiş</label>';
    h += '<input type="date" id="ar-inp-muayene" class="field-input"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-inp-sigorta">Trafik sigortası bitiş</label>';
    h += '<input type="date" id="ar-inp-sigorta" class="field-input"/></div>';
    h += '<div class="field-group ar-form-grid-full"><label class="field-label" for="ar-inp-kasko">Kasko bitiş <span class="ar-label-hint">isteğe bağlı</span></label>';
    h += '<input type="date" id="ar-inp-kasko" class="field-input"/></div>';
    h += "</div></div>";
    h += "</div>";
    h += '<div class="modal-footer"><button type="button" class="btn-secondary" id="ar-arac-iptal">İptal</button>';
    h += '<button type="button" class="btn-primary" id="ar-arac-kaydet">Kaydet</button></div>';
    h += "</div></div>";

    /* Detay + giderler */
    h += '<div class="bk-modal-overlay hidden" id="ar-detay-modal">';
    h += '<div class="modal-box ar-detay-kutu">';
    h += '<div class="modal-header ar-detay-head">';
    h += '<div class="ar-detay-ust">';
    h += '<span id="ar-d-emoji" class="ar-detay-emoji" aria-hidden="true"></span>';
    h += '<div class="ar-detay-baslik-blok">';
    h += '<div class="ar-detay-plaka" id="ar-d-plaka"></div>';
    h += '<div id="ar-d-tipi" class="ar-d-tipi"></div>';
    h += '<div class="ar-detay-marka" id="ar-d-marka"></div>';
    h += "</div>";
    h += '<div class="ar-detay-toplam-blok"><div class="ar-detay-toplam-rakam" id="ar-d-toplam"></div><div class="ar-detay-toplam-lbl">gider</div></div>';
    h += "</div>";
    h += '<div class="ar-detay-ak">';
    h += '<button type="button" class="ar-btn-duzenle" id="ar-bilgi-duzenle">Aracı düzenle</button>';
    h += '<button type="button" class="modal-close" id="ar-detay-kapat" aria-label="Kapat">&#10005;</button>';
    h += "</div></div>";

    h += '<div class="ar-bakim-ozet" id="ar-d-bakim-ozet"></div>';

    h += '<div class="ar-yil-ozet" id="ar-d-yil-ozet"></div>';

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
    var dem = $("ar-d-emoji");
    if (dem) dem.textContent = aracEmojiGoster(a);
    var dti = $("ar-d-tipi");
    if (dti) dti.textContent = tipLabel(a.aracTip || "otomobil");
    $("ar-d-marka").textContent = ((a.marka || "") + " " + (a.model || "")).trim() || "—";
    var tt = aracToplam(a);
    $("ar-d-toplam").textContent = mp(tt) + " TL";

    var ozBakim = $("ar-d-bakim-ozet");
    if (ozBakim) ozBakim.innerHTML = bakimMuayeneOzetHtml(a);

    var ozYil = $("ar-d-yil-ozet");
    if (ozYil) ozYil.innerHTML = yillikOzetHtml(a);

    var liste = $("ar-d-liste");
    if (!liste) return;
    if (!a.giderler || !a.giderler.length) {
      liste.innerHTML = '<div class="ar-bos-kucuk">Henüz bu araç için gider yok</div>';
    } else {
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
  }

  function aracFormDoldur(a) {
    $("ar-inp-plaka").value = a.plaka || "";
    $("ar-inp-marka").value = a.marka || "";
    $("ar-inp-model").value = a.model || "";
    $("ar-inp-sigorta").value = a.sigortaTarih || "";
    $("ar-inp-muayene").value = a.muayeneTarih || "";
    $("ar-inp-kasko").value = a.kaskoTarih || "";
    $("ar-inp-km").value = a.guncelKm != null && a.guncelKm !== "" ? String(a.guncelKm) : "";
    $("ar-inp-bakim-tarih").value = a.bakimSonTarih || "";
    $("ar-inp-bakim-km").value = a.bakimSonKm != null && a.bakimSonKm !== "" ? String(a.bakimSonKm) : "";
    $("ar-inp-bakim-per-km").value = a.bakimPeriyodKm != null && a.bakimPeriyodKm !== "" ? String(a.bakimPeriyodKm) : "10000";
    $("ar-inp-bakim-per-ay").value = a.bakimPeriyodAy != null && a.bakimPeriyodAy !== "" ? String(a.bakimPeriyodAy) : "12";
    if ($("ar-inp-tipi")) $("ar-inp-tipi").value = a.aracTip || "otomobil";
    if ($("ar-inp-emoji")) $("ar-inp-emoji").value = aracEmojiGoster(a);
  }

  function aracFormOku() {
    var km = parseInt($("ar-inp-km").value, 10);
    var bkm = parseInt($("ar-inp-bakim-km").value, 10);
    var perKm = parseInt($("ar-inp-bakim-per-km").value, 10);
    var perAy = parseInt($("ar-inp-bakim-per-ay").value, 10);
    return {
      plaka: ($("ar-inp-plaka").value || "").trim().toUpperCase(),
      marka: ($("ar-inp-marka").value || "").trim(),
      model: ($("ar-inp-model").value || "").trim(),
      sigortaTarih: $("ar-inp-sigorta").value || "",
      muayeneTarih: $("ar-inp-muayene").value || "",
      kaskoTarih: $("ar-inp-kasko").value || "",
      guncelKm: isNaN(km) || km < 0 ? "" : km,
      bakimSonTarih: $("ar-inp-bakim-tarih").value || "",
      bakimSonKm: isNaN(bkm) || bkm < 0 ? "" : bkm,
      bakimPeriyodKm: isNaN(perKm) || perKm < 1000 ? 10000 : perKm,
      bakimPeriyodAy: isNaN(perAy) || perAy < 1 ? 12 : Math.min(36, perAy),
      aracTip: ($("ar-inp-tipi") && $("ar-inp-tipi").value) || "otomobil",
      aracEmoji: (($("ar-inp-emoji") && $("ar-inp-emoji").value) || "").trim().slice(0, 16)
    };
  }

  function aracModalAc(id) {
    $("ar-arac-id").value = id || "";
    if (id) {
      var a = aracBul(id);
      if (a) aracFormDoldur(a);
      $("ar-arac-modal-baslik").textContent = "Aracı düzenle";
    } else {
      $("ar-inp-plaka").value = "";
      $("ar-inp-marka").value = "";
      $("ar-inp-model").value = "";
      $("ar-inp-sigorta").value = "";
      $("ar-inp-muayene").value = "";
      $("ar-inp-kasko").value = "";
      $("ar-inp-km").value = "";
      $("ar-inp-bakim-tarih").value = "";
      $("ar-inp-bakim-km").value = "";
      $("ar-inp-bakim-per-km").value = "10000";
      $("ar-inp-bakim-per-ay").value = "12";
      if ($("ar-inp-tipi")) $("ar-inp-tipi").value = "otomobil";
      if ($("ar-inp-emoji")) $("ar-inp-emoji").value = tipVarsayilanEmoji("otomobil");
      $("ar-arac-modal-baslik").textContent = "Araç ekle";
    }
    syncAracEmojiUI();
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
      var f = aracFormOku();
      if (!f.plaka) {
        $("ar-inp-plaka").focus();
        return;
      }
      var emojiStr = f.aracEmoji || tipVarsayilanEmoji(f.aracTip);
      var geriDetay = null;
      if (kId) {
        var ex = aracBul(kId);
        if (ex) {
          ex.plaka = f.plaka;
          ex.marka = f.marka;
          ex.model = f.model;
          ex.aracTip = f.aracTip;
          ex.aracEmoji = emojiStr;
          ex.sigortaTarih = f.sigortaTarih;
          ex.muayeneTarih = f.muayeneTarih;
          ex.kaskoTarih = f.kaskoTarih;
          ex.guncelKm = f.guncelKm;
          ex.bakimSonTarih = f.bakimSonTarih;
          ex.bakimSonKm = f.bakimSonKm;
          ex.bakimPeriyodKm = f.bakimPeriyodKm;
          ex.bakimPeriyodAy = f.bakimPeriyodAy;
          geriDetay = kId;
        }
      } else {
        _araclar.push({
          id: muid(),
          plaka: f.plaka,
          marka: f.marka,
          model: f.model,
          aracTip: f.aracTip,
          aracEmoji: emojiStr,
          sigortaTarih: f.sigortaTarih,
          muayeneTarih: f.muayeneTarih,
          kaskoTarih: f.kaskoTarih,
          guncelKm: f.guncelKm,
          bakimSonTarih: f.bakimSonTarih,
          bakimSonKm: f.bakimSonKm,
          bakimPeriyodKm: f.bakimPeriyodKm,
          bakimPeriyodAy: f.bakimPeriyodAy,
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

    var tipEl = $("ar-inp-tipi");
    if (tipEl) {
      tipEl.addEventListener("change", function () {
        var h = $("ar-inp-emoji");
        if (h) {
          h.value = tipVarsayilanEmoji(tipEl.value);
          syncAracEmojiUI();
        }
      });
    }
    var eg = $("ar-emoji-grid");
    if (eg) {
      eg.addEventListener("click", function (e) {
        var btn = e.target.closest(".ar-emoji-btn");
        if (!btn) return;
        var h = $("ar-inp-emoji");
        if (h) {
          h.value = btn.textContent.trim();
          syncAracEmojiUI();
        }
      });
    }

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
