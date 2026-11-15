/* Saf hesap ve kayit birlestirme kontrolleri. */
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function fail(ad, detay) {
  console.error("FAIL", ad, detay || "");
  process.exitCode = 1;
}

function assert(ad, cond, detay) {
  if (!cond) fail(ad, detay);
}

var context = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  Math: Math,
  Number: Number,
  String: String,
  Object: Object,
  Array: Array,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isFinite: isFinite,
  isNaN: isNaN,
  document: {
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    createElement: function () { return { style: {}, classList: { add: function () {}, remove: function () {} } }; }
  },
  localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
  window: {}
};
context.window = context;
context.global = context;

function yukle(dosya) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", dosya), "utf8"), context, { filename: dosya });
}

yukle("js/modules/yukle.js");
yukle("js/modules/alacaklar.js");

var pay = context.hkTaksitPaylari(100, 3);
assert("taksit 100/3", pay.length === 3 && pay[0] === 33.33 && pay[1] === 33.33 && pay[2] === 33.34, JSON.stringify(pay));
var top = Math.round(pay.reduce(function (s, n) { return s + n; }, 0) * 100);
assert("taksit toplam kurus", top === 10000, String(top));
assert("taksit 10/2", context.hkTaksitPaylari(10, 2).join(",") === "5,5");
assert("taksit sifir adet", context.hkTaksitPaylari(20, 0).length === 1);

var kart = context.hkMetinDizisi({ 1: "Yapi", 0: "Garanti" });
assert("kart nesne sirasi", kart.join("|") === "Garanti|Yapi", kart.join("|"));
assert("kart dizi", context.hkMetinDizisi(["A", "", null, "B"]).join("|") === "A|B");
assert("kart metin", context.hkMetinDizisi("Tek")[0] === "Tek");
assert("kart bos", context.hkMetinDizisi(null).length === 0);

assert("konum el", context.vfKonumFiltreId("el") === "elimde");
assert("konum borc", context.vfKonumFiltreId("borc") === "borc");
assert("konum diger", context.vfKonumFiltreId("hepsi") === "hepsi");
assert("kacis", context.hkEsc('a<"&>') === "a&lt;&quot;&amp;&gt;");

var pesin = context.hkAlacakDuzenleBirlestir(
  { id: "a1", tip: "pesin", odendi: true, odemeler: { 0: true } },
  { tip: "pesin", odendi: false, kisi: "Ali" }
);
assert("pesin odendi korunur", pesin.odendi === true && pesin.id === "a1" && pesin.kisi === "Ali");

var taksit = context.hkAlacakDuzenleBirlestir(
  { id: "t1", tip: "taksit", odemeler: { 0: true, 1: true, 2: true, 5: true } },
  { tip: "taksit", taksitSayisi: 3, odemeler: {} }
);
assert("taksit eski anahtar kirpilir", taksit.odemeler[0] && taksit.odemeler[1] && taksit.odemeler[2] && !taksit.odemeler[5], JSON.stringify(taksit.odemeler));

var metinAnahtar = context.hkAlacakDuzenleBirlestir(
  { id: "t2", odemeler: { "0": true } },
  { tip: "taksit", taksitSayisi: 2, odemeler: {} }
);
assert("taksit metin anahtar", metinAnahtar.odemeler[0] === true && !metinAnahtar.odemeler[1]);

if (!process.exitCode) console.log("duzeltme testleri tamam");
