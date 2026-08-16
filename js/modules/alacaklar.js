/* alacaklar.js — Alacaklar + Borclarim (cift panel) */
var AlacaklarModule=(function(){
var $=function(id){return document.getElementById(id);};
var _gramAltinFiyatTL=0;
var AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
var ALTIN_GRAM={gram:1,ceyrek:1.75,yarim:3.5,tam:7,ata:7.2};
var ALTIN_LABEL={gram:"Gram",ceyrek:"Ceyrek",yarim:"Yarim",tam:"Tam",ata:"Ata"};
var ALTIN_SIRASI=["gram","ceyrek","yarim","tam","ata"];
var DOVIZLER=[
  {k:"TRY",label:"TL",sembol:"TL"},
  {k:"USD",label:"USD",sembol:"$"},
  {k:"EUR",label:"EUR",sembol:"€"},
  {k:"GBP",label:"GBP",sembol:"£"}
];
var L_ALACAK={
  kolon:"Alacaklar",ozet:"Alacak ozeti",ozetBos:"Acik alacak yok",yeni:"Yeni alacak",
  bosBaslik:"Henuz alacak yok",bosAlt:"Yeni alacak ekleyerek baslayin.",
  araPh:"Kisi veya aciklama ara...",acikListe:"Acik alacaklar",kapaliListe:"Kapali / odenen",
  kisiEkle:"+ Bu kisiye ekle",modalYeni:"Yeni Alacak",modalDuzenle:"Alacagi Duzenle",
  pesinDef:"Pesin alacak",taksitDef:"Taksitli alacak",kisiKayit:"kayit",altinOdendi:"Alindi"
};
var L_BORC={
  kolon:"Borclarim",ozet:"Borc ozeti",ozetBos:"Acik borc yok",yeni:"Yeni borc",
  bosBaslik:"Henuz borc yok",bosAlt:"Yeni borc ekleyerek baslayin.",
  araPh:"Kisi veya aciklama ara...",acikListe:"Acik borclar",kapaliListe:"Odenen borclar",
  kisiEkle:"+ Bu kisiye ekle",modalYeni:"Yeni Borc",modalDuzenle:"Borcu Duzenle",
  pesinDef:"Pesin borc",taksitDef:"Taksitli borc",kisiKayit:"kayit",altinOdendi:"Verildi"
};
var P_ALACAK={key:"alacak",fbPath:"alacaklar",pfx:"al-a-",lbl:L_ALACAK,kayitlar:[],aktif:null,aktifTip:"pesin",araMetni:"",aktifKisiAd:null};
var P_BORC={key:"borc",fbPath:"borclar",pfx:"al-b-",lbl:L_BORC,kayitlar:[],aktif:null,aktifTip:"pesin",araMetni:"",aktifKisiAd:null};
var _aktifPanel="alacak";
var _modalKoruma=0;
function pid(p,n){return p.pfx+n;}
function formModalAcikMi(p){var m=$(pid(p,"modal"));return !!(m&&!m.classList.contains("hidden"));}
function formModalHerhangiAcikMi(){return formModalAcikMi(P_ALACAK)||formModalAcikMi(P_BORC);}
function overlayAc(modal){
  if(!modal)return;
  _modalKoruma=Date.now()+450;
  modal.classList.remove("hidden");
  modal.style.pointerEvents="none";
  setTimeout(function(){
    if(modal&&!modal.classList.contains("hidden"))modal.style.pointerEvents="";
  },350);
}
function overlayKapat(modal){
  if(!modal)return;
  modal.classList.add("hidden");
  modal.style.pointerEvents="";
}
function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "a"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}
function ayFmt(t){if(!t)return"";var p=t.split("-");return AYLAR[parseInt(p[1],10)-1]+" "+p[0];}
function ayEkle(bas,n){var d=new Date(bas+"-01");d.setMonth(d.getMonth()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function todayStr(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function altinGram(k){return (ALTIN_GRAM[k.altinTur]||1)*(parseFloat(k.altinAdet)||1);}
function normalizeDoviz(d){
  var x=String(d||"TRY").trim().toUpperCase();
  for(var i=0;i<DOVIZLER.length;i++)if(DOVIZLER[i].k===x)return x;
  return "TRY";
}
function dovizSembol(d){var x=normalizeDoviz(d);for(var i=0;i<DOVIZLER.length;i++)if(DOVIZLER[i].k===x)return DOVIZLER[i].sembol;return "TL";}
function tutarFmt(n,doviz){return para(n)+" "+dovizSembol(doviz);}
function normalizeTip(tip){
  var t=(tip||"").toString().trim().toLowerCase();
  if(t==="altin")return "altin";
  if(t==="taksit"||t==="taksitli")return "taksit";
  if(t==="pesin"||t==="peşin"||t==="nakit")return "pesin";
  return "pesin";
}
function normalizeKayit(k){
  var tip=normalizeTip(k.tip),kk=Object.assign({},k,{tip:tip});
  if(tip!=="altin")kk.doviz=normalizeDoviz(kk.doviz);
  if(tip==="taksit"){
    var ts=parseInt(kk.taksitSayisi,10);
    if(!ts||ts<1){
      var odemeAdedi=(kk.odemeler&&typeof kk.odemeler==="object")?Object.keys(kk.odemeler).length:0;
      ts=odemeAdedi>0?odemeAdedi:1;
    }
    kk.taksitSayisi=ts;
    if(!kk.basTarih)kk.basTarih=(kk.tarih&&kk.tarih.substring)?kk.tarih.substring(0,7):todayStr().substring(0,7);
    if(!kk.odemeler||typeof kk.odemeler!=="object")kk.odemeler={};
  }
  if(tip==="pesin"){kk.tutar=parseFloat(kk.tutar)||0;if(!kk.tarih)kk.tarih=todayStr();}
  if(tip==="altin"){kk.altinTur=kk.altinTur||"gram";kk.altinAdet=parseFloat(kk.altinAdet)||1;if(!kk.tarih)kk.tarih=todayStr();}
  return kk;
}
async function fbYukle(p){
  if(!window._fbDb)return;
  try{var v=await fbRtdbOku(p.fbPath);p.kayitlar=v?Object.values(v):[];}
  catch(e){p.kayitlar=[];console.error("[Alacak/Borc] yukle",p.fbPath,e);}
}
async function fbKaydet(p){
  if(!window._fbDb)return;
  try{var obj={};p.kayitlar.forEach(function(x){obj[x.id]=x;});await fbRtdbRef(p.fbPath).set(obj);}
  catch(e){console.error("[Alacak/Borc] kaydet",p.fbPath,e);}
}
async function altinGuncelFiyatYukle(){
  _gramAltinFiyatTL=0;
  if(typeof fbAltinFiyatOku==="function"){
    try{var cached=await fbAltinFiyatOku();if(cached&&cached>0)_gramAltinFiyatTL=cached;}catch(e){}
  }else if(typeof window._fbDb!=="undefined"&&window._fbDb){
    try{var v=parseFloat(await fbRtdbOku("altin_guncel_fiyat"));if(v&&v>0)_gramAltinFiyatTL=v;}catch(e){}
  }
  if(_gramAltinFiyatTL<=0){
    var URLs=["https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json","https://latest.currency-api.pages.dev/v1/currencies/xau.json"];
    var j,r2,d2,x2,oz;
    for(j=0;j<URLs.length;j++){
      try{r2=await fetch(URLs[j],{cache:"no-store"});if(!r2.ok)continue;d2=await r2.json();x2=d2&&d2.xau;oz=x2&&parseFloat(x2.try);if(isFinite(oz)&&oz>100){_gramAltinFiyatTL=oz/31.1034768;break;}}catch(e){}
    }
  }
  if(_gramAltinFiyatTL>0&&typeof fbAltinFiyatCacheYaz==="function")fbAltinFiyatCacheYaz(_gramAltinFiyatTL);
}
function taksitPlan(k){
  if(k.tip==="pesin")return [{ay:k.tarih?k.tarih.substring(0,7):"",tutar:parseFloat(k.tutar)||0,no:1,odendi:k.odendi||false}];
  if(k.tip==="altin")return [{ay:k.tarih?k.tarih.substring(0,7):"",tutar:0,no:1,odendi:k.odendi||false}];
  var ts=Math.max(1,parseInt(k.taksitSayisi,10)||1),toplam=parseFloat(k.tutar)||0,plan=[],i;
  for(i=0;i<ts;i++)plan.push({ay:ayEkle(k.basTarih,i),tutar:toplam/ts,no:i+1,odendi:(k.odemeler&&k.odemeler[i])||false});
  return plan;
}
function kalanTutar(k){
  if(k.tip==="altin")return k.odendi?0:1;
  return taksitPlan(k).filter(function(t){return !t.odendi;}).reduce(function(s,t){return s+t.tutar;},0);
}
function nakitToplamMap(liste){
  var m={};
  (liste||[]).filter(function(k){return k.tip!=="altin"&&kalanTutar(k)>0;}).forEach(function(k){
    var d=normalizeDoviz(k.doviz);m[d]=(m[d]||0)+kalanTutar(k);
  });
  return m;
}
function toplamAltinGram(liste){return (liste||[]).filter(function(k){return k.tip==="altin"&&!k.odendi;}).reduce(function(s,k){return s+altinGram(k);},0);}
function kisilerMap(p){var m={};p.kayitlar.forEach(function(k){var ad=(k.kisi||"?").trim();if(!m[ad])m[ad]=[];m[ad].push(k);});return m;}
function kisiInitial(ad){var s=(ad||"?").trim();return s?s.charAt(0).toLocaleUpperCase("tr-TR"):"?";}
function taksitIlerleme(k){
  if(k.tip!=="taksit")return null;
  var plan=taksitPlan(k),top=plan.length;if(!top)return null;
  var od=plan.filter(function(t){return t.odendi;}).length;
  return {od:od,top:top,pct:Math.round(od/top*100)};
}
function ozetToplamMetni(nakit,tg){
  var parcalar=[],tryNakit=nakit.TRY||0,tryToplam=tryNakit,i,d,v;
  if(tg>0&&_gramAltinFiyatTL>0)tryToplam+=tg*_gramAltinFiyatTL;
  if(tryToplam>0)parcalar.push(tutarFmt(tryToplam,"TRY"));
  else if(tryNakit>0)parcalar.push(tutarFmt(tryNakit,"TRY"));
  for(i=0;i<DOVIZLER.length;i++){
    d=DOVIZLER[i].k;if(d==="TRY")continue;
    v=nakit[d]||0;if(v>0)parcalar.push(tutarFmt(v,d));
  }
  if(tg>0&&_gramAltinFiyatTL<=0)parcalar.push(tg.toFixed(2)+" gr");
  if(!parcalar.length)return null;
  return parcalar.join(" · ");
}
function kisiOzetMetni(ks){
  var nakit=nakitToplamMap(ks),tg=toplamAltinGram(ks),parcalar=[],i,d,v;
  for(i=0;i<DOVIZLER.length;i++){d=DOVIZLER[i].k;v=nakit[d]||0;if(v>0)parcalar.push(tutarFmt(v,d));}
  if(tg>0)parcalar.push(tg.toFixed(2)+" gr");
  if(!parcalar.length)return {metin:"Tamamlandi",ok:true};
  return {metin:parcalar.join(" · "),ok:false};
}
function ozetHtml(p){
  var nakit=nakitToplamMap(p.kayitlar),tg=toplamAltinGram(p.kayitlar),h='<div class="al-ozet-tek">';
  var any=false,i,d,v,toplam=ozetToplamMetni(nakit,tg);
  h+='<div class="al-ozet-ust"><span class="al-oz-label">'+p.lbl.ozet+'</span>';
  if(toplam)h+='<span class="al-oz-toplam-hizli">'+toplam+'</span>';
  h+='</div><div class="al-ozet-chip-row">';
  for(i=0;i<DOVIZLER.length;i++){
    d=DOVIZLER[i].k;v=nakit[d]||0;
    if(v>0){any=true;h+='<span class="al-oz-chip al-oz-chip-tl"><em>'+DOVIZLER[i].label+'</em> '+tutarFmt(v,d)+'</span>';}
  }
  if(tg>0){
    any=true;
    h+='<span class="al-oz-chip al-oz-chip-au"><em>Au</em> '+tg.toFixed(2)+' gr';
    if(_gramAltinFiyatTL>0)h+=' <small>≈ '+para(tg*_gramAltinFiyatTL)+'</small>';
    h+='</span>';
  }
  if(!any)h+='<span class="al-oz-bos">'+p.lbl.ozetBos+'</span>';
  h+='</div></div>';return h;
}
function kisiChipHtml(ks){
  var nakit=nakitToplamMap(ks),tg=toplamAltinGram(ks),h='<div class="al-kisi-chip-wrap">',any=false,i,d,v;
  for(i=0;i<DOVIZLER.length;i++){d=DOVIZLER[i].k;v=nakit[d]||0;if(v>0){any=true;h+='<span class="al-kisi-chip al-chip-tl">'+tutarFmt(v,d)+'</span>';}}
  if(tg>0){any=true;h+='<span class="al-kisi-chip al-chip-au">'+tg.toFixed(2)+' gr</span>';}
  if(!any)h+='<span class="al-kisi-chip al-chip-ok">Tamamlandi</span>';
  h+='</div>';return h;
}
function aksiyonBtn(cls,id,ikon,baslik){
  return '<button class="al-aksiyon-btn '+cls+'" data-id="'+id+'" type="button" title="'+baslik+'" aria-label="'+baslik+'">'+ikon+'</button>';
}
function odemeBtnHtml(k,no,odendi){
  var baslik=odendi?"Odenmis (geri al)":"Odendi isaretle";
  var ikon=odendi
    ?'<svg class="al-odeme-ikon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    :'<svg class="al-odeme-ikon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  return '<button class="al-aksiyon-btn al-odeme-btn'+(odendi?" al-odendi-aktif":"")+'" data-id="'+k.id+'" data-no="'+no+'" type="button" title="'+baslik+'" aria-label="'+baslik+'">'+ikon+'</button>';
}
function kartHtml(p,k){
  var L=p.lbl,tamOdendi=(k.tip==="altin")?k.odendi:(kalanTutar(k)<=0);
  var aciklama=esc(k.aciklama||""),dv=normalizeDoviz(k.doviz);
  var tipCls=k.tip==="altin"?"al-kart--altin":(k.tip==="taksit"?"al-kart--taksit":"al-kart--pesin");
  var h='<div class="al-kart '+tipCls+(tamOdendi?" al-kart-kapali":"")+'">';
  var aksiyonlar='<div class="al-kart-actions">'+aksiyonBtn("al-duz-btn duzenle",k.id,"&#9998;","Duzenle")+aksiyonBtn("al-sil-btn sil",k.id,"&#10005;","Sil")+'</div>';
  if(k.tip==="pesin"){
    var kalan=kalanTutar(k);
    h+='<div class="al-kart-satir"><div class="al-kart-bilgi"><span class="al-kart-tip al-tip-p">Pesin</span>';
    h+='<span class="al-kart-baslik-metin">'+(aciklama||L.pesinDef)+'</span>';
    h+='<span class="al-kart-ek">'+tarihFmt(k.tarih)+' · '+tutarFmt(k.tutar,dv)+'</span></div>';
    h+='<span class="al-kart-tutar'+(tamOdendi?" al-kart-tutar-bitti":"")+'">'+(tamOdendi?"Odendi":tutarFmt(kalan,dv))+'</span>';
    h+='<div class="al-kart-actions">'+odemeBtnHtml(k,-1,!!k.odendi)+aksiyonBtn("al-duz-btn duzenle",k.id,"&#9998;","Duzenle")+aksiyonBtn("al-sil-btn sil",k.id,"&#10005;","Sil")+'</div></div>';
  }else if(k.tip==="altin"){
    h+='<div class="al-kart-satir"><div class="al-kart-bilgi"><span class="al-kart-tip al-tip-au">Altin</span>';
    h+='<span class="al-kart-baslik-metin">'+ALTIN_LABEL[k.altinTur||"gram"]+' × '+(parseFloat(k.altinAdet)||1)+'</span>';
    if(aciklama)h+='<span class="al-kart-ek">'+aciklama+' · '+tarihFmt(k.tarih)+'</span>';
    else h+='<span class="al-kart-ek">'+tarihFmt(k.tarih)+'</span>';
    h+='</div><span class="al-kart-tutar al-kart-tutar-au'+(tamOdendi?" al-kart-tutar-bitti":"")+'">'+(tamOdendi?L.altinOdendi:altinGram(k).toFixed(2)+" gr")+'</span>';
    h+='<div class="al-kart-actions">'+odemeBtnHtml(k,-1,!!k.odendi)+aksiyonBtn("al-duz-btn duzenle",k.id,"&#9998;","Duzenle")+aksiyonBtn("al-sil-btn sil",k.id,"&#10005;","Sil")+'</div></div>';
  }else{
    var kalan=kalanTutar(k),prog=taksitIlerleme(k);
    h+='<div class="al-kart-satir al-kart-satir-ust"><div class="al-kart-bilgi"><span class="al-kart-tip al-tip-t">Taksitli</span>';
    h+='<span class="al-kart-baslik-metin">'+(aciklama||L.taksitDef)+'</span>';
    h+='<span class="al-kart-ek">'+tutarFmt(k.tutar,dv)+' · '+k.taksitSayisi+' taksit';
    if(prog)h+=' · '+prog.od+'/'+prog.top+' odendi';
    h+='</span></div><span class="al-kart-tutar'+(tamOdendi?" al-kart-tutar-bitti":"")+'">'+(tamOdendi?"Odendi":tutarFmt(kalan,dv))+'</span>'+aksiyonlar+'</div>';
    if(prog&&!tamOdendi)h+='<div class="al-kart-bar" role="progressbar" aria-valuenow="'+prog.pct+'"><div class="al-kart-bar-inner" style="width:'+prog.pct+'%"></div></div>';
    var plan=taksitPlan(k);
    if(plan.length){
      h+='<div class="al-plan">';
      plan.forEach(function(t){
        h+='<div class="al-kart-satir al-kart-satir-alt'+(t.odendi?" al-odendi":"")+'">';
        h+='<div class="al-kart-bilgi al-kart-bilgi-alt"><span class="al-kart-baslik-metin">'+ayFmt(t.ay)+'</span>';
        h+='<span class="al-kart-ek">'+t.no+' / '+k.taksitSayisi+'</span></div>';
        h+='<span class="al-kart-tutar">'+tutarFmt(t.tutar,dv)+'</span>';
        h+='<div class="al-kart-actions">'+odemeBtnHtml(k,t.no-1,!!t.odendi)+'</div></div>';
      });
      h+='</div>';
    }
  }
  h+='</div>';return h;
}
function kisiListeHtml(p,ks){
  var aktif=ks.filter(function(k){return kalanTutar(k)>0;});
  var kapali=ks.filter(function(k){return kalanTutar(k)<=0;});
  var h='';
  if(aktif.length){h+='<div class="al-liste-baslik">'+p.lbl.acikListe+'</div>';aktif.forEach(function(k){h+=kartHtml(p,k);});}
  if(kapali.length){h+='<div class="al-liste-baslik al-liste-baslik-kapali">'+p.lbl.kapaliListe+'</div>';kapali.forEach(function(k){h+=kartHtml(p,k);});}
  if(!h)h+='<div class="al-bos al-bos-kucuk">Bu kisiye ait kayit yok.</div>';
  return h;
}
function renderKolon(p){
  var h='<section class="al-kolon al-kolon--'+p.key+'" aria-label="'+esc(p.lbl.kolon)+'">';
  h+='<div class="al-kolon-baslik">'+esc(p.lbl.kolon)+'</div>';
  h+='<div class="al-wrap al-wrap-kolon"><div class="al-header">'+ozetHtml(p);
  h+='<button class="al-yeni-btn" id="'+pid(p,"yeni-btn")+'" type="button" data-panel="'+p.key+'" title="'+esc(p.lbl.yeni)+'" aria-label="'+esc(p.lbl.yeni)+'"><span class="al-yeni-ikon">+</span></button></div>';
  h+='<div class="al-kontrol-bar"><div class="al-ara-wrap"><input id="'+pid(p,"ara")+'" class="al-ara-input" type="search" placeholder="'+esc(p.lbl.araPh)+'" value="'+esc(p.araMetni)+'" autocomplete="off" data-panel="'+p.key+'"/></div></div>';
  if(!p.kayitlar.length){
    h+='<div class="al-bos al-bos-kolon"><div class="al-bos-baslik">'+esc(p.lbl.bosBaslik)+'</div><div class="al-bos-alt">'+esc(p.lbl.bosAlt)+'</div></div>';
  }else{
    var km=kisilerMap(p),ara=(p.araMetni||"").toLocaleLowerCase("tr-TR"),gorunen=0;
    h+='<div class="al-kisi-liste">';
    Object.keys(km).sort(function(a,b){return a.localeCompare(b,"tr-TR");}).forEach(function(ad){
      var ks=km[ad];
      var uygun=!ara||ad.toLocaleLowerCase("tr-TR").indexOf(ara)>-1||ks.some(function(k){return ((k.aciklama||"")+" "+(k.tip||"")).toLocaleLowerCase("tr-TR").indexOf(ara)>-1;});
      if(!uygun)return;
      gorunen++;
      var aktifAdet=ks.filter(function(k){return kalanTutar(k)>0;}).length;
      var oz=kisiOzetMetni(ks);
      h+='<div class="al-kisi-satir" data-panel="'+p.key+'" data-kisi="'+encodeURIComponent(ad)+'" role="button" tabindex="0">';
      h+='<span class="al-kisi-avatar" aria-hidden="true">'+esc(kisiInitial(ad))+'</span>';
      h+='<div class="al-kisi-body"><div class="al-kisi-row1">';
      h+='<span class="al-kisi-ad">'+esc(ad)+'</span>';
      h+='<span class="al-kisi-tutar'+(oz.ok?" al-kisi-tutar-ok":"")+'">'+esc(oz.metin)+'</span>';
      h+='<span class="al-kisi-ok" aria-hidden="true">›</span></div>';
      h+='<div class="al-kisi-meta">'+aktifAdet+' acik · '+ks.length+' '+p.lbl.kisiKayit+'</div></div></div>';
    });
    h+='</div>';
    if(!gorunen)h+='<div class="al-bos al-bos-kolon"><div class="al-bos-baslik">Sonuc bulunamadi</div></div>';
  }
  h+='</div></section>';return h;
}
function kisiModalShell(p){
  return '<div class="bk-modal-overlay hidden" id="'+pid(p,"kisi-modal")+'" data-panel="'+p.key+'"><div class="modal-box al-kisi-modal-box">'+
    '<div class="modal-header"><h2 class="modal-title" id="'+pid(p,"kisi-modal-baslik")+'">Kisi</h2><button type="button" class="modal-close" id="'+pid(p,"kisi-modal-kapat")+'" data-panel="'+p.key+'">&#10005;</button></div>'+
    '<div class="modal-body al-kisi-modal-body" id="'+pid(p,"kisi-modal-body")+'"></div>'+
    '<div class="modal-footer"><button type="button" class="btn-primary" id="'+pid(p,"kisi-modal-ekle")+'" data-panel="'+p.key+'">'+esc(p.lbl.kisiEkle)+'</button></div></div></div>';
}
function modalHtml(p){
  var today=todayStr(),thisMonth=today.substring(0,7),id=pid(p,"modal");
  var h='<div class="bk-modal-overlay hidden" id="'+id+'" data-panel="'+p.key+'"><div class="modal-box al-form-modal">';
  h+='<div class="modal-header"><h2 class="modal-title" id="'+pid(p,"modal-baslik")+'">'+esc(p.lbl.modalYeni)+'</h2><button class="modal-close" id="'+pid(p,"modal-kapat")+'" data-panel="'+p.key+'">&#10005;</button></div><div class="modal-body al-form-body">';
  h+='<div class="al-form-cift">';
  h+='<div class="field-group"><label class="field-label" for="'+pid(p,"kisi")+'">Kisi</label><input type="text" id="'+pid(p,"kisi")+'" class="field-input" placeholder="Ad Soyad" maxlength="60" autocomplete="name"/></div>';
  h+='<div class="field-group"><label class="field-label" for="'+pid(p,"aciklama")+'">Aciklama</label><input type="text" id="'+pid(p,"aciklama")+'" class="field-input" placeholder="Konu" maxlength="100"/></div>';
  h+='</div>';
  h+='<div class="al-tip-secici" data-panel="'+p.key+'">';
  h+='<button class="al-tip-btn active" data-panel="'+p.key+'" data-tip="pesin" type="button">Pesin</button>';
  h+='<button class="al-tip-btn" data-panel="'+p.key+'" data-tip="taksit" type="button">Taksit</button>';
  h+='<button class="al-tip-btn" data-panel="'+p.key+'" data-tip="altin" type="button">Altin</button></div>';
  h+='<div id="'+pid(p,"nakit-wrap")+'" class="al-form-satir">';
  h+='<input type="hidden" id="'+pid(p,"doviz")+'" value="TRY"/>';
  h+='<button type="button" class="al-doviz-btn" id="'+pid(p,"doviz-btn")+'" data-panel="'+p.key+'" title="Para birimini degistir" aria-label="Para birimini degistir">TL</button>';
  h+='<input type="number" id="'+pid(p,"tutar")+'" class="field-input al-form-tutar" placeholder="0" min="0" step="0.01" inputmode="decimal" aria-label="Tutar"/>';
  h+='<div id="'+pid(p,"pesin-wrap")+'" class="al-form-tarih-wrap"><input type="date" id="'+pid(p,"tarih")+'" class="field-input" value="'+today+'" aria-label="Tarih"/></div>';
  h+='<div id="'+pid(p,"taksit-wrap")+'" class="al-form-taksit-wrap" style="display:none">';
  h+='<input type="number" id="'+pid(p,"taksit-sayi")+'" class="field-input al-form-taksit-sayi" value="1" min="1" max="60" inputmode="numeric" aria-label="Taksit sayisi" title="Taksit sayisi"/>';
  h+='<input type="month" id="'+pid(p,"bas-tarih")+'" class="field-input" value="'+thisMonth+'" aria-label="1. taksit ayi" title="1. taksit ayi"/>';
  h+='</div></div>';
  h+='<div id="'+pid(p,"altin-wrap")+'" class="al-altin-alan" style="display:none">';
  h+='<input type="hidden" id="'+pid(p,"altin-tur")+'" value="gram"/>';
  h+='<div class="al-form-satir">';
  h+='<button type="button" class="al-doviz-btn al-altin-btn" id="'+pid(p,"altin-tur-btn")+'" data-panel="'+p.key+'" title="Altin birimini degistir (tikla)" aria-label="Altin birimini degistir">Gram</button>';
  h+='<input type="number" id="'+pid(p,"altin-adet")+'" class="field-input al-form-tutar" value="" placeholder="Adet" min="0.01" step="0.01" inputmode="decimal" aria-label="Adet"/>';
  h+='<div class="al-form-tarih-wrap"><input type="date" id="'+pid(p,"altin-tarih")+'" class="field-input" value="'+today+'" aria-label="Tarih"/></div>';
  h+='</div>';
  h+='<div id="'+pid(p,"altin-info")+'" class="al-altin-info"></div>';
  h+='</div>';
  h+='</div><div class="modal-footer"><button class="btn-secondary" id="'+pid(p,"iptal")+'" data-panel="'+p.key+'">Iptal</button><button class="btn-primary" id="'+pid(p,"kaydet")+'" data-panel="'+p.key+'">Kaydet</button></div></div></div>';
  return h;
}
function sayiOku(v){
  if(v==null||v==="")return NaN;
  var s=String(v).trim().replace(/\s/g,"").replace(",",".");
  return parseFloat(s);
}
function dovizBtnGuncelle(p){
  var hid=$(pid(p,"doviz")),btn=$(pid(p,"doviz-btn"));
  if(!hid||!btn)return;
  btn.textContent=dovizSembol(hid.value);
}
function dovizDegistir(p){
  var hid=$(pid(p,"doviz"));if(!hid)return;
  var cur=normalizeDoviz(hid.value),idx=0,i;
  for(i=0;i<DOVIZLER.length;i++)if(DOVIZLER[i].k===cur){idx=i;break;}
  hid.value=DOVIZLER[(idx+1)%DOVIZLER.length].k;
  dovizBtnGuncelle(p);
}
function altinTurAl(p){
  var hid=$(pid(p,"altin-tur"));
  var tur=hid?(hid.value||"gram"):"gram";
  return ALTIN_LABEL[tur]?tur:"gram";
}
function altinTurBtnGuncelle(p){
  var tur=altinTurAl(p),hid=$(pid(p,"altin-tur")),btn=$(pid(p,"altin-tur-btn"));
  if(hid)hid.value=tur;
  if(btn){
    btn.textContent=ALTIN_LABEL[tur];
    btn.title=ALTIN_LABEL[tur]+" ("+(ALTIN_GRAM[tur]||1)+" gr) — tikla, birim degistir";
  }
  altinInfoGuncelle(p);
}
function altinTurDegistir(p){
  var cur=altinTurAl(p),idx=ALTIN_SIRASI.indexOf(cur);
  if(idx<0)idx=0;
  var hid=$(pid(p,"altin-tur"));
  if(hid)hid.value=ALTIN_SIRASI[(idx+1)%ALTIN_SIRASI.length];
  altinTurBtnGuncelle(p);
}
function altinInfoGuncelle(p){
  var info=$(pid(p,"altin-info"));if(!info)return;
  if(p.aktifTip!=="altin"){info.style.display="none";return;}
  info.style.display="";
  var tur=altinTurAl(p),birimGr=ALTIN_GRAM[tur]||1;
  var adet=sayiOku(($(pid(p,"altin-adet"))||{value:""}).value);
  if(!adet||adet<=0){
    info.textContent=ALTIN_LABEL[tur]+" = "+birimGr+" gr / adet  ·  Adet girin";
    return;
  }
  var gr=birimGr*adet;
  var metin=adet+" adet × "+birimGr+" gr = "+gr.toFixed(2)+" gr";
  if(_gramAltinFiyatTL>0)metin+="  ·  ≈ "+para(gr*_gramAltinFiyatTL)+" TL";
  info.textContent=metin;
}
function tipGoster(p,tip){
  p.aktifTip=tip;
  document.querySelectorAll('.al-tip-btn[data-panel="'+p.key+'"]').forEach(function(b){b.classList.toggle("active",b.dataset.tip===tip);});
  var nw=$(pid(p,"nakit-wrap")),aw=$(pid(p,"altin-wrap")),pw=$(pid(p,"pesin-wrap")),tw=$(pid(p,"taksit-wrap"));
  if(tip==="altin"){
    if(nw)nw.style.display="none";
    if(aw)aw.style.display="";
    altinTurBtnGuncelle(p);
  }else{
    if(nw)nw.style.display="";
    if(aw)aw.style.display="none";
    if(pw)pw.style.display=tip==="pesin"?"":"none";
    if(tw)tw.style.display=tip==="taksit"?"":"none";
    dovizBtnGuncelle(p);
  }
  altinInfoGuncelle(p);
}
function kisiModalAc(p,ad){
  var ks=kisilerMap(p)[ad];if(!ks)return;
  p.aktifKisiAd=ad;
  var baslik=$(pid(p,"kisi-modal-baslik")),govde=$(pid(p,"kisi-modal-body")),modal=$(pid(p,"kisi-modal"));
  if(!baslik||!govde||!modal)return;
  baslik.textContent=ad;
  govde.innerHTML='<div class="al-kisi-modal-ozet">'+kisiChipHtml(ks)+'</div>'+kisiListeHtml(p,ks);
  overlayAc(modal);
  baglaKisiModal(p);
}
function kisiModalKapat(p){
  p.aktifKisiAd=null;
  overlayKapat($(pid(p,"kisi-modal")));
}
function baglaKartAksiyonlari(p,root){
  if(!root)return;
  root.querySelectorAll(".al-duz-btn").forEach(function(btn){
    btn.onclick=function(e){e.stopPropagation();modalAc(p,btn.dataset.id,null);};
  });
  root.querySelectorAll(".al-sil-btn").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();if(!confirm("Silmek istiyor musunuz?"))return;
      p.kayitlar=p.kayitlar.filter(function(x){return x.id!==btn.dataset.id;});
      fbKaydet(p);guvenliRender();
    };
  });
  root.querySelectorAll(".al-odeme-btn").forEach(function(btn){
    btn.onclick=function(e){
      e.stopPropagation();
      var kid=btn.dataset.id,no=parseInt(btn.dataset.no,10),k=p.kayitlar.find(function(x){return x.id===kid;});if(!k)return;
      if(k.tip==="altin"||k.tip==="pesin")k.odendi=!k.odendi;
      else{if(!k.odemeler)k.odemeler={};k.odemeler[no]=!k.odemeler[no];}
      fbKaydet(p);guvenliRender();
    };
  });
}
function baglaKisiModal(p){
  baglaKartAksiyonlari(p,$(pid(p,"kisi-modal-body")));
  var kapat=$(pid(p,"kisi-modal-kapat")),modal=$(pid(p,"kisi-modal")),ekle=$(pid(p,"kisi-modal-ekle"));
  if(kapat)kapat.onclick=function(e){e.preventDefault();e.stopPropagation();kisiModalKapat(p);};
  if(modal){
    modal.onclick=function(e){
      if(e.target!==modal)return;
      if(Date.now()<_modalKoruma)return;
      kisiModalKapat(p);
    };
    var box=modal.querySelector(".al-kisi-modal-box");
    if(box)box.onclick=function(e){e.stopPropagation();};
  }
  if(ekle)ekle.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    var ad=p.aktifKisiAd;
    /* kisi modalini gizle ama aktifKisiAd korunsun (iptalde geri acilsin) */
    overlayKapat($(pid(p,"kisi-modal")));
    modalAc(p,null,ad);
  };
}
function baglaPanel(p){
  var yeni=$(pid(p,"yeni-btn"));
  if(yeni)yeni.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    p.aktifKisiAd=null;
    modalAc(p,null,null);
  };
  var ara=$(pid(p,"ara"));
  if(ara)ara.oninput=function(){p.araMetni=ara.value||"";guvenliRender();};
  document.querySelectorAll('.al-kisi-satir[data-panel="'+p.key+'"]').forEach(function(row){
    row.onclick=function(e){
      e.preventDefault();e.stopPropagation();
      kisiModalAc(p,decodeURIComponent(row.dataset.kisi||""));
    };
    row.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();row.click();}};
  });
  var modal=$(pid(p,"modal"));
  var mk=$(pid(p,"modal-kapat")),ipt=$(pid(p,"iptal")),ky=$(pid(p,"kaydet"));
  if(mk)mk.onclick=function(e){e.preventDefault();e.stopPropagation();modalKapat(p);};
  if(ipt)ipt.onclick=function(e){e.preventDefault();e.stopPropagation();modalKapat(p);};
  if(modal){
    modal.onclick=function(e){
      if(e.target!==modal)return;
      if(Date.now()<_modalKoruma)return;
      modalKapat(p);
    };
    var formBox=modal.querySelector(".al-form-modal");
    if(formBox)formBox.onclick=function(e){e.stopPropagation();};
  }
  if(ky)ky.onclick=function(e){e.preventDefault();e.stopPropagation();kaydet(p);};
  document.querySelectorAll('.al-tip-btn[data-panel="'+p.key+'"]').forEach(function(btn){
    btn.onclick=function(e){e.preventDefault();e.stopPropagation();tipGoster(p,btn.dataset.tip);};
  });
  var aa=$(pid(p,"altin-adet")),db=$(pid(p,"doviz-btn")),ab=$(pid(p,"altin-tur-btn"));
  if(aa)aa.oninput=function(){altinInfoGuncelle(p);};
  if(db)db.onclick=function(e){e.preventDefault();e.stopPropagation();dovizDegistir(p);};
  if(ab)ab.onclick=function(e){e.preventDefault();e.stopPropagation();altinTurDegistir(p);};
  var kmk=$(pid(p,"kisi-modal-kapat"));if(kmk)kmk.onclick=function(e){e.preventDefault();e.stopPropagation();kisiModalKapat(p);};
  var kolon=document.querySelector(".al-kolon--"+p.key);
  if(kolon)baglaKartAksiyonlari(p,kolon);
}
function modalAc(p,id,kisiAdi){
  p.aktif=id;
  /* kisi modalini gizle; aktifKisiAd'i silme (iptalde geri donus icin) */
  overlayKapat($(pid(p,"kisi-modal")));
  $(pid(p,"modal-baslik")).textContent=id?p.lbl.modalDuzenle:p.lbl.modalYeni;
  var today=todayStr(),thisMonth=today.substring(0,7);
  $(pid(p,"kisi")).value=kisiAdi||"";$(pid(p,"aciklama")).value="";$(pid(p,"tutar")).value="";
  $(pid(p,"tarih")).value=today;$(pid(p,"taksit-sayi")).value="1";$(pid(p,"bas-tarih")).value=thisMonth;
  $(pid(p,"altin-adet")).value="";$(pid(p,"altin-tur")).value="gram";
  if($(pid(p,"doviz")))$(pid(p,"doviz")).value="TRY";
  if(id){
    var k=p.kayitlar.find(function(x){return x.id===id;});
    if(k){
      $(pid(p,"kisi")).value=k.kisi||"";$(pid(p,"aciklama")).value=k.aciklama||"";
      if(k.tip==="altin"){
        $(pid(p,"altin-tur")).value=k.altinTur||"gram";
        $(pid(p,"altin-adet")).value=k.altinAdet!=null&&k.altinAdet!==""?k.altinAdet:"";
        var at2=$(pid(p,"altin-tarih"));if(at2)at2.value=k.tarih||today;
        tipGoster(p,"altin");
      }else{
        $(pid(p,"tutar")).value=k.tutar||"";
        if($(pid(p,"doviz")))$(pid(p,"doviz")).value=normalizeDoviz(k.doviz);
        if(k.tip==="pesin"){$(pid(p,"tarih")).value=k.tarih||today;tipGoster(p,"pesin");}
        else{$(pid(p,"taksit-sayi")).value=k.taksitSayisi;$(pid(p,"bas-tarih")).value=k.basTarih;tipGoster(p,"taksit");}
      }
      overlayAc($(pid(p,"modal")));
      altinInfoGuncelle(p);dovizBtnGuncelle(p);
      return;
    }
  }
  tipGoster(p,"pesin");
  overlayAc($(pid(p,"modal")));
  altinInfoGuncelle(p);dovizBtnGuncelle(p);
  setTimeout(function(){
    var kisi=$(pid(p,"kisi"));
    if(kisi&&!kisi.value)kisi.focus();
  },350);
}
function modalKapat(p){
  overlayKapat($(pid(p,"modal")));
  p.aktif=null;
  _modalKoruma=0;
  if(p.aktifKisiAd&&kisilerMap(p)[p.aktifKisiAd])kisiModalAc(p,p.aktifKisiAd);
}
async function kaydet(p){
  var kisi=($(pid(p,"kisi")).value||"").trim();if(!kisi){$(pid(p,"kisi")).focus();return;}
  var aciklama=($(pid(p,"aciklama")).value||"").trim(),kayit,doviz=normalizeDoviz(($(pid(p,"doviz"))||{value:"TRY"}).value);
  if(p.aktifTip==="altin"){
    var tur=altinTurAl(p),adet=sayiOku(($(pid(p,"altin-adet"))||{value:""}).value);
    var at3=$(pid(p,"altin-tarih")),tarih3=at3?at3.value:todayStr();
    if(!ALTIN_LABEL[tur]){alert("Altin birimi secin.");return;}
    if(!adet||adet<=0){$(pid(p,"altin-adet")).focus();return;}
    if(!tarih3){alert("Tarih giriniz.");return;}
    kayit={tip:"altin",kisi:kisi,aciklama:aciklama,altinTur:tur,altinAdet:adet,tarih:tarih3,odendi:false};
  }else if(p.aktifTip==="pesin"){
    var tutar=sayiOku(($(pid(p,"tutar"))||{value:""}).value)||0;if(!tutar||tutar<=0){$(pid(p,"tutar")).focus();return;}
    var tarih=$(pid(p,"tarih")).value;if(!tarih){alert("Tarih giriniz.");return;}
    kayit={tip:"pesin",kisi:kisi,tutar:tutar,doviz:doviz,aciklama:aciklama,tarih:tarih,odendi:false};
  }else{
    var tutar2=sayiOku(($(pid(p,"tutar"))||{value:""}).value)||0;if(!tutar2||tutar2<=0){$(pid(p,"tutar")).focus();return;}
    var ts=parseInt($(pid(p,"taksit-sayi")).value,10)||1,bt=$(pid(p,"bas-tarih")).value;
    if(!bt){alert("Baslangic ayi giriniz.");return;}
    kayit={tip:"taksit",kisi:kisi,tutar:tutar2,doviz:doviz,aciklama:aciklama,taksitSayisi:ts,basTarih:bt,odemeler:{}};
  }
  if(p.aktif){var idx=p.kayitlar.findIndex(function(x){return x.id===p.aktif;});if(idx>=0){kayit.id=p.aktif;if(p.kayitlar[idx].odemeler)kayit.odemeler=p.kayitlar[idx].odemeler;p.kayitlar[idx]=kayit;}}
  else{kayit.id=uid();p.kayitlar.push(kayit);}
  p.aktifKisiAd=kisi;
  await fbKaydet(p);modalKapat(p);render();
}
function panelGoster(key){
  _aktifPanel=key==="borc"?"borc":"alacak";
  var wrap=document.querySelector(".al-ab-wrap");
  if(wrap)wrap.setAttribute("data-panel",_aktifPanel);
  document.querySelectorAll(".al-panel-btn").forEach(function(btn){
    var aktif=btn.dataset.panel===_aktifPanel;
    btn.classList.toggle("active",aktif);
    btn.setAttribute("aria-selected",aktif?"true":"false");
  });
}
function baglaPanelGecis(){
  document.querySelectorAll(".al-panel-btn").forEach(function(btn){
    btn.onclick=function(){panelGoster(btn.dataset.panel||"alacak");};
  });
}
function render(){
  var c=$("alacaklar-container");if(!c)return;
  var h='<div class="al-ab-wrap" data-panel="'+esc(_aktifPanel)+'">';
  h+='<div class="al-panel-gecis" role="tablist" aria-label="Alacak borc gecisi">';
  h+='<button type="button" class="al-panel-btn al-panel-btn--alacak'+(_aktifPanel==="alacak"?" active":"")+'" data-panel="alacak" role="tab" aria-selected="'+(_aktifPanel==="alacak"?"true":"false")+'"><span class="al-panel-yon" aria-hidden="true">‹</span><span>Alacaklar</span></button>';
  h+='<button type="button" class="al-panel-btn al-panel-btn--borc'+(_aktifPanel==="borc"?" active":"")+'" data-panel="borc" role="tab" aria-selected="'+(_aktifPanel==="borc"?"true":"false")+'"><span>Borclarim</span><span class="al-panel-yon" aria-hidden="true">›</span></button>';
  h+='</div>';
  h+='<div class="al-ab-split">';
  h+=renderKolon(P_ALACAK)+renderKolon(P_BORC);
  h+='</div>'+modalHtml(P_ALACAK)+kisiModalShell(P_ALACAK)+modalHtml(P_BORC)+kisiModalShell(P_BORC)+'</div>';
  c.innerHTML=h;
  baglaPanelGecis();
  baglaPanel(P_ALACAK);baglaPanel(P_BORC);
  panelGoster(_aktifPanel);
  if(P_ALACAK.aktifKisiAd&&kisilerMap(P_ALACAK)[P_ALACAK.aktifKisiAd])kisiModalAc(P_ALACAK,P_ALACAK.aktifKisiAd);
  else if(P_ALACAK.aktifKisiAd)kisiModalKapat(P_ALACAK);
  if(P_BORC.aktifKisiAd&&kisilerMap(P_BORC)[P_BORC.aktifKisiAd])kisiModalAc(P_BORC,P_BORC.aktifKisiAd);
  else if(P_BORC.aktifKisiAd)kisiModalKapat(P_BORC);
}
function guvenliRender(){
  /* Form modal acikken tam render formu kapatmasin */
  if(formModalHerhangiAcikMi())return;
  render();
}
async function init(){
  await altinGuncelFiyatYukle();
  await Promise.all([fbYukle(P_ALACAK),fbYukle(P_BORC)]);
  P_ALACAK.kayitlar=P_ALACAK.kayitlar.map(normalizeKayit);
  P_BORC.kayitlar=P_BORC.kayitlar.map(normalizeKayit);
  guvenliRender();
}
return{init:init};
})();
