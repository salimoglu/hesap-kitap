/* Vefa yatırım ve birikim Excel raporu. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var zlib = require("zlib");

function fail(ad, detay) {
  console.error("FAIL", ad, detay || "");
  process.exitCode = 1;
}

function zipEntries(u8) {
  var buf = Buffer.from(u8);
  var i = 0;
  var out = {};
  while (i + 30 < buf.length) {
    if (buf.readUInt32LE(i) !== 0x04034b50) break;
    var method = buf.readUInt16LE(i + 8);
    var comp = buf.readUInt32LE(i + 18);
    var nameLen = buf.readUInt16LE(i + 26);
    var extra = buf.readUInt16LE(i + 28);
    var name = buf.slice(i + 30, i + 30 + nameLen).toString("utf8");
    var start = i + 30 + nameLen + extra;
    var data = buf.slice(start, start + comp);
    var payload = method === 8 ? zlib.inflateRawSync(data) : data;
    out[name] = payload.toString("utf8");
    i = start + comp;
  }
  return out;
}

function paylasilan(xml) {
  var list = [];
  var re = /<si><t(?: xml:space="preserve")?>([\s\S]*?)<\/t><\/si>/g;
  var m;
  function coz(s) {
    return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  }
  while ((m = re.exec(xml))) list.push(coz(m[1]));
  return list;
}

function satirlar(sheetXml, sst) {
  var rows = [];
  var rowRe = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  var m;
  while ((m = rowRe.exec(sheetXml))) {
    var cells = [];
    var cRe = /<c r="([A-Z]+)(\d+)"([^>]*)>(?:<v>([\s\S]*?)<\/v>)?<\/c>/g;
    var c;
    while ((c = cRe.exec(m[2]))) {
      var text = c[4];
      if (/t="s"/.test(c[3])) text = sst[parseInt(c[4], 10)];
      cells.push(text);
    }
    rows.push(cells);
  }
  return rows;
}

function sayiVar(rows, n) {
  var s = String(n);
  return rows.some(function (r) { return r.indexOf(s) >= 0; });
}

var context = {
  console: console,
  process: process,
  require: require,
  Buffer: Buffer,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  TextEncoder: TextEncoder,
  Uint8Array: Uint8Array,
  Uint32Array: Uint32Array
};
var vefaEl = { id: "vefa-container", innerHTML: "" };
context.document = {
  getElementById: function (id) { return id === "vefa-container" ? vefaEl : null; },
  querySelectorAll: function () { return []; },
  querySelector: function () { return null; },
  addEventListener: function () {},
  readyState: "complete",
  body: { appendChild: function () {}, removeChild: function () {} }
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/hk-xlsx.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/modules/yukle.js"), "utf8"), context);

var ornek = {
  gramFiyat: 3000,
  uyeler: [
    { id: "u1", ad: "Zafer EROĞLU", rol: "Başkan" },
    { id: "u2", ad: "Fatma İNCE", rol: "Üye" }
  ],
  aylar: [
    {
      key: "2026-01",
      toplamOdeme: 10000,
      odemeler: { u1: true, u2: true },
      yatirimlar: [
        { id: "y1", tip: "ceyrek", adet: 2 },
        { id: "y2", tip: "tam", adet: 1 },
        { id: "y3", tip: "nakit", nakitTL: 1500, aciklama: "Acil" }
      ]
    },
    {
      key: "2026-02",
      toplamOdeme: 4000,
      odemeler: { u1: true, u2: false },
      yatirimlar: [{ id: "y4", tip: "gram", adet: 1 }]
    }
  ],
  altinDurum: {
    "y1~1": { durum: "borc", uyeId: "u2" },
    "y2~1": { durum: "borc", dis: true, disAd: "Ali Veli" }
  }
};
var simdi = new Date(2026, 9, 20, 16, 49, 0);

function paket(pack) {
  if (!pack || !pack.bytes) {
    fail("paket bos");
    return null;
  }
  return zipEntries(pack.bytes);
}

context.VefaModule.excelOlustur(ornek, simdi).then(function (pack) {
  var dosyalar = paket(pack);
  if (!dosyalar) return;
  if (pack.dosya !== "HesapKitap_Vefa_2026-10-20.xlsx") fail("dosya adi", pack.dosya);
  var wb = dosyalar["xl/workbook.xml"];
  ["Özet", "Aylar", "Altınlar"].forEach(function (ad) {
    if (wb.indexOf('name="' + ad + '"') < 0) fail("sayfa yok", ad);
  });
  var sst = paylasilan(dosyalar["xl/sharedStrings.xml"]);
  function icerir(metin) {
    if (sst.indexOf(metin) < 0) fail("metin yok", metin);
  }
  icerir("HESAP KİTAP  —  VEFA YATIRIM VE BİRİKİM");
  icerir("Zafer EROĞLU");
  icerir("Fatma İNCE");
  icerir("Ali Veli (grup dışı)");
  icerir("Acil");
  icerir("GENEL DURUM");
  icerir("ÜYE BİRİKİMLERİ");
  icerir("ALTIN YATIRIMI");
  icerir("ALTIN NEREDE");
  icerir("BORÇTAKİ ALTIN");
  icerir("AYLIK BİRİKİM");
  icerir("AYLIK YATIRIMLAR");
  if (sst.indexOf("Borç verilen altın yok. Tamamı elimizde.") >= 0) fail("borc bos gorunmemeli");

  var ozet = satirlar(dosyalar["xl/worksheets/sheet1.xml"], sst);
  var aylar = satirlar(dosyalar["xl/worksheets/sheet2.xml"], sst);
  var altin = satirlar(dosyalar["xl/worksheets/sheet3.xml"], sst);
  [12000, 14000, 10500, 34500, 36000, 24000, 7000, 5000, 1500, 11.5, 8.75, 2.75, 8250, 26250].forEach(function (n) {
    var varMi = sayiVar(ozet, n) || sayiVar(aylar, n) || sayiVar(altin, n);
    if (!varMi) fail("sayi yok", n);
  });

  var durumlar = [];
  altin.forEach(function (r) {
    r.forEach(function (h) {
      if (h === "Elimde" || h === "Borç") durumlar.push(h);
    });
  });
  if (durumlar.join(",") !== "Elimde,Borç,Elimde,Borç") fail("altin sirasi", durumlar.join(","));

  var ayXml = dosyalar["xl/worksheets/sheet2.xml"];
  if (ayXml.indexOf('orientation="landscape"') < 0) fail("aylar yatay degil");
  if (ayXml.indexOf('fitToHeight="0"') < 0) fail("aylar sayfaya sigdirilmis");
  var ozXml = dosyalar["xl/worksheets/sheet1.xml"];
  if (ozXml.indexOf('orientation="portrait"') < 0) fail("ozet dikey degil");
  if (ozXml.indexOf("A1:E1") < 0) fail("baslik birlesmemis");
  if (dosyalar["xl/styles.xml"].indexOf('cellXfs count="33"') < 0) fail("stil sayisi");

  return context.HK_XLSX.build({
    sheets: [{ name: "S", rows: [{ r: 1, cells: [{ c: 0, t: "s", v: "a" }] }] }]
  }).then(function (bytes) {
    var eski = zipEntries(bytes)["xl/worksheets/sheet1.xml"];
    if (eski.indexOf('orientation="portrait"') < 0 || eski.indexOf('fitToHeight="1"') < 0) {
      fail("eski sayfa ayari bozuldu", eski);
    }
  }).then(function () {
    return context.VefaModule.excelOlustur(null, simdi);
  }).then(function (bosPaket) {
    var bos = paket(bosPaket);
    if (!bos) return;
    var metin = paylasilan(bos["xl/sharedStrings.xml"]);
    if (metin.indexOf("Ali Veli") >= 0) fail("canli veri ornege kirdi");
    ["Üye yok.", "Henüz aylık kayıt yok.", "Henüz vefa altını yok.", "Nakit birikim yok.", "Borç verilen altın yok. Tamamı elimizde."].forEach(function (s) {
      if (metin.indexOf(s) < 0) fail("bos metin yok", s);
    });
    return context.VefaModule.excelOlustur({
      uyeler: [{ id: "u", ad: "Kayip", rol: "Üye" }],
      aylar: [{ key: "2026-03", toplamOdeme: 10000, odemeler: { u: true }, yatirimlar: [{ id: "g", tip: "gram", adet: 1 }] }],
      altinDurum: {},
      gramFiyat: 1000
    }, simdi);
  }).then(function (zarar) {
    var z = paket(zarar);
    if (!z) return;
    var rows = satirlar(z["xl/worksheets/sheet1.xml"], paylasilan(z["xl/sharedStrings.xml"]));
    if (!sayiVar(rows, -9000)) fail("zarar eksi degil");
    return context.VefaModule.excelOlustur({
      uyeler: [{ id: "u", ad: "Fiyatsiz", rol: "Üye" }],
      aylar: [{ key: "2026-04", toplamOdeme: 4321, odemeler: { u: true }, yatirimlar: [{ id: "g2", tip: "gram", adet: 1 }] }],
      altinDurum: {},
      gramFiyat: 0
    }, simdi);
  }).then(function (fiyatsiz) {
    var f = paket(fiyatsiz);
    if (!f) return;
    var xml = f["xl/worksheets/sheet1.xml"];
    if (xml.indexOf(">-4321<") >= 0 || xml.indexOf(">-4321.0") >= 0) fail("fiyatsiz zarar yazildi");
    var metin = paylasilan(f["xl/sharedStrings.xml"]);
    if (metin.indexOf("Gram fiyatı girilmedi") < 0) fail("fiyat notu yok");
    context.window._hkVefaSahipUid = "sahip";
    return context.VefaModule.init();
  }).then(function () {
    if (vefaEl.innerHTML.indexOf('id="vf2-excel"') < 0) fail("excel butonu yok");
    if (vefaEl.innerHTML.indexOf("vf2-btn-excel") < 0) fail("excel sinifi yok");
    if (!process.exitCode) console.log("vefa excel raporu tamam");
  });
}).catch(function (e) {
  console.error(e);
  process.exitCode = 1;
});
