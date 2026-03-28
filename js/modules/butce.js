/* butce.js — Aylik Butce Planlama Modulu */
const ButceModule = (() => {
  const $ = id => document.getElementById(id);

  // Sabit satir yapisi — tutarlar degisir, satirlar sabit
  const YAPI = [
    { bolum: "gelir", baslik: "GELİR", satirlar: [
      { id: "salim_maas",   label: "SALİM MAAŞ / TAHMİNİ",    varsayilan: 0 },
      { id: "bugra_maas",   label: "BUĞRA MAAŞ / TAHMİNİ",    varsayilan: 0 },
      { id: "toplam_maas",  label: "TOPLAM MAAŞ / TAHMİNİ",   varsayilan: 0, hesaplanan: true, hesapla: d => (d.salim_maas||0)+(d.bugra_maas||0) },
      { id: "gelecek_borc", label: "GELECEK OLAN BORÇLAR",     varsayilan: 0 },
      { id: "hedef_birikim",label: "HEDEF BİRİKİM MİKTARI",   varsayilan: 0 },
      { id: "zekat_tahmini",label: "ZEKAT TAHMİNİ",           varsayilan: 0 },
    ]},
    { bolum: "zorunlu", baslik: "ZORUNLU GİDERLER", satirlar: [
      { id: "mutfak",       label: "MUTFAK",                   varsayilan: 0 },
      { id: "kira",         label: "KİRA",                     varsayilan: 0 },
      { id: "iase",         label: "İAŞE",                     varsayilan: 0 },
      { id: "faturalar",    label: "FATURALAR (DOGALGAZ-ELEKTRİK-SU VE TELEFON)", varsayilan: 0 },
      { id: "google_vs",    label: "GOOGLE-YOUTUBE VE SPOTİFY",varsayilan: 0 },
      { id: "saglik",       label: "SAĞLIK/GÖZLÜK",            varsayilan: 0 },
      { id: "zekat",        label: "ZEKAT",                    varsayilan: 0 },
      { id: "arac_bakim",   label: "ARAÇ BAKIM",               varsayilan: 0 },
      { id: "arac_sigorta", label: "ARAÇ SİGORTA",             varsayilan: 0 },
      { id: "arac_muayene", label: "ARAÇ MUAYENE",             varsayilan: 0 },
      { id: "arac_mtv",     label: "ARAÇ MTV",                 varsayilan: 0 },
      { id: "mazot",        label: "MAZOT",                    varsayilan: 0 },
      { id: "zorunlu_top",  label: "TOPLAM", varsayilan: 0, hesaplanan: true,
        hesapla: d => ["mutfak","kira","iase","faturalar","google_vs","saglik","zekat","arac_bakim","arac_sigorta","arac_muayene","arac_mtv","mazot"].reduce((s,k)=>s+(d[k]||0),0)
      },
    ]},
    { bolum: "istege", baslik: "İSTEĞE BAĞLI GİDERLER", satirlar: [
      { id: "eglence",      label: "EĞLENCE-D.YEMEK-EĞİTİM-HOBİ VS", varsayilan: 0 },
      { id: "cocuk",        label: "ÇOCUK",                    varsayilan: 0 },
      { id: "giyim",        label: "GİYİM",                    varsayilan: 0 },
      { id: "kredi_kart_ev",label: "KREDİ KARTI (EV EŞYASI)", varsayilan: 0 },
      { id: "oyle",         label: "ÖYLE",                     varsayilan: 0 },
      { id: "istege_top",   label: "TOPLAM", varsayilan: 0, hesaplanan: true,
        hesapla: d => ["eglence","cocuk","giyim","kredi_kart_ev","oyle"].reduce((s,k)=>s+(d[k]||0),0)
      },
    ]},
    { bolum: "yatirim", baslik: "YATIRIM", satirlar: [
      { id: "bes",          label: "BES",                      varsayilan: 0 },
      { id: "fon",          label: "FON / YATIRIM VS",         varsayilan: 0 },
      { id: "kardes_fon",   label: "KARDEŞLER ORTAK FON",      varsayilan: 0 },
      { id: "vefa",         label: "VEFA BİRLİĞİ",             varsayilan: 0 },
      { id: "nakit",        label: "NAKİT KALAN",              varsayilan: 0 },
      { id: "atalira",      label: "ATALİRA",                  varsayilan: 0 },
      { id: "kripto",       label: "KRİPTO",                   varsayilan: 0 },
      { id: "yatirim_top",  label: "TOPLAM", varsayilan: 0, hesaplanan: true,
        hesapla: d => ["bes","fon","kardes_fon","vefa","nakit","atalira","kripto"].reduce((s,k)=>s+(d[k]||0),0)
      },
    ]},
  ];

  const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  let _veri = {}; // { satirId: tutar }
  let _aktifAy = new Date().getMonth(); // 0-11
  let _aktifYil = new Date().getFullYear();

  function para(n) { return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function pct(n, toplam) { if(!toplam) return "0,00"; return ((n/toplam)*100).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}); }

  // Firebase den veri yukle
  async function veriYukle() {
    const key = `butce_${_aktifYil}_${_aktifAy+1}`;
    if (typeof _fbDb !== "undefined" && _fbDb) {
      try {
        const snap = await _fbDb.ref(key).once("value");
        _veri = snap.val() || {};
      } catch(e) { _veri = {}; }
    } else { _veri = {}; }
  }

  // Firebase e veri kaydet
  async function veriKaydet() {
    const key = `butce_${_aktifYil}_${_aktifAy+1}`;
    if (typeof _fbDb !== "undefined" && _fbDb) {
      try { await _fbDb.ref(key).set(_veri); } catch(e) {}
    }
  }

  // Hesaplanan degerleri guncelle
  function hesapla() {
    for (const bolum of YAPI) {
      for (const satir of bolum.satirlar) {
        if (satir.hesaplanan) _veri[satir.id] = satir.hesapla(_veri);
      }
    }
  }

  // Toplam gelir
  function toplamGelir() { return (_veri.salim_maas||0)+(_veri.bugra_maas||0)+(_veri.gelecek_borc||0); }

  // Toplam harcanan
  function toplamHarcanan() { return (_veri.zorunlu_top||0)+(_veri.istege_top||0)+(_veri.yatirim_top||0); }

  // Render
  function render() {
    hesapla();
    const container = $("butce-container");
    if (!container) return;

    const gelir = toplamGelir();
    const harcanan = toplamHarcanan();
    const kalan = gelir - harcanan;

    let html = "";

    // Ay secici
    html += `<div class="butce-ay-bar">
      <button class="butce-ay-btn" id="butce-ay-geri">&#8249;</button>
      <span class="butce-ay-label">${AYLAR[_aktifAy]} ${_aktifYil}</span>
      <button class="butce-ay-btn" id="butce-ay-ileri">&#8250;</button>
      <button class="butce-rapor-btn" id="butce-rapor-btn">&#8595; CSV İndir</button>
    </div>`;

    // Tablo
    html += `<div class="butce-tablo-wrap"><table class="butce-tablo">`,
    html += `<thead><tr>
      <th class="bt-col-label">KATEGORİ</th>
      <th class="bt-col-tutar">TAHMİNİ TUTAR</th>
      <th class="bt-col-pct">YÜZDE</th>
    </tr></thead><tbody>`;

    for (const bolum of YAPI) {
      // Bölüm başlığı
      html += `<tr class="bt-bolum-baslik"><td colspan="3">${bolum.baslik}</td></tr>`;

      for (const satir of bolum.satirlar) {
        const val = _veri[satir.id] || 0;
        const isTop = satir.label === "TOPLAM";
        const isHesap = satir.hesaplanan;
        const rowCls = isTop ? "bt-toplam-row" : (isHesap ? "bt-hesap-row" : "bt-satir");

        if (isHesap) {
          // Hesaplanan satir — sadece goster
          html += `<tr class="${rowCls}">`,
          html += `<td class="bt-col-label">${satir.label}</td>`,
          html += `<td class="bt-col-tutar">${para(val)}</td>`,
          html += `<td class="bt-col-pct">${gelir ? pct(val,gelir) : "0,00"}</td>`,
          html += `</tr>`;
        } else {
          // Duzenlenebilir satir
          html += `<tr class="${rowCls}">`,
          html += `<td class="bt-col-label">${satir.label}</td>`,
          html += `<td class="bt-col-tutar">`,
          html += `<input type="number" class="bt-input" data-id="${satir.id}" value="${val||""}" placeholder="0" min="0" step="0.01" inputmode="decimal" />`,
          html += `</td>`,
          html += `<td class="bt-col-pct">${gelir ? pct(val,gelir) : "0,00"}</td>`,
          html += `</tr>`;
        }
      }
    }

    // Sonuç satırları
    html += `<tr class="bt-bolum-baslik"><td colspan="3">SONUÇ</td></tr>`;
    html += `<tr class="bt-sonuc-row bt-harcanan">`,
    html += `<td class="bt-col-label">TOPLAM HARCANAN</td>`,
    html += `<td class="bt-col-tutar">${para(harcanan)}</td>`,
    html += `<td class="bt-col-pct">${gelir ? pct(harcanan,gelir) : "0,00"}</td></tr>`;

    html += `<tr class="bt-sonuc-row bt-kalan">`,
    html += `<td class="bt-col-label">KALAN</td>`,
    html += `<td class="bt-col-tutar">${para(kalan)}</td>`,
    html += `<td class="bt-col-pct">${gelir ? pct(kalan,gelir) : "0,00"}</td></tr>`;

    html += `</tbody></table></div>`;

    container.innerHTML = html;
    baglaInputlar();
    baglaAyButonlari();
  }

  function baglaInputlar() {
    document.querySelectorAll(".bt-input").forEach(inp => {
      inp.addEventListener("change", async function() {
        const id = this.dataset.id;
        const val = parseFloat(this.value) || 0;
        _veri[id] = val;
        hesapla();
        // Yuzde ve toplam satirlarini guncelle
        renderSatirlar();
        // Firebase e kaydet
        await veriKaydet();
      });
      // Enter ile sonraki inputa gec
      inp.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          const inputs = [...document.querySelectorAll(".bt-input")];
          const idx = inputs.indexOf(this);
          if (inputs[idx+1]) inputs[idx+1].focus();
        }
      });
    });
  }

  // Sadece yuzde ve hesaplanan satirlari yenile (tam render olmadan)
  function renderSatirlar() {
    hesapla();
    const gelir = toplamGelir();
    const harcanan = toplamHarcanan();
    const kalan = gelir - harcanan;

    // Hesaplanan satirlar
    document.querySelectorAll(".bt-input").forEach(inp => {
      // Yuzde guncelle
      const tr = inp.closest("tr");
      const pctCell = tr?.querySelector(".bt-col-pct");
      if (pctCell) pctCell.textContent = gelir ? pct(parseFloat(inp.value)||0, gelir) : "0,00";
    });

    // Hesaplanan satirlari bul ve guncelle
    document.querySelectorAll(".bt-hesap-row, .bt-toplam-row").forEach(tr => {
      const labelEl = tr.querySelector(".bt-col-label");
      const tutarEl = tr.querySelector(".bt-col-tutar");
      const pctEl = tr.querySelector(".bt-col-pct");
      if (!labelEl) return;
      const label = labelEl.textContent;
      // Bu satira karsilik gelen satir id sini bul
      for (const bolum of YAPI) {
        for (const satir of bolum.satirlar) {
          if (satir.label === label && satir.hesaplanan) {
            const val = _veri[satir.id] || 0;
            if (tutarEl) tutarEl.textContent = para(val);
            if (pctEl) pctEl.textContent = gelir ? pct(val, gelir) : "0,00";
          }
        }
      }
      // Sonuc satirlari
      if (label === "TOPLAM HARCANAN") {
        if (tutarEl) tutarEl.textContent = para(harcanan);
        if (pctEl) pctEl.textContent = gelir ? pct(harcanan, gelir) : "0,00";
      }
      if (label === "KALAN") {
        if (tutarEl) tutarEl.textContent = para(kalan);
        if (pctEl) pctEl.textContent = gelir ? pct(kalan, gelir) : "0,00";
        tr.className = "bt-sonuc-row " + (kalan >= 0 ? "bt-kalan" : "bt-kalan-negatif");
      }
    });
  }

  function baglaAyButonlari() {
    const geri = $("butce-ay-geri");
    const ileri = $("butce-ay-ileri");
    const rapor = $("butce-rapor-btn");
    if (geri) geri.addEventListener("click", async () => {
      _aktifAy--; if (_aktifAy < 0) { _aktifAy = 11; _aktifYil--; }
      await veriYukle(); render();
    });
    if (ileri) ileri.addEventListener("click", async () => {
      _aktifAy++; if (_aktifAy > 11) { _aktifAy = 0; _aktifYil++; }
      await veriYukle(); render();
    });
    if (rapor) rapor.addEventListener("click", csvIndir);
  }

  // CSV indirme
  function csvIndir() {
    hesapla();
    const gelir = toplamGelir();
    const harcanan = toplamHarcanan();
    const kalan = gelir - harcanan;
    const ay = `${AYLAR[_aktifAy]} ${_aktifYil}`;

    let rows = [];
    rows.push(["HESAP KİTAP - AYLIK BÜTÇE TABLOSU"]);
    rows.push([ay]);
    rows.push([]);
    rows.push(["KATEGORİ", "TAHMİNİ TUTAR", "YÜZDE (%)"]);

    for (const bolum of YAPI) {
      rows.push([bolum.baslik, "", ""]);
      for (const satir of bolum.satirlar) {
        const val = _veri[satir.id] || 0;
        const pctVal = gelir ? ((val/gelir)*100).toFixed(2) : "0.00";
        rows.push([satir.label, val.toFixed(2), pctVal]);
      }
      rows.push([]);
    }

    rows.push(["SONUÇ", "", ""]);
    rows.push(["TOPLAM HARCANAN", harcanan.toFixed(2), gelir ? ((harcanan/gelir)*100).toFixed(2) : "0.00"]);
    rows.push(["KALAN", kalan.toFixed(2), gelir ? ((kalan/gelir)*100).toFixed(2) : "0.00"]);

    const csv = rows.map(r => r.map(c => `"${c}"`).join(";")).join("
");
    const bom = "﻿"; // UTF-8 BOM - Excel Turkce karakter icin
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `butce_${AYLAR[_aktifAy]}_${_aktifYil}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function init() {
    await veriYukle();
    render();
  }

  return { init };
})();
