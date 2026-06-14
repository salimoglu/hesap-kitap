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

  var BELGE_TIPLER = [
    { key: "bakim", label: "Bakım", chip: "Bakım" },
    { key: "muayene", label: "Muayene", chip: "Muayene" },
    { key: "sigorta", label: "Trafik sigortası", chip: "Sigorta" },
    { key: "kasko", label: "Kasko", chip: "Kasko" },
    { key: "km", label: "Km güncelleme", chip: "Km" }
  ];

  function belgeTipLabel(key) {
    var f = BELGE_TIPLER.find(function (x) { return x.key === key; });
    return f ? f.label : key || "—";
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

  function aracGecmisKaydet(ex, f) {
    if (!ex || !f) return;
    var bugun = new Date().toISOString().split("T")[0];
    if (f.bakimSonTarih && (f.bakimSonTarih !== ex.bakimSonTarih || String(f.bakimSonKm) !== String(ex.bakimSonKm || ""))) {
      belgeGecmisEkle(ex, { tip: "bakim", tarih: f.bakimSonTarih, km: f.bakimSonKm || "", not: "" });
    }
    if (f.muayeneTarih && f.muayeneTarih !== ex.muayeneTarih) {
      belgeGecmisEkle(ex, { tip: "muayene", bitis: f.muayeneTarih, tarih: bugun });
      ex.muayeneTarih = f.muayeneTarih;
    }
    if (f.sigortaTarih && f.sigortaTarih !== ex.sigortaTarih) {
      belgeGecmisEkle(ex, { tip: "sigorta", bitis: f.sigortaTarih, tarih: bugun });
    }
    if (f.kaskoTarih && f.kaskoTarih !== ex.kaskoTarih) {
      belgeGecmisEkle(ex, { tip: "kasko", bitis: f.kaskoTarih, tarih: bugun });
    }
    if (f.guncelKm !== "" && f.guncelKm != null && String(f.guncelKm) !== String(ex.guncelKm || "")) {
      belgeGecmisEkle(ex, { tip: "km", tarih: bugun, km: f.guncelKm });
    }
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
    var p = belgeTipLabel(r.tip);
    if (r.tip === "bakim") {
      return p + " · " + mTarih(r.tarih) + (r.km !== "" && r.km != null ? " · " + Number(r.km).toLocaleString("tr-TR") + " km" : "");
    }
    if (r.tip === "km") {
      return p + " · " + Number(r.km).toLocaleString("tr-TR") + " km";
    }
    if (r.bitis) return p + " · bitiş " + mTarih(r.bitis);
    return p + " · " + mTarih(r.tarih || r.olusturma);
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
    var chips = [];
    hat.forEach(function (x) {
      var c = x.km !== undefined ? miniChipHtml(x.lbl, null, x.km) : miniChipHtml(x.lbl, x.gun);
      if (c) chips.push(c);
    });
    var h = "";
    if (chips.length) h += '<div class="ar-kart-belge-chips">' + chips.slice(0, 2).join("") + "</div>";
    var parcalar = [];
    var gKm = Number(a.guncelKm);
    if (!isNaN(gKm) && gKm > 0) parcalar.push(gKm.toLocaleString("tr-TR") + " km");
    if (a.muayeneTarih) {
      var gm = gunKaldi(a.muayeneTarih);
      if (gm !== null) parcalar.push("Muayene " + (gm < 0 ? Math.abs(gm) + "g geç" : gm + "g"));
    }
    if (a.bakimSonTarih) parcalar.push("Son bakım " + mTarih(a.bakimSonTarih));
    if (parcalar.length) h += '<div class="ar-kart-belge-info">' + parcalar.slice(0, 2).join(" · ") + "</div>";
    return h;
  }

  function bakimMuayeneOzetHtml(a) {
    aracNormalize(a);
    var gKm = Number(a.guncelKm);
    var kmB = kmKaldiBakim(a);
    var snTar = bakimSonrakiTarih(a);
    var h = '<div class="ar-bakim-ozet-baslik">Bakım & muayene</div>';
    h += '<div class="ar-bakim-kompakt">';
    h += '<div class="ar-bk-stat"><span class="ar-bk-l">Km</span><span class="ar-bk-v">' +
      (!isNaN(gKm) && gKm > 0 ? gKm.toLocaleString("tr-TR") : "—") + "</span></div>";
    h += '<div class="ar-bk-stat"><span class="ar-bk-l">Son bakım</span><span class="ar-bk-v">' +
      (a.bakimSonTarih ? mTarih(a.bakimSonTarih) : "—") + "</span></div>";
    h += '<div class="ar-bk-stat"><span class="ar-bk-l">Muayene</span><span class="ar-bk-v">' +
      (a.muayeneTarih ? mTarih(a.muayeneTarih) : "—") + "</span></div>";
    h += '<div class="ar-bk-stat"><span class="ar-bk-l">Sigorta</span><span class="ar-bk-v">' +
      (a.sigortaTarih ? mTarih(a.sigortaTarih) : "—") + "</span></div>";
    h += "</div>";
    var uyarilar = [];
    if (kmB !== null && durumSinifiKm(kmB) !== "ar-durum--ok") uyarilar.push(hatirlatmaKartHtml({ lbl: "Bakım km", km: kmB }));
    var gBa = gunKaldi(snTar);
    if (gBa !== null && durumSinifiGun(gBa) !== "ar-durum--ok") uyarilar.push(hatirlatmaKartHtml({ lbl: "Bakım tarih", gun: gBa }));
    if (a.muayeneTarih && durumSinifiGun(gunKaldi(a.muayeneTarih)) !== "ar-durum--ok") {
      uyarilar.push(hatirlatmaKartHtml({ lbl: "Muayene", gun: gunKaldi(a.muayeneTarih) }));
    }
    if (a.sigortaTarih && durumSinifiGun(gunKaldi(a.sigortaTarih)) !== "ar-durum--ok") {
      uyarilar.push(hatirlatmaKartHtml({ lbl: "Sigorta", gun: gunKaldi(a.sigortaTarih) }));
    }
    if (a.kaskoTarih && durumSinifiGun(gunKaldi(a.kaskoTarih)) !== "ar-durum--ok") {
      uyarilar.push(hatirlatmaKartHtml({ lbl: "Kasko", gun: gunKaldi(a.kaskoTarih) }));
    }
    if (uyarilar.length) {
      h += '<div class="ar-bakim-uyarilar">' + uyarilar.slice(0, 3).join("") + "</div>";
    }
    h += belgeGecmisHtml(a);
    return h;
  }

  function belgeGecmisHtml(a) {
    var list = (a.belgeGecmisi || []).slice();
    list.sort(function (x, y) {
      var dx = x.olusturma || x.tarih || x.bitis || "";
      var dy = y.olusturma || y.tarih || y.bitis || "";
      return dy.localeCompare(dx);
    });
    var h = '<div class="ar-gecmis-baslik">Geçmiş kayıtlar</div>';
    if (!list.length) {
      h += '<div class="ar-gecmis-bos">Henüz geçmiş kayıt yok. Aşağıdan veya araç düzenle ile ekleyebilirsiniz.</div>';
      return h;
    }
    h += '<div class="ar-gecmis-liste">';
    list.slice(0, 12).forEach(function (r) {
      h += '<div class="ar-gecmis-satir" data-gid="' + r.id + '">';
      h += '<span class="ar-gecmis-tip ar-gecmis-tip--' + r.tip + '">' + belgeTipLabel(r.tip) + "</span>";
      h += '<span class="ar-gecmis-metin">' + belgeGecmisSatirMetni(r) + "</span>";
      if (r.not) h += '<span class="ar-gecmis-not">' + String(r.not).slice(0, 60) + "</span>";
      h += '<button type="button" class="ar-gecmis-sil row-action-btn sil" data-gid="' + r.id + '" title="Sil">&#10005;</button>';
      h += "</div>";
    });
    if (list.length > 12) h += '<div class="ar-gecmis-fazla">+' + (list.length - 12) + " eski kayıt</div>";
    h += "</div>";
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
        var belgeOzet = arKartBelgeOzetHtml(a);
        if (belgeOzet) h += belgeOzet;
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

    h += '<div class="ar-belge-form-wrap">';
    h += '<div class="ar-belge-form-kart">';
    h += '<div class="ar-belge-form-head">';
    h += '<div class="ar-belge-form-baslik">Hızlı kayıt</div>';
    h += '<p class="ar-belge-form-hint">Bakım, muayene veya km bilgisini tek adımda güncelleyin</p>';
    h += "</div>";
    h += '<div class="ar-belge-tip-blok">';
    h += '<span class="ar-belge-tip-lbl">Kayıt türü</span>';
    h += '<div class="ar-belge-tip-chips" id="ar-belge-tip-chips" role="group" aria-label="Kayıt türü">';
    BELGE_TIPLER.forEach(function (bt, i) {
      h += '<button type="button" class="ar-belge-tip-chip' + (i === 0 ? " selected" : "") + '" data-tip="' + bt.key + '">' + (bt.chip || bt.label) + "</button>";
    });
    h += '</div><input type="hidden" id="ar-belge-tip" value="bakim"/>';
    h += "</div>";
    h += '<div class="ar-belge-alan-grid">';
    h += '<div class="field-group" id="ar-belge-tarih-gr">';
    h += '<label class="field-label" for="ar-belge-tarih" id="ar-belge-tarih-lbl">Bakım tarihi</label>';
    h += '<input type="date" id="ar-belge-tarih" class="field-input" value="' + bugun + '"/></div>';
    h += '<div class="field-group hidden" id="ar-belge-km-gr">';
    h += '<label class="field-label" for="ar-belge-km" id="ar-belge-km-lbl">Bakımdaki km</label>';
    h += '<input type="number" id="ar-belge-km" class="field-input" placeholder="125000" min="0" step="1" inputmode="numeric"/></div>';
    h += '<div class="field-group ar-belge-not-gr">';
    h += '<label class="field-label" for="ar-belge-not">Not <span class="ar-label-hint">isteğe bağlı</span></label>';
    h += '<input type="text" id="ar-belge-not" class="field-input" placeholder="Kısa not…" maxlength="80"/></div>';
    h += "</div>";
    h += '<button type="button" class="ar-belge-kaydet-btn" id="ar-belge-kaydet-btn">Kaydı ekle</button>';
    h += "</div></div>";

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
      wireBelgeGecmisSil(aid);
    }

    syncBelgeFormUI();

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

  function syncBelgeFormUI() {
    var tipEl = $("ar-belge-tip");
    var kmGr = $("ar-belge-km-gr");
    var kmLbl = $("ar-belge-km-lbl");
    var tarihGr = $("ar-belge-tarih-gr");
    var tarihLbl = $("ar-belge-tarih-lbl");
    if (!tipEl) return;
    var tip = tipEl.value;
    if (kmGr) kmGr.classList.toggle("hidden", tip !== "bakim" && tip !== "km");
    if (kmLbl) kmLbl.textContent = tip === "km" ? "Güncel km" : "Bakımdaki km";
    if (tarihGr) tarihGr.classList.toggle("hidden", tip === "km");
    if (tarihLbl) {
      if (tip === "bakim") tarihLbl.textContent = "Bakım tarihi";
      else if (tip === "muayene") tarihLbl.textContent = "Muayene bitiş";
      else if (tip === "sigorta") tarihLbl.textContent = "Sigorta bitiş";
      else if (tip === "kasko") tarihLbl.textContent = "Kasko bitiş";
    }
    document.querySelectorAll(".ar-belge-tip-chip").forEach(function (b) {
      b.classList.toggle("selected", b.dataset.tip === tip);
    });
  }

  function wireBelgeGecmisSil(aid) {
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
          aracGecmisKaydet(ex, f);
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
        var yeni = {
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
        };
        aracNormalize(yeni);
        _araclar.push(yeni);
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

    var tipChips = $("ar-belge-tip-chips");
    if (tipChips) {
      tipChips.addEventListener("click", function (e) {
        var btn = e.target.closest(".ar-belge-tip-chip");
        if (!btn) return;
        var hid = $("ar-belge-tip");
        if (hid) hid.value = btn.dataset.tip || "bakim";
        syncBelgeFormUI();
      });
    }

    $("ar-belge-kaydet-btn") && $("ar-belge-kaydet-btn").addEventListener("click", async function () {
      if (!_aktifAracId) return;
      var ar = aracBul(_aktifAracId);
      if (!ar) return;
      var tip = ($("ar-belge-tip") && $("ar-belge-tip").value) || "bakim";
      var tarih = ($("ar-belge-tarih") && $("ar-belge-tarih").value) || "";
      var kmVal = parseInt(($("ar-belge-km") && $("ar-belge-km").value) || "", 10);
      var km = isNaN(kmVal) || kmVal < 0 ? "" : kmVal;
      var not = ($("ar-belge-not") && $("ar-belge-not").value || "").trim();
      if ((tip === "muayene" || tip === "sigorta" || tip === "kasko" || tip === "bakim") && !tarih) {
        $("ar-belge-tarih") && $("ar-belge-tarih").focus();
        return;
      }
      if (tip === "km" && km === "") {
        $("ar-belge-km") && $("ar-belge-km").focus();
        return;
      }
      if (tip === "bakim" && km === "" && !tarih) {
        $("ar-belge-tarih") && $("ar-belge-tarih").focus();
        return;
      }
      belgeKayitUygula(ar, tip, tarih, km, not);
      await fbKaydet();
      render();
      if ($("ar-belge-not")) $("ar-belge-not").value = "";
      if ($("ar-belge-km")) $("ar-belge-km").value = "";
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
      render();
      if ($("ar-g-tutar")) $("ar-g-tutar").value = "";
      if ($("ar-g-aciklama")) $("ar-g-aciklama").value = "";
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
