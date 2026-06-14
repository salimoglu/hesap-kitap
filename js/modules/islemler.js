const IslemlerModule = (() => {
  let _islemler=[], _kategoriler=[], _duzenleId=null, _silId=null;
  let _aktifTip="gider", _katTip="gider";
  let _seciliKat={value:"",label:"",tip:""};
  let _katDuzId=null, _katSilId=null;
  let _baglandi=false;
  let _iozAy=new Date().getMonth(), _iozYil=new Date().getFullYear();
  const $=id=>document.getElementById(id);

  function normKatStr(s){return String(s||"").replace(/\s+/g," ").trim();}

  /** Tek canonical etiket (yazim / Turkce karakter / grup alias farklarini birlestirir). */
  function gorunumKategori(catStr){
    if (typeof HKKategori !== "undefined" && HKKategori.resolve) {
      return HKKategori.resolve(catStr, _kategoriler) || normKatStr(catStr);
    }
    return normKatStr(catStr);
  }

  function para(s){return Number(s).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function tarihSaat(t){if(!t)return"";const[y,m,d]=t.split("-");return d+"."+m+"."+y;}
  function bugun(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function esc(s){const d=document.createElement("div");d.textContent=s||"";return d.innerHTML;}

  const AYLAR_TR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];

  function ayEtiket(ayKey){
    if(!ayKey||ayKey==="hepsi")return"";
    const p=ayKey.split("-");
    if(p.length<2)return ayKey;
    return AYLAR_TR[parseInt(p[1],10)-1]+" "+p[0];
  }

  function iozAyKey(){
    return _iozYil+"-"+String(_iozAy+1).padStart(2,"0");
  }

  function iozBuAyKey(){
    const d=new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  }

  function ozetAySecimi(){
    return iozAyKey();
  }

  function iozAyIleriKapali(){
    return iozAyKey()>=iozBuAyKey();
  }

  function iozAyGeri(){
    _iozAy--;
    if(_iozAy<0){_iozAy=11;_iozYil--;}
    renderKategoriOzeti();
  }

  function iozAyIleri(){
    if(iozAyIleriKapali())return;
    _iozAy++;
    if(_iozAy>11){_iozAy=0;_iozYil++;}
    if(iozAyKey()>iozBuAyKey()){
      const d=new Date();
      _iozAy=d.getMonth();
      _iozYil=d.getFullYear();
    }
    renderKategoriOzeti();
  }

  function iozAyBagla(){
    const g=$("ioz-geri"), i=$("ioz-ileri");
    if(g)g.onclick=iozAyGeri;
    if(i)i.onclick=iozAyIleri;
  }

  function iozHeadRender(head, ayVer, ayKey){
    if(!head)return;
    const ayNet=ayVer.gelir-ayVer.gider;
    const ayLbl=ayEtiket(ayKey);
    head.innerHTML=
      '<div class="islemler-kol-baslik">'+
      '<span class="islemler-kol-ad">Kategori &#246;zeti</span>'+
      '<div class="islemler-kol-nav">'+
      '<button type="button" class="butce-ay-btn" id="ioz-geri">&#8249;</button>'+
      '<span class="islemler-kol-ay butce-kol-ay">'+esc(ayLbl)+'</span>'+
      '<button type="button" class="butce-ay-btn" id="ioz-ileri"'+(iozAyIleriKapali()?' disabled':'')+'>&#8250;</button>'+
      '</div></div>'+
      '<div class="ozet-bar ioz-ust-ozet ioz-ust-ozet-stack">'+
      '<div class="ioz-ozet-satir"><span class="ozet-label">Gelir</span><span class="ozet-val gelir">'+para(ayVer.gelir)+'</span></div>'+
      '<div class="ioz-ozet-satir"><span class="ozet-label">Gider</span><span class="ozet-val gider">'+para(ayVer.gider)+'</span></div>'+
      '<div class="ioz-ozet-satir"><span class="ozet-label">Net</span><span class="ozet-val net">'+(ayNet>=0?"":"-")+para(Math.abs(ayNet))+'</span></div>'+
      '</div>';
    iozAyBagla();
  }

  function kategoriGrupAdi(katTam){
    const d=katTam.indexOf(" - ");
    return d>=0?katTam.slice(0,d).trim():katTam;
  }

  /** Tek satir tutar: gider veya gelir; ikisi varsa net (cift yazim yok). */
  function katTekTutar(k){
    if(k.gelir>0&&k.gider>0){
      const net=k.gelir-k.gider;
      return{cls:net>=0?"gelir":"gider",txt:(net>=0?"+":"-")+para(Math.abs(net))};
    }
    if(k.gider>0)return{cls:"gider",txt:"-"+para(k.gider)};
    if(k.gelir>0)return{cls:"gelir",txt:"+"+para(k.gelir)};
    return{cls:"",txt:""};
  }

  function grupToplamTutar(liste){
    let gelir=0,gider=0;
    for(const k of liste){gelir+=k.gelir;gider+=k.gider;}
    if(gelir>0&&gider>0){
      const net=gelir-gider;
      return{cls:"net",txt:(net>=0?"+":"-")+para(Math.abs(net)),gider:gider,gelir:gelir};
    }
    if(gider>0)return{cls:"gider",txt:"-"+para(gider),gider:gider,gelir:gelir};
    if(gelir>0)return{cls:"gelir",txt:"+"+para(gelir),gider:gider,gelir:gelir};
    return{cls:"",txt:"",gider:0,gelir:0};
  }

  function kategoriOzetiVeri(){
    const byAy={};
    const byYil={};
    for(const i of _islemler){
      const ay=i.tarih.substring(0,7);
      const yil=i.tarih.substring(0,4);
      const kat=gorunumKategori(i.kategori);
      const tut=parseFloat(i.tutar)||0;
      if(!byAy[ay])byAy[ay]={gelir:0,gider:0,kat:{}};
      if(!byYil[yil])byYil[yil]={gelir:0,gider:0,kat:{}};
      const ayK=byAy[ay].kat;
      const yK=byYil[yil].kat;
      if(!ayK[kat])ayK[kat]={gelir:0,gider:0,adet:0,grup:kategoriGrupAdi(kat)};
      if(!yK[kat])yK[kat]={gelir:0,gider:0,adet:0};
      ayK[kat].adet++;
      yK[kat].adet++;
      if(i.tip==="gelir"){
        byAy[ay].gelir+=tut;byYil[yil].gelir+=tut;
        ayK[kat].gelir+=tut;yK[kat].gelir+=tut;
      }else{
        byAy[ay].gider+=tut;byYil[yil].gider+=tut;
        ayK[kat].gider+=tut;yK[kat].gider+=tut;
      }
    }
    return {byAy,byYil};
  }

  function kolBaslikAyMetni(){
    const filtreAy=$("filter-ay");
    if(filtreAy&&filtreAy.value&&filtreAy.value!=="hepsi")return ayEtiket(filtreAy.value);
    return ayEtiket(iozBuAyKey())+" · bu ay";
  }

  function guncelleKolBaslikAy(){
    const txt=kolBaslikAyMetni();
    const sol=$("islem-sol-ay");
    if(sol)sol.textContent=txt;
  }

  function iozKatAdKisa(ad){
    return ad.indexOf(" - ")>=0?ad.slice(ad.indexOf(" - ")+3):ad;
  }

  function iozTipBolumRender(tip, katListe, ayVer){
    const filtered=katListe.filter(function(k){return tip==="gelir"?k.gelir>0:k.gider>0;});
    filtered.sort(function(a,b){return tip==="gelir"?b.gelir-a.gelir:b.gider-a.gider;});
    const baslik=tip==="gelir"?"GELİR":"GİDER";
    let h='<div class="ioz-tip-bolum ioz-tip-'+tip+'">';
    h+='<div class="ioz-bolum-baslik ioz-tip-baslik">'+baslik+'</div>';
    if(!filtered.length){
      h+='<div class="ioz-bos ioz-tip-bos">Bu ayda '+baslik.toLocaleLowerCase("tr")+' yok.</div>';
      h+='</div>';
      return h;
    }
    const topRef=tip==="gelir"?(ayVer.gelir||1):(ayVer.gider||1);
    const gruplar={};
    filtered.forEach(function(k){
      if(!gruplar[k.grup])gruplar[k.grup]=[];
      gruplar[k.grup].push(k);
    });
    const grupSira=Object.keys(gruplar).sort(function(a,b){return a.localeCompare(b,"tr");});
    grupSira.forEach(function(g){
      const gListe=gruplar[g];
      let gTopVal=0;
      gListe.forEach(function(k){gTopVal+=tip==="gelir"?k.gelir:k.gider;});
      const gBarPct=Math.round((gTopVal/topRef)*100);
      h+='<div class="ioz-grup-wrap">';
      h+='<div class="ioz-grup-baslik">';
      h+='<span class="ioz-grup-ad">'+esc(g)+'</span>';
      h+='<span class="ioz-grup-toplam '+(tip==="gelir"?"gelir":"gider")+'">'+(tip==="gelir"?"+":"-")+para(gTopVal)+'</span>';
      h+='</div>';
      h+='<div class="ioz-grup-bar-wrap" title="Grup '+baslik.toLocaleLowerCase("tr")+' / ay toplam %'+gBarPct+'">';
      h+='<span class="ioz-kat-bar-track" aria-hidden="true"><span class="ioz-kat-bar-fill'+(tip==="gelir"?" gelir-bar ioz-grup-bar-fill":"")+'" style="width:'+gBarPct+'%"></span></span>';
      h+='<span class="ioz-grup-pct">%'+gBarPct+'</span>';
      h+='</div></div>';
      gListe.forEach(function(k){
        const tutVal=tip==="gelir"?k.gelir:k.gider;
        const barPct=Math.round((tutVal/topRef)*100);
        h+='<div class="ioz-kat-satir">';
        h+='<div class="ioz-kat-ust">';
        h+='<span class="ioz-kat-ad">'+esc(iozKatAdKisa(k.ad))+'</span>';
        h+='<span class="ioz-kat-ust-sag">';
        h+='<span class="ioz-kat-tutar '+(tip==="gelir"?"gelir":"gider")+'">'+(tip==="gelir"?"+":"-")+para(tutVal)+'</span>';
        h+='<span class="ioz-kat-adet">'+k.adet+' işlem</span>';
        h+='</span></div>';
        h+='<div class="ioz-kat-bar-wrap" title="Toplam '+baslik.toLocaleLowerCase("tr")+'e göre %'+barPct+'">';
        h+='<span class="ioz-kat-bar-track" aria-hidden="true"><span class="ioz-kat-bar-fill'+(tip==="gelir"?" gelir-bar":"")+'" style="width:'+barPct+'%"></span></span>';
        h+='<span class="ioz-kat-pct">%'+barPct+'</span>';
        h+='</div></div>';
      });
    });
    h+='</div>';
    return h;
  }

  function renderKategoriOzeti(){
    const head=$("ioz-panel-head");
    const wrap=$("islem-kat-ozet-scroll");
    if(!wrap)return;
    guncelleKolBaslikAy();
    const {byAy,byYil}=_islemler.length?kategoriOzetiVeri():{byAy:{},byYil:{}};
    const ayKey=ozetAySecimi();
    const ayVer=byAy[ayKey]||{gelir:0,gider:0,kat:{}};
    iozHeadRender(head, ayVer, ayKey);

    if(!_islemler.length){
      wrap.innerHTML='<div class="ioz-bos">Henüz işlem yok.<br>Kategori özetleri burada görünecek.</div>';
      return;
    }

    let h='';

    /* —— Aylık detay: gelir ustte, gider altta —— */
    const katListe=Object.entries(ayVer.kat).map(function(e){
      const k=e[1];
      return {ad:e[0],grup:k.grup||kategoriGrupAdi(e[0]),gelir:k.gelir,gider:k.gider,adet:k.adet};
    });

    if(!katListe.some(function(k){return k.gelir>0||k.gider>0;})){
      h+='<div class="ioz-bos">Bu ayda kategorili işlem yok.</div>';
    }else{
      h+=iozTipBolumRender("gelir", katListe, ayVer);
      h+=iozTipBolumRender("gider", katListe, ayVer);
    }

    /* —— Yıllık sade —— */
    const yillar=Object.keys(byYil).sort(function(a,b){return b.localeCompare(a);});
    h+='<div class="ioz-bolum ioz-bolum-yil">';
    h+='<div class="ioz-bolum-baslik">Yıllık özet</div>';
    h+='<div class="ioz-yil-liste">';
    yillar.forEach(function(y){
      const v=byYil[y];
      const net=v.gelir-v.gider;
      h+='<div class="ioz-yil-satir">';
      h+='<span class="ioz-yil-yil">'+y+'</span>';
      h+='<div class="ioz-yil-rakamlar">';
      h+='<span class="ioz-yil-g">+'+para(v.gelir)+'</span>';
      h+='<span class="ioz-yil-d">-'+para(v.gider)+'</span>';
      h+='<span class="ioz-yil-n">'+(net>=0?"+":"-")+para(Math.abs(net))+'</span>';
      h+='</div></div>';
    });
    h+='</div></div>';

    wrap.innerHTML=h;
  }

  function listeVeOzetGuncelle(){
    renderList();
    renderKategoriOzeti();
  }

  async function yukle(){
    if (typeof KategorilerDB !== "undefined" && KategorilerDB.dedupeNormalizeAll) {
      await KategorilerDB.dedupeNormalizeAll();
    }
    _islemler=await IslemlerDB.getAll();
    _kategoriler=await KategorilerDB.getAll();
    _islemler.sort((a,b)=>a.tarih.localeCompare(b.tarih)||(a.olusturma||0)-(b.olusturma||0));
    renderList();renderSummary();renderKategoriOzeti();doldurAyFilter();doldurGrupFilter();renderHgList("");const _ht=$("hg-tarih");if(_ht&&!_ht.value)_ht.value=bugun();setTimeout(()=>{const l=$("islem-list");if(l)l.scrollTop=l.scrollHeight;},100);
  }

  function renderSummary(){
    const gelir=_islemler.filter(i=>i.tip==="gelir").reduce((s,i)=>s+parseFloat(i.tutar),0);
    const gider=_islemler.filter(i=>i.tip==="gider").reduce((s,i)=>s+parseFloat(i.tutar),0);
    const net=gelir-gider;
    $("total-gelir").textContent=para(gelir);
    $("total-gider").textContent=para(gider);
    const el=$("total-net");el.textContent=para(net);
    el.style.color=net>=0?"var(--green)":"var(--red)";
  }

  function islemGrupAdi(islem){
    var katFull = gorunumKategori((islem && islem.kategori) || "");
    if(!katFull)return"";
    const d=katFull.indexOf(" - ");
    if(d>=0)return katFull.slice(0,d).trim();
    var sadeAd=_kategoriler.find(function(k){ return normKatStr(k.ad)===normKatStr(katFull); });
    return sadeAd?sadeAd.grup:"";
  }

  function filtreliIslemler(){
    const tip=$("filter-type").value,ay=$("filter-ay").value,grup=$("filter-grup").value;
    return _islemler.filter(i=>{
      if(tip!=="hepsi"&&i.tip!==tip)return false;
      if(ay!=="hepsi"&&!i.tarih.startsWith(ay))return false;
      if(grup!=="hepsi"){
        const g=islemGrupAdi(i);
        if(g!==grup)return false;
      }
      return true;
    });
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
    let genG=0,genGi=0;
    for(const[key,grup]of Object.entries(gruplar)){
      const[y,m]=key.split("-");
      const bas=document.createElement("div");bas.className="islem-grup-baslik";
      bas.textContent=AYLAR_TR[parseInt(m)-1]+" "+y;liste.appendChild(bas);
      let ayG=0,ayGi=0;
      for(const i of grup){
        liste.appendChild(rowOlustur(i,bakMap[i.id]));
        if(i.tip==="gelir")ayG+=parseFloat(i.tutar);else ayGi+=parseFloat(i.tutar);
      }
      genG+=ayG;genGi+=ayGi;
      const oz=document.createElement("div");oz.className="islem-ay-ozet";
      const ayNet=ayG-ayGi;
      oz.innerHTML="<span>"+AYLAR_TR[parseInt(m)-1]+":</span><span class='ao-gelir'>"+para(ayG)+"</span><span class='ao-sep'>&#8722;</span><span class='ao-gider'>"+para(ayGi)+"</span><span class='ao-sep'>=</span><span class='ao-net'>"+(ayNet>=0?"":"-")+para(Math.abs(ayNet))+"</span>";
      liste.appendChild(oz);
    }
    if(Object.keys(gruplar).length){
      const gt=document.createElement("div");gt.className="islem-genel-toplam";
      const gNet=genG-genGi;
      gt.innerHTML="<span>TOPLAM:</span><span style='color:var(--green);font-family:var(--font-brand)'>"+para(genG)+"</span><span style='color:var(--text-muted)'>&#8722;</span><span style='color:var(--red);font-family:var(--font-brand)'>"+para(genGi)+"</span><span style='color:var(--text-muted)'>=</span><span class='gt-val'>"+(gNet>=0?"":"-")+para(Math.abs(gNet))+"</span>";
      liste.appendChild(gt);
    }
  }

  function rowOlustur(islem,bakiye){
    const div=document.createElement("div");div.className="islem-row "+islem.tip;
    const katTam=gorunumKategori(islem.kategori);
    const katAdi=esc(katTam)+(islem.aciklama?" <span class='islem-aciklama-inline'>* "+esc(islem.aciklama)+"</span>":"");
    div.innerHTML="<div class='sol-bar'></div><div class='islem-row-left'><div class='islem-kat-adi'>"+katAdi+"</div></div><div class='islem-row-right'><span class='islem-tarih-col'>"+tarihSaat(islem.tarih)+"</span><span class='islem-tutar-col'>"+(islem.tip==="gider"?"-":"+")+para(islem.tutar)+"</span><span class='islem-bakiye-col'>"+para(bakiye||0)+"</span><div class='islem-row-actions'><button class='row-action-btn duzenle'>&#9998;</button><button class='row-action-btn sil'>&#10005;</button></div></div>";
    div.querySelector(".duzenle").addEventListener("click",e=>{e.stopPropagation();modalAc(islem.id);});
    div.querySelector(".sil").addEventListener("click",e=>{e.stopPropagation();silModalAc(islem.id);});
    return div;
  }

  function doldurAyFilter(){
    const sel=$("filter-ay"),prev=sel.value;
    while(sel.options.length>1)sel.remove(1);
    const aySet=new Set(_islemler.map(i=>i.tarih.substring(0,7)));
    [...aySet].sort((a,b)=>b.localeCompare(a)).forEach(key=>{
      const[y,m]=key.split("-");
      const o=document.createElement("option");
      o.value=key;o.textContent=AYLAR_TR[parseInt(m)-1]+" "+y;sel.appendChild(o);
    });
    if([...sel.options].some(o=>o.value===prev))sel.value=prev;
  }

  function doldurGrupFilter(){
    const sel=$("filter-grup");if(!sel)return;
    const prev=sel.value;
    sel.innerHTML="";
    const o0=document.createElement("option");o0.value="hepsi";o0.textContent="Tüm Gruplar";sel.appendChild(o0);
    const grups=[...new Set(_kategoriler.map(k=>k.grup).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"tr"));
    grups.forEach(g=>{const o=document.createElement("option");o.value=g;o.textContent=g;sel.appendChild(o);});
    if([...sel.options].some(x=>x.value===prev))sel.value=prev;
  }

  function klavyeKapat(){
    const ae=document.activeElement;
    if(ae&&typeof ae.blur==="function")ae.blur();
  }

  function hgKatUygula(grup,kat){
    _seciliKat={value:grup+" - "+kat.ad,label:kat.ad,tip:kat.tip};
    const tr=$("hg-kat-trigger");
    if(tr){tr.textContent=kat.ad;tr.classList.add("selected");}
    closeHgDropdown();
    closeHgKatSecModal();
  }

  function renderHgList(arama,listId){
    const liste=$(listId||"hg-kat-list");if(!liste)return;
    liste.innerHTML="";
    const q=(arama||"").trim().toLocaleLowerCase("tr");
    const kats=[..._kategoriler].sort((a,b)=>a.grup.localeCompare(b.grup,"tr")||a.ad.localeCompare(b.ad,"tr"));
    const filtered=q?kats.filter(k=>k.grup.toLocaleLowerCase("tr").includes(q)||k.ad.toLocaleLowerCase("tr").includes(q)):kats;
    const secSinif=listId==="hg-kat-sec-list"?"hg-kat-sec-option":"hg-kat-option";
    const grpSinif=listId==="hg-kat-sec-list"?"hg-kat-sec-group-label":"hg-kat-group-label";
    if(!filtered.length){
      const e2=document.createElement("div");e2.className="hg-kat-empty";
      e2.textContent="Sonuc bulunamadi";liste.appendChild(e2);return;
    }
    const gruplar={};
    for(const k of filtered){if(!gruplar[k.grup])gruplar[k.grup]=[];gruplar[k.grup].push(k);}
    for(const[g,ks]of Object.entries(gruplar)){
      const lbl=document.createElement("div");lbl.className=grpSinif;lbl.textContent=g;liste.appendChild(lbl);
      const mobilSec=listId==="hg-kat-sec-list";
      for(const k of ks){
        const item=document.createElement("button");
        item.type="button";
        item.className=secSinif+(_seciliKat.value===g+" - "+k.ad?" selected":"");
        if(mobilSec){
          item.innerHTML='<span class="hg-kat-sec-ad">'+esc(k.ad)+'</span><span class="hg-kat-sec-tip '+k.tip+'">'+(k.tip==="gelir"?"Gelir":"Gider")+'</span>';
        }else{
          item.textContent=k.ad;
        }
        item.addEventListener("click",function(){hgKatUygula(g,k);});
        liste.appendChild(item);
      }
    }
  }

  function renderHgKatSecList(){
    renderHgList("","hg-kat-sec-list");
  }

  function openHgKatSecModal(){
    klavyeKapat();
    renderHgKatSecList();
    const m=$("modal-hg-kat-sec");
    if(m)m.classList.remove("hidden");
  }

  function closeHgKatSecModal(){
    const m=$("modal-hg-kat-sec");
    if(m)m.classList.add("hidden");
  }

  function openHgKatSec(){
    if(mobilPanelAktifMi())openHgKatSecModal();
    else openHgDropdown();
  }

  function toggleHgKatSec(){
    if(mobilPanelAktifMi()){
      const m=$("modal-hg-kat-sec");
      if(m&&!m.classList.contains("hidden"))closeHgKatSecModal();
      else openHgKatSecModal();
    }else toggleHgDropdown();
  }

  function openHgDropdown(){
    $("hg-kat-dropdown").classList.add("open");
    const inp=$("hg-kat-search-inp");
    inp.value="";
    $("hg-kat-search-clear").classList.remove("visible");
    renderHgList("");
    setTimeout(()=>inp.focus(),80);
    // DÄ±ÅarÄ± tÄ±klayÄ±nca kapat â bir kerelik listener
    setTimeout(function(){
      function _kapat(e){
        const w=document.getElementById("hg-kat-wrap");
        if(w && !w.contains(e.target)){
          closeHgDropdown();
          document.removeEventListener("click",_kapat,true);
        }
      }
      document.addEventListener("click",_kapat,true);
    },200);
  }
  function closeHgDropdown(){$("hg-kat-dropdown").classList.remove("open");}
  function toggleHgDropdown(){
    if($("hg-kat-dropdown").classList.contains("open"))closeHgDropdown();
    else openHgDropdown();
  }

  function katYonetimAc(){katTipSec(_katTip);$("modal-kategori").classList.remove("hidden");}
  function katYonetimKapat(){$("modal-kategori").classList.add("hidden");}
  function katTipSec(tip){
    _katTip=tip;
    $("kat-tab-gider").classList.toggle("active",tip==="gider");
    $("kat-tab-gelir").classList.toggle("active",tip==="gelir");
    renderKatListe();doldurGrupSelect(tip);
  }

  function renderKatListe(){
    const wrap=$("kat-liste-wrap");if(!wrap)return;wrap.innerHTML="";
    const kats=_kategoriler.filter(k=>k.tip===_katTip).sort((a,b)=>a.grup.localeCompare(b.grup,"tr")||a.ad.localeCompare(b.ad,"tr"));
    if(!kats.length){
      const bo=document.createElement("div");
      bo.style.cssText="padding:24px;text-align:center;color:var(--text-muted);font-size:13px";
      bo.textContent="Henuz kategori yok";wrap.appendChild(bo);return;
    }
    const gruplar={};
    for(const k of kats){if(!gruplar[k.grup])gruplar[k.grup]=[];gruplar[k.grup].push(k);}
    for(const[g,ks]of Object.entries(gruplar)){
      const baslik=document.createElement("div");baslik.className="kat-grup-baslik";
      baslik.innerHTML=esc(g)+'<button class="kat-grup-duzenle-btn">&#9998;</button>';
      baslik.querySelector(".kat-grup-duzenle-btn").addEventListener("click",()=>grupDuzenleAc(g));
      wrap.appendChild(baslik);
      for(const k of ks){
        const satir=document.createElement("div");satir.className="kat-satir";
        satir.innerHTML='<span class="kat-satir-ad">'+esc(k.ad)+'</span><div class="kat-satir-actions"><button class="kat-satir-btn duzenle">&#9998;</button><button class="kat-satir-btn sil">&#10005;</button></div>';
        satir.querySelector(".duzenle").addEventListener("click",()=>katDuzenleAc(k));
        satir.querySelector(".sil").addEventListener("click",()=>katSilAc(k));
        wrap.appendChild(satir);
      }
    }
  }

  function katDuzenleAc(k){
    _katDuzId=k.id;
    $("inp-duz-grup").value=k.grup;$("inp-duz-ad").value=k.ad;
    const aw=$("duz-ad-wrap");if(aw)aw.style.display="";
    $("modal-kat-duzenle").querySelector(".modal-title").textContent="Kategoriyi Duzenle";
    $("modal-kat-duzenle").classList.remove("hidden");
    setTimeout(()=>$("inp-duz-ad").focus(),200);
  }
  function grupDuzenleAc(eskiGrup){
    _katDuzId="__GRUP__:"+eskiGrup;
    $("inp-duz-grup").value=eskiGrup;
    const aw=$("duz-ad-wrap");if(aw)aw.style.display="none";
    const ai=$("inp-duz-ad");if(ai)ai.style.display="none";
    $("modal-kat-duzenle").querySelector(".modal-title").textContent="Grup Adi Duzenle";
    $("modal-kat-duzenle").classList.remove("hidden");
    setTimeout(()=>$("inp-duz-grup").focus(),200);
  }
  function katDuzenleKapatGenel(){
    $("modal-kat-duzenle").classList.add("hidden");_katDuzId=null;
    const aw=$("duz-ad-wrap");if(aw)aw.style.display="";
    const ai=$("inp-duz-ad");if(ai)ai.style.display="";
    $("modal-kat-duzenle").querySelector(".modal-title").textContent="Kategoriyi Duzenle";
  }
  async function katDuzenleKaydetGenel(){
    const str=String(_katDuzId||"");
    if(str.startsWith("__GRUP__:")){
      const eg=str.replace("__GRUP__:","");
      const yg=($("inp-duz-grup").value||"").trim().toUpperCase();
      if(!yg){alert("Grup adi bos olamaz.");return;}
      const gks=_kategoriler.filter(k=>k.grup===eg);
      for(const gk of gks){
        await KategorilerDB.update(Object.assign({},gk,{grup:yg}));
        const ed=eg+" - "+gk.ad,yd=yg+" - "+gk.ad;
        const edN=normKatStr(ed);
        for(const i of _islemler.filter(x=>normKatStr(x.kategori)===edN))await IslemlerDB.update(Object.assign({},i,{kategori:yd}));
        if(normKatStr(_seciliKat.value)===normKatStr(ed)){_seciliKat={value:yd,label:gk.ad,tip:gk.tip};$("hg-kat-trigger").textContent=gk.ad;}
      }
    } else {
      const yg=($("inp-duz-grup").value||"").trim().toUpperCase();
      const ya=($("inp-duz-ad").value||"").trim();
      if(!yg||!ya){alert("Bos birakilamaz.");return;}
      const k=_kategoriler.find(x=>x.id===_katDuzId);
      if(!k){alert("Bulunamadi.");return;}
      const ed=k.grup+" - "+k.ad,yd=yg+" - "+ya;
      await KategorilerDB.update(Object.assign({},k,{grup:yg,ad:ya}));
      const edN=normKatStr(ed);
      for(const i of _islemler.filter(x=>normKatStr(x.kategori)===edN))await IslemlerDB.update(Object.assign({},i,{kategori:yd}));
      if(normKatStr(_seciliKat.value)===normKatStr(ed)){_seciliKat={value:yd,label:ya,tip:k.tip};$("hg-kat-trigger").textContent=ya;}
    }
    _kategoriler=await KategorilerDB.getAll();_islemler=await IslemlerDB.getAll();
    katDuzenleKapatGenel();renderKatListe();doldurGrupSelect(_katTip);renderHgList("");renderList();renderSummary();renderKategoriOzeti();
  }

  function katSilAc(k){_katSilId=k.id;$("kat-sil-text").textContent=k.grup+" - "+k.ad+" silinsin mi?";$("modal-kat-sil").classList.remove("hidden");}
  function katSilKapat(){$("modal-kat-sil").classList.add("hidden");_katSilId=null;}
  async function katSilOnayla(){
    if(!_katSilId)return;
    await KategorilerDB.delete(_katSilId);
    _kategoriler=await KategorilerDB.getAll();
    katSilKapat();renderKatListe();doldurGrupSelect(_katTip);renderHgList("");
  }

  function doldurGrupSelect(tip){
    const sel=$("sel-kat-grup");if(!sel)return;sel.innerHTML="";
    const gruplar=[...new Set(_kategoriler.filter(k=>k.tip===tip).map(k=>k.grup))].sort((a,b)=>a.localeCompare(b,"tr"));
    gruplar.forEach(g=>{const o=document.createElement("option");o.value=g;o.textContent=g;sel.appendChild(o);});
    const yn=document.createElement("option");yn.value="__YENI__";yn.textContent="+ Yeni grup...";sel.appendChild(yn);
    const yw=$("yeni-grup-wrap");if(yw)yw.style.display="none";
  }
  async function yeniKatKaydet(){
    const sel=$("sel-kat-grup");let grup=sel.value;
    if(grup==="__YENI__"){const yg=($("inp-kat-grup-yeni").value||"").trim().toUpperCase();if(!yg){alert("Grup adi girin.");return;}grup=yg;}
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

  function hgOdakTutar(){
    var el=$("hg-tutar");
    if(!el)return;
    setTimeout(function(){
      try{ el.focus({ preventScroll: true }); }catch(e){ el.focus(); }
      if(typeof el.select==="function")el.select();
    }, 60);
  }

  async function hgKaydet(tip){
    const aciklama=$("hg-aciklama").value.trim();
    const tutar=parseFloat($("hg-tutar").value);
    if(!tutar||tutar<=0){$("hg-tutar").focus();return;}
    if(!_seciliKat.value){openHgKatSec();return;}
    const _tarihVal=$("hg-tarih");const _yi={tip,kategori:gorunumKategori(_seciliKat.value),tutar,aciklama,tarih:(_tarihVal&&_tarihVal.value)?_tarihVal.value:bugun()};
    await IslemlerDB.add(_yi);
    $("hg-aciklama").value="";$("hg-tutar").value="";
    await yukle();
    hgOdakTutar();
  }

  async function modalAc(id){
    _duzenleId=id;
    const islem=_islemler.find(x=>x.id===id);if(!islem)return;
    tipSec(islem.tip);doldurKategoriSelect(islem.tip);
    $("sel-kategori").value=gorunumKategori(islem.kategori);
    $("inp-tutar").value=islem.tutar;$("inp-aciklama").value=islem.aciklama||"";$("inp-tarih").value=islem.tarih;
    $("modal-islem").classList.remove("hidden");
  }
  function modalKapat(){$("modal-islem").classList.add("hidden");_duzenleId=null;}
  function tipSec(tip){_aktifTip=tip;$("btn-gider").classList.toggle("active",tip==="gider");$("btn-gelir").classList.toggle("active",tip==="gelir");doldurKategoriSelect(tip);}
  async function kaydet(){
    const tutar=parseFloat($("inp-tutar").value);
    const kategori=gorunumKategori($("sel-kategori").value);
    const aciklama=$("inp-aciklama").value.trim();
    const tarih=$("inp-tarih").value;
    if(!tutar||tutar<=0){alert("Gecerli tutar girin.");return;}
    if(!kategori){alert("Kategori secin.");return;}
    if(!tarih){alert("Tarih secin.");return;}
    const islem={tip:_aktifTip,kategori,tutar,aciklama,tarih};
    if(_duzenleId){islem.id=_duzenleId;await IslemlerDB.update(islem);}
    else await IslemlerDB.add(islem);
    modalKapat();await yukle();
  }
  function silModalAc(id){_silId=id;$("modal-sil").classList.remove("hidden");}
  function silModalKapat(){$("modal-sil").classList.add("hidden");_silId=null;}
  async function silOnayla(){if(_silId){await IslemlerDB.delete(_silId);silModalKapat();await yukle();}}

  function mobilPanelAktifMi(){
    try{return window.matchMedia("(max-width: 900px)").matches;}catch(e){return false;}
  }

  function mobilPanelSec(panel){
    const split=$("islemler-split");
    const nav=$("islemler-mobil-nav");
    if(!split||!nav)return;
    const p=["liste","ozet","butce"].includes(panel)?panel:"liste";
    split.setAttribute("data-mobil-panel",p);
    nav.querySelectorAll(".islemler-mnav-btn").forEach(function(btn){
      btn.classList.toggle("active",btn.dataset.islemPanel===p);
    });
    if(p==="butce"&&typeof ButceModule!=="undefined")ButceModule.init();
    try{localStorage.setItem("hk-islem-mobil-panel",p);}catch(e){}
  }

  function baglaMobilNav(){
    const nav=$("islemler-mobil-nav");
    if(!nav||nav._bound)return;
    nav._bound=true;
    nav.querySelectorAll(".islemler-mnav-btn").forEach(function(btn){
      btn.addEventListener("click",function(){
        mobilPanelSec(btn.dataset.islemPanel||"liste");
      });
    });
    let saved="liste";
    try{saved=localStorage.getItem("hk-islem-mobil-panel")||"liste";}catch(e){}
    if(!["liste","ozet","butce"].includes(saved))saved="liste";
    mobilPanelSec(mobilPanelAktifMi()?saved:"liste");
    let mq;
    try{mq=window.matchMedia("(max-width: 900px)");}catch(e){return;}
    const onMq=function(){
      if(mq.matches){
        let s="liste";
        try{s=localStorage.getItem("hk-islem-mobil-panel")||"liste";}catch(e){}
        mobilPanelSec(s);
      }else if($("islemler-split"))$("islemler-split").setAttribute("data-mobil-panel","liste");
    };
    if(mq.addEventListener)mq.addEventListener("change",onMq);
    else if(mq.addListener)mq.addListener(onMq);
  }

  function baglaEventler(){
    if(_baglandi)return;
    _baglandi=true;
    baglaMobilNav();
    $("hg-btn-gelir").addEventListener("click",()=>hgKaydet("gelir"));
    $("hg-btn-gider").addEventListener("click",()=>hgKaydet("gider"));
    $("hg-tutar").addEventListener("keydown",e=>{if(e.key==="Enter")hgKaydet("gider");});
    $("hg-kat-trigger").addEventListener("click",e=>{e.stopPropagation();toggleHgKatSec();});
    const hgKatSecClose=$("hg-kat-sec-close");
    if(hgKatSecClose)hgKatSecClose.addEventListener("click",closeHgKatSecModal);
    const hgKatSecModal=$("modal-hg-kat-sec");
    if(hgKatSecModal)hgKatSecModal.addEventListener("click",e=>{if(e.target===hgKatSecModal)closeHgKatSecModal();});
    $("hg-kat-search-inp").addEventListener("input",function(){
      const q=this.value;
      $("hg-kat-search-clear").classList.toggle("visible",q.length>0);
      renderHgList(q);
    });
    $("hg-kat-search-inp").addEventListener("keydown",e=>{if(e.key==="Escape")closeHgDropdown();e.stopPropagation();});
    $("hg-kat-search-clear").addEventListener("click",e=>{
      e.stopPropagation();
      $("hg-kat-search-inp").value="";
      $("hg-kat-search-clear").classList.remove("visible");
      renderHgList("");$("hg-kat-search-inp").focus();
    });
    $("hg-kat-dropdown").addEventListener("click",e=>e.stopPropagation());
    document.addEventListener("click",()=>closeHgDropdown());
    $("filter-type").addEventListener("change",listeVeOzetGuncelle);
    $("filter-ay").addEventListener("change",listeVeOzetGuncelle);
    $("filter-grup").addEventListener("change",listeVeOzetGuncelle);
    $("btn-yeni-kat-bar").addEventListener("click",katYonetimAc);
    $("kat-close").addEventListener("click",katYonetimKapat);
    $("modal-kategori").addEventListener("click",e=>{if(e.target===$("modal-kategori"))katYonetimKapat();});
    $("kat-tab-gider").addEventListener("click",()=>katTipSec("gider"));
    $("kat-tab-gelir").addEventListener("click",()=>katTipSec("gelir"));
    $("kat-kaydet").addEventListener("click",yeniKatKaydet);
    $("inp-kat-ad").addEventListener("keydown",e=>{if(e.key==="Enter")yeniKatKaydet();});
    $("sel-kat-grup").addEventListener("change",function(){
      const w=$("yeni-grup-wrap");
      if(this.value==="__YENI__"){w.style.display="flex";setTimeout(()=>$("inp-kat-grup-yeni").focus(),100);}
      else w.style.display="none";
    });
    $("kat-duz-close").addEventListener("click",katDuzenleKapatGenel);
    $("kat-duz-iptal").addEventListener("click",katDuzenleKapatGenel);
    $("kat-duz-kaydet").addEventListener("click",katDuzenleKaydetGenel);
    $("modal-kat-duzenle").addEventListener("click",e=>{if(e.target===$("modal-kat-duzenle"))katDuzenleKapatGenel();});
    [$("inp-duz-grup"),$("inp-duz-ad")].forEach(el=>el&&el.addEventListener("keydown",e=>{if(e.key==="Enter")katDuzenleKaydetGenel();}));
    $("kat-sil-close").addEventListener("click",katSilKapat);
    $("kat-sil-iptal").addEventListener("click",katSilKapat);
    $("kat-sil-onayla").addEventListener("click",katSilOnayla);
    $("modal-kat-sil").addEventListener("click",e=>{if(e.target===$("modal-kat-sil"))katSilKapat();});
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
