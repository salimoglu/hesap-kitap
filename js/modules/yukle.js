/* yukle.js — defter.net PDF rapor aktarimi */

const YukleModule = (() => {
  const $ = id => document.getElementById(id);
  let _bulunanIslemler = [];
  let _raporTarihi = "";

  if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  function modalAc() { sifirla(); $("modal-yukle").classList.remove("hidden"); }
  function modalKapat() { $("modal-yukle").classList.add("hidden"); }

  function sifirla() {
    $("yukle-drop-zone").style.display = "flex";
    $("yukle-progress").classList.remove("visible");
    $("yukle-onizleme").classList.remove("visible");
    $("yukle-hata").classList.remove("visible");
    $("yukle-aktar").classList.add("hidden");
    $("yukle-file-input").value = "";
    const header = $("yukle-onizleme-tablo").querySelector(".yukle-tablo-row.header");
    $("yukle-onizleme-tablo").innerHTML = "";
    if (header) $("yukle-onizleme-tablo").appendChild(header);
    $("yukle-ozet").innerHTML = "";
    $("yukle-sayi").textContent = "0";
    $("yukle-aktar-sayi").textContent = "0";
    _bulunanIslemler = [];
    _raporTarihi = "";
  }

  function hataGoster(msg) {
    $("yukle-hata").textContent = msg;
    $("yukle-hata").classList.add("visible");
    $("yukle-progress").classList.remove("visible");
  }

  function progressGoster(pct, msg) {
    $("yukle-progress").classList.add("visible");
    $("yukle-progress-bar").style.width = pct + "%";
    $("yukle-progress-text").textContent = msg;
  }

  async function pdfOku(file) {
    $("yukle-hata").classList.remove("visible");
    $("yukle-drop-zone").style.display = "none";
    progressGoster(10, "PDF aciliyor...");

    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let tumSatirlar = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      progressGoster(10 + Math.round((p / pdf.numPages) * 60),
        p + "/" + pdf.numPages + ". sayfa okunuyor...");
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const yMap = {};
      for (const item of content.items) {
        if (!item.str.trim()) continue;
        const y = Math.round(item.transform[5]);
        const x = Math.round(item.transform[4]);
        if (!yMap[y]) yMap[y] = [];
        yMap[y].push({ x, text: item.str.trim() });
      }
      const sayfaSatirlari = Object.keys(yMap)
        .map(Number).sort((a, b) => b - a)
        .map(y => yMap[y].sort((a, b) => a.x - b.x).map(i => i.text));
      tumSatirlar = tumSatirlar.concat(sayfaSatirlari);
    }

    progressGoster(75, "Veriler analiz ediliyor...");
    const islemler = raporuCoz(tumSatirlar);
    progressGoster(95, "Onizleme hazirlaniyor...");

    if (islemler.length === 0) {
      hataGoster("Gecerli veri bulunamadi. defter.net raporu bekleniyor: Kategori | Adet | Tutar");
      $("yukle-drop-zone").style.display = "flex";
      return;
    }

    _bulunanIslemler = islemler;
    onizlemeGoster(islemler);
    $("yukle-progress").classList.remove("visible");
  }

  /* defter.net Kategori Ozet Raporu Cozucu
     Format: KATEGORI ADI   [ADET]   [TUTAR]
     Gelir bolumu: pozitif tutarlar
     Gider bolumu: negatif tutarlar
  */
  function raporuCoz(satirlar) {
    function parsePara(s) {
      if (!s) return null;
      s = s.replace(/\s/g, "");
      const neg = s.startsWith("-");
      s = s.replace("-", "");
      if (/^[\d.]+,[\d]{2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(s);
      return isNaN(n) ? null : (neg ? -n : n);
    }

    // Rapor tarihini bul
    for (const satir of satirlar.slice(0, 8)) {
      const joined = satir.join(" ");
      const m = joined.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (m) {
        _raporTarihi = m[3] + "-" + m[2] + "-" + m[1];
        break;
      }
    }
    if (!_raporTarihi) {
      const d = new Date();
      _raporTarihi = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    }

    const islemler = [];
    let aktifTip = null;

    // Atlanacak satirlar
    const SKIP = /^(toplam|islem|adedi|kategori|dagil|defter|https?:|\d+\/\d+|ev ortak|kategori da)/i;
    // Ust duzey ana kategoriler — bunlari atla (cift sayma)
    const ANA_KAT = new Set([
      "GELIRLER", "GELİRLER",
      "BİRİKİM", "BIRIKIM",
      "EV GENEL",
      "KİŞİSEL HARCAMA (BAKIM-EŞYA-GEZİ)", "KISISEL HARCAMA (BAKIM-ESYA-GEZI)",
      "AİLEM", "AILEM",
      "MUTFAK",
      "ARAÇ", "ARAC",
      "GENEL GİDERLER", "GENEL GIDERLER",
      "FATURALAR",
      "İAŞE", "IASE",
    ]);

    for (const satir of satirlar) {
      const joined = satir.join(" ").trim();
      if (!joined || joined.length < 2) continue;
      if (SKIP.test(joined)) continue;

      // Tek kelime tip bolumu mu?
      if (satir.length === 1) {
        const tek = satir[0].replace(/\s/g, "").toUpperCase();
        if (tek === "GELİR" || tek === "GELIR") { aktifTip = "gelir"; continue; }
        if (tek === "GİDER" || tek === "GIDER") { aktifTip = "gider"; continue; }
      }
      if (!aktifTip) continue;

      const n = satir.length;
      if (n < 3) continue;

      // Son token = tutar, son-1 = adet
      const tutar = parsePara(satir[n - 1]);
      const adet = parseInt(satir[n - 2]);

      if (tutar === null || isNaN(adet) || adet < 1 || adet > 9999) continue;

      // Tutar tokeninin rakam+virgul+nokta oldugunu dogrula
      const tutarRaw = satir[n - 1].replace(/\s/g, "");
      if (!/^-?[\d.,]+$/.test(tutarRaw)) continue;

      // Kategori adi
      const katAdi = satir.slice(0, n - 2).join(" ").trim();
      if (!katAdi || katAdi.length < 2) continue;
      if (/^toplam$/i.test(katAdi)) continue;

      // Ana kategori ise atla
      const katUpper = katAdi.toUpperCase().replace(/\s+/g, " ");
      if (ANA_KAT.has(katUpper)) continue;

      const gercekTutar = Math.abs(tutar);
      if (gercekTutar <= 0) continue;

      // Tip: aktifTip kullan, tutarin isaretini de dikkate al
      let tip = aktifTip;
      if (tutar < 0) tip = "gider";
      else if (tutar > 0 && aktifTip === "gelir") tip = "gelir";

      islemler.push({
        tip,
        tarih: _raporTarihi,
        kategori: katAdi,
        tutar: gercekTutar,
        aciklama: "Rapor (" + adet + " islem)",
      });
    }

    return islemler;
  }

  function para(s) {
    return Number(s).toLocaleString("tr-TR", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function onizlemeGoster(islemler) {
    const tablo = $("yukle-onizleme-tablo");
    const header = tablo.querySelector(".header");
    tablo.innerHTML = "";
    if (header) tablo.appendChild(header);

    let gelirT = 0, giderT = 0;
    for (const i of islemler) {
      const row = document.createElement("div");
      row.className = "yukle-tablo-row";
      row.innerHTML =
        "<span class=\"yukle-col-tip " + i.tip + "\">" +
          (i.tip === "gelir" ? "+ Gelir" : "- Gider") +
        "</span>" +
        "<span class=\"yukle-col-tarih\">" +
          i.tarih.split("-").reverse().join(".") +
        "</span>" +
        "<span class=\"yukle-col-kat\">" + i.kategori +
          " <small style=\"color:var(--text-muted)\">" + i.aciklama + "</small>" +
        "</span>" +
        "<span class=\"yukle-col-tutar " + i.tip + "\">" +
          (i.tip === "gider" ? "-" : "+") + " " + para(i.tutar) +
        "</span>";
      tablo.appendChild(row);
      if (i.tip === "gelir") gelirT += parseFloat(i.tutar);
      else giderT += parseFloat(i.tutar);
    }

    const net = gelirT - giderT;
    $("yukle-ozet").innerHTML =
      "<div class=\"yukle-ozet-kart\"><span class=\"yukle-ozet-label\">Gelir</span>" +
      "<span class=\"yukle-ozet-val gelir\">" + para(gelirT) + " TL</span></div>" +
      "<div class=\"yukle-ozet-kart\"><span class=\"yukle-ozet-label\">Gider</span>" +
      "<span class=\"yukle-ozet-val gider\">" + para(giderT) + " TL</span></div>" +
      "<div class=\"yukle-ozet-kart\"><span class=\"yukle-ozet-label\">Net</span>" +
      "<span class=\"yukle-ozet-val toplam\">" + (net >= 0 ? "" : "-") + para(Math.abs(net)) + " TL</span></div>" +
      "<div class=\"yukle-ozet-kart\" style=\"flex-basis:100%;background:rgba(240,184,64,0.06);border-color:var(--gold-dim)\">" +
      "<span class=\"yukle-ozet-label\">Bilgi</span>" +
      "<span style=\"font-size:11px;color:var(--text-secondary)\">Her alt kategori toplam tutarla eklenir. " +
      "Rapor tarihi: " + _raporTarihi.split("-").reverse().join(".") + "</span></div>";

    $("yukle-sayi").textContent = islemler.length;
    $("yukle-aktar-sayi").textContent = islemler.length;
    $("yukle-onizleme").classList.add("visible");
    $("yukle-aktar").classList.remove("hidden");
  }

  async function aktar() {
    if (!_bulunanIslemler.length) return;
    const btn = $("yukle-aktar");
    btn.disabled = true;
    btn.textContent = "Aktariliyor...";

    let ok = 0;
    for (const i of _bulunanIslemler) {
      try {
        await IslemlerDB.add({
          tip: i.tip,
          kategori: i.kategori,
          tutar: i.tutar,
          aciklama: i.aciklama || "",
          tarih: i.tarih,
        });
        ok++;
      } catch (e) {
        console.warn("Eklenemedi:", e);
      }
    }

    btn.textContent = ok + " kayit aktarildi!";
    btn.style.background = "var(--green)";

    // Listeyi yenile
    if (window._islemlerYukle) await window._islemlerYukle();

    setTimeout(() => {
      modalKapat();
      btn.disabled = false;
      btn.textContent = "Aktar";
      btn.style.background = "";
    }, 2000);
  }

  function baglaEventler() {
    const b = $("btn-yukle");
    if (b) b.addEventListener("click", modalAc);

    $("yukle-close").addEventListener("click", modalKapat);
    $("yukle-iptal").addEventListener("click", modalKapat);
    $("modal-yukle").addEventListener("click", e => {
      if (e.target === $("modal-yukle")) modalKapat();
    });
    $("yukle-aktar").addEventListener("click", aktar);

    $("yukle-drop-zone").addEventListener("click", () =>
      $("yukle-file-input").click()
    );
    $("yukle-file-input").addEventListener("change", e => {
      const f = e.target.files[0];
      if (f) pdfOku(f).catch(err => hataGoster("Hata: " + err.message));
    });

    const dz = $("yukle-drop-zone");
    dz.addEventListener("dragover", e => {
      e.preventDefault(); dz.classList.add("drag-over");
    });
    dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
    dz.addEventListener("drop", e => {
      e.preventDefault(); dz.classList.remove("drag-over");
      const f = e.dataTransfer.files[0];
      if (f && f.type === "application/pdf") {
        pdfOku(f).catch(err => hataGoster("Hata: " + err.message));
      } else {
        hataGoster("Lutfen bir PDF dosyasi yukleyin.");
      }
    });
  }

  function init() { baglaEventler(); }
  return { init };
})();
