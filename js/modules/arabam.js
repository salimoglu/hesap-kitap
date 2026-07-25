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
  var _detayBackdropDown = false;
  var _detayModalGuardUntil = 0;
  var _acikTakipTip = null;

  var BELGE_TIPLER = [
    { key: "bakim", label: "Bakım", chip: "Bakım", yardim: "Yapılan bakımın tarihini ve o andaki km’yi girin." },
    { key: "muayene", label: "Muayene", chip: "Muayene", yardim: "Yeni muayene geçerlilik bitiş tarihini girin (genelde 1–2 yıl sonrası)." },
    { key: "sigorta", label: "Trafik sigortası", chip: "Sigorta", yardim: "Yeni trafik sigortası bitiş tarihini girin." },
    { key: "kasko", label: "Kasko", chip: "Kasko", yardim: "Yeni kasko poliçesi bitiş tarihini girin (isteğe bağlı)." },
    { key: "km", label: "Km güncelleme", chip: "Km", yardim: "Aracın güncel kilometresini girin." }
  ];

  function belgeTipLabel(key) {
    var f = BELGE_TIPLER.find(function (x) { return x.key === key; });
    return f ? f.label : key || "—";
  }

  function belgeTipYardim(key) {
    var f = BELGE_TIPLER.find(function (x) { return x.key === key; });
    return f ? f.yardim : "";
  }

  function durumRozetMetni(opts) {
    var gun = opts.gun;
    var km = opts.km;
    var varMi = (gun !== null && gun !== undefined) || (km !== null && km !== undefined);
    if (!varMi) return { sinif: "ar-durum--bos", metin: "—" };
    if ((gun !== null && gun !== undefined && gun < 0) || (km !== null && km !== undefined && km < 0)) {
      return { sinif: "ar-durum--gec", metin: "Geçti" };
    }
    if ((gun !== null && gun !== undefined && gun <= 30) || (km !== null && km !== undefined && km <= 1000)) {
      return { sinif: "ar-durum--yakin", metin: "Yakın" };
    }
    return { sinif: "ar-durum--ok", metin: "İyi" };
  }

  function kalanGunMetni(gun) {
    if (gun === null || gun === undefined) return "—";
    if (gun < 0) return Math.abs(gun) + "g geçti";
    if (gun === 0) return "Bugün";
    return gun + " gün";
  }

  function kalanKmMetni(km) {
    if (km === null || km === undefined) return "—";
    if (km < 0) return Math.abs(km).toLocaleString("tr-TR") + " km geçti";
    if (km === 0) return "Doldu";
    return km.toLocaleString("tr-TR") + " km";
  }

  function aracNormalize(a) {
    if (!a) return a;
    if (!Array.isArray(a.belgeGecmisi)) a.belgeGecmisi = [];
    if (!Array.isArray(a.giderler)) a.giderler = [];
    if (a.belgeGecmisi.length) return a;
    var now = new Date().toISOString().split("T")[0];
    if (a.bakimSonTarih) {
      a.belgeGecmisi.push({
        id: muid(),
        tip: "bakim",
        tarih: a.bakimSonTarih,
        km: a.bakimSonKm || "",
        not: "Mevcut kayıttan aktarıldı",
        olusturma: now
      });
    }
    if (a.muayeneTarih) {
      a.belgeGecmisi.push({ id: muid(), tip: "muayene", bitis: a.muayeneTarih, tarih: a.muayeneTarih, olusturma: now });
    }
    if (a.sigortaTarih) {
      a.belgeGecmisi.push({ id: muid(), tip: "sigorta", bitis: a.sigortaTarih, tarih: a.sigortaTarih, olusturma: now });
    }
    if (a.kaskoTarih) {
      a.belgeGecmisi.push({ id: muid(), tip: "kasko", bitis: a.kaskoTarih, tarih: a.kaskoTarih, olusturma: now });
    }
    if (a.guncelKm !== "" && a.guncelKm != null && !isNaN(Number(a.guncelKm))) {
      a.belgeGecmisi.push({ id: muid(), tip: "km", tarih: now, km: Number(a.guncelKm), olusturma: now });
    }
    return a;
  }

  function belgeGecmisEkle(a, kayit) {
    if (!a) return;
    if (!Array.isArray(a.belgeGecmisi)) a.belgeGecmisi = [];
    a.belgeGecmisi.unshift(Object.assign({ id: muid(), olusturma: new Date().toISOString().split("T")[0] }, kayit));
  }

  function belgeKayitUygula(a, tip, tarih, km, not) {
    if (!a || !tip) return;
    var bugun = new Date().toISOString().split("T")[0];
    var kayit = { tip: tip, not: not || "" };
    if (tip === "bakim") {
      kayit.tarih = tarih || bugun;
      kayit.km = km !== "" && km != null ? km : "";
      a.bakimSonTarih = kayit.tarih;
      if (kayit.km !== "") a.bakimSonKm = kayit.km;
    } else if (tip === "muayene") {
      kayit.bitis = tarih;
      kayit.tarih = bugun;
      a.muayeneTarih = tarih;
    } else if (tip === "sigorta") {
      kayit.bitis = tarih;
      kayit.tarih = bugun;
      a.sigortaTarih = tarih;
    } else if (tip === "kasko") {
      kayit.bitis = tarih;
      kayit.tarih = bugun;
      a.kaskoTarih = tarih;
    } else if (tip === "km") {
      kayit.tarih = bugun;
      kayit.km = km;
      a.guncelKm = km;
    }
    belgeGecmisEkle(a, kayit);
  }

  function belgeGecmisSatirMetni(r) {
    if (r.tip === "bakim") {
      return mTarih(r.tarih) + (r.km !== "" && r.km != null ? " · " + Number(r.km).toLocaleString("tr-TR") + " km" : "");
    }
    if (r.tip === "km") {
      return Number(r.km).toLocaleString("tr-TR") + " km";
    }
    if (r.bitis) return "Bitiş " + mTarih(r.bitis);
    return mTarih(r.tarih || r.olusturma);
  }

  function miniChipHtml(lbl, gun, km) {
    var sinif = "";
    var txt = lbl;
    if (km !== undefined && km !== null) {
      sinif = durumSinifiKm(km);
      if (km < 0) txt += " " + Math.abs(km).toLocaleString("tr-TR") + " km geç";
      else if (km <= 1000) txt += " " + km.toLocaleString("tr-TR") + " km";
      else return "";
    } else if (gun !== null && gun !== undefined) {
      sinif = durumSinifiGun(gun);
      if (gun < 0) txt += " " + Math.abs(gun) + "g geç";
      else if (gun <= 30) txt += " " + gun + "g";
      else return "";
    } else return "";
    return '<span class="ar-mini-chip ' + sinif + '">' + txt + "</span>";
  }

  function arKartBelgeOzetHtml(a) {
    aracNormalize(a);
    var hat = aracHatirlatmalar(a);
    var acil = [];
    hat.forEach(function (x) {
      var c = x.km !== undefined ? miniChipHtml(x.lbl, null, x.km) : miniChipHtml(x.lbl, x.gun);
      if (c) acil.push(c);
    });
    var h = "";
    if (acil.length) {
      h += '<div class="ar-kart-belge-chips">' + acil.slice(0, 3).join("") + "</div>";
    }
    var parcalar = [];
    var gKm = Number(a.guncelKm);
    if (!isNaN(gKm) && gKm > 0) parcalar.push(gKm.toLocaleString("tr-TR") + " km");
    if (a.muayeneTarih) parcalar.push("Muayene " + mTarih(a.muayeneTarih));
    else if (a.sigortaTarih) parcalar.push("Sigorta " + mTarih(a.sigortaTarih));
    else if (a.bakimSonTarih) parcalar.push("Son bakım " + mTarih(a.bakimSonTarih));
    if (parcalar.length) h += '<div class="ar-kart-belge-info">' + parcalar.join(" · ") + "</div>";
    return h;
  }

  function tipBelgeGecmisListesi(a, tip) {
    var list = (a.belgeGecmisi || []).filter(function (r) { return r.tip === tip; });
    list.sort(function (x, y) {
      var dx = x.olusturma || x.tarih || x.bitis || "";
      var dy = y.olusturma || y.tarih || y.bitis || "";
      return dy.localeCompare(dx);
    });
    return list;
  }

  function tipBelgeGecmisHtml(a, tip, inline) {
    var list = tipBelgeGecmisListesi(a, tip);
    var h = '<details class="ar-kart-gecmis' + (inline ? " ar-kart-gecmis--inline" : "") + '">';
    h += '<summary class="ar-kart-gecmis-baslik">Geçmiş';
    if (list.length) h += ' <span class="ar-gecmis-adet">' + list.length + "</span>";
    h += "</summary>";
    if (!list.length) {
      h += '<div class="ar-kart-gecmis-bos">Bu kart için kayıt yok</div>';
    } else {
      h += '<div class="ar-gecmis-liste">';
      list.slice(0, 8).forEach(function (r) {
        h += '<div class="ar-gecmis-satir" data-gid="' + r.id + '">';
        h += '<span class="ar-gecmis-metin">' + belgeGecmisSatirMetni(r) + "</span>";
        h += '<button type="button" class="ar-gecmis-sil row-action-btn sil" data-gid="' + r.id + '" title="Sil">&#10005;</button>';
        h += "</div>";
      });
      if (list.length > 8) h += '<div class="ar-gecmis-fazla">+' + (list.length - 8) + "</div>";
      h += "</div>";
    }
    h += "</details>";
    return h;
  }

  function takipFormHtml(tip, a) {
    var bugun = new Date().toISOString().split("T")[0];
    var gKm = a && a.guncelKm != null && a.guncelKm !== "" ? String(a.guncelKm) : "";
    var perKm = a && a.bakimPeriyodKm != null && a.bakimPeriyodKm !== "" ? String(a.bakimPeriyodKm) : "10000";
    var perAy = a && a.bakimPeriyodAy != null && a.bakimPeriyodAy !== "" ? String(a.bakimPeriyodAy) : "12";
    var basit = tip === "km" || tip === "muayene" || tip === "sigorta" || tip === "kasko";
    var h = '<div class="ar-takip-form' + (basit ? " ar-takip-form--satir" : "") + '" data-tip="' + tip + '">';
    if (tip === "bakim") {
      h += '<div class="ar-takip-form-grid">';
      h += '<input type="date" class="field-input ar-tf-tarih" value="' + bugun + '" aria-label="Bakım tarihi"/>';
      h += '<input type="number" class="field-input ar-tf-km" value="' + gKm + '" placeholder="Km" min="0" step="1" inputmode="numeric" aria-label="Bakım km"/>';
      h += '<input type="number" class="field-input ar-tf-per-km" value="' + perKm + '" placeholder="Her km" min="1000" step="500" inputmode="numeric" aria-label="Periyot km"/>';
      h += '<input type="number" class="field-input ar-tf-per-ay" value="' + perAy + '" placeholder="Her ay" min="1" max="36" step="1" inputmode="numeric" aria-label="Periyot ay"/>';
      h += "</div>";
      h += '<div class="ar-takip-form-satir">';
      h += '<button type="button" class="ar-takip-kaydet">Kaydet</button>';
      h += tipBelgeGecmisHtml(a, tip, true);
      h += '<button type="button" class="ar-takip-iptal" title="Vazgeç" aria-label="Vazgeç">&#10005;</button>';
      h += "</div>";
    } else {
      if (tip === "km") {
        h += '<input type="number" class="field-input ar-tf-km ar-tf-tek" value="' + gKm + '" placeholder="Güncel km" min="0" step="1" inputmode="numeric" aria-label="Güncel km"/>';
      } else {
        var mevcut =
          tip === "muayene" ? (a && a.muayeneTarih) || "" :
          tip === "sigorta" ? (a && a.sigortaTarih) || "" :
          (a && a.kaskoTarih) || "";
        h += '<input type="date" class="field-input ar-tf-tarih ar-tf-tek" value="' + mevcut + '" aria-label="Bitiş tarihi"/>';
      }
      h += '<button type="button" class="ar-takip-kaydet">Kaydet</button>';
      h += tipBelgeGecmisHtml(a, tip, true);
      h += '<button type="button" class="ar-takip-iptal" title="Vazgeç" aria-label="Vazgeç">&#10005;</button>';
    }
    h += "</div>";
    return h;
  }

  function takipKartHtml(opts, a) {
    var rozet = opts.tip === "km"
      ? { sinif: opts.ana && opts.ana !== "—" ? "ar-durum--ok" : "ar-durum--bos", metin: "" }
      : durumRozetMetni({ gun: opts.gun, km: opts.km });
    var acik = _acikTakipTip === opts.tip;
    var ana = opts.ana || "—";
    var alt = opts.alt || "";
    var h = '<div class="ar-takip-kart ' + rozet.sinif + (acik ? " ar-takip-kart--acik" : "") + '" data-tip="' + opts.tip + '">';
    if (acik) {
      h += takipFormHtml(opts.tip, a);
    } else {
      h += '<button type="button" class="ar-takip-kart-ozet" data-tip="' + opts.tip + '" aria-expanded="false">';
      h += '<span class="ar-takip-dot" aria-hidden="true"></span>';
      h += '<span class="ar-takip-metin">';
      h += '<span class="ar-takip-ad">' + opts.ad + "</span>";
      h += '<span class="ar-takip-ana">' + ana + "</span>";
      if (alt) h += '<span class="ar-takip-alt">' + alt + "</span>";
      h += "</span></button>";
      h += tipBelgeGecmisHtml(a, opts.tip, false);
    }
    h += "</div>";
    return h;
  }

  function bakimMuayeneOzetHtml(a) {
    aracNormalize(a);
    var gKm = Number(a.guncelKm);
    var kmB = kmKaldiBakim(a);
    var snTar = bakimSonrakiTarih(a);
    var gBa = gunKaldi(snTar);
    var gMu = a.muayeneTarih ? gunKaldi(a.muayeneTarih) : null;
    var gSi = a.sigortaTarih ? gunKaldi(a.sigortaTarih) : null;
    var gKa = a.kaskoTarih ? gunKaldi(a.kaskoTarih) : null;

    var bakimAna = "—";
    var bakimAlt = "";
    if (kmB !== null) bakimAna = kalanKmMetni(kmB);
    else if (gBa !== null) bakimAna = kalanGunMetni(gBa);
    else if (a.bakimSonTarih) bakimAna = mTarih(a.bakimSonTarih);
    if (kmB !== null && gBa !== null) bakimAlt = kalanGunMetni(gBa);
    else if (a.bakimSonTarih && (kmB !== null || gBa !== null)) bakimAlt = "Son " + mTarih(a.bakimSonTarih);

    var h = '<div class="ar-takip">';
    h += '<div class="ar-takip-baslik">Takip</div>';
    h += '<div class="ar-takip-liste">';
    h += takipKartHtml({
      tip: "km",
      ad: "Km",
      ana: !isNaN(gKm) && gKm > 0 ? gKm.toLocaleString("tr-TR") : "—"
    }, a);
    h += takipKartHtml({
      tip: "bakim",
      ad: "Bakım",
      gun: gBa,
      km: kmB,
      ana: bakimAna,
      alt: bakimAlt
    }, a);
    h += takipKartHtml({
      tip: "muayene",
      ad: "Muayene",
      gun: gMu,
      ana: gMu !== null ? kalanGunMetni(gMu) : "—",
      alt: a.muayeneTarih ? mTarih(a.muayeneTarih) : ""
    }, a);
    h += takipKartHtml({
      tip: "sigorta",
      ad: "Sigorta",
      gun: gSi,
      ana: gSi !== null ? kalanGunMetni(gSi) : "—",
      alt: a.sigortaTarih ? mTarih(a.sigortaTarih) : ""
    }, a);
    h += takipKartHtml({
      tip: "kasko",
      ad: "Kasko",
      gun: gKa,
      ana: gKa !== null ? kalanGunMetni(gKa) : "—",
      alt: a.kaskoTarih ? mTarih(a.kaskoTarih) : ""
    }, a);
    h += "</div></div>";
    return h;
  }

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
    if (kmB !== null) list.push({ tip: "bakim-km", km: kmB, lbl: "Bakım" });
    var gBa = gunKaldi(bakimSonrakiTarih(a));
    if (gBa !== null && kmB === null) list.push({ tip: "bakim-tarih", gun: gBa, lbl: "Bakım" });
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
    if (!satirlar.length) return "";
    var buYilKayit = satirlar.find(function (r) { return r.yil === yilSimdi; });
    var buYilToplam = buYilKayit ? buYilKayit.toplam : 0;
    var gun = buguneKadarYilGunSayisi(yilSimdi);
    var ort = gun > 0 ? buYilToplam / gun : 0;
    var h = '<div class="ar-yil-ozet-kompakt">';
    h += '<div class="ar-yil-kompakt-ana">';
    h += '<span class="ar-yil-kompakt-l">Bu yıl</span>';
    h += '<span class="ar-yil-kompakt-v">' + mp(buYilToplam) + " TL</span>";
    h += '<span class="ar-yil-kompakt-ort">' + mp(ort) + " TL/gün</span>";
    h += "</div>";
    if (satirlar.length > 1) {
      h += '<details class="ar-yil-daha"><summary>Diğer yıllar</summary><div class="ar-yil-grid">';
      satirlar.forEach(function (r) {
        if (r.yil === yilSimdi) return;
        var yEtiket = r.yil === "_" ? "Tarih eksik" : r.yil;
        h += '<div class="ar-yil-kart">';
        h += '<div class="ar-yil-y">' + yEtiket + "</div>";
        h += '<div class="ar-yil-t">' + mp(r.toplam) + " TL</div>";
        h += '<div class="ar-yil-n">' + r.adet + " kayıt</div>";
        h += "</div>";
      });
      h += "</div></details>";
    }
    h += "</div>";
    return h;
  }

  async function fbYukle() {
    if (typeof window._fbDb === "undefined" || !window._fbDb) {
      return;
    }
    try {
      var v = await fbRtdbOku("arabam");
      _araclar = v ? Object.values(v) : [];
      _araclar.forEach(aracNormalize);
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

    var geriDetayId = _aktifAracId;
    var detayModalEl = $("ar-detay-modal");
    var detayAcikMi = !!(geriDetayId && detayModalEl && !detayModalEl.classList.contains("hidden"));

    var topGenel = ozetToplamTumu();
    var bugun = new Date().toISOString().split("T")[0];
    var yBu = String(new Date().getFullYear());

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
        h += '<div class="ar-kart" data-id="' + a.id + '" role="button" tabindex="0">';
        h += '<div class="ar-kart-sol">';
        h += '<div class="ar-kart-ust">';
        h += '<span class="ar-kart-emoji" aria-hidden="true">' + aracEmojiGoster(a) + "</span>";
        h += '<div class="ar-kart-metin">';
        h += '<div class="ar-plaka">' + (a.plaka || "—") + "</div>";
        h += '<div class="ar-marka-model">' +
          [tipLabel(a.aracTip || "otomobil"), ((a.marka || "") + " " + (a.model || "")).trim()].filter(Boolean).join(" · ") +
          "</div>";
        h += "</div></div>";
        h += '<div class="ar-kart-meta">';
        var belgeOzet = arKartBelgeOzetHtml(a);
        if (belgeOzet) h += belgeOzet;
        h += '<div class="ar-kart-yil-satir"><span class="ar-kart-yil-l">Bu yıl</span><span class="ar-kart-yil-v">' + mp(tb) + " TL</span></div>";
        h += "</div></div>";
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

    h += '<div class="ar-detay-body">';

    h += '<div class="ar-yil-ozet" id="ar-d-yil-ozet"></div>';

    h += '<div class="ar-bakim-ozet" id="ar-d-bakim-ozet"></div>';

    h += '<div class="ar-kayit-panel">';
    h += '<div class="ar-kayit-head"><span class="ar-kayit-baslik">Gider ekle</span></div>';
    h += '<div class="ar-kayit-alan-grid ar-kayit-gider-grid">';
    h += '<div class="field-group"><label class="field-label" for="ar-g-tarih">Tarih</label><input type="date" id="ar-g-tarih" class="field-input" value="' + bugun + '"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-g-tutar">Tutar (TL)</label><input type="number" id="ar-g-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-g-kalem">Kalem</label><select id="ar-g-kalem" class="field-select"></select></div>';
    h += '<div class="field-group"><label class="field-label" for="ar-g-aciklama">Not</label><input type="text" id="ar-g-aciklama" class="field-input" placeholder="İsteğe bağlı" maxlength="120"/></div>';
    h += "</div>";
    h += '<div class="ar-kayit-aksiyon"><button type="button" class="ar-kayit-kaydet-btn" id="ar-kayit-kaydet">Kaydet</button></div>';
    h += "</div>";

    h += '<details class="ar-gider-liste-wrap" id="ar-gider-gecmis">';
    h += '<summary class="ar-gider-liste-baslik">Gider geçmişi <span class="ar-gecmis-adet" id="ar-gider-adet">0</span></summary>';
    h += '<div class="ar-gider-liste" id="ar-d-liste"></div>';
    h += "</details>";
    h += "</div>";
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
    if (detayAcikMi && geriDetayId && aracBul(geriDetayId)) {
      detayModalAc(geriDetayId, false);
    }
  }

  function detayModalAc(aracId, koruma) {
    if (!aracId || !aracBul(aracId)) return;
    _aktifAracId = aracId;
    detayGuncelle(aracId);
    var m = $("ar-detay-modal");
    if (m) m.classList.remove("hidden");
    if (koruma !== false) _detayModalGuardUntil = Date.now() + 450;
  }

  function detayModalKapat() {
    var m = $("ar-detay-modal");
    if (m) m.classList.add("hidden");
    _aktifAracId = null;
    _acikTakipTip = null;
    _detayBackdropDown = false;
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
    if (ozBakim) {
      ozBakim.innerHTML = bakimMuayeneOzetHtml(a);
      wireTakipPaneli(aid);
    }

    var ozYil = $("ar-d-yil-ozet");
    if (ozYil) ozYil.innerHTML = yillikOzetHtml(a);

    var giderAdet = $("ar-gider-adet");
    var giderSayisi = a.giderler ? a.giderler.length : 0;
    if (giderAdet) giderAdet.textContent = String(giderSayisi);

    var liste = $("ar-d-liste");
    if (!liste) return;
    if (!giderSayisi) {
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
        });
      });
    }
  }

  function aracFormDoldur(a) {
    $("ar-inp-plaka").value = a.plaka || "";
    $("ar-inp-marka").value = a.marka || "";
    $("ar-inp-model").value = a.model || "";
    if ($("ar-inp-tipi")) $("ar-inp-tipi").value = a.aracTip || "otomobil";
    if ($("ar-inp-emoji")) $("ar-inp-emoji").value = aracEmojiGoster(a);
  }

  function aracFormOku() {
    return {
      plaka: ($("ar-inp-plaka").value || "").trim().toUpperCase(),
      marka: ($("ar-inp-marka").value || "").trim(),
      model: ($("ar-inp-model").value || "").trim(),
      aracTip: ($("ar-inp-tipi") && $("ar-inp-tipi").value) || "otomobil",
      aracEmoji: (($("ar-inp-emoji") && $("ar-inp-emoji").value) || "").trim().slice(0, 16)
    };
  }

  function takipTipAc(tip) {
    _acikTakipTip = _acikTakipTip === tip ? null : tip;
    if (_aktifAracId) detayGuncelle(_aktifAracId);
    if (_acikTakipTip) {
      setTimeout(function () {
        var form = document.querySelector('.ar-takip-form[data-tip="' + _acikTakipTip + '"]');
        if (!form) return;
        var focusEl = form.querySelector(".ar-tf-tarih, .ar-tf-km");
        if (focusEl) focusEl.focus();
        try { form.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) { /* ignore */ }
      }, 40);
    }
  }

  async function takipKartKaydet(formEl) {
    if (!_aktifAracId || !formEl) return;
    var ar = aracBul(_aktifAracId);
    if (!ar) return;
    var tip = formEl.dataset.tip || "bakim";
    var tarihEl = formEl.querySelector(".ar-tf-tarih");
    var kmEl = formEl.querySelector(".ar-tf-km");
    var notEl = formEl.querySelector(".ar-tf-not");
    var tarih = tarihEl ? tarihEl.value || "" : "";
    var kmVal = kmEl ? parseInt(kmEl.value || "", 10) : NaN;
    var km = isNaN(kmVal) || kmVal < 0 ? "" : kmVal;
    var not = notEl ? (notEl.value || "").trim() : "";

    if ((tip === "muayene" || tip === "sigorta" || tip === "kasko" || tip === "bakim") && !tarih) {
      if (tarihEl) tarihEl.focus();
      return;
    }
    if (tip === "km" && km === "") {
      if (kmEl) kmEl.focus();
      return;
    }

    belgeKayitUygula(ar, tip, tarih, km, not);

    if (tip === "bakim") {
      var perKmEl = formEl.querySelector(".ar-tf-per-km");
      var perAyEl = formEl.querySelector(".ar-tf-per-ay");
      var perKm = perKmEl ? parseInt(perKmEl.value || "", 10) : NaN;
      var perAy = perAyEl ? parseInt(perAyEl.value || "", 10) : NaN;
      ar.bakimPeriyodKm = isNaN(perKm) || perKm < 1000 ? 10000 : perKm;
      ar.bakimPeriyodAy = isNaN(perAy) || perAy < 1 ? 12 : Math.min(36, perAy);
      if (km !== "" && (ar.guncelKm === "" || ar.guncelKm == null || Number(km) >= Number(ar.guncelKm))) {
        ar.guncelKm = km;
      }
    }

    _acikTakipTip = null;
    await fbKaydet();
    render();
  }

  async function giderKaydet() {
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
    render();
    if ($("ar-g-tutar")) $("ar-g-tutar").value = "";
    if ($("ar-g-aciklama")) $("ar-g-aciklama").value = "";
  }

  function wireTakipPaneli(aid) {
    var oz = $("ar-d-bakim-ozet");
    if (!oz) return;
    oz.querySelectorAll(".ar-gecmis-sil").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.stopPropagation();
        var gid = btn.dataset.gid;
        var ar = aracBul(aid);
        if (!ar || !ar.belgeGecmisi) return;
        ar.belgeGecmisi = ar.belgeGecmisi.filter(function (r) { return r.id !== gid; });
        await fbKaydet();
        render();
      });
    });
    oz.querySelectorAll(".ar-takip-kart-ozet").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        takipTipAc(btn.dataset.tip || "bakim");
      });
    });
    oz.querySelectorAll(".ar-kart-gecmis").forEach(function (det) {
      det.addEventListener("click", function (e) { e.stopPropagation(); });
    });
    oz.querySelectorAll(".ar-takip-iptal").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        _acikTakipTip = null;
        detayGuncelle(aid);
      });
    });
    oz.querySelectorAll(".ar-takip-kaydet").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        var form = btn.closest(".ar-takip-form");
        await takipKartKaydet(form);
      });
    });
    oz.querySelectorAll(".ar-takip-form").forEach(function (form) {
      form.addEventListener("click", function (e) { e.stopPropagation(); });
    });
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
          geriDetay = kId;
        }
      } else {
        var yeni = {
          id: muid(),
          plaka: f.plaka,
          marka: f.marka,
          model: f.model,
          aracTip: f.aracTip,
          aracEmoji: emojiStr,
          sigortaTarih: "",
          muayeneTarih: "",
          kaskoTarih: "",
          guncelKm: "",
          bakimSonTarih: "",
          bakimSonKm: "",
          bakimPeriyodKm: 10000,
          bakimPeriyodAy: 12,
          belgeGecmisi: [],
          giderler: []
        };
        _araclar.push(yeni);
        geriDetay = yeni.id;
      }
      await fbKaydet();
      $("ar-arac-modal").classList.add("hidden");
      render();
      if (geriDetay) detayModalAc(geriDetay, false);
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
        e.stopPropagation();
        detayModalAc(el.dataset.id);
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
        if (_aktifAracId === btn.dataset.id) detayModalKapat();
        await fbKaydet();
        render();
      });
    });

    $("ar-detay-kapat") && $("ar-detay-kapat").addEventListener("click", detayModalKapat);
    var detayModal = $("ar-detay-modal");
    if (detayModal) {
      detayModal.addEventListener("pointerdown", function (e) {
        _detayBackdropDown = e.target === detayModal;
      });
      detayModal.addEventListener("pointercancel", function () {
        _detayBackdropDown = false;
      });
      detayModal.addEventListener("click", function (e) {
        if (Date.now() < _detayModalGuardUntil) return;
        if (!_detayBackdropDown || e.target !== detayModal) {
          _detayBackdropDown = false;
          return;
        }
        _detayBackdropDown = false;
        detayModalKapat();
      });
    }

    $("ar-bilgi-duzenle") && $("ar-bilgi-duzenle").addEventListener("click", function () {
      if (!_aktifAracId) return;
      var m = $("ar-detay-modal");
      if (m) m.classList.add("hidden");
      aracModalAc(_aktifAracId);
    });

    $("ar-kayit-kaydet") && $("ar-kayit-kaydet").addEventListener("click", async function () {
      await giderKaydet();
    });
  }

  async function ainit() {
    var acikId = _aktifAracId;
    var acikMi = acikId && $("ar-detay-modal") && !$("ar-detay-modal").classList.contains("hidden");
    await fbYukle();
    render();
    if (acikMi && acikId && aracBul(acikId)) detayModalAc(acikId, false);
  }

  return { init: ainit };
})();
