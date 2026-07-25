const IslemlerModule = (() => {
  let _islemler=[], _kategoriler=[], _duzenleId=null, _silId=null;
  let _aktifTip="gider", _katTip="gider";
  let _seciliKat={value:"",label:"",tip:""};
  let _katDuzId=null, _katSilId=null;
  let _baglandi=false;
  let _iozAy=new Date().getMonth(), _iozYil=new Date().getFullYear();
  let _iozSeciliGrup={gider:null,gelir:null};
  let _iozSeciliKatIslem={tip:null,kat:null};
  let _iozGunSeciliGrup={gider:null,gelir:null};
  let _iozGunSeciliKatIslem={tip:null,kat:null};
  let _iozYilSeciliGrup={gider:null,gelir:null};
  let _iozYilSeciliKatIslem={tip:null,kat:null};
  let _iozGunlukTarih=null;
  let _iozYillikYil=null;
  let _ozetCache=null,_bakMap={},_gorunumKatCache={},_listRenderToken=0;
  const $=id=>document.getElementById(id);

  function normKatStr(s){return String(s||"").replace(/\s+/g," ").trim();}

  /** Tek canonical etiket (yazim / Turkce karakter / grup alias farklarini birlestirir). */
  function gorunumKategori(catStr){
    var k=String(catStr||"");
    if(Object.prototype.hasOwnProperty.call(_gorunumKatCache,k))return _gorunumKatCache[k];
    var out;
    if (typeof HKKategori !== "undefined" && HKKategori.resolve) {
      out = HKKategori.resolve(catStr, _kategoriler) || normKatStr(catStr);
    } else {
      out = normKatStr(catStr);
    }
    _gorunumKatCache[k]=out;
    return out;
  }

  function katNormKey(grup, ad) {
    var tam = katTamEtiket(grup, ad);
    if (typeof HKKategori !== "undefined" && HKKategori.normKey) {
      return HKKategori.normKey(tam);
    }
    return normKatStr(grup).toUpperCase() + "\0" + normKatStr(ad).toLocaleLowerCase("tr");
  }

  function katTamEtiket(grup, ad) {
    if (typeof HKKategori !== "undefined" && HKKategori.canonicalEtiket) {
      return HKKategori.canonicalEtiket(grup, ad);
    }
    return normKatStr(grup).toUpperCase() + " - " + normKatStr(ad);
  }

  /** İşlem kaydı bu kategori (eski grup/ad) ile mi eşleşiyor — yazım farklarını da kapsar. */
  function islemKategoriEslesir(islem, eskiGrup, eskiAd) {
    if (!islem) return false;
    var mevcut = String(islem.kategori || "");
    if (!mevcut) return false;
    var hedefKey = katNormKey(eskiGrup, eskiAd);
    if (typeof HKKategori !== "undefined" && HKKategori.normKey) {
      if (HKKategori.normKey(mevcut) === hedefKey) return true;
      if (HKKategori.normKey(gorunumKategori(mevcut)) === hedefKey) return true;
    }
    var eskiTam = katTamEtiket(eskiGrup, eskiAd);
    if (normKatStr(gorunumKategori(mevcut)) === normKatStr(eskiTam)) return true;
    if (normKatStr(mevcut) === normKatStr(eskiTam)) return true;
    if (normKatStr(mevcut) === normKatStr(eskiGrup + " - " + eskiAd)) return true;
    return false;
  }

  async function islemleriKategoriYenidenEtiketle(eskiGrup, eskiAd, yeniGrup, yeniAd) {
    var yeniTam = katTamEtiket(yeniGrup, yeniAd);
    for (var i = 0; i < _islemler.length; i++) {
      var islem = _islemler[i];
      if (!islemKategoriEslesir(islem, eskiGrup, eskiAd)) continue;
      await IslemlerDB.update(Object.assign({}, islem, { kategori: yeniTam }));
    }
  }

  function katAltModalAcikMi() {
    var duz = $("modal-kat-duzenle");
    var sil = $("modal-kat-sil");
    return (duz && !duz.classList.contains("hidden")) || (sil && !sil.classList.contains("hidden"));
  }

  function katAltModalDurumGuncelle() {
    document.body.classList.toggle("hk-kat-alt-modal-acik", katAltModalAcikMi());
  }

  function ayniGrupMu(a, b) {
    if (typeof HKKategori !== "undefined" && HKKategori.normGrupEslestir) {
      return HKKategori.normGrupEslestir(a) === HKKategori.normGrupEslestir(b);
    }
    if (typeof HKKategori !== "undefined" && HKKategori.normGrup) {
      return HKKategori.normGrup(a) === HKKategori.normGrup(b);
    }
    return normKatStr(a).toLocaleUpperCase("tr") === normKatStr(b).toLocaleUpperCase("tr");
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
    _iozSeciliGrup={gider:null,gelir:null};
    _iozSeciliKatIslem={tip:null,kat:null};
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
    _iozSeciliGrup={gider:null,gelir:null};
    _iozSeciliKatIslem={tip:null,kat:null};
    renderKategoriOzeti();
  }

  function iozAyBagla(){
    const g=$("ioz-geri"), i=$("ioz-ileri");
    if(g)g.onclick=iozAyGeri;
    if(i)i.onclick=iozAyIleri;
    const gunBtn=$("ioz-gun-ozet-btn");
    if(gunBtn)gunBtn.onclick=gunlukOzetModalAc;
    const yilBtn=$("ioz-yil-ozet-btn");
    if(yilBtn)yilBtn.onclick=yillikOzetModalAc;
  }

  function gunEtiket(gunKey){
    if(!gunKey)return"";
    const p=gunKey.split("-");
    if(p.length<3)return tarihSaat(gunKey);
    const d=new Date(parseInt(p[0],10),parseInt(p[1],10)-1,parseInt(p[2],10));
    const gunler=["Pazar","Pazartesi","Sali","Carsamba","Persembe","Cuma","Cumartesi"];
    return tarihSaat(gunKey)+" · "+gunler[d.getDay()];
  }

  function gunlukOzetVeri(gunKey){
    const kat={};
    let gelir=0,gider=0;
    for(const i of _islemler){
      if(!i.tarih||i.tarih!==gunKey)continue;
      const katAd=gorunumKategori(i.kategori);
      const tut=parseFloat(i.tutar)||0;
      if(!kat[katAd])kat[katAd]={gelir:0,gider:0,adet:0,grup:kategoriGrupAdi(katAd)};
      kat[katAd].adet++;
      if(i.tip==="gelir"){
        gelir+=tut;kat[katAd].gelir+=tut;
      }else{
        gider+=tut;kat[katAd].gider+=tut;
      }
    }
    const katListe=Object.entries(kat).map(function(e){
      const k=e[1];
      return {ad:e[0],grup:k.grup,gelir:k.gelir,gider:k.gider,adet:k.adet};
    });
    return {gelir,gider,katListe};
  }

  function gunlukOzetHtml(gunKey){
    const v=gunlukOzetVeri(gunKey);
    const net=v.gelir-v.gider;
    const gunVer={gelir:v.gelir,gider:v.gider};
    if(!v.katListe.some(function(k){return k.gelir>0||k.gider>0;})){
      return '<div class="ioz-bos">'+esc(gunEtiket(gunKey))+'<br>Bu g&#252;nde i&#351;lem yok.</div>';
    }
    let h='<div class="ioz-gun-etiket">'+esc(gunEtiket(gunKey))+'</div>';
    h+='<div class="ioz-panel-head ioz-gun-mini-head">';
    h+='<div class="ozet-bar ioz-ust-ozet-yatay">';
    h+='<div class="ioz-ozet-hucre"><span class="ioz-ozet-lbl">Gelir</span><span class="ioz-ozet-val gelir">'+para(v.gelir)+'</span></div>';
    h+='<div class="ioz-ozet-hucre"><span class="ioz-ozet-lbl">Gider</span><span class="ioz-ozet-val gider">'+para(v.gider)+'</span></div>';
    h+='<div class="ioz-ozet-hucre"><span class="ioz-ozet-lbl">Net</span><span class="ioz-ozet-val net">'+(net>=0?"":"-")+para(Math.abs(net))+'</span></div>';
    h+='</div></div>';
    h+=iozOranCubukHtml(gunVer);
    h+=iozGrafikBlokRender(v.katListe, gunVer, _iozGunSeciliGrup, {tur:"gun",key:gunKey}, _iozGunSeciliKatIslem);
    return h;
  }

  function iozKatIslemToggle(st, tip, kat){
    if(!st||!tip||!kat)return;
    if(st.tip===tip&&st.kat===kat){st.tip=null;st.kat=null;}
    else{st.tip=tip;st.kat=kat;}
  }

  function iozKatIslemleriBul(katAd, tip, ozetCtx){
    if(!ozetCtx||!ozetCtx.key)return [];
    return _islemler.filter(function(i){
      if(gorunumKategori(i.kategori)!==katAd)return false;
      if(i.tip!==tip)return false;
      if(ozetCtx.tur==="gun")return i.tarih===ozetCtx.key;
      if(ozetCtx.tur==="ay")return i.tarih.startsWith(ozetCtx.key);
      if(ozetCtx.tur==="yil")return i.tarih.startsWith(ozetCtx.key);
      return true;
    }).sort(function(a,b){
      return a.tarih.localeCompare(b.tarih)||(a.olusturma||0)-(b.olusturma||0);
    });
  }

  function iozIslemZamanEtiket(islem, ozetCtx){
    if(ozetCtx.tur==="gun"&&islem.olusturma){
      try{
        return new Date(islem.olusturma).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
      }catch(e){}
    }
    if(ozetCtx.tur==="ay"){
      const p=islem.tarih.split("-");
      if(p.length>=3)return p[2]+"."+p[1];
    }
    return tarihSaat(islem.tarih);
  }

  function iozKatIslemListeHtml(katAd, tip, ozetCtx){
    const liste=iozKatIslemleriBul(katAd, tip, ozetCtx);
    if(!liste.length)return "";
    let h='<div class="ioz-kat-islem-liste">';
    liste.forEach(function(i){
      const bilgi=i.aciklama?esc(i.aciklama):esc(iozKatAdKisa(katAd));
      h+='<div class="ioz-kat-islem-satir">';
      h+='<span class="ioz-kat-islem-zaman">'+esc(iozIslemZamanEtiket(i, ozetCtx))+'</span>';
      h+='<span class="ioz-kat-islem-bilgi">'+bilgi+'</span>';
      h+='<span class="ioz-kat-islem-tutar '+(tip==="gelir"?"gelir":"gider")+'">'+(tip==="gelir"?"+":"-")+para(i.tutar)+'</span>';
      h+='</div>';
    });
    h+='</div>';
    return h;
  }

  function iozGunKatIslemSec(tip, kat){
    iozKatIslemToggle(_iozGunSeciliKatIslem, tip, kat);
    gunlukOzetIcerikGuncelle(false);
  }

  function iozYilKatIslemSec(tip, kat){
    iozKatIslemToggle(_iozYilSeciliKatIslem, tip, kat);
    yillikOzetIcerikGuncelle(false);
  }

  function iozAyKatIslemSec(tip, kat){
    iozKatIslemToggle(_iozSeciliKatIslem, tip, kat);
    renderKategoriOzeti();
  }

  function iozGunGrupSec(tip, grup){
    if(!tip||!grup)return;
    var diger=tip==="gelir"?"gider":"gelir";
    if(_iozGunSeciliGrup[tip]===grup){
      _iozGunSeciliGrup[tip]=null;
    }else{
      _iozGunSeciliGrup[tip]=grup;
      _iozGunSeciliGrup[diger]=null;
    }
    _iozGunSeciliKatIslem={tip:null,kat:null};
    gunlukOzetIcerikGuncelle(false);
  }

  function gunlukOzetIcerikGuncelle(resetSecim){
    if(resetSecim!==false){
      _iozGunSeciliGrup={gider:null,gelir:null};
      _iozGunSeciliKatIslem={tip:null,kat:null};
    }
    const inp=$("ioz-gun-tarih");
    const gunKey=(inp&&inp.value)||bugun();
    _iozGunlukTarih=gunKey;
    const el=$("ioz-gun-ozet-icerik");
    if(!el)return;
    el.innerHTML=gunlukOzetHtml(gunKey);
    iozGrafikEtkilesimBagla(el, iozGunGrupSec, iozGunKatIslemSec);
  }

  function gunlukOzetModalAc(){
    const modal=$("modal-gunluk-ozet");
    if(!modal)return;
    const inp=$("ioz-gun-tarih");
    if(inp)inp.value=_iozGunlukTarih||bugun();
    gunlukOzetIcerikGuncelle();
    modal.classList.remove("hidden");
  }

  function gunlukOzetModalKapat(){
    const modal=$("modal-gunluk-ozet");
    if(modal)modal.classList.add("hidden");
  }

  function yillikOzetVeri(yilKey){
    const yil=String(yilKey||"");
    const kat={};
    let gelir=0,gider=0;
    for(const i of _islemler){
      if(!i.tarih||!i.tarih.startsWith(yil))continue;
      const katAd=gorunumKategori(i.kategori);
      const tut=parseFloat(i.tutar)||0;
      if(!kat[katAd])kat[katAd]={gelir:0,gider:0,adet:0,grup:kategoriGrupAdi(katAd)};
      kat[katAd].adet++;
      if(i.tip==="gelir"){
        gelir+=tut;kat[katAd].gelir+=tut;
      }else{
        gider+=tut;kat[katAd].gider+=tut;
      }
    }
    const katListe=Object.entries(kat).map(function(e){
      const k=e[1];
      return {ad:e[0],grup:k.grup,gelir:k.gelir,gider:k.gider,adet:k.adet};
    });
    return {gelir,gider,katListe};
  }

  function yillikOzetYilDoldur(){
    const sel=$("ioz-yil-sec");
    if(!sel)return;
    const ySet={};
    for(const i of _islemler){
      if(i.tarih&&i.tarih.length>=4)ySet[i.tarih.substring(0,4)]=true;
    }
    const yillar=Object.keys(ySet).sort(function(a,b){return b.localeCompare(a);});
    const buYil=String(new Date().getFullYear());
    if(!yillar.length)yillar.push(buYil);
    sel.innerHTML=yillar.map(function(y){return '<option value="'+esc(y)+'">'+esc(y)+'</option>';}).join("");
    const sec=_iozYillikYil||(yillar.indexOf(buYil)>=0?buYil:yillar[0]);
    sel.value=sec;
    _iozYillikYil=sec;
  }

  function yillikOzetHtml(yilKey){
    const v=yillikOzetVeri(yilKey);
    const net=v.gelir-v.gider;
    const yilVer={gelir:v.gelir,gider:v.gider};
    if(!v.katListe.some(function(k){return k.gelir>0||k.gider>0;})){
      return '<div class="ioz-bos">'+esc(yilKey)+'<br>Bu y&#305;lda i&#351;lem yok.</div>';
    }
    let h='<div class="ioz-gun-etiket">'+esc(yilKey)+' y&#305;l&#305;</div>';
    h+='<div class="ioz-panel-head ioz-gun-mini-head">';
    h+='<div class="ozet-bar ioz-ust-ozet-yatay">';
    h+='<div class="ioz-ozet-hucre"><span class="ioz-ozet-lbl">Gelir</span><span class="ioz-ozet-val gelir">'+para(v.gelir)+'</span></div>';
    h+='<div class="ioz-ozet-hucre"><span class="ioz-ozet-lbl">Gider</span><span class="ioz-ozet-val gider">'+para(v.gider)+'</span></div>';
    h+='<div class="ioz-ozet-hucre"><span class="ioz-ozet-lbl">Net</span><span class="ioz-ozet-val net">'+(net>=0?"":"-")+para(Math.abs(net))+'</span></div>';
    h+='</div></div>';
    h+=iozOranCubukHtml(yilVer);
    h+=iozGrafikBlokRender(v.katListe, yilVer, _iozYilSeciliGrup, {tur:"yil",key:yilKey}, _iozYilSeciliKatIslem);
    return h;
  }

  function iozYilGrupSec(tip, grup){
    if(!tip||!grup)return;
    var diger=tip==="gelir"?"gider":"gelir";
    if(_iozYilSeciliGrup[tip]===grup){
      _iozYilSeciliGrup[tip]=null;
    }else{
      _iozYilSeciliGrup[tip]=grup;
      _iozYilSeciliGrup[diger]=null;
    }
    _iozYilSeciliKatIslem={tip:null,kat:null};
    yillikOzetIcerikGuncelle(false);
  }

  function yillikOzetIcerikGuncelle(resetSecim){
    if(resetSecim!==false){
      _iozYilSeciliGrup={gider:null,gelir:null};
      _iozYilSeciliKatIslem={tip:null,kat:null};
    }
    const sel=$("ioz-yil-sec");
    const yilKey=(sel&&sel.value)||String(new Date().getFullYear());
    _iozYillikYil=yilKey;
    const el=$("ioz-yil-ozet-icerik");
    if(!el)return;
    el.innerHTML=yillikOzetHtml(yilKey);
    iozGrafikEtkilesimBagla(el, iozYilGrupSec, iozYilKatIslemSec);
  }

  function yillikOzetModalAc(){
    const modal=$("modal-yillik-ozet");
    if(!modal)return;
    yillikOzetYilDoldur();
    yillikOzetIcerikGuncelle();
    modal.classList.remove("hidden");
  }

  function yillikOzetModalKapat(){
    const modal=$("modal-yillik-ozet");
    if(modal)modal.classList.add("hidden");
  }

  function iozHeadRender(head, ayVer, ayKey){
    if(!head)return;
    const ayNet=ayVer.gelir-ayVer.gider;
    const ayLbl=ayEtiket(ayKey);
    head.innerHTML=
      '<div class="islemler-kol-baslik">'+
      '<span class="islemler-kol-ad">Ayl&#305;k Kategori &#214;zet</span>'+
      '<div class="islemler-kol-nav">'+
      '<button type="button" class="butce-rapor-btn ioz-ozet-nav-btn" id="ioz-yil-ozet-btn" title="Y&#305;ll&#305;k &#246;zet">Y&#305;ll&#305;k</button>'+
      '<button type="button" class="butce-rapor-btn ioz-ozet-nav-btn" id="ioz-gun-ozet-btn" title="G&#252;nl&#252;k &#246;zet">G&#252;nl&#252;k</button>'+
      '<button type="button" class="butce-ay-btn" id="ioz-geri">&#8249;</button>'+
      '<span class="islemler-kol-ay butce-kol-ay">'+esc(ayLbl)+'</span>'+
      '<button type="button" class="butce-ay-btn" id="ioz-ileri"'+(iozAyIleriKapali()?' disabled':'')+'>&#8250;</button>'+
      '</div></div>'+
      '<div class="ozet-bar ioz-ust-ozet-yatay">'+
      '<div class="ioz-ozet-hucre"><span class="ioz-ozet-lbl">Gelir</span><span class="ioz-ozet-val gelir">'+para(ayVer.gelir)+'</span></div>'+
      '<div class="ioz-ozet-hucre"><span class="ioz-ozet-lbl">Gider</span><span class="ioz-ozet-val gider">'+para(ayVer.gider)+'</span></div>'+
      '<div class="ioz-ozet-hucre"><span class="ioz-ozet-lbl">Net</span><span class="ioz-ozet-val net">'+(ayNet>=0?"":"-")+para(Math.abs(ayNet))+'</span></div>'+
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
    if(_ozetCache)return _ozetCache;
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
    _ozetCache={byAy,byYil};
    return _ozetCache;
  }

  function veriHazirla(){
    _islemler.sort(function(a,b){return a.tarih.localeCompare(b.tarih)||(a.olusturma||0)-(b.olusturma||0);});
    _bakMap={};
    var bak=0;
    for(var i=0;i<_islemler.length;i++){
      var row=_islemler[i];
      bak+=row.tip==="gelir"?parseFloat(row.tutar):-parseFloat(row.tutar);
      _bakMap[row.id]=bak;
    }
    _ozetCache=null;
    _gorunumKatCache={};
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

  var IOZ_GIDER_RENK=["#f05454","#e8884a","#f0b840","#c8952a","#8aadcc","#64748b","#a855f7","#94a3b8"];
  var IOZ_GELIR_RENK=["#34c97a","#2dd4bf","#4ade80","#22c55e","#86efac","#64748b","#10b981","#94a3b8"];

  function iozConicOlustur(parcaList){
    var acc=0,parts=[];
    parcaList.forEach(function(p){
      var bas=acc;
      acc+=p.pct;
      if(p.pct>0)parts.push(p.renk+" "+bas+"% "+acc+"%");
    });
    if(acc<100)parts.push("rgba(46,64,89,0.45) "+acc+"% 100%");
    return parts.join(", ");
  }

  function iozDonutPolar(cx,cy,r,deg){
    var rad=deg*Math.PI/180;
    return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};
  }

  function iozDonutSegPath(cx,cy,R,Ri,startDeg,endDeg){
    if(endDeg-startDeg>=359.99){
      return "M "+(cx-R)+" "+cy+" A "+R+" "+R+" 0 1 1 "+(cx+R)+" "+cy+
        " A "+R+" "+R+" 0 1 1 "+(cx-R)+" "+cy+
        " M "+(cx-Ri)+" "+cy+" A "+Ri+" "+Ri+" 0 1 0 "+(cx+Ri)+" "+cy+
        " A "+Ri+" "+Ri+" 0 1 0 "+(cx-Ri)+" "+cy+" Z";
    }
    var large=(endDeg-startDeg)>180?1:0;
    var o1=iozDonutPolar(cx,cy,R,startDeg);
    var o2=iozDonutPolar(cx,cy,R,endDeg);
    var i2=iozDonutPolar(cx,cy,Ri,endDeg);
    var i1=iozDonutPolar(cx,cy,Ri,startDeg);
    return "M "+o1.x+" "+o1.y+
      " A "+R+" "+R+" 0 "+large+" 1 "+o2.x+" "+o2.y+
      " L "+i2.x+" "+i2.y+
      " A "+Ri+" "+Ri+" 0 "+large+" 0 "+i1.x+" "+i1.y+" Z";
  }

  function iozDonutSvgHtml(parcaList, baslik, chartTip){
    var size=132,cx=size/2,cy=size/2,R=size/2-2,Ri=42,acc=0,segs="";
    parcaList.forEach(function(p){
      if(p.pct<=0)return;
      var bas=acc;
      acc+=p.pct;
      var start=bas*3.6-90;
      var end=acc*3.6-90;
      segs+='<path class="ioz-donut-seg" d="'+iozDonutSegPath(cx,cy,R,Ri,start,end)+'" fill="'+p.renk+'" data-ioz-chart-tip="'+(chartTip||"")+'" data-ioz-grup="'+esc(p.ad)+'">';
      segs+='</path>';
    });
    return '<svg class="ioz-donut-svg" viewBox="0 0 '+size+' '+size+'" role="img" aria-label="'+esc(baslik)+' dagilim grafigi">'+segs+'</svg>';
  }

  function iozGrupDagilim(katListe, tip, ayVer, maxParca){
    maxParca=maxParca||6;
    var topRef=tip==="gelir"?(ayVer.gelir||0):(ayVer.gider||0);
    if(topRef<=0)return{toplam:0,parca:[]};
    var renkler=tip==="gelir"?IOZ_GELIR_RENK:IOZ_GIDER_RENK;
    var gruplar={};
    katListe.forEach(function(k){
      var val=tip==="gelir"?k.gelir:k.gider;
      if(val<=0)return;
      var g=k.grup||"Diger";
      gruplar[g]=(gruplar[g]||0)+val;
    });
    var sirali=Object.keys(gruplar).map(function(g){
      return {ad:g,val:gruplar[g]};
    }).sort(function(a,b){return b.val-a.val;});
    var parca=[],diger=0;
    sirali.forEach(function(row,i){
      if(i<maxParca)parca.push(row);
      else diger+=row.val;
    });
    if(diger>0)parca.push({ad:"Diger",val:diger});
    parca=parca.map(function(row,i){
      return {
        ad:row.ad,
        val:row.val,
        pct:Math.round((row.val/topRef)*1000)/10,
        renk:renkler[i%renkler.length]
      };
    });
    var topGrupAdlari=parca.filter(function(p){return p.ad!=="Diger";}).map(function(p){return p.ad;});
    return {toplam:topRef,parca:parca,topGrupAdlari:topGrupAdlari};
  }

  function iozGruplarMapForLegend(filtered, tip, topGrupAdlari){
    var map={};
    filtered.forEach(function(k){
      var val=tip==="gelir"?k.gelir:k.gider;
      if(val<=0)return;
      var g=k.grup||"Diger";
      if(topGrupAdlari.indexOf(g)<0)g="Diger";
      if(!map[g])map[g]=[];
      map[g].push(k);
    });
    return map;
  }

  function iozDonutOnlyHtml(tip, dagilim, baslik){
    if(!dagilim.parca.length)return "";
    var h='<div class="ioz-donut-col ioz-donut-'+tip+'">';
    h+='<div class="ioz-donut-wrap" data-ioz-chart-tip="'+tip+'">';
    h+=iozDonutSvgHtml(dagilim.parca, baslik, tip);
    h+='<div class="ioz-donut-ic">';
    h+='<span class="ioz-donut-ic-lbl">'+baslik+'</span>';
    h+='<span class="ioz-donut-ic-val '+(tip==="gelir"?"gelir":"gider")+'">'+(tip==="gelir"?"+":"-")+para(dagilim.toplam)+'</span>';
    h+='</div></div></div>';
    return h;
  }

  function iozGiderOzetLegendHtml(dagilim, seciliGrup){
    if(!dagilim.parca.length)return "";
    var h='<ul class="ioz-donut-legend ioz-gider-ozet">';
    h+='<li class="ioz-legend-toplam">';
    h+='<span class="ioz-legend-toplam-lbl">Toplam Gider</span>';
    h+='<span class="ioz-legend-toplam-val gider">-'+para(dagilim.toplam)+'</span>';
    h+='</li>';
    dagilim.parca.forEach(function(p){
      var aktif=seciliGrup===p.ad;
      h+='<li><button type="button" class="ioz-legend-btn'+(aktif?" active":"")+'" data-ioz-tip="gider" data-ioz-grup="'+esc(p.ad)+'" aria-pressed="'+(aktif?"true":"false")+'" aria-expanded="'+(aktif?"true":"false")+'">';
      h+='<span class="ioz-legend-satir">';
      h+='<span class="ioz-legend-renk" style="background:'+p.renk+'"></span>';
      h+='<span class="ioz-legend-ad">'+esc(p.ad)+'</span>';
      h+='<span class="ioz-legend-rakam gider">-'+para(p.val)+'</span>';
      h+='<span class="ioz-legend-pct">%'+p.pct.toLocaleString("tr-TR",{minimumFractionDigits:0,maximumFractionDigits:1})+'</span>';
      h+='</span></button></li>';
    });
    h+='</ul>';
    return h;
  }

  function iozGrafikBlokRender(katListe, ayVer, seciliGrup, ozetCtx, seciliKatIslem){
    var gelirListe=katListe.filter(function(k){return k.gelir>0;});
    var giderListe=katListe.filter(function(k){return k.gider>0;});
    gelirListe.sort(function(a,b){return b.gelir-a.gelir;});
    giderListe.sort(function(a,b){return b.gider-a.gider;});
    var gelirDag=gelirListe.length?iozGrupDagilim(gelirListe,"gelir",ayVer,6):{toplam:0,parca:[],topGrupAdlari:[]};
    var giderDag=giderListe.length?iozGrupDagilim(giderListe,"gider",ayVer,6):{toplam:0,parca:[],topGrupAdlari:[]};
    seciliGrup=seciliGrup||_iozSeciliGrup;
    seciliKatIslem=seciliKatIslem||{tip:null,kat:null};
    ozetCtx=ozetCtx||{tur:"ay",key:ozetAySecimi()};
    var seciliGider=seciliGrup.gider;
    var seciliGelir=seciliGrup.gelir;
    var h='<div class="ioz-grafik-blok">';
    h+='<div class="ioz-donut-cift">';
    if(gelirDag.parca.length)h+=iozDonutOnlyHtml("gelir",gelirDag,"Gelir");
    else h+='<div class="ioz-donut-col ioz-donut-bos"><span class="ioz-donut-bos-lbl">Gelir</span><span class="ioz-bos ioz-tip-bos">Bu ayda gelir yok.</span></div>';
    if(giderDag.parca.length)h+=iozDonutOnlyHtml("gider",giderDag,"Gider");
    else h+='<div class="ioz-donut-col ioz-donut-bos"><span class="ioz-donut-bos-lbl">Gider</span><span class="ioz-bos ioz-tip-bos">Bu ayda gider yok.</span></div>';
    h+='</div>';
    if(seciliGelir&&gelirDag.parca.length){
      var grupMapG=iozGruplarMapForLegend(gelirListe,"gelir",gelirDag.topGrupAdlari);
      var gListeG=grupMapG[seciliGelir];
      if(gListeG&&gListeG.length){
        h+=iozGrupDetayPanelHtml(seciliGelir,gListeG,"gelir",ayVer.gelir||1, ozetCtx, seciliKatIslem);
      }
    }
    if(giderDag.parca.length){
      h+=iozGiderOzetLegendHtml(giderDag, seciliGider);
      if(seciliGider){
        var grupMap=iozGruplarMapForLegend(giderListe,"gider",giderDag.topGrupAdlari);
        var gListe=grupMap[seciliGider];
        if(gListe&&gListe.length){
          h+=iozGrupDetayPanelHtml(seciliGider,gListe,"gider",ayVer.gider||1, ozetCtx, seciliKatIslem);
        }
      }
    }
    h+='</div>';
    return h;
  }

  function iozGrupDetayPanelHtml(grup, gListe, tip, topRef, ozetCtx, seciliKatIslem){
    seciliKatIslem=seciliKatIslem||{tip:null,kat:null};
    var sorted=gListe.slice().sort(function(a,b){
      return tip==="gelir"?b.gelir-a.gelir:b.gider-a.gider;
    });
    var h='<div class="ioz-grup-detay-panel">';
    h+='<div class="ioz-grup-detay-baslik">';
    h+='<span class="ioz-grup-detay-ad">'+esc(grup)+'</span>';
    h+='<span class="ioz-grup-detay-ipucu">Kapatmak i\u00e7in gruba tekrar dokunun</span>';
    h+='</div>';
    sorted.forEach(function(k){
      var tutVal=tip==="gelir"?k.gelir:k.gider;
      var pct=Math.round((tutVal/topRef)*100);
      var acik=seciliKatIslem.tip===tip&&seciliKatIslem.kat===k.ad;
      h+='<div class="ioz-kat-satir'+(acik?" ioz-kat-satir-acik":"")+'">';
      h+='<div class="ioz-kat-ust">';
      h+='<span class="ioz-kat-ad">'+esc(iozKatAdKisa(k.ad))+'</span>';
      h+='<span class="ioz-kat-ust-sag">';
      h+='<span class="ioz-kat-tutar '+(tip==="gelir"?"gelir":"gider")+'">'+(tip==="gelir"?"+":"-")+para(tutVal)+'</span>';
      h+='<span class="ioz-kat-pct">%'+pct+'</span>';
      h+='<button type="button" class="ioz-kat-adet-btn'+(acik?" active":"")+'" data-ioz-tip="'+tip+'" data-ioz-kat="'+esc(k.ad)+'">'+k.adet+' i\u015flem</button>';
      h+='</span></div>';
      if(acik)h+=iozKatIslemListeHtml(k.ad, tip, ozetCtx);
      h+='</div>';
    });
    h+='</div>';
    return h;
  }

  function iozGrupSec(tip, grup){
    if(!tip||!grup)return;
    var diger=tip==="gelir"?"gider":"gelir";
    if(_iozSeciliGrup[tip]===grup){
      _iozSeciliGrup[tip]=null;
    }else{
      _iozSeciliGrup[tip]=grup;
      _iozSeciliGrup[diger]=null;
    }
    _iozSeciliKatIslem={tip:null,kat:null};
    renderKategoriOzeti();
  }

  function iozDonutSegBul(node, root){
    while(node&&node!==root){
      if(node.nodeType===1&&node.classList&&node.classList.contains("ioz-donut-seg"))return node;
      node=node.parentNode;
    }
    return null;
  }

  function iozGrafikEtkilesimBagla(wrap, onGrupSec, onKatIslem){
    if(!wrap)return;
    wrap._iozOnGrupSec=onGrupSec||function(tip,grup){iozGrupSec(tip,grup);};
    wrap._iozOnKatIslem=onKatIslem||function(tip,kat){iozAyKatIslemSec(tip,kat);};
    if(!wrap._iozGrafikClickBound){
      wrap._iozGrafikClickBound=true;
      wrap.addEventListener("click",function(e){
        var adetBtn=e.target.closest(".ioz-kat-adet-btn");
        if(adetBtn){
          e.preventDefault();
          var kt=adetBtn.getAttribute("data-ioz-tip");
          var ka=adetBtn.getAttribute("data-ioz-kat");
          if(kt&&ka)wrap._iozOnKatIslem(kt,ka);
          return;
        }
        var btn=e.target.closest(".ioz-legend-btn");
        if(btn){
          var tip=btn.getAttribute("data-ioz-tip");
          var grup=btn.getAttribute("data-ioz-grup");
          if(tip&&grup)wrap._iozOnGrupSec(tip,grup);
          return;
        }
        var seg=iozDonutSegBul(e.target,wrap)||(e.target.closest?e.target.closest(".ioz-donut-seg"):null);
        if(seg){
          var st=seg.getAttribute("data-ioz-chart-tip");
          var sg=seg.getAttribute("data-ioz-grup");
          if((st==="gelir"||st==="gider")&&sg)wrap._iozOnGrupSec(st,sg);
        }
      });
    }
    var tipEl=document.getElementById("ioz-cursor-tip");
    if(!tipEl){
      tipEl=document.createElement("div");
      tipEl.id="ioz-cursor-tip";
      tipEl.className="ioz-donut-hover-tip ioz-cursor-tip";
      tipEl.setAttribute("aria-hidden","true");
      document.body.appendChild(tipEl);
    }
    if(wrap._iozGrafikTipBound)return;
    wrap._iozGrafikTipBound=true;
    var activeSeg=null;
    function konumla(e){
      if(!e)return;
      var pad=10;
      tipEl.style.left=(e.clientX+pad)+"px";
      tipEl.style.top=(e.clientY+pad)+"px";
    }
    function segAt(e){
      var hit=document.elementFromPoint(e.clientX,e.clientY);
      if(!hit)return null;
      var seg=iozDonutSegBul(hit,wrap);
      if(seg)return seg;
      if(hit.closest)return hit.closest(".ioz-donut-seg");
      return null;
    }
    function goster(seg,e){
      if(!seg)return;
      var grupAd=seg.getAttribute("data-ioz-grup")||"";
      tipEl.textContent=grupAd;
      tipEl.classList.add("visible");
      konumla(e);
      if(activeSeg!==seg){
        if(activeSeg)activeSeg.classList.remove("ioz-donut-seg-hover");
        activeSeg=seg;
        seg.classList.add("ioz-donut-seg-hover");
      }
    }
    function gizle(){
      tipEl.classList.remove("visible");
      tipEl.textContent="";
      tipEl.style.left="";
      tipEl.style.top="";
      if(activeSeg){activeSeg.classList.remove("ioz-donut-seg-hover");activeSeg=null;}
    }
    wrap.addEventListener("mousemove",function(e){
      var seg=segAt(e);
      if(seg&&wrap.contains(seg)){goster(seg,e);return;}
      if(!e.target.closest||!e.target.closest(".ioz-donut-wrap"))gizle();
    });
    wrap.addEventListener("mouseleave",function(e){
      if(!wrap.contains(e.relatedTarget))gizle();
    });
  }

  function iozOranCubukHtml(ayVer){
    var gelir=ayVer.gelir||0,gider=ayVer.gider||0,top=gelir+gider;
    if(top<=0)return "";
    var gPct=Math.round((gelir/top)*1000)/10;
    var dPct=Math.round((gider/top)*1000)/10;
    if(gPct+dPct>100)dPct=Math.max(0,100-gPct);
    var h='<div class="ioz-oran-kart ioz-oran-sade">';
    h+='<div class="ioz-oran-baslik"><span>Gelir / Gider orani</span><span class="ioz-oran-net '+(gelir>=gider?"gelir":"gider")+'">Net '+(gelir>=gider?"+":"-")+para(Math.abs(gelir-gider))+'</span></div>';
    h+='<div class="ioz-oran-etiket"><span class="gelir">Gelir %'+gPct.toLocaleString("tr-TR",{maximumFractionDigits:1})+'</span><span class="gider">Gider %'+dPct.toLocaleString("tr-TR",{maximumFractionDigits:1})+'</span></div>';
    h+='</div>';
    return h;
  }

  function renderKategoriOzeti(){
    const head=$("ioz-panel-head");
    const wrap=$("islem-kat-ozet-scroll");
    if(!wrap)return;
    guncelleKolBaslikAy();
    const {byAy}=_islemler.length?kategoriOzetiVeri():{byAy:{}};
    const ayKey=ozetAySecimi();
    const ayVer=byAy[ayKey]||{gelir:0,gider:0,kat:{}};
    iozHeadRender(head, ayVer, ayKey);

    if(!_islemler.length){
      wrap.innerHTML='<div class="ioz-bos">Henüz işlem yok.<br>Kategori özetleri burada görünecek.</div>';
      return;
    }

    let h='';

    /* —— Aylik detay: gelir + gider grafikleri tek blok —— */
    const katListe=Object.entries(ayVer.kat).map(function(e){
      const k=e[1];
      return {ad:e[0],grup:k.grup||kategoriGrupAdi(e[0]),gelir:k.gelir,gider:k.gider,adet:k.adet};
    });

    if(!katListe.some(function(k){return k.gelir>0||k.gider>0;})){
      h+='<div class="ioz-bos">Bu ayda kategorili i\u015flem yok.</div>';
    }else{
      h+=iozOranCubukHtml(ayVer);
      h+=iozGrafikBlokRender(katListe, ayVer, _iozSeciliGrup, {tur:"ay",key:ayKey}, _iozSeciliKatIslem);
    }

    wrap.innerHTML=h;
    iozGrafikEtkilesimBagla(wrap, null, iozAyKatIslemSec);
  }

  function listeVeOzetGuncelle(){
    var l=$("islem-list");
    var top=l?l.scrollTop:0;
    renderList();
    renderKategoriOzeti();
    l=$("islem-list");
    if(l)l.scrollTop=Math.min(top,Math.max(0,l.scrollHeight-l.clientHeight));
  }

  async function yukle(opt){
    opt=opt||{};
    if(typeof window._hkIslemlerOnbellekPromise!=="undefined"&&window._hkIslemlerOnbellekPromise){
      try{await window._hkIslemlerOnbellekPromise;}catch(e){}
    }
    if(!opt.zorla&&window._hkIslemlerOnbellek){
      _islemler=window._hkIslemlerOnbellek;
      _kategoriler=window._hkKategorilerOnbellek||[];
    }else{
      var p=await Promise.all([IslemlerDB.getAll(),KategorilerDB.getAll()]);
      _islemler=p[0];
      _kategoriler=p[1];
      window._hkIslemlerOnbellek=_islemler;
      window._hkKategorilerOnbellek=_kategoriler;
    }
    veriHazirla();
    renderSummary();
    renderKategoriOzeti();
    doldurAyFilter();
    doldurGrupFilter();
    renderHgList("");
    var _ht=$("hg-tarih");
    if(_ht&&!_ht.value)_ht.value=bugun();
    var listeOnce=$("islem-list");
    var onceTop=listeOnce?listeOnce.scrollTop:0;
    var onceH=listeOnce?listeOnce.scrollHeight:0;
    var onceCh=listeOnce?listeOnce.clientHeight:0;
    var altaYakin=onceH>0&&(onceH-onceTop-onceCh<56);
    var altaKaydir=!!opt.altaKaydir||!!opt.ilk||altaYakin||onceH===0;
    var token=++_listRenderToken;
    requestAnimationFrame(function(){
      if(token!==_listRenderToken)return;
      renderList();
      requestAnimationFrame(function(){
        var l=$("islem-list");
        if(!l)return;
        /* Bulut yenilemesi / arka plan yukle: kullanici eski kayitlara bakarken alta ziplatma */
        if(altaKaydir)l.scrollTop=l.scrollHeight;
        else l.scrollTop=Math.min(onceTop,Math.max(0,l.scrollHeight-l.clientHeight));
      });
    });
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

  function rowHtml(islem,bakiye){
    var katTam=gorunumKategori(islem.kategori);
    var katAdi=esc(katTam)+(islem.aciklama?" <span class='islem-aciklama-inline'>* "+esc(islem.aciklama)+"</span>":"");
    return "<div class=\"islem-row "+islem.tip+"\" data-id=\""+islem.id+"\">"+
      "<div class=\"sol-bar\"></div><div class=\"islem-row-left\"><div class=\"islem-kat-adi\">"+katAdi+"</div></div>"+
      "<div class=\"islem-row-right\"><span class=\"islem-tarih-col\">"+tarihSaat(islem.tarih)+"</span>"+
      "<span class=\"islem-tutar-col\">"+(islem.tip==="gider"?"-":"+")+para(islem.tutar)+"</span>"+
      "<span class=\"islem-bakiye-col\">"+para(bakiye||0)+"</span>"+
      "<div class=\"islem-row-actions\"><button type=\"button\" class=\"row-action-btn duzenle\" aria-label=\"Düzenle\">&#9998;</button>"+
      "<button type=\"button\" class=\"row-action-btn sil\" aria-label=\"Sil\">&#10005;</button></div></div></div>";
  }

  function renderList(){
    const liste=$("islem-list"),empty=$("empty-state");
    if(!liste)return;
    const items=filtreliIslemler();
    if(!items.length){
      liste.innerHTML="";
      if(empty)empty.style.display="flex";
      return;
    }
    if(empty)empty.style.display="none";
    const gruplar={};
    for(var i=0;i<items.length;i++){
      var it=items[i];
      var k=it.tarih.substring(0,7);
      if(!gruplar[k])gruplar[k]=[];
      gruplar[k].push(it);
    }
    var genG=0,genGi=0;
    var parts=[];
    for(const [key,grup] of Object.entries(gruplar)){
      const[y,m]=key.split("-");
      parts.push("<div class=\"islem-grup-baslik\">"+AYLAR_TR[parseInt(m)-1]+" "+y+"</div>");
      let ayG=0,ayGi=0;
      for(var j=0;j<grup.length;j++){
        var row=grup[j];
        parts.push(rowHtml(row,_bakMap[row.id]));
        if(row.tip==="gelir")ayG+=parseFloat(row.tutar);else ayGi+=parseFloat(row.tutar);
      }
      genG+=ayG;genGi+=ayGi;
      var ayNet=ayG-ayGi;
      parts.push("<div class=\"islem-ay-ozet\"><span>"+AYLAR_TR[parseInt(m)-1]+":</span><span class='ao-gelir'>"+para(ayG)+"</span><span class='ao-sep'>&#8722;</span><span class='ao-gider'>"+para(ayGi)+"</span><span class='ao-sep'>=</span><span class='ao-net'>"+(ayNet>=0?"":"-")+para(Math.abs(ayNet))+"</span></div>");
    }
    if(Object.keys(gruplar).length){
      var gNet=genG-genGi;
      parts.push("<div class=\"islem-genel-toplam\"><span class=\"gt-lbl\">TOPLAM:</span><span class=\"gt-gelir\">"+para(genG)+"</span><span class=\"gt-sep\">&#8722;</span><span class=\"gt-gider\">"+para(genGi)+"</span><span class=\"gt-sep\">=</span><span class=\"gt-val\">"+(gNet>=0?"":"-")+para(Math.abs(gNet))+"</span></div>");
    }
    liste.innerHTML=parts.join("");
  }

  function rowOlustur(islem,bakiye){
    return rowHtml(islem,bakiye);
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
        if(mobilSec){
          const item=document.createElement("button");
          item.type="button";
          item.className=secSinif+(_seciliKat.value===g+" - "+k.ad?" selected":"");
          item.innerHTML='<span class="hg-kat-sec-ad">'+esc(k.ad)+'</span><span class="hg-kat-sec-tip '+k.tip+'">'+(k.tip==="gelir"?"Gelir":"Gider")+'</span>';
          item.addEventListener("click",function(e){e.stopPropagation();hgKatUygula(g,k);});
          liste.appendChild(item);
        }else{
          const item=document.createElement("div");
          item.className=secSinif+(_seciliKat.value===g+" - "+k.ad?" selected":"");
          item.textContent=k.ad;
          item.addEventListener("click",function(e){e.stopPropagation();hgKatUygula(g,k);});
          liste.appendChild(item);
        }
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
    $("inp-duz-grup").value=k.grup;
    $("inp-duz-ad").value=k.ad;
    const aw=$("duz-ad-wrap");if(aw)aw.style.display="";
    const ai=$("inp-duz-ad");if(ai){ai.style.display="";ai.disabled=false;}
    $("modal-kat-duzenle").querySelector(".modal-title").textContent="Kategoriyi Duzenle";
    $("modal-kat-duzenle").classList.remove("hidden");
    katAltModalDurumGuncelle();
    setTimeout(()=>$("inp-duz-ad").focus(),200);
  }
  function grupDuzenleAc(eskiGrup){
    _katDuzId="__GRUP__:"+eskiGrup;
    $("inp-duz-grup").value=eskiGrup;
    const aw=$("duz-ad-wrap");if(aw)aw.style.display="none";
    const ai=$("inp-duz-ad");if(ai)ai.style.display="none";
    $("modal-kat-duzenle").querySelector(".modal-title").textContent="Grup Adi Duzenle";
    $("modal-kat-duzenle").classList.remove("hidden");
    katAltModalDurumGuncelle();
    setTimeout(()=>$("inp-duz-grup").focus(),200);
  }
  function katDuzenleKapatGenel(){
    $("modal-kat-duzenle").classList.add("hidden");_katDuzId=null;
    const aw=$("duz-ad-wrap");if(aw)aw.style.display="";
    const ai=$("inp-duz-ad");if(ai){ai.style.display="";ai.disabled=false;}
    $("modal-kat-duzenle").querySelector(".modal-title").textContent="Kategoriyi Duzenle";
    katAltModalDurumGuncelle();
  }
  async function katDuzenleKaydetGenel(){
    const str=String(_katDuzId||"");
    if(str.startsWith("__GRUP__:")){
      const eg=str.replace("__GRUP__:","");
      const yg=($("inp-duz-grup").value||"").trim().toLocaleUpperCase("tr");
      if(!yg){alert("Grup adi bos olamaz.");return;}
      const gks=_kategoriler.filter(k=>ayniGrupMu(k.grup, eg));
      for(const gk of gks){
        await KategorilerDB.update(Object.assign({},gk,{grup:yg}));
        await islemleriKategoriYenidenEtiketle(gk.grup, gk.ad, yg, gk.ad);
        const ed=katTamEtiket(eg, gk.ad), yd=katTamEtiket(yg, gk.ad);
        if(normKatStr(_seciliKat.value)===normKatStr(ed)||normKatStr(_seciliKat.value)===normKatStr(gorunumKategori(ed))){
          _seciliKat={value:yd,label:gk.ad,tip:gk.tip};
          $("hg-kat-trigger").textContent=gk.ad;
        }
      }
    } else {
      const yg=($("inp-duz-grup").value||"").trim().toLocaleUpperCase("tr");
      const ya=($("inp-duz-ad").value||"").trim();
      if(!yg||!ya){alert("Bos birakilamaz.");return;}
      const k=_kategoriler.find(x=>x.id===_katDuzId);
      if(!k){alert("Bulunamadi.");return;}
      const eskiGrup=k.grup, eskiAd=k.ad;
      await KategorilerDB.update(Object.assign({},k,{grup:yg,ad:ya}));
      await islemleriKategoriYenidenEtiketle(eskiGrup, eskiAd, yg, ya);
      const ed=katTamEtiket(eskiGrup, eskiAd), yd=katTamEtiket(yg, ya);
      if(normKatStr(_seciliKat.value)===normKatStr(ed)||normKatStr(_seciliKat.value)===normKatStr(gorunumKategori(ed))){
        _seciliKat={value:yd,label:ya,tip:k.tip};
        $("hg-kat-trigger").textContent=ya;
      }
    }
    _kategoriler=await KategorilerDB.getAll();
    _islemler=await IslemlerDB.getAll();
    veriHazirla();
    katDuzenleKapatGenel();
    renderKatListe();
    doldurGrupSelect(_katTip);
    doldurGrupFilter();
    renderHgList("");
    renderList();
    renderSummary();
    renderKategoriOzeti();
  }

  function katSilAc(k){_katSilId=k.id;$("kat-sil-text").textContent=k.grup+" - "+k.ad+" silinsin mi?";$("modal-kat-sil").classList.remove("hidden");katAltModalDurumGuncelle();}
  function katSilKapat(){$("modal-kat-sil").classList.add("hidden");_katSilId=null;katAltModalDurumGuncelle();}
  async function katSilOnayla(){
    if(!_katSilId)return;
    await KategorilerDB.delete(_katSilId);
    _kategoriler=await KategorilerDB.getAll();
    katSilKapat();renderKatListe();doldurGrupSelect(_katTip);doldurGrupFilter();renderHgList("");renderList();renderSummary();renderKategoriOzeti();
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
    if(grup==="__YENI__"){const yg=($("inp-kat-grup-yeni").value||"").trim().toLocaleUpperCase("tr");if(!yg){alert("Grup adi girin.");return;}grup=yg;}
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
    await yukle({altaKaydir:true});
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
    var yeniKayit=!_duzenleId;
    if(_duzenleId){islem.id=_duzenleId;await IslemlerDB.update(islem);}
    else await IslemlerDB.add(islem);
    modalKapat();await yukle({altaKaydir:yeniKayit});
  }
  function silModalAc(id){_silId=id;$("modal-sil").classList.remove("hidden");}
  function silModalKapat(){$("modal-sil").classList.add("hidden");_silId=null;}
  async function silOnayla(){if(_silId){await IslemlerDB.delete(_silId);silModalKapat();await yukle({altaKaydir:false});}}

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
    document.addEventListener("click",function(e){
      if(mobilPanelAktifMi())return;
      const dd=$("hg-kat-dropdown");
      const wrap=$("hg-kat-wrap");
      if(!dd||!dd.classList.contains("open"))return;
      if(wrap&&wrap.contains(e.target))return;
      closeHgDropdown();
    });
    $("filter-type").addEventListener("change",listeVeOzetGuncelle);
    $("filter-ay").addEventListener("change",listeVeOzetGuncelle);
    $("filter-grup").addEventListener("change",listeVeOzetGuncelle);
    var islemListe=$("islem-list");
    if(islemListe&&!islemListe._hkDelegasyon){
      islemListe._hkDelegasyon=true;
      islemListe.addEventListener("click",function(e){
        var btn=e.target.closest(".row-action-btn");
        if(!btn||!islemListe.contains(btn))return;
        e.stopPropagation();
        var row=btn.closest(".islem-row");
        if(!row)return;
        var id=parseInt(row.getAttribute("data-id"),10);
        if(isNaN(id))return;
        if(btn.classList.contains("duzenle"))modalAc(id);
        else if(btn.classList.contains("sil"))silModalAc(id);
      });
    }
    $("btn-yeni-kat-bar").addEventListener("click",katYonetimAc);
    $("kat-close").addEventListener("click",katYonetimKapat);
    $("modal-kategori").addEventListener("click",e=>{
      if(katAltModalAcikMi())return;
      if(e.target===$("modal-kategori"))katYonetimKapat();
    });
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
    var duzModal=$("modal-kat-duzenle");
    if(duzModal){
      var duzBox=duzModal.querySelector(".modal-box");
      if(duzBox){
        duzBox.addEventListener("click",e=>e.stopPropagation());
        duzBox.addEventListener("touchstart",e=>e.stopPropagation(),{passive:true});
      }
    }
    [$("inp-duz-grup"),$("inp-duz-ad")].forEach(el=>{
      if(!el)return;
      el.addEventListener("keydown",e=>{
        if(e.key==="Enter"){e.preventDefault();katDuzenleKaydetGenel();}
        e.stopPropagation();
      });
    });
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
    const gunModal=$("modal-gunluk-ozet");
    if(gunModal){
      $("ioz-gun-ozet-kapat")&&$("ioz-gun-ozet-kapat").addEventListener("click",gunlukOzetModalKapat);
      $("ioz-gun-bugun")&&$("ioz-gun-bugun").addEventListener("click",function(){
        const inp=$("ioz-gun-tarih");
        if(inp)inp.value=bugun();
        gunlukOzetIcerikGuncelle();
      });
      $("ioz-gun-tarih")&&$("ioz-gun-tarih").addEventListener("change",gunlukOzetIcerikGuncelle);
      gunModal.addEventListener("click",e=>{if(e.target===gunModal)gunlukOzetModalKapat();});
      const gunBox=gunModal.querySelector(".modal-box");
      if(gunBox)gunBox.addEventListener("click",e=>e.stopPropagation());
    }
    const yilModal=$("modal-yillik-ozet");
    if(yilModal){
      $("ioz-yil-ozet-kapat")&&$("ioz-yil-ozet-kapat").addEventListener("click",yillikOzetModalKapat);
      $("ioz-yil-bu")&&$("ioz-yil-bu").addEventListener("click",function(){
        const sel=$("ioz-yil-sec");
        if(sel)sel.value=String(new Date().getFullYear());
        yillikOzetIcerikGuncelle();
      });
      $("ioz-yil-sec")&&$("ioz-yil-sec").addEventListener("change",yillikOzetIcerikGuncelle);
      yilModal.addEventListener("click",e=>{if(e.target===yilModal)yillikOzetModalKapat();});
      const yilBox=yilModal.querySelector(".modal-box");
      if(yilBox)yilBox.addEventListener("click",e=>e.stopPropagation());
    }
  }

  var _eventsBound=false;
  var _initPromise=null;
  async function init(){
    if(_initPromise)return _initPromise;
    _initPromise=(async function(){
      if(!_eventsBound){baglaEventler();_eventsBound=true;}
      await yukle({ilk:true});
    })().catch(function(e){
      _initPromise=null;
      throw e;
    });
    return _initPromise;
  }
  return{init,yukle};
})();
