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

if (!process.exitCode) console.log("vefa paylasim anahtarlari tamam");
