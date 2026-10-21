/* Vefa paylaşım anahtarı, veritabanı kuralındaki ifade ile aynı kalmalı. */
var fs = require("fs");
var vm = require("vm");
var context = { console: console };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(require("path").join(__dirname, "../js/hk-erisim.js"), "utf8"), context);
var er = context.HK_ERISIM;

function esit(ad, a, b) {
  var ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) {
    console.error("FAIL", ad, a, "!=", b);
    process.exitCode = 1;
  }
}

esit("yonetici", er.kuralAnahtari("Salimoglu61@gmail.com"), "salimoglu61@gmail,com");
esit("googlemail", er.kuralAnahtari("Foo.Bar@GoogleMail.com"), "foo,bar@gmail,com");
esit("yahoo", er.kuralAnahtari("Person.Name@yahoo.com"), "person,name@yahoo,com");
esit(
  "gmail ikisi",
  er.paylasimAnahtarlari("Foo.Bar@gmail.com"),
  ["foo,bar@gmail,com", "foobar@gmail,com"]
);
esit(
  "gmail noktasiz",
  er.paylasimAnahtarlari("foobar@gmail.com"),
  ["foobar@gmail,com"]
);
esit("bos", er.paylasimAnahtarlari("not-an-email"), []);
esit("yasak", er.paylasimAnahtarlari("a/b@gmail.com"), []);

var MISAFIR = ["islemler", "birikim", "arabam", "kredi", "alacaklar", "altin"];
var OZEL = ["urun", "cocugum", "verilen-altin", "vefa", "muhtac"];
var izleyici = { uid: "izleyici-1", email: "paylasilan.hesap@gmail.com", isAnonymous: false };
var yonetici = { uid: "yonetici-1", email: "salimoglu61@gmail.com", isAnonymous: false };

context.window._hkVefaSahipUid = "";
esit("izleyici ozel yok", er.izinliSekmeler(izleyici), MISAFIR);
esit("oturumsuz ozel yok", er.izinliSekmeler(null), MISAFIR);
OZEL.forEach(function (id) {
  esit("izleyici " + id, er.modulErisilebilir(id, izleyici), false);
  esit("oturumsuz " + id, er.modulErisilebilir(id, null), false);
});

context.window._hkVefaSahipUid = "yonetici-1";
esit("izleyici yalniz vefa", er.izinliSekmeler(izleyici), MISAFIR.concat(["vefa"]));
esit("izleyici cocugum kapali", er.modulErisilebilir("cocugum", izleyici), false);
esit("izleyici urun kapali", er.modulErisilebilir("urun", izleyici), false);

context.window._hkVefaSahipUid = "";
var yoneticiListe = er.izinliSekmeler(yonetici);
OZEL.forEach(function (id) {
  esit("yonetici " + id, yoneticiListe.indexOf(id) >= 0, true);
});

var html = fs.readFileSync(require("path").join(__dirname, "../index.html"), "utf8");
OZEL.forEach(function (id) {
  var btn = new RegExp('class="tab-btn hidden"[^>]*data-tab="' + id + '"[^>]*data-hk-ozel="1"');
  var panel = new RegExp('id="tab-' + id + '" class="tab-panel" data-hk-ozel="1"');
  if (!btn.test(html)) {
    console.error("FAIL ozel sekme isareti", id);
    process.exitCode = 1;
  }
  if (!panel.test(html)) {
    console.error("FAIL ozel panel isareti", id);
    process.exitCode = 1;
  }
});
if (html.indexOf('html:not(.hk-erisim-hazir) .tab-panel[data-hk-ozel="1"]') < 0) {
  console.error("FAIL erisim oncesi panel kilidi yok");
  process.exitCode = 1;
}
MISAFIR.forEach(function (id) {
  if (html.indexOf('data-tab="' + id + '" data-hk-ozel="1"') >= 0) {
    console.error("FAIL misafir sekme ozel isaretli", id);
    process.exitCode = 1;
  }
});

if (!process.exitCode) console.log("vefa paylasim anahtarlari tamam");
