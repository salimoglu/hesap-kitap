const IslemlerModule = (() => {
  let _islemler=[], _kategoriler=[], _duzenleId=null, _silId=null;
  let _aktifTip="gider", _katTip="gider";
  let _seciliKat={value:"",label:"",tip:""};
  let _katDuzId=null, _katSilId=null;
  const $=id=>document.getElementById(id);

  function para(s){return Number(s).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function tarihSaat(t){if(!t)return"";const[y,m,d]=t.split("-");return d+"."+m+"."+y;}
  function bugun(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function esc(s){const d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}
  function vurgula(metin,arama){
    if(!arama)return esc(metin);
    const re=new RegExp("("+arama.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","gi");
    return esc(metin).replace(re,"<span class=\"hg-kat-highlight\">$1</span>");
  }

  async function yukle(){
    _islemler=await IslemlerDB.getAll();
    _kategoriler=await KategorilerDB.getAll();
    _islemler.sort((a,b)=>b.tarih.localeCompare(a.tarih)||(b.olusturma||0)-(a.olusturma||0));
    renderList();renderSummary();doldurAyFilter();renderHgList("");
  }

  function renderSummary(){
    const gelir=_islemler.filter(i=>i.tip==="gelir").reduce((s,i)=>s+parseFloat(i.tutar),0);
    const gider=_islemler.filter(i=>i.tip==="gider").reduce((s,i)=>s+parseFloat(i.tutar),0);
    const net=gelir-gider;
    $("total-gelir").textContent=para(gelir);$("total-gider").textContent=para(gider);
    const el=$("total-net");el.textContent=para(net);
    el.style.color=net>=0?"var(--green)":"var(--red)";
  }

  function filtreliIslemler(){
    const tip=$("filter-type").value,ay=$("filter-ay").value;
    return _islemler.filter(i=>(tip==="hepsi"||i.tip===tip)&&(ay==="hepsi"||i.tarih.startsWith(ay)));
  }

  function renderList(){
    const liste=$("islem-list"),empty=$("empty-state");
    const items=filtreliIslemler();
    [...liste.querySelectorAll(".islem-row,.islem-grup-baslik,.islem-ay-ozet,.islem-genel-toplam")].forEach(el=>el.remove());
    if(!items.length){empty.style.display="flex";return;}
    empty.style.display="none";
    const sirali=[..._islemler].sort((a,b)=>a.tarih.localeCompare(b.tarih)||(a.olusturma||0)-(b.olusturma||0));
    const bakMap={};let bak=0;
    for(const i of sirali){bak+=i.tip==="gelir"?parseFloat(i.tutar):-parseFloat(i.tutar);bakMap[i.id]=bak;}
    const gruplar={};
    for(const i of items){const k=i.tarih.substring(0,7);if(!gruplar[k])gruplar[k]=[];gruplar[k].push(i);}
    const AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
    let genG=0,genGi=0;
    for(const [key,grup] of Object.entries(gruplar)){
      const[y,m]=key.split("-");
      const bas=document.createElement("div");bas.className="islem-grup-baslik";
      bas.textContent=AYLAR[parseInt(m)-1]+" "+y;liste.appendChild(bas);
      let ayG=0,ayGi=0;
      for(const i of grup){liste.appendChild(rowOlustur(i,bakMap[i.id]));
        if(i.tip==="gelir")ayG+=parseFloat(i.tutar);else ayGi+=parseFloat(i.tutar);}
      genG+=ayG;genGi+=ayGi;
      const ayOzet=document.createElement("div");ayOzet.className="islem-ay-ozet";
      const ayNet=ayG-ayGi;
      ayOzet.innerHTML="<span>"+AYLAR[parseInt(m)-1]+":</span>"+
        "<span class=\"ao-gelir\">"+para(ayG)+"</span><span class=\"ao-sep\">&#8722;</span>"+
        "<span class=\"ao-gider\">"+para(ayGi)+"</span><span class=\"ao-sep\">=</span>"+
        "<span class=\"ao-net\">"+(ayNet>=0?"":"-")+para(Math.abs(ayNet))+"</span>";
      liste.appendChild(ayOzet);
    }
    if(Object.keys(gruplar).length){
      const gt=document.createElement("div");gt.className="islem-genel-toplam";
      const gNet=genG-genGi;
      gt.innerHTML="<span>TOPLAM:</span>"+
        "<span style=\"color:var(--green);font-family:var(--font-brand)\">"+para(genG)+"</span>"+
        "<span style=\"color:var(--text-muted)\">&#8722;</span>"+
        "<span style=\"color:var(--red);font-family:var(--font-brand)\">"+para(genGi)+"</span>"+
        "<span style=\"color:var(--text-muted)\">=</span>"+
        "<span class=\"gt-val\">"+(gNet>=0?"":"-")+para(Math.abs(gNet))+"</span>";
      liste.appendChild(gt);
    }
  }

  function rowOlustur(islem,bakiye){
    const div=document.createElement("div");div.className="islem-row "+islem.tip;
    const katAdi=esc(islem.kategori)+(islem.aciklama?" <span class=\"islem-aciklama-inline\">* "+esc(islem.aciklama)+"</span>":"");
    div.innerHTML="<div class=\"sol-bar\"></div>"+
      "<div class=\"islem-row-left\"><div class=\"islem-kat-adi\">"+katAdi+"</div></div>"+
      "<div class=\"islem-row-right\">"+
        "<span class=\"islem-tarih-col\">"+tarihSaat(islem.tarih)+"</span>"+
        "<span class=\"islem-tutar-col\">"+(islem.tip==="gider"?"-":"+")+para(islem.tutar)+"</span>"+
        "<span class=\"islem-bakiye-col\">"+para(bakiye||0)+"</span>"+
        "<div class=\"islem-row-actions\">"+
          "<button class=\"row-action-btn duzenle\">&#9998;</button>"+
          "<button class=\"row-action-btn sil\">&#10005;</button>"+
        "</div></div>";
    div.querySelector(".duzenle").addEventListener("click",e=>{e.stopPropagation();modalAc(islem.id);});
    div.querySelector(".sil").addEventListener("click",e=>{e.stopPropagation();silModalAc(islem.id);});
    return div;
  }

  function doldurAyFilter(){
    const sel=$("filter-ay"),prev=sel.value;
    while(sel.options.length>1)sel.remove(1);
    const AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
    const aySet=new Set(_islemler.map(i=>i.tarih.substring(0,7)));
    [...aySet].sort((a,b)=>b.localeCompare(a)).forEach(key=>{
      const[y,m]=key.split("-");const o=document.createElement("option");
      o.value=key;o.textContent=AYLAR[parseInt(m)-1]+" "+y;sel.appendChild(o);
    });
    if([...sel.options].some(o=>o.value===prev))sel.value=prev;
  }

  /* ══ KATEGORİ DROPDOWN ══ */
  function renderHgList(arama){
    const liste=$("hg-kat-list");if(!liste)return;
    liste.innerHTML="";
    const q=arama.trim().toLocaleLowerCase("tr");
    const kats=[..._kategoriler].sort((a,b)=>a.grup.localeCompare(b.grup,"tr")||a.ad.localeCompare(b.ad,"tr"));
    const filtered=q?kats.filter(k=>k.grup.toLocaleLowerCase("tr").includes(q)||k.ad.toLocaleLowerCase("tr").includes(q)):kats;
    if(!filtered.length){
      const empty=document.createElement("div");empty.className="hg-kat-empty";
      empty.textContent="Sonuc bulunamadi";liste.appendChild(empty);return;
    }
    const gruplar={};
    for(const k of filtered){if(!gruplar[k.grup])gruplar[k.grup]=[];gruplar[k.grup].push(k);}
    for(const[g,ks]of Object.entries(gruplar)){
      const lbl=document.createElement("div");lbl.className="hg-kat-group-label";
      lbl.innerHTML=vurgula(g,q);liste.appendChild(lbl);
      for(const k of ks){
        const item=document.createElement("div");
        item.className="hg-kat-option"+((_seciliKat.value===g+" - "+k.ad)?" selected":"");
        item.innerHTML=vurgula(k.ad,q);
        item.addEventListener("click",()=>{
          _seciliKat={value:g+" - "+k.ad,label:k.ad,tip:k.tip};
          const trigger=$("hg-kat-trigger");
          trigger.textContent=k.ad;trigger.classList.add("selected");
          closeHgDropdown();
        });
        liste.appendChild(item);
      }
    }
  }
  function openHgDropdown(){
    $("hg-kat-dropdown").classList.add("open");
    const inp=$("hg-kat-search-inp");inp.value="";
    $("hg-kat-search-clear").classList.remove("visible");
    renderHgList("");setTimeout(()=>inp.focus(),80);
  }
  function closeHgDropdown(){$("hg-kat-dropdown").classList.remove("open");}
  function toggleHgDropdown(){
    if($("hg-kat-dropdown").classList.contains("open"))closeHgDropdown();else openHgDropdown();
  }

  /* ══ KATEGORİ YÖNETİM MODALI ══ */
  function katYonetimAc(){
    katTipSec(_katTip);
    $("modal-kategori").classList.remove("hidden");
  }
  function katYonetimKapat(){$("modal-kategori").classList.add("hidden");}

  function katTipSec(tip){
    _katTip=tip;
    $("kat-tab-gider").classList.toggle("active",tip==="gider");
    $("kat-tab-gelir").classList.toggle("active",tip==="gelir");
    renderKatListe();
    doldurGrupSelect(tip);
  }

  function renderKatListe(){
    const wrap=$("kat-liste-wrap");if(!wrap)return;
    wrap.innerHTML="";
    const kats=_kategoriler.filter(k=>k.tip===_katTip)
      .sort((a,b)=>a.grup.localeCompare(b.grup,"tr")||a.ad.localeCompare(b.ad,"tr"));
    if(!kats.length){
      const bo=document.createElement("div");
      bo.style.cssText="padding:24px;text-align:center;color:var(--text-muted);font-size:13px";
      bo.textContent="Henuz kategori yok";wrap.appendChild(bo);return;
    }
    const gruplar={};
    for(const k of kats){if(!gruplar[k.grup])gruplar[k.grup]=[];gruplar[k.grup].push(k);}
    for(const[g,ks]of Object.entries(gruplar)){
      const baslik=document.createElement("div");baslik.className="kat-grup-baslik";
      baslik.innerHTML=esc(g)+"<button class=\"kat-grup-duzenle-btn\" title=\"Grup adi duzenle\">&#9998;</button>";
      baslik.querySelector(".kat-grup-duzenle-btn").addEventListener("click",()=>grupDuzenleAc(g));
      wrap.appendChild(baslik);
      for(const k of ks){
        const satir=document.createElement("div");satir.className="kat-satir";
        satir.innerHTML="<span class=\"kat-satir-ad\">"+esc(k.ad)+"</span>"+
          "<div class=\"kat-satir-actions\">"+
            "<button class=\"kat-satir-btn duzenle\" title=\"Duzenle\">&#9998;</button>"+
            "<button class=\"kat-satir-btn sil\" title=\"Sil\">&#10005;</button>"+
          "</div>";
        satir.querySelector(".duzenle").addEventListener("click",()=>katDuzenleAc(k));
        satir.querySelector(".sil").addEventListener("click",()=>katSilAc(k));
        wrap.appendChild(satir);
      }
    }
  }

  /* Kategori düzenle */
  function katDuzenleAc(k){
    _katDuzId=k.id;
    $("inp-duz-grup").value=k.grup;
    $("inp-duz-ad").value=k.ad;
    $("modal-kat-duzenle").classList.remove("hidden");
    setTimeout(()=>$("inp-duz-ad").focus(),200);
  }
  function katDuzenleKapat(){$("modal-kat-duzenle").classList.add("hidden");_katDuzId=null;}
  async function katDuzenleKaydet(){
    const yeniGrup=($("inp-duz-grup").value||"").trim().toUpperCase();
    const yeniAd=($("inp-duz-ad").value||"").trim();
    if(!yeniGrup||!yeniAd){alert("Grup ve kategori adi bos olamaz.");return;}
    const k=_kategoriler.find(x=>x.id===_katDuzId);if(!k)return;
    const eskiDeger=k.grup+" - "+k.ad;
    const yeniDeger=yeniGrup+" - "+yeniAd;
    await KategorilerDB.update({...k,grup:yeniGrup,ad:yeniAd});
    // Bu kategoriyi kullanan işlemleri güncelle
    const etkilenen=_islemler.filter(i=>i.kategori===eskiDeger);
    for(const i of etkilenen){await IslemlerDB.update({...i,kategori:yeniDeger});}
    // Seçili kategori güncelle
    if(_seciliKat.value===eskiDeger){
      _seciliKat={value:yeniDeger,label:yeniAd,tip:k.tip};
      $("hg-kat-trigger").textContent=yeniAd;
    }
    _kategoriler=await KategorilerDB.getAll();
    _islemler=await IslemlerDB.getAll();
    katDuzenleKapat();
    renderKatListe();doldurGrupSelect(_katTip);renderHgList("");
    renderList();renderSummary();
  }

  /* Grup adı düzenle */
  function grupDuzenleAc(eskiGrup){
    _katDuzId="__GRUP__:"+eskiGrup;
    $("inp-duz-grup").value=eskiGrup;
    $("inp-duz-ad").style.display="none";
    $("modal-kat-duzenle").querySelector("[for=inp-duz-ad]").style.display="none";
    $("modal-kat-duzenle").querySelector(".modal-title").textContent="Grup Adi Duzenle";
    $("modal-kat-duzenle").classList.remove("hidden");
    setTimeout(()=>$("inp-duz-grup").focus(),200);
  }
  async function katDuzenleKaydetGenel(){
    if(_katDuzId && _katDuzId.startsWith("__GRUP__:")){
      const eskiGrup=_katDuzId.replace("__GRUP__:","");
      const yeniGrup=($("inp-duz-grup").value||"").trim().toUpperCase();
      if(!yeniGrup){alert("Grup adi bos olamaz.");return;}
      const gruplaKats=_kategoriler.filter(k=>k.grup===eskiGrup);
      for(const k of gruplaKats){await KategorilerDB.update({...k,grup:yeniGrup});}
      // İşlemleri güncelle
      for(const k of gruplaKats){
        const eskiDeger=eskiGrup+" - "+k.ad;
        const yeniDeger=yeniGrup+" - "+k.ad;
        const etkilenen=_islemler.filter(i=>i.kategori===eskiDeger);
        for(const i of etkilenen){await IslemlerDB.update({...i,kategori:yeniDeger});}
        if(_seciliKat.value===eskiDeger){
          _seciliKat={value:yeniDeger,label:k.ad,tip:k.tip};
          $("hg-kat-trigger").textContent=k.ad;
        }
      }
      _kategoriler=await KategorilerDB.getAll();
      _islemler=await IslemlerDB.getAll();
      katDuzenleKapatGenel();
      renderKatListe();doldurGrupSelect(_katTip);renderHgList("");renderList();renderSummary();
    } else {
      await katDuzenleKaydet();
    }
  }
  function katDuzenleKapatGenel(){
    $("modal-kat-duzenle").classList.add("hidden");
    _katDuzId=null;
    const adInp=$("inp-duz-ad");
    adInp.style.display="";
    $("modal-kat-duzenle").querySelector("[for=inp-duz-ad]").style.display="";
    $("modal-kat-duzenle").querySelector(".modal-title").textContent="Kategoriyi Duzenle";
  }

  /* Kategori sil */
  function katSilAc(k){
    _katSilId=k.id;
    $("kat-sil-text").textContent=k.grup+" - "+k.ad+" kategorisini silmek istiyor musunuz?";
    $("modal-kat-sil").classList.remove("hidden");
  }
  function katSilKapat(){$("modal-kat-sil").classList.add("hidden");_katSilId=null;}
  async function katSilOnayla(){
    if(!_katSilId)return;
    await KategorilerDB.delete(_katSilId);
    _kategoriler=await KategorilerDB.getAll();
    katSilKapat();
    renderKatListe();doldurGrupSelect(_katTip);renderHgList("");
  }

  /* Grup select */
  function doldurGrupSelect(tip){
    const sel=$("sel-kat-grup");if(!sel)return;
    sel.innerHTML="";
    const gruplar=[...new Set(_kategoriler.filter(k=>k.tip===tip).map(k=>k.grup))].sort((a,b)=>a.localeCompare(b,"tr"));
    gruplar.forEach(g=>{const o=document.createElement("option");o.value=g;o.textContent=g;sel.appendChild(o);});
    const yeni=document.createElement("option");yeni.value="__YENI__";yeni.textContent="+ Yeni grup olustur...";sel.appendChild(yeni);
    const wrap=$("yeni-grup-wrap");if(wrap)wrap.style.display="none";
  }

  async function yeniKatKaydet(){
    const sel=$("sel-kat-grup");let grup=sel.value;
    if(grup==="__YENI__"){const yg=($("inp-kat-grup-yeni").value||"").trim().toUpperCase();if(!yg){alert("Yeni grup adi girin.");return;}grup=yg;}
    const ad=($("inp-kat-ad").value||"").trim();if(!ad){alert("Kategori adi girin.");return;}
    await KategorilerDB.add({tip:_katTip,grup,ad,varsayilan:false});
    $("inp-kat-ad").value="";
    _kategoriler=await KategorilerDB.getAll();
    renderKatListe();doldurGrupSelect(_katTip);renderHgList($("hg-kat-search-inp").value||"");
  }

  function doldurKategoriSelect(tip){
    const sel=$("sel-kategori");sel.innerHTML="";
    const kats=_kategoriler.filter(k=>k.tip===tip).sort((a,b)=>a.grup.localeCompare(b.grup,"tr")||a.ad.localeCompare(b.ad,"tr"));
    const gruplar={};
    for(const k of kats){if(!gruplar[k.grup])gruplar[k.grup]=[];gruplar[k.grup].push(k);}
    for(const[g,ks]of Object.entries(gruplar)){
      const og=document.createElement("optgroup");og.label=g;
      for(const k of ks){const o=document.createElement("option");o.value=g+" - "+k.ad;o.textContent=k.ad;og.appendChild(o);}
      sel.appendChild(og);
    }
  }

  async function hgKaydet(tip){
    const aciklama=$("hg-aciklama").value.trim();
    const tutar=parseFloat($("hg-tutar").value);
    if(!tutar||tutar<=0){$("hg-tutar").focus();return;}
    if(!_seciliKat.value){openHgDropdown();return;}
    await IslemlerDB.add({tip,kategori:_seciliKat.value,tutar,aciklama,tarih:bugun()});
    $("hg-aciklama").value="";$("hg-tutar").value="";
    await yukle();
  }

  async function modalAc(id){
    _duzenleId=id;
    const islem=_islemler.find(x=>x.id===id);if(!islem)return;
    tipSec(islem.tip);doldurKategoriSelect(islem.tip);
    $("sel-kategori").value=islem.kategori;
    $("inp-tutar").value=islem.tutar;
    $("inp-aciklama").value=islem.aciklama||"";
    $("inp-tarih").value=islem.tarih;
    $("modal-islem").classList.remove("hidden");
  }
  function modalKapat(){$("modal-islem").classList.add("hidden");_duzenleId=null;}
  function tipSec(tip){_aktifTip=tip;$("btn-gider").classList.toggle("active",tip==="gider");$("btn-gelir").classList.toggle("active",tip==="gelir");doldurKategoriSelect(tip);}

  async function kaydet(){
    const tutar=parseFloat($("inp-tutar").value);
    const kategori=$("sel-kategori").value;
    const aciklama=$("inp-aciklama").value.trim();
    const tarih=$("inp-tarih").value;
    if(!tutar||tutar<=0){alert("Gecerli tutar girin.");return;}
    if(!kategori){alert("Kategori secin.");return;}
    if(!tarih){alert("Tarih secin.");return;}
    const islem={tip:_aktifTip,kategori,tutar,aciklama,tarih};
    if(_duzenleId){islem.id=_duzenleId;await IslemlerDB.update(islem);}
    else{await IslemlerDB.add(islem);}
    modalKapat();await yukle();
  }

  function silModalAc(id){_silId=id;$("modal-sil").classList.remove("hidden");}
  function silModalKapat(){$("modal-sil").classList.add("hidden");_silId=null;}
  async function silOnayla(){if(_silId){await IslemlerDB.delete(_silId);silModalKapat();await yukle();}}

  function baglaEventler(){
    $("hg-btn-gelir").addEventListener("click",()=>hgKaydet("gelir"));
    $("hg-btn-gider").addEventListener("click",()=>hgKaydet("gider"));
    $("hg-tutar").addEventListener("keydown",e=>{if(e.key==="Enter")hgKaydet("gider");});
    $("hg-kat-trigger").addEventListener("click",e=>{e.stopPropagation();toggleHgDropdown();});
    $("hg-kat-search-inp").addEventListener("input",function(){
      const q=this.value;
      $("hg-kat-search-clear").classList.toggle("visible",q.length>0);
      renderHgList(q);
    });
    $("hg-kat-search-inp").addEventListener("keydown",e=>{if(e.key==="Escape")closeHgDropdown();e.stopPropagation();});
    $("hg-kat-search-clear").addEventListener("click",()=>{
      $("hg-kat-search-inp").value="";
      $("hg-kat-search-clear").classList.remove("visible");
      renderHgList("");$("hg-kat-search-inp").focus();
    });
    document.addEventListener("click",e=>{if(!$("hg-kat-wrap").contains(e.target))closeHgDropdown();});
    $("filter-type").addEventListener("change",renderList);
    $("filter-ay").addEventListener("change",renderList);
    // Kategoriler butonu
    $("btn-yeni-kat-bar").addEventListener("click",katYonetimAc);
    $("kat-close").addEventListener("click",katYonetimKapat);
    $("modal-kategori").addEventListener("click",e=>{if(e.target===$("modal-kategori"))katYonetimKapat();});
    $("kat-tab-gider").addEventListener("click",()=>katTipSec("gider"));
    $("kat-tab-gelir").addEventListener("click",()=>katTipSec("gelir"));
    $("kat-kaydet").addEventListener("click",yeniKatKaydet);
    $("inp-kat-ad").addEventListener("keydown",e=>{if(e.key==="Enter")yeniKatKaydet();});
    $("sel-kat-grup").addEventListener("change",function(){
      const wrap=$("yeni-grup-wrap");
      if(this.value==="__YENI__"){wrap.style.display="flex";setTimeout(()=>$("inp-kat-grup-yeni").focus(),100);}
      else{wrap.style.display="none";}
    });
    // Kategori düzenle modal
    $("kat-duz-close").addEventListener("click",katDuzenleKapatGenel);
    $("kat-duz-iptal").addEventListener("click",katDuzenleKapatGenel);
    $("kat-duz-kaydet").addEventListener("click",katDuzenleKaydetGenel);
    $("modal-kat-duzenle").addEventListener("click",e=>{if(e.target===$("modal-kat-duzenle"))katDuzenleKapatGenel();});
    [$("inp-duz-grup"),$("inp-duz-ad")].forEach(el=>el&&el.addEventListener("keydown",e=>{if(e.key==="Enter")katDuzenleKaydetGenel();}));
    // Kategori sil modal
    $("kat-sil-close").addEventListener("click",katSilKapat);
    $("kat-sil-iptal").addEventListener("click",katSilKapat);
    $("kat-sil-onayla").addEventListener("click",katSilOnayla);
    $("modal-kat-sil").addEventListener("click",e=>{if(e.target===$("modal-kat-sil"))katSilKapat();});
    // İşlem modal
    $("modal-close").addEventListener("click",modalKapat);
    $("btn-iptal").addEventListener("click",modalKapat);
    $("btn-kaydet").addEventListener("click",kaydet);
    $("btn-gider").addEventListener("click",()=>tipSec("gider"));
    $("btn-gelir").addEventListener("click",()=>tipSec("gelir"));
    $("modal-islem").addEventListener("click",e=>{if(e.target===$("modal-islem"))modalKapat();});
    [$("inp-tutar"),$("inp-aciklama"),$("inp-tarih")].forEach(el=>el&&el.addEventListener("keydown",e=>{if(e.key==="Enter")kaydet();}));
    $("sil-close").addEventListener("click",silModalKapat);
    $("sil-iptal").addEventListener("click",silModalKapat);
    $("sil-onayla").addEventListener("click",silOnayla);
    $("modal-sil").addEventListener("click",e=>{if(e.target===$("modal-sil"))silModalKapat();});
  }

  async function init(){baglaEventler();await yukle();}
  return{init};
})();
