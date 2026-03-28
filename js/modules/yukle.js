/* yukle.js — defter.net PDF kategori raporu */

const YukleModule = (() => {
  const $ = id => document.getElementById(id);
  let _islemler = [];
  let _tarih = "";

  if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  function ac() { sifirla(); $("modal-yukle").classList.remove("hidden"); }
  function kapat() { $("modal-yukle").classList.add("hidden"); }

  function sifirla() {
    $("yukle-drop-zone").style.display = "flex";
    $("yukle-progress").classList.remove("visible");
    $("yukle-onizleme").classList.remove("visible");
    $("yukle-hata").classList.remove("visible");
    $("yukle-aktar").classList.add("hidden");
    $("yukle-file-input").value = "";
    const h = $("yukle-onizleme-tablo").querySelector(".header");
    $("yukle-onizleme-tablo").innerHTML = "";
    if (h) $("yukle-onizleme-tablo").appendChild(h);
    $("yukle-ozet").innerHTML = "";
    $("yukle-sayi").textContent = "0";
    $("yukle-aktar-sayi").textContent = "0";
    _islemler = []; _tarih = "";
  }

  function hata(msg) {
    $("yukle-hata").textContent = msg;
    $("yukle-hata").classList.add("visible");
    $("yukle-progress").classList.remove("visible");
    $("yukle-drop-zone").style.display = "flex";
  }

  function prog(pct, msg) {
    $("yukle-progress").classList.add("visible");
    $("yukle-progress-bar").style.width = pct + "%";
    $("yukle-progress-text").textContent = msg;
  }

  async function pdfOku(file) {
    $("yukle-hata").classList.remove("visible");
    $("yukle-drop-zone").style.display = "none";
    prog(10, "PDF aciliyor...");

    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

    // Tum metni topla — her item icin metin + pozisyon
    let items = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      prog(10 + Math.round(p/pdf.numPages*55), p+"/"+pdf.numPages+". sayfa...");
      const page = await pdf.getPage(p);
      const ct = await page.getTextContent();
      for (const item of ct.items) {
        const t = item.str.trim();
        if (!t) continue;
        items.push({
          t,
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
          page: p
        });
      }
    }

    prog(70, "Analiz ediliyor...");
    // Ham satirlari debug icin kaydet
    window._pdfItems = items;

    const result = coz(items);
    prog(95, "Onizleme...");

    if (!result.length) {
      // Debug: ilk 30 item i goster
      const ornek = items.slice(0,30).map(i=>i.t).join(" | ");
      hata("Veri bulunamadi. Ham metin ornegi: " + ornek.substring(0,200));
      return;
    }

    _islemler = result;
    onizle(result);
    $("yukle-progress").classList.remove("visible");
  }

  /* ---- COZUCU ----
     defter.net rapor yapisi:
     Sayfa 1: pasta grafik + tablo
     Tablo: KATEGORI ADI | ISLEM ADEDI | TOPLAM
     GELİR bolumu pozitif, GİDER bolumu negatif
     
     PDF item'lari genelde tek tek kelime olarak geliyor.
     Strateji: tum text'i birlestiip regex ile parse et.
  */
  function coz(items) {
    // Tum metni sirali birlestir (y azalan, x artan)
    const sorted = [...items].sort((a,b)=>{
      if (a.page !== b.page) return a.page - b.page;
      if (Math.abs(a.y - b.y) > 3) return b.y - a.y;
      return a.x - b.x;
    });

    // Rapor tarihini bul
    for (const item of sorted.slice(0,10)) {
      const m = item.t.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (m) { _tarih = m[3]+"-"+m[2]+"-"+m[1]; break; }
    }
    if (!_tarih) {
      const d = new Date();
      _tarih = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    }

    // Y gruplarina gore satirlara ayir
    const satirMap = {};
    for (const item of sorted) {
      // Ayni sayfadaki yakin y degerlerini grupla (+-4px)
      let key = item.page+"_"+Math.round(item.y/4)*4;
      if (!satirMap[key]) satirMap[key] = { items:[], page:item.page, y:item.y };
      satirMap[key].items.push(item);
    }

    // Satirlari sirala ve metin dizisi olustur
    const satirlar = Object.values(satirMap)
      .sort((a,b)=> a.page!==b.page ? a.page-b.page : b.y-a.y)
      .map(s => s.items.sort((a,b)=>a.x-b.x).map(i=>i.t));

    // Para parse: "275.282,46" veya "-57.408,55"
    function parsePara(s) {
      s = s.trim().replace(/[₺\s]/g,"");
      const neg = s.startsWith("-"); s=s.replace("-","");
      // Turkce: nokta=binlik, virgul=ondalik
      if (/^[\d.]+,[\d]{1,2}$/.test(s)) s=s.replace(/\./g,"").replace(",",".");
      // Sadece virgul: "57,40"
      else if (/^[\d]+,[\d]{1,2}$/.test(s)) s=s.replace(",",".");
      const n = parseFloat(s);
      return isNaN(n)?null:(neg?-n:n);
    }
    function isPara(s) {
      return /^-?[\d.,]+$/.test(s.replace(/[₺\s]/g,"")) && parsePara(s)!==null;
    }
    function isAdet(s) {
      return /^\d{1,4}$/.test(s.trim()) && parseInt(s)>0 && parseInt(s)<=9999;
    }

    const islemler = [];
    let aktifTip = null;
    const ATLA = /^(toplam|islem adedi|kategori|gelir.gider|kategori da|defter|https?:|\d+\/\d+|ev ortak|rapor|pie|type=|income)/i;
    // Ana (ust) kategoriler - cift saymamak icin atla
    const ANA = new Set(["GELİRLER","BİRİKİM","EV GENEL","KİŞİSEL HARCAMA (BAKIM-EŞYA-GEZİ)","KİŞİSEL","AİLEM","MUTFAK","ARAÇ","GENEL GİDERLER","FATURALAR","İAŞE"]);

    for (const satir of satirlar) {
      const joined = satir.join(" ").trim();
      if (!joined || joined.length < 2) continue;
      if (ATLA.test(joined)) continue;

      // Tek item satirlar — tip bolumu mu?
      if (satir.length === 1) {
        const u = satir[0].replace(/[\s\u00A0]/g,"").toUpperCase();
        if (u==="GELİR"||u==="GELIR") { aktifTip="gelir"; continue; }
        if (u==="GİDER"||u==="GIDER") { aktifTip="gider"; continue; }
      }

      // Birden fazla token: son 2 token adet+tutar mi?
      // VEYA: 2 token: "adet tutar"
      if (!aktifTip) continue;

      // Son token tutar mi?
      const n = satir.length;
      if (n < 2) continue;

      // Son 1 veya 2 token kontrol
      let tutar=null, adet=null, katTokenlar=[];

      // Durum 1: [...kat] [adet] [tutar]
      if (n>=3 && isAdet(satir[n-2]) && isPara(satir[n-1])) {
        tutar = parsePara(satir[n-1]);
        adet = parseInt(satir[n-2]);
        katTokenlar = satir.slice(0,n-2);
      }
      // Durum 2: [...kat] [tutar] (adet onceki satirda)
      else if (n>=2 && isPara(satir[n-1]) && !isAdet(satir[n-2])) {
        tutar = parsePara(satir[n-1]);
        adet = 1;
        katTokenlar = satir.slice(0,n-1);
      }
      else continue;

      if (tutar===null || Math.abs(tutar)<=0) continue;

      const katAdi = katTokenlar.join(" ").trim();
      if (!katAdi || katAdi.length<2) continue;
      if (/^toplam$/i.test(katAdi)) continue;

      // Ana kategori mi?
      if (ANA.has(katAdi.toUpperCase().replace(/\s+/g," "))) continue;

      const tip = tutar<0?"gider":(aktifTip==="gelir"?"gelir":"gider");

      islemler.push({
        tip,
        tarih: _tarih,
        kategori: katAdi,
        tutar: Math.abs(tutar),
        aciklama: "Rapor ("+adet+" islem)",
      });
    }

    return islemler;
  }

  function para(s){return Number(s).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}

  function onizle(list) {
    const tablo = $("yukle-onizleme-tablo");
    const h = tablo.querySelector(".header");
    tablo.innerHTML=""; if(h)tablo.appendChild(h);
    let gT=0,giT=0;
    for(const i of list){
      const row=document.createElement("div"); row.className="yukle-tablo-row";
      row.innerHTML=
        "<span class=\"yukle-col-tip "+i.tip+"\">"+(i.tip==="gelir"?"+ Gelir":"- Gider")+"</span>"+
        "<span class=\"yukle-col-tarih\">"+i.tarih.split("-").reverse().join(".")+"</span>"+
        "<span class=\"yukle-col-kat\">"+i.kategori+          " <small style=\"color:var(--text-muted)\">"+i.aciklama+"</small></span>"+
        "<span class=\"yukle-col-tutar "+i.tip+"\">"+(i.tip==="gider"?"-":"+")+para(i.tutar)+"</span>";
      tablo.appendChild(row);
      if(i.tip==="gelir")gT+=parseFloat(i.tutar); else giT+=parseFloat(i.tutar);
    }
    const net=gT-giT;
    $("yukle-ozet").innerHTML=
      "<div class=\"yukle-ozet-kart\"><span class=\"yukle-ozet-label\">Gelir</span><span class=\"yukle-ozet-val gelir\">"+para(gT)+" TL</span></div>"+
      "<div class=\"yukle-ozet-kart\"><span class=\"yukle-ozet-label\">Gider</span><span class=\"yukle-ozet-val gider\">"+para(giT)+" TL</span></div>"+
      "<div class=\"yukle-ozet-kart\"><span class=\"yukle-ozet-label\">Net</span><span class=\"yukle-ozet-val toplam\">"+(net>=0?"":"-")+para(Math.abs(net))+" TL</span></div>"+
      "<div class=\"yukle-ozet-kart\" style=\"flex-basis:100%;background:rgba(240,184,64,0.06);border-color:var(--gold-dim)\">"+
      "<span class=\"yukle-ozet-label\">Bilgi</span>"+
      "<span style=\"font-size:11px;color:var(--text-secondary)\">Her alt kategori toplam tutarla eklenir. Rapor: "+_tarih.split("-").reverse().join(".")+"</span></div>";
    $("yukle-sayi").textContent=list.length;
    $("yukle-aktar-sayi").textContent=list.length;
    $("yukle-onizleme").classList.add("visible");
    $("yukle-aktar").classList.remove("hidden");
  }

  async function aktar(){
    if(!_islemler.length)return;
    const btn=$("yukle-aktar");
    btn.disabled=true; btn.textContent="Aktariliyor...";
    let ok=0;
    for(const i of _islemler){
      try{await IslemlerDB.add({tip:i.tip,kategori:i.kategori,tutar:i.tutar,aciklama:i.aciklama||"",tarih:i.tarih});ok++;}
      catch(e){console.warn("Eklenemedi:",e);}
    }
    btn.textContent=ok+" kayit aktarildi!"; btn.style.background="var(--green)";
    if(window._islemlerYukle)await window._islemlerYukle();
    setTimeout(()=>{kapat();btn.disabled=false;btn.textContent="Aktar";btn.style.background="";},2000);
  }

  function bagla(){
    const b=$("btn-yukle"); if(b)b.addEventListener("click",ac);
    $("yukle-close").addEventListener("click",kapat);
    $("yukle-iptal").addEventListener("click",kapat);
    $("modal-yukle").addEventListener("click",e=>{if(e.target===$("modal-yukle"))kapat();});
    $("yukle-aktar").addEventListener("click",aktar);
    $("yukle-drop-zone").addEventListener("click",()=>$("yukle-file-input").click());
    $("yukle-file-input").addEventListener("change",e=>{
      const f=e.target.files[0];
      if(f)pdfOku(f).catch(err=>hata("Hata: "+err.message));
    });
    const dz=$("yukle-drop-zone");
    dz.addEventListener("dragover",e=>{e.preventDefault();dz.classList.add("drag-over");});
    dz.addEventListener("dragleave",()=>dz.classList.remove("drag-over"));
    dz.addEventListener("drop",e=>{
      e.preventDefault();dz.classList.remove("drag-over");
      const f=e.dataTransfer.files[0];
      if(f&&f.type==="application/pdf")pdfOku(f).catch(err=>hata("Hata: "+err.message));
      else hata("Lutfen PDF dosyasi yukleyin.");
    });
  }

  function init(){bagla();}
  return{init};
})();
