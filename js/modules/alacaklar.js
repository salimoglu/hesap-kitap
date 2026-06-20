/* alacaklar.js */
var AlacaklarModule=(function(){
var $=function(id){return document.getElementById(id);};
var _kayitlar=[],_aktif=null,_aktifTip="pesin",_araMetni="",_aktifKisiAd=null,_gramAltinFiyatTL=0;
var AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
var ALTIN_GRAM={gram:1,ceyrek:1.75,yarim:3.5,tam:7,ata:7.2};
var ALTIN_LABEL={gram:"Gram",ceyrek:"Çeyrek",yarim:"Yarım",tam:"Tam",ata:"Ata"};
var DOVIZLER=[
  {k:"TRY",label:"TL",sembol:"TL"},
  {k:"USD",label:"USD",sembol:"$"},
  {k:"EUR",label:"EUR",sembol:"€"},
  {k:"GBP",label:"GBP",sembol:"£"}
];
function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "a"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}
function ayFmt(t){if(!t)return"";var p=t.split("-");return AYLAR[parseInt(p[1],10)-1]+" "+p[0];}
function ayEkle(bas,n){var d=new Date(bas+"-01");d.setMonth(d.getMonth()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function todayStr(){return new Date().toISOString().split("T")[0];}
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
  if(tip==="pesin"){
    kk.tutar=parseFloat(kk.tutar)||0;
    if(!kk.tarih)kk.tarih=todayStr();
  }
  if(tip==="altin"){
    kk.altinTur=kk.altinTur||"gram";
    kk.altinAdet=parseFloat(kk.altinAdet)||1;
    if(!kk.tarih)kk.tarih=todayStr();
  }
  return kk;
}
async function fbYukle(){if(!window._fbDb){return;}try{var v=await fbRtdbOku("alacaklar");_kayitlar=v?Object.values(v):[];}catch(e){_kayitlar=[];console.error("[Alacaklar] yukle",(e&&e.code)||e.message||e);}}
async function fbKaydet(){if(!window._fbDb)return;try{var obj={};_kayitlar.forEach(function(x){obj[x.id]=x;});await fbRtdbRef("alacaklar").set(obj);}catch(e){console.error("[Alacaklar] kaydet",e);}}
async function altinGuncelFiyatYukle(){
  _gramAltinFiyatTL=0;
  if(typeof window._fbDb!=="undefined"&&window._fbDb){
    try{
      var v=parseFloat(await fbRtdbOku("altin_guncel_fiyat"));
      if(v&&v>0)_gramAltinFiyatTL=v;
    }catch(e){}
  }
  if(_gramAltinFiyatTL<=0){
    var URLs=[
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json",
      "https://latest.currency-api.pages.dev/v1/currencies/xau.json"
    ];
    var j,r2,d2,x2,oz;
    for(j=0;j<URLs.length;j++){
      try{
        r2=await fetch(URLs[j],{cache:"no-store"});
        if(!r2.ok)continue;
        d2=await r2.json();
        x2=d2&&d2.xau;
        oz=x2&&parseFloat(x2.try);
        if(isFinite(oz)&&oz>100){_gramAltinFiyatTL=oz/31.1034768;break;}
      }catch(e){}
    }
  }
}
function taksitPlan(k){
  if(k.tip==="pesin")return [{ay:k.tarih?k.tarih.substring(0,7):"",tutar:parseFloat(k.tutar)||0,no:1,odendi:k.odendi||false}];
  if(k.tip==="altin")return [{ay:k.tarih?k.tarih.substring(0,7):"",tutar:0,no:1,odendi:k.odendi||false}];
  var ts=Math.max(1,parseInt(k.taksitSayisi,10)||1),toplam=parseFloat(k.tutar)||0,plan=[];
  for(var i=0;i<ts;i++)plan.push({ay:ayEkle(k.basTarih,i),tutar:toplam/ts,no:i+1,odendi:(k.odemeler&&k.odemeler[i])||false});
  return plan;
}
function kalanAlacak(k){
  if(k.tip==="altin")return k.odendi?0:1;
  return taksitPlan(k).filter(function(t){return !t.odendi;}).reduce(function(s,t){return s+t.tutar;},0);
}
function nakitToplamMap(liste){
  var m={};
  (liste||[]).filter(function(k){return k.tip!=="altin"&&kalanAlacak(k)>0;}).forEach(function(k){
    var d=normalizeDoviz(k.doviz);
    m[d]=(m[d]||0)+kalanAlacak(k);
  });
  return m;
}
function toplamAltinGram(){return _kayitlar.filter(function(k){return k.tip==="altin"&&!k.odendi;}).reduce(function(s,k){return s+altinGram(k);},0);}
function kisilerMap(){var m={};_kayitlar.forEach(function(k){var ad=(k.kisi||"?").trim();if(!m[ad])m[ad]=[];m[ad].push(k);});return m;}
function kisiInitial(ad){var s=(ad||"?").trim();return s?s.charAt(0).toLocaleUpperCase("tr-TR"):"?";}
function taksitIlerleme(k){
  if(k.tip!=="taksit")return null;
  var plan=taksitPlan(k),top=plan.length;
  if(!top)return null;
  var od=plan.filter(function(t){return t.odendi;}).length;
  return {od:od,top:top,pct:Math.round(od/top*100)};
}
function ozetHtml(){
  var nakit=nakitToplamMap(_kayitlar),tg=toplamAltinGram(),h='<div class="al-ozet-tek">';
  h+='<span class="al-oz-label">Alacak ozeti</span><div class="al-ozet-satirlar">';
  var any=false,i,d,v;
  for(i=0;i<DOVIZLER.length;i++){
    d=DOVIZLER[i].k;v=nakit[d]||0;
    if(v>0){any=true;h+='<div class="al-oz-satir"><span class="al-oz-satir-etik">Nakit · '+DOVIZLER[i].label+'</span><span class="al-oz-satir-val al-oz-val-tl">'+tutarFmt(v,d)+'</span></div>';}
  }
  if(tg>0){
    any=true;
    h+='<div class="al-oz-satir al-oz-satir-au"><span class="al-oz-satir-etik">Altin</span><span class="al-oz-satir-val al-oz-val-au">'+tg.toFixed(2)+' gr';
    if(_gramAltinFiyatTL>0)h+=' <small>≈ '+para(tg*_gramAltinFiyatTL)+' TL</small>';
    h+='</span></div>';
  }
  if(!any)h+='<div class="al-oz-bos">Acik alacak yok</div>';
  h+='</div></div>';return h;
}
function kisiChipHtml(ks){
  var nakit=nakitToplamMap(ks),tg=ks.filter(function(k){return k.tip==="altin"&&!k.odendi;}).reduce(function(s,k){return s+altinGram(k);},0);
  var h='<div class="al-kisi-chip-wrap">',any=false,i,d,v;
  for(i=0;i<DOVIZLER.length;i++){
    d=DOVIZLER[i].k;v=nakit[d]||0;
    if(v>0){any=true;h+='<span class="al-kisi-chip al-chip-tl">'+tutarFmt(v,d)+'</span>';}
  }
  if(tg>0){any=true;h+='<span class="al-kisi-chip al-chip-au">'+tg.toFixed(2)+' gr</span>';}
  if(!any)h+='<span class="al-kisi-chip al-chip-ok">Tamamlandi</span>';
  h+='</div>';return h;
}
function render(){
  var c=$("alacaklar-container");if(!c)return;
  var h='<div class="al-wrap">';
  h+='<div class="al-header">'+ozetHtml();
  h+='<button class="al-yeni-btn" id="al-yeni-btn" type="button"><span class="al-yeni-ikon">+</span> Yeni alacak</button></div>';
  h+='<div class="al-kontrol-bar"><div class="al-ara-wrap"><input id="al-ara" class="al-ara-input" type="search" placeholder="Kisi veya aciklama ara..." value="'+esc(_araMetni||"")+'" autocomplete="off"/></div></div>';
  if(!_kayitlar.length){h+='<div class="al-bos"><div class="al-bos-ikon">&#128184;</div><div class="al-bos-baslik">Henuz alacak yok</div><div class="al-bos-alt">Yeni alacak ekleyerek baslayin.</div></div>';}
  else{
    var km=kisilerMap(),ara=(_araMetni||"").toLocaleLowerCase("tr-TR"),gorunenKisi=0;
    h+='<div class="al-kisi-liste">';
    Object.keys(km).sort(function(a,b){return a.localeCompare(b,"tr-TR");}).forEach(function(ad){
      var ks=km[ad];
      var uygun=!ara||ad.toLocaleLowerCase("tr-TR").indexOf(ara)>-1||ks.some(function(k){return ((k.aciklama||"")+" "+(k.tip||"")).toLocaleLowerCase("tr-TR").indexOf(ara)>-1;});
      if(!uygun)return;
      gorunenKisi++;
      var aktifAdet=ks.filter(function(k){return kalanAlacak(k)>0;}).length;
      var kapaliAdet=ks.length-aktifAdet;
      h+='<div class="al-kisi-satir" data-kisi="'+encodeURIComponent(ad)+'" role="button" tabindex="0" aria-label="'+esc(ad)+' alacaklari">';
      h+='<span class="al-kisi-avatar" aria-hidden="true">'+esc(kisiInitial(ad))+'</span>';
      h+='<div class="al-kisi-info"><div class="al-kisi-ad">'+esc(ad)+'</div>';
      h+='<div class="al-kisi-meta">'+aktifAdet+' acik'+(kapaliAdet?(' · '+kapaliAdet+' kapali'):"")+' · '+ks.length+' kayit</div></div>';
      h+=kisiChipHtml(ks);
      h+='<span class="al-kisi-ok" aria-hidden="true">›</span></div>';
    });
    h+='</div>';
    if(!gorunenKisi)h+='<div class="al-bos"><div class="al-bos-baslik">Sonuc bulunamadi</div><div class="al-bos-alt">Arama metnini degistirmeyi deneyin.</div></div>';
  }
  h+='</div>'+modalHtml()+kisiModalShell();
  c.innerHTML=h;bagla();
  if(_aktifKisiAd&&kisilerMap()[_aktifKisiAd])kisiModalAc(_aktifKisiAd);
  else if(_aktifKisiAd)kisiModalKapat();
}
function aksiyonBtn(cls,id,ikon,baslik){
  return '<button class="al-aksiyon-btn '+cls+'" data-id="'+id+'" type="button" title="'+baslik+'" aria-label="'+baslik+'">'+ikon+'</button>';
}
function odemeBtnHtml(k,no,odendi){
  var baslik=odendi?"Odenmis (geri al)":"Odendi isaretle";
  var ikon=odendi
    ? '<svg class="al-odeme-ikon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg class="al-odeme-ikon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  return '<button class="al-aksiyon-btn al-odeme-btn'+(odendi?" al-odendi-aktif":"")+'" data-id="'+k.id+'" data-no="'+no+'" type="button" title="'+baslik+'" aria-label="'+baslik+'">'+ikon+'</button>';
}
function kartHtml(k){
  var tamOdendi=(k.tip==="altin")?k.odendi:(kalanAlacak(k)<=0);
  var aciklama=esc(k.aciklama||""),dv=normalizeDoviz(k.doviz);
  var tipCls=k.tip==="altin"?"al-kart--altin":(k.tip==="taksit"?"al-kart--taksit":"al-kart--pesin");
  var h='<div class="al-kart '+tipCls+(tamOdendi?" al-kart-kapali":"")+'">';
  var aksiyonlar='<div class="al-kart-actions">'+aksiyonBtn("al-duz-btn duzenle",k.id,"&#9998;","Duzenle")+aksiyonBtn("al-sil-btn sil",k.id,"&#10005;","Sil")+'</div>';

  if(k.tip==="pesin"){
    var kalan=kalanAlacak(k);
    h+='<div class="al-kart-satir">';
    h+='<div class="al-kart-bilgi"><span class="al-kart-tip al-tip-p">Pesin</span>';
    h+='<span class="al-kart-baslik-metin">'+(aciklama||"Pesin alacak")+'</span>';
    h+='<span class="al-kart-ek">'+tarihFmt(k.tarih)+' · '+tutarFmt(k.tutar,dv)+'</span></div>';
    h+='<span class="al-kart-tutar'+(tamOdendi?" al-kart-tutar-bitti":"")+'">'+(tamOdendi?"Odendi":tutarFmt(kalan,dv))+'</span>';
    h+='<div class="al-kart-actions">'+odemeBtnHtml(k,-1,!!k.odendi)+aksiyonBtn("al-duz-btn duzenle",k.id,"&#9998;","Duzenle")+aksiyonBtn("al-sil-btn sil",k.id,"&#10005;","Sil")+'</div></div>';
  }else if(k.tip==="altin"){
    h+='<div class="al-kart-satir">';
    h+='<div class="al-kart-bilgi"><span class="al-kart-tip al-tip-au">Altin</span>';
    h+='<span class="al-kart-baslik-metin">'+ALTIN_LABEL[k.altinTur||"gram"]+' × '+(parseFloat(k.altinAdet)||1)+'</span>';
    if(aciklama)h+='<span class="al-kart-ek">'+aciklama+' · '+tarihFmt(k.tarih)+'</span>';
    else h+='<span class="al-kart-ek">'+tarihFmt(k.tarih)+'</span>';
    h+='</div><span class="al-kart-tutar al-kart-tutar-au'+(tamOdendi?" al-kart-tutar-bitti":"")+'">'+(tamOdendi?"Alindi":altinGram(k).toFixed(2)+" gr")+'</span>';
    h+='<div class="al-kart-actions">'+odemeBtnHtml(k,-1,!!k.odendi)+aksiyonBtn("al-duz-btn duzenle",k.id,"&#9998;","Duzenle")+aksiyonBtn("al-sil-btn sil",k.id,"&#10005;","Sil")+'</div></div>';
  }else{
    var kalan=kalanAlacak(k),prog=taksitIlerleme(k);
    h+='<div class="al-kart-satir al-kart-satir-ust">';
    h+='<div class="al-kart-bilgi"><span class="al-kart-tip al-tip-t">Taksitli</span>';
    h+='<span class="al-kart-baslik-metin">'+(aciklama||"Taksitli alacak")+'</span>';
    h+='<span class="al-kart-ek">'+tutarFmt(k.tutar,dv)+' · '+k.taksitSayisi+' taksit';
    if(prog)h+=' · '+prog.od+'/'+prog.top+' odendi';
    h+='</span></div>';
    h+='<span class="al-kart-tutar'+(tamOdendi?" al-kart-tutar-bitti":"")+'">'+(tamOdendi?"Odendi":tutarFmt(kalan,dv))+'</span>';
    h+=aksiyonlar+'</div>';
    if(prog&&!tamOdendi){
      h+='<div class="al-kart-bar" role="progressbar" aria-valuenow="'+prog.pct+'"><div class="al-kart-bar-inner" style="width:'+prog.pct+'%"></div></div>';
    }
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
function kisiListeHtml(ks){
  var aktif=ks.filter(function(k){return kalanAlacak(k)>0;});
  var kapali=ks.filter(function(k){return kalanAlacak(k)<=0;});
  var h='';
  if(aktif.length){h+='<div class="al-liste-baslik">Acik alacaklar</div>';aktif.forEach(function(k){h+=kartHtml(k);});}
  if(kapali.length){h+='<div class="al-liste-baslik al-liste-baslik-kapali">Kapali / odenen</div>';kapali.forEach(function(k){h+=kartHtml(k);});}
  if(!h)h='<div class="al-bos al-bos-kucuk">Bu kisiye ait kayit yok.</div>';
  return h;
}
function kisiModalShell(){
  return '<div class="bk-modal-overlay hidden" id="al-kisi-modal"><div class="modal-box al-kisi-modal-box">'+
    '<div class="modal-header"><h2 class="modal-title" id="al-kisi-modal-baslik">Kisi</h2><button type="button" class="modal-close" id="al-kisi-modal-kapat">&#10005;</button></div>'+
    '<div class="modal-body al-kisi-modal-body" id="al-kisi-modal-body"></div>'+
    '<div class="modal-footer"><button type="button" class="btn-primary" id="al-kisi-modal-ekle">+ Bu kisiye ekle</button></div>'+
    '</div></div>';
}
function kisiModalAc(ad){
  var ks=kisilerMap()[ad];
  if(!ks)return;
  _aktifKisiAd=ad;
  var baslik=$("al-kisi-modal-baslik"),govde=$("al-kisi-modal-body"),modal=$("al-kisi-modal");
  if(!baslik||!govde||!modal)return;
  baslik.textContent=ad;
  var ozet=kisiChipHtml(ks);
  govde.innerHTML='<div class="al-kisi-modal-ozet">'+ozet+'</div>'+kisiListeHtml(ks);
  modal.classList.remove("hidden");
  baglaKisiModal();
}
function kisiModalKapat(){
  _aktifKisiAd=null;
  var modal=$("al-kisi-modal");
  if(modal)modal.classList.add("hidden");
}
function modalHtml(){
  var today=todayStr(),thisMonth=today.substring(0,7),i;
  var h='<div class="bk-modal-overlay hidden" id="al-modal"><div class="modal-box" style="max-width:460px">';
  h+='<div class="modal-header"><h2 class="modal-title" id="al-modal-baslik">Yeni Alacak</h2><button class="modal-close" id="al-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Kisi Adi</label><input type="text" id="al-kisi" class="field-input" placeholder="Ad Soyad..." maxlength="60"/></div>';
  h+='<div class="field-group"><label class="field-label">Aciklama</label><input type="text" id="al-aciklama" class="field-input" placeholder="Konu..." maxlength="100"/></div>';
  h+='<div class="field-group"><label class="field-label">Odeme Tipi</label><div class="al-tip-secici">';
  h+='<button class="al-tip-btn active" data-tip="pesin" type="button">&#128184; Pesin</button>';
  h+='<button class="al-tip-btn" data-tip="taksit" type="button">&#128200; Taksitli</button>';
  h+='<button class="al-tip-btn" data-tip="altin" type="button">&#129351; Altin</button>';
  h+='</div></div>';
  h+='<div id="al-nakit-wrap">';
  h+='<div class="field-group"><label class="field-label">Para birimi</label><select id="al-doviz" class="field-input field-select">';
  for(i=0;i<DOVIZLER.length;i++)h+='<option value="'+DOVIZLER[i].k+'">'+DOVIZLER[i].label+' ('+DOVIZLER[i].sembol+')</option>';
  h+='</select></div>';
  h+='<div class="field-group"><label class="field-label" id="al-tutar-label">Toplam Tutar</label><input type="number" id="al-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div id="al-pesin-wrap" class="field-group"><label class="field-label">Odeme Tarihi</label><input type="date" id="al-tarih" class="field-input" value="'+today+'"/></div>';
  h+='<div id="al-taksit-wrap" style="display:none"><div class="field-group"><label class="field-label">Taksit Sayisi</label><input type="number" id="al-taksit-sayi" class="field-input" value="1" min="1" max="60"/></div>';
  h+='<div class="field-group"><label class="field-label">1. Taksit Ayi</label><input type="month" id="al-bas-tarih" class="field-input" value="'+thisMonth+'"/></div></div></div>';
  h+='<div id="al-altin-wrap" style="display:none">';
  h+='<div class="field-group"><label class="field-label">Altin Birimi</label>';
  h+='<select id="al-altin-tur" class="field-input field-select"><option value="">Birim secin</option><option value="gram">Gram</option><option value="ceyrek">Ceyrek</option><option value="yarim">Yarim</option><option value="tam">Tam</option><option value="ata">Ata</option></select></div>';
  h+='<div class="field-group"><label class="field-label">Adet</label><input type="number" id="al-altin-adet" class="field-input" value="1" min="0.01" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="field-group"><label class="field-label">Tarih</label><input type="date" id="al-altin-tarih" class="field-input" value="'+today+'"/></div>';
  h+='<div id="al-altin-info" class="al-altin-info"></div></div>';
  h+='</div><div class="modal-footer"><button class="btn-secondary" id="al-iptal">Iptal</button><button class="btn-primary" id="al-kaydet">Kaydet</button></div>';
  h+='</div></div>';return h;
}
function dovizLabelGuncelle(){
  var sel=$("al-doviz"),lbl=$("al-tutar-label");
  if(!sel||!lbl)return;
  lbl.textContent="Toplam Tutar ("+dovizSembol(sel.value)+")";
}
function altinInfoGuncelle(){
  var tur=($("al-altin-tur")||{value:""}).value;
  var adet=parseFloat(($("al-altin-adet")||{value:"1"}).value)||1;
  var info=$("al-altin-info");
  if(!info)return;
  if(!tur){info.textContent="Lutfen altin birimi secin.";return;}
  info.textContent=adet+" adet "+ALTIN_LABEL[tur]+" = "+((ALTIN_GRAM[tur]||1)*adet).toFixed(2)+" gram";
}
function tipGoster(tip){
  _aktifTip=tip;
  document.querySelectorAll(".al-tip-btn").forEach(function(b){b.classList.toggle("active",b.dataset.tip===tip);});
  var nw=$("al-nakit-wrap"),aw=$("al-altin-wrap"),pw=$("al-pesin-wrap"),tw=$("al-taksit-wrap");
  if(tip==="altin"){if(nw)nw.style.display="none";if(aw)aw.style.display="";}
  else{if(nw)nw.style.display="";if(aw)aw.style.display="none";if(pw)pw.style.display=tip==="pesin"?"":"none";if(tw)tw.style.display=tip==="taksit"?"":"none";dovizLabelGuncelle();}
  altinInfoGuncelle();
}
function baglaKartAksiyonlari(kapsam){
  var root=kapsam||document;
  root.querySelectorAll(".al-duz-btn").forEach(function(btn){btn.addEventListener("click",function(e){e.stopPropagation();modalAc(btn.dataset.id,null);});});
  root.querySelectorAll(".al-sil-btn").forEach(function(btn){btn.addEventListener("click",function(e){
    e.stopPropagation();
    if(!confirm("Silmek istiyor musunuz?"))return;
    _kayitlar=_kayitlar.filter(function(x){return x.id!==btn.dataset.id;});
    fbKaydet();render();
  });});
  root.querySelectorAll(".al-odeme-btn").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.stopPropagation();
      var kid=btn.dataset.id,no=parseInt(btn.dataset.no,10),k=_kayitlar.find(function(x){return x.id===kid;});if(!k)return;
      if(k.tip==="altin"||k.tip==="pesin")k.odendi=!k.odendi;
      else{if(!k.odemeler)k.odemeler={};k.odemeler[no]=!k.odemeler[no];}
      fbKaydet();render();
    });
  });
}
function baglaKisiModal(){
  baglaKartAksiyonlari($("al-kisi-modal-body"));
  var kapat=$("al-kisi-modal-kapat"),modal=$("al-kisi-modal"),ekle=$("al-kisi-modal-ekle");
  if(kapat)kapat.onclick=kisiModalKapat;
  if(modal)modal.onclick=function(e){if(e.target===modal)kisiModalKapat();};
  if(ekle)ekle.onclick=function(){var ad=_aktifKisiAd;kisiModalKapat();modalAc(null,ad);};
}
function bagla(){
  $("al-yeni-btn").addEventListener("click",function(){modalAc(null,null);});
  var ara=$("al-ara");if(ara)ara.addEventListener("input",function(){_araMetni=ara.value||"";render();});
  document.querySelectorAll(".al-kisi-satir").forEach(function(row){
    row.addEventListener("click",function(){kisiModalAc(decodeURIComponent(row.dataset.kisi||""));});
    row.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();row.click();}});
  });
  $("al-modal-kapat").addEventListener("click",modalKapat);$("al-iptal").addEventListener("click",modalKapat);
  $("al-modal").addEventListener("click",function(e){if(e.target===$("al-modal"))modalKapat();});
  $("al-kaydet").addEventListener("click",kaydet);
  document.querySelectorAll(".al-tip-btn").forEach(function(btn){btn.addEventListener("click",function(){tipGoster(btn.dataset.tip);});});
  var at=$("al-altin-tur"),aa=$("al-altin-adet"),dv=$("al-doviz");
  if(at)at.addEventListener("change",altinInfoGuncelle);
  if(aa)aa.addEventListener("input",altinInfoGuncelle);
  if(dv)dv.addEventListener("change",dovizLabelGuncelle);
  var kmk=$("al-kisi-modal-kapat");
  if(kmk)kmk.addEventListener("click",kisiModalKapat);
}
function modalAc(id,kisiAdi){
  _aktif=id;
  var km=$("al-kisi-modal");if(km)km.classList.add("hidden");
  $("al-modal-baslik").textContent=id?"Alacagi Duzenle":"Yeni Alacak";
  var today=todayStr(),thisMonth=today.substring(0,7);
  $("al-kisi").value=kisiAdi||"";$("al-aciklama").value="";$("al-tutar").value="";
  $("al-tarih").value=today;$("al-taksit-sayi").value="1";$("al-bas-tarih").value=thisMonth;
  $("al-altin-adet").value="1";$("al-altin-tur").value="";
  if($("al-doviz"))$("al-doviz").value="TRY";
  if(id){
    var k=_kayitlar.find(function(x){return x.id===id;});
    if(k){
      $("al-kisi").value=k.kisi||"";$("al-aciklama").value=k.aciklama||"";
      if(k.tip==="altin"){
        $("al-altin-tur").value=k.altinTur||"";
        $("al-altin-adet").value=k.altinAdet||1;
        var at2=$("al-altin-tarih");if(at2)at2.value=k.tarih||today;
        tipGoster("altin");
      }else{
        $("al-tutar").value=k.tutar||"";
        if($("al-doviz"))$("al-doviz").value=normalizeDoviz(k.doviz);
        if(k.tip==="pesin"){$("al-tarih").value=k.tarih||today;tipGoster("pesin");}
        else{$("al-taksit-sayi").value=k.taksitSayisi;$("al-bas-tarih").value=k.basTarih;tipGoster("taksit");}
      }
      $("al-modal").classList.remove("hidden");
      setTimeout(function(){if(!kisiAdi)$("al-kisi").focus();else $("al-tutar").focus();},100);
      altinInfoGuncelle();dovizLabelGuncelle();
      return;
    }
  }
  tipGoster("pesin");
  $("al-modal").classList.remove("hidden");
  setTimeout(function(){if(!kisiAdi)$("al-kisi").focus();else $("al-tutar").focus();},100);
  altinInfoGuncelle();dovizLabelGuncelle();
}
function modalKapat(){
  $("al-modal").classList.add("hidden");
  _aktif=null;
  if(_aktifKisiAd&&kisilerMap()[_aktifKisiAd])kisiModalAc(_aktifKisiAd);
}
async function kaydet(){
  var kisi=($("al-kisi").value||"").trim();if(!kisi){$("al-kisi").focus();return;}
  var aciklama=($("al-aciklama").value||"").trim(),kayit,doviz=normalizeDoviz(($("al-doviz")||{value:"TRY"}).value);
  if(_aktifTip==="altin"){
    var tur=$("al-altin-tur").value,adet=parseFloat($("al-altin-adet").value)||1;
    var at3=$("al-altin-tarih"),tarih3=at3?at3.value:todayStr();
    if(!tur){alert("Altin birimi secin.");$("al-altin-tur").focus();return;}
    if(!adet||adet<=0){$("al-altin-adet").focus();return;}
    kayit={tip:"altin",kisi:kisi,aciklama:aciklama,altinTur:tur,altinAdet:adet,tarih:tarih3,odendi:false};
  }else if(_aktifTip==="pesin"){
    var tutar=parseFloat($("al-tutar").value)||0;if(!tutar||tutar<=0){$("al-tutar").focus();return;}
    var tarih=$("al-tarih").value;if(!tarih){alert("Tarih giriniz.");return;}
    kayit={tip:"pesin",kisi:kisi,tutar:tutar,doviz:doviz,aciklama:aciklama,tarih:tarih,odendi:false};
  }else{
    var tutar2=parseFloat($("al-tutar").value)||0;if(!tutar2||tutar2<=0){$("al-tutar").focus();return;}
    var ts=parseInt($("al-taksit-sayi").value,10)||1,bt=$("al-bas-tarih").value;
    if(!bt){alert("Baslangic ayi giriniz.");return;}
    kayit={tip:"taksit",kisi:kisi,tutar:tutar2,doviz:doviz,aciklama:aciklama,taksitSayisi:ts,basTarih:bt,odemeler:{}};
  }
  if(_aktif){var idx=_kayitlar.findIndex(function(x){return x.id===_aktif;});if(idx>=0){kayit.id=_aktif;if(_kayitlar[idx].odemeler)kayit.odemeler=_kayitlar[idx].odemeler;_kayitlar[idx]=kayit;}}
  else{kayit.id=uid();_kayitlar.push(kayit);}
  _aktifKisiAd=kisi;
  await fbKaydet();modalKapat();render();
}
async function init(){await fbYukle();_kayitlar=_kayitlar.map(normalizeKayit);await altinGuncelFiyatYukle();render();}
return{init:init};
})();
