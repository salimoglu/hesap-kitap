/* alacaklar.js */
var AlacaklarModule=(function(){
var $=function(id){return document.getElementById(id);};
var _kayitlar=[],_aktif=null,_aktifTip="pesin",_araMetni="",_kisiAcikMap={},_gramAltinFiyatTL=0;
var AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
var ALTIN_GRAM={gram:1,ceyrek:1.75,yarim:3.5,tam:7,ata:7.2};
var ALTIN_LABEL={gram:"Gram",ceyrek:"Çeyrek",yarim:"Yarım",tam:"Tam",ata:"Ata"};
function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "a"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}
function ayFmt(t){if(!t)return"";var p=t.split("-");return AYLAR[parseInt(p[1],10)-1]+" "+p[0];}
function ayEkle(bas,n){var d=new Date(bas+"-01");d.setMonth(d.getMonth()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function todayStr(){return new Date().toISOString().split("T")[0];}
function altinGram(k){return (ALTIN_GRAM[k.altinTur]||1)*(parseFloat(k.altinAdet)||1);}
function normalizeTip(tip){
  var t=(tip||"").toString().trim().toLowerCase();
  if(t==="altin")return "altin";
  if(t==="taksit"||t==="taksitli")return "taksit";
  if(t==="pesin"||t==="peşin"||t==="nakit")return "pesin";
  return "pesin";
}
function normalizeKayit(k){
  var tip=normalizeTip(k.tip),kk=Object.assign({},k,{tip:tip});
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
async function fbYukle(){if(!window._fbDb){return;}try{var s=await fbRtdbRef("alacaklar").once("value");var v=s.val();_kayitlar=v?Object.values(v):[];}catch(e){_kayitlar=[];console.error("[Alacaklar] yukle",(e&&e.code)||e.message||e);}}
async function fbKaydet(){if(!window._fbDb)return;try{var obj={};_kayitlar.forEach(function(x){obj[x.id]=x;});await fbRtdbRef("alacaklar").set(obj);}catch(e){console.error("[Alacaklar] kaydet",e);}}
/* Altın modülüyle aynı kaynak: gram TL (Firebase), yoksa API tahmini (kaydedilmez) */
async function altinGuncelFiyatYukle(){
  _gramAltinFiyatTL=0;
  if(typeof window._fbDb!=="undefined"&&window._fbDb){
    try{
      var s=await fbRtdbRef("altin_guncel_fiyat").once("value");
      var v=parseFloat(s.val());
      if(v&&v>0)_gramAltinFiyatTL=v;
    }catch(e){}
  }
  if(_gramAltinFiyatTL<=0){
    var URLs=[
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json",
      "https://latest.currency-api.pages.dev/v1/currencies/xau.json"
    ];
    var j, r2, d2, x2, oz;
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
function toplamAlacak(){return _kayitlar.filter(function(k){return k.tip!=="altin";}).reduce(function(s,k){return s+kalanAlacak(k);},0);}
function toplamAltinGram(){return _kayitlar.filter(function(k){return k.tip==="altin"&&!k.odendi;}).reduce(function(s,k){return s+altinGram(k);},0);}
function kisilerMap(){var m={};_kayitlar.forEach(function(k){var ad=(k.kisi||"?").trim();if(!m[ad])m[ad]=[];m[ad].push(k);});return m;}
function kisiAcikMi(ad,ks){
  if(typeof _kisiAcikMap[ad]==="boolean")return _kisiAcikMap[ad];
  _kisiAcikMap[ad]=false;
  return _kisiAcikMap[ad];
}
function render(){
  var c=$("alacaklar-container");if(!c)return;
  var h='<div class="al-wrap">';
  h+='<div class="al-header"><div class="al-ozet">';
  h+='<div class="al-ozet-item"><span class="al-oz-label">TOPLAM ALACAK</span><span class="al-oz-val al-oz-val-tl">'+para(toplamAlacak())+' TL</span></div>';
  var tg=toplamAltinGram();
  if(tg>0){
    h+='<div class="al-ozet-item"><span class="al-oz-label">ALTIN ALACAK</span><span class="al-oz-val al-oz-val-au">'+tg.toFixed(2)+' gr';
    if(_gramAltinFiyatTL>0)h+='<span class="al-oz-au-guncel"> ≈ '+para(tg*_gramAltinFiyatTL)+' TL</span>';
    h+='</span></div>';
  }
  h+='</div><button class="al-yeni-btn" id="al-yeni-btn">+ Yeni Alacak</button></div>';
  h+='<div class="al-kontrol-bar">';
  h+='<input id="al-ara" class="field-input" type="text" placeholder="Kişi veya açıklama ara..." value="'+(_araMetni||"").replace(/"/g,"&quot;")+'"/>';
  h+='<button class="btn-secondary" id="al-tum-ac" type="button">Tumunu Ac</button>';
  h+='<button class="btn-secondary" id="al-tum-kapat" type="button">Tumunu Kapat</button>';
  h+='</div>';
  if(!_kayitlar.length){h+='<div class="al-bos"><div style="font-size:40px;margin-bottom:12px">&#128184;</div><div>Henüz alacak kaydı yok</div></div>';}
  else{
    var km=kisilerMap(),ara=(_araMetni||"").toLocaleLowerCase("tr-TR"),gorunenKisi=0;
    Object.keys(km).forEach(function(ad){
      var ks=km[ad];
      var uygun=!ara||ad.toLocaleLowerCase("tr-TR").indexOf(ara)>-1||ks.some(function(k){return ((k.aciklama||"")+" "+(k.tip||"")).toLocaleLowerCase("tr-TR").indexOf(ara)>-1;});
      if(!uygun)return;
      gorunenKisi++;
      var kTL=ks.filter(function(k){return k.tip!=="altin";}).reduce(function(s,k){return s+kalanAlacak(k);},0);
      var kGr=ks.filter(function(k){return k.tip==="altin"&&!k.odendi;}).reduce(function(s,k){return s+altinGram(k);},0);
      var aktifAdet=ks.filter(function(k){return kalanAlacak(k)>0;}).length;
      var kapaliAdet=ks.length-aktifAdet;
      var acik=kisiAcikMi(ad,ks);
      h+='<div class="al-kisi-blok">';
      h+='<div class="al-kisi-header'+(acik?"":" al-kisi-header-kapali")+'" data-kisi="'+encodeURIComponent(ad)+'">';
      h+='<span class="al-kisi-ok">'+(acik?"▾":"▸")+'</span>';
      h+='<div class="al-kisi-ad">'+esc(ad)+'</div>';
      if(kTL>0)h+='<span class="al-kisi-tl">'+para(kTL)+' TL</span>';
      if(kGr>0)h+='<span class="al-kisi-gr">'+kGr.toFixed(2)+' gr</span>';
      h+='<span class="al-kisi-adet">'+aktifAdet+' acik / '+kapaliAdet+' kapali</span>';
      h+='<button class="al-kisi-ekle-btn" data-kisi="'+encodeURIComponent(ad)+'" type="button">+ Ekle</button>';
      h+='</div><div class="al-liste'+(acik?"":" hidden")+'">';
      var aktif=ks.filter(function(k){return kalanAlacak(k)>0;});
      var kapali=ks.filter(function(k){return kalanAlacak(k)<=0;});
      aktif.forEach(function(k){h+=kartHtml(k);});kapali.forEach(function(k){h+=kartHtml(k);});
      h+='</div></div>';
    });
    if(!gorunenKisi)h+='<div class="al-bos"><div>Aramaya uygun kisi/alacak bulunamadi.</div></div>';
  }
  h+='</div>'+modalHtml();c.innerHTML=h;bagla();
}
function kartHtml(k){
  var tamOdendi=(k.tip==="altin")?k.odendi:(kalanAlacak(k)<=0);
  var aciklama=esc(k.aciklama||"");
  var h='<div class="al-kart'+(tamOdendi?" al-kart-kapali":"")+'"><div class="al-kart-header"><div class="al-kart-sol">';
  if(aciklama)h+='<div class="al-kart-aciklama">'+aciklama+'</div>';
  if(k.tip==="altin"){
    h+='<div class="al-kart-meta"><span class="al-kart-tip al-tip-au">&#129351; '+ALTIN_LABEL[k.altinTur||"gram"]+' x'+(parseFloat(k.altinAdet)||1)+'</span><span class="al-kart-meta-ek"> &middot; '+altinGram(k).toFixed(2)+' gr</span></div>';
  }else{
    h+='<div class="al-kart-meta"><span class="al-kart-tip '+(k.tip==="pesin"?"al-tip-p":"al-tip-t")+'">'+(k.tip==="pesin"?"Peşin":k.taksitSayisi+" Taksit")+'</span><span class="al-kart-meta-ek"> &middot; '+para(k.tutar)+' TL toplam</span></div>';
  }
  h+='</div><div class="al-kart-sag">';
  if(k.tip==="altin"){
    if(!tamOdendi)h+='<div class="al-kalan-val al-kalan-altin">'+altinGram(k).toFixed(2)+'<span class="al-kalan-label">gr altin</span></div>';
    else h+='<div class="al-odendi-badge">&#10003; ALINDI</div>';
  }else{
    var kalan=kalanAlacak(k);
    if(!tamOdendi)h+='<div class="al-kalan-val">'+para(kalan)+' TL<span class="al-kalan-label">kalan</span></div>';
    else h+='<div class="al-odendi-badge">&#10003; TAM ODENDI</div>';
  }
  h+='<div class="al-kart-actions"><button class="al-duz-btn row-action-btn duzenle" data-id="'+k.id+'">&#9998;</button><button class="al-sil-btn row-action-btn sil" data-id="'+k.id+'">&#10005;</button></div></div></div>';
  h+='<div class="al-plan">';
  if(k.tip==="altin"){
    h+='<div class="al-plan-satir'+(k.odendi?" al-odendi":"")+'"><span class="al-plan-ay">'+tarihFmt(k.tarih)+'</span><span class="al-plan-tutar al-tutar-altin">'+altinGram(k).toFixed(2)+' gr</span>';
    h+='<button class="al-odeme-btn'+(k.odendi?" al-odendi-aktif":"")+'" data-id="'+k.id+'" data-no="-1">'+(k.odendi?"&#10003; Alindı":"Alindı işaretle")+'</button></div>';
  }else{
    var plan=taksitPlan(k);
    if(!plan.length)plan=[{ay:k.tarih?k.tarih.substring(0,7):"",tutar:parseFloat(k.tutar)||0,no:1,odendi:k.odendi||false}];
    plan.forEach(function(t){
      h+='<div class="al-plan-satir'+(t.odendi?" al-odendi":"")+'"><span class="al-plan-ay">'+(k.tip==="pesin"?tarihFmt(k.tarih):ayFmt(t.ay))+'</span>';
      if(k.tip!=="pesin")h+='<span class="al-plan-no">'+t.no+'/'+k.taksitSayisi+'</span>';
      h+='<span class="al-plan-tutar">'+para(t.tutar)+' TL</span>';
      h+='<button class="al-odeme-btn'+(t.odendi?" al-odendi-aktif":"")+'" data-id="'+k.id+'" data-no="'+(t.no-1)+'">'+(t.odendi?'&#10003; Odendi':'Odendi işaretle')+'</button></div>';
    });
  }
  h+='</div></div>';return h;
}
function modalHtml(){
  var today=todayStr(),thisMonth=today.substring(0,7);
  var h='<div class="bk-modal-overlay hidden" id="al-modal"><div class="modal-box" style="max-width:460px">';
  h+='<div class="modal-header"><h2 class="modal-title" id="al-modal-baslik">Yeni Alacak</h2><button class="modal-close" id="al-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Kisi Adı</label><input type="text" id="al-kisi" class="field-input" placeholder="Ad Soyad..." maxlength="60"/></div>';
  h+='<div class="field-group"><label class="field-label">Açıklama</label><input type="text" id="al-aciklama" class="field-input" placeholder="Konu..." maxlength="100"/></div>';
  h+='<div class="field-group"><label class="field-label">Odeme Tipi</label><div class="al-tip-secici">';
  h+='<button class="al-tip-btn active" data-tip="pesin">&#128184; Peşin</button>';
  h+='<button class="al-tip-btn" data-tip="taksit">&#128200; Taksitli</button>';
  h+='<button class="al-tip-btn" data-tip="altin">&#129351; Altın Alacağı</button>';
  h+='</div></div>';
  h+='<div id="al-nakit-wrap"><div class="field-group"><label class="field-label">Toplam Tutar (TL)</label><input type="number" id="al-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div id="al-pesin-wrap" class="field-group"><label class="field-label">Odeme Tarihi</label><input type="date" id="al-tarih" class="field-input" value="'+today+'"/></div>';
  h+='<div id="al-taksit-wrap" style="display:none"><div class="field-group"><label class="field-label">Taksit Sayısı</label><input type="number" id="al-taksit-sayi" class="field-input" value="1" min="1" max="60"/></div>';
  h+='<div class="field-group"><label class="field-label">1. Taksit Ayı</label><input type="month" id="al-bas-tarih" class="field-input" value="'+thisMonth+'"/></div></div></div>';
  h+='<div id="al-altin-wrap" style="display:none">';
  h+='<div class="field-group"><label class="field-label">Altın Birimi</label>';
  h+='<select id="al-altin-tur" class="field-input"><option value="">Birim secin</option><option value="gram">Gram</option><option value="ceyrek">Çeyrek</option><option value="yarim">Yarım</option><option value="tam">Tam</option><option value="ata">Ata</option></select></div>';
  h+='<div class="field-group"><label class="field-label">Adet</label><input type="number" id="al-altin-adet" class="field-input" value="1" min="0.01" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="field-group"><label class="field-label">Tarih</label><input type="date" id="al-altin-tarih" class="field-input" value="'+today+'"/></div>';
  h+='<div id="al-altin-info" style="padding:8px 12px;background:var(--bg-elevated);border-radius:8px;font-size:13px;color:var(--gold)"></div>';
  h+='</div>';
  h+='</div><div class="modal-footer"><button class="btn-secondary" id="al-iptal">İptal</button><button class="btn-primary" id="al-kaydet">Kaydet</button></div>';
  h+='</div></div>';return h;
}
function altinInfoGuncelle(){
  var tur=($("al-altin-tur")||{value:""}).value;
  var adet=parseFloat(($("al-altin-adet")||{value:"1"}).value)||1;
  var info=$("al-altin-info");
  if(!info)return;
  if(!tur){info.textContent="Lutfen altın birimi secin.";return;}
  info.textContent=adet+" adet "+ALTIN_LABEL[tur]+" = "+((ALTIN_GRAM[tur]||1)*adet).toFixed(2)+" gram";
}
function tipGoster(tip){
  _aktifTip=tip;
  document.querySelectorAll(".al-tip-btn").forEach(function(b){b.classList.toggle("active",b.dataset.tip===tip);});
  var nw=$("al-nakit-wrap"),aw=$("al-altin-wrap"),pw=$("al-pesin-wrap"),tw=$("al-taksit-wrap");
  if(tip==="altin"){if(nw)nw.style.display="none";if(aw)aw.style.display="";}
  else{if(nw)nw.style.display="";if(aw)aw.style.display="none";if(pw)pw.style.display=tip==="pesin"?"":"none";if(tw)tw.style.display=tip==="taksit"?"":"none";}
  altinInfoGuncelle();
}
function bagla(){
  $("al-yeni-btn").addEventListener("click",function(){modalAc(null,null);});
  var ara=$("al-ara");if(ara)ara.addEventListener("input",function(){_araMetni=ara.value||"";render();});
  var acBtn=$("al-tum-ac"),kapatBtn=$("al-tum-kapat");
  if(acBtn)acBtn.addEventListener("click",function(){Object.keys(kisilerMap()).forEach(function(ad){_kisiAcikMap[ad]=true;});render();});
  if(kapatBtn)kapatBtn.addEventListener("click",function(){Object.keys(kisilerMap()).forEach(function(ad){_kisiAcikMap[ad]=false;});render();});
  document.querySelectorAll(".al-kisi-header").forEach(function(hd){hd.addEventListener("click",function(){var ad=decodeURIComponent(hd.dataset.kisi||"");_kisiAcikMap[ad]=!_kisiAcikMap[ad];render();});});
  $("al-modal-kapat").addEventListener("click",modalKapat);$("al-iptal").addEventListener("click",modalKapat);
  $("al-modal").addEventListener("click",function(e){if(e.target===$("al-modal"))modalKapat();});
  $("al-kaydet").addEventListener("click",kaydet);
  document.querySelectorAll(".al-tip-btn").forEach(function(btn){btn.addEventListener("click",function(){tipGoster(btn.dataset.tip);});});
  var at=$("al-altin-tur"),aa=$("al-altin-adet");
  if(at)at.addEventListener("change",altinInfoGuncelle);if(aa)aa.addEventListener("input",altinInfoGuncelle);
  document.querySelectorAll(".al-kisi-ekle-btn").forEach(function(btn){btn.addEventListener("click",function(e){e.stopPropagation();modalAc(null,decodeURIComponent(btn.dataset.kisi));});});
  document.querySelectorAll(".al-duz-btn").forEach(function(btn){btn.addEventListener("click",function(){modalAc(btn.dataset.id,null);});});
  document.querySelectorAll(".al-sil-btn").forEach(function(btn){btn.addEventListener("click",function(){if(!confirm("Silmek istiyor musunuz?"))return;_kayitlar=_kayitlar.filter(function(x){return x.id!==btn.dataset.id;});fbKaydet();render();});});
  document.querySelectorAll(".al-odeme-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      var kid=btn.dataset.id,no=parseInt(btn.dataset.no,10),k=_kayitlar.find(function(x){return x.id===kid;});if(!k)return;
      if(k.tip==="altin"||k.tip==="pesin"){k.odendi=!k.odendi;}
      else{if(!k.odemeler)k.odemeler={};k.odemeler[no]=!k.odemeler[no];}
      fbKaydet();render();
    });
  });
}
function modalAc(id,kisiAdi){
  _aktif=id;
  $("al-modal-baslik").textContent=id?"Alacağı Düzenle":"Yeni Alacak";
  var today=todayStr(),thisMonth=today.substring(0,7);
  $("al-kisi").value=kisiAdi||"";$("al-aciklama").value="";$("al-tutar").value="";
  $("al-tarih").value=today;$("al-taksit-sayi").value="1";$("al-bas-tarih").value=thisMonth;
  $("al-altin-adet").value="1";$("al-altin-tur").value="";
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
        if(k.tip==="pesin"){$("al-tarih").value=k.tarih||today;tipGoster("pesin");}
        else{$("al-taksit-sayi").value=k.taksitSayisi;$("al-bas-tarih").value=k.basTarih;tipGoster("taksit");}
      }
      $("al-modal").classList.remove("hidden");
      setTimeout(function(){if(!kisiAdi)$("al-kisi").focus();else $("al-tutar").focus();},100);
      altinInfoGuncelle();
      return;
    }
  }
  tipGoster("pesin");
  $("al-modal").classList.remove("hidden");setTimeout(function(){if(!kisiAdi)$("al-kisi").focus();else $("al-tutar").focus();},100);altinInfoGuncelle();
}
function modalKapat(){$("al-modal").classList.add("hidden");_aktif=null;}
async function kaydet(){
  var kisi=($("al-kisi").value||"").trim();if(!kisi){$("al-kisi").focus();return;}
  var aciklama=($("al-aciklama").value||"").trim(),kayit;
  if(_aktifTip==="altin"){
    var tur=$("al-altin-tur").value,adet=parseFloat($("al-altin-adet").value)||1;
    var at3=$("al-altin-tarih"),tarih3=at3?at3.value:todayStr();
    if(!tur){alert("Altın birimi secin.");$("al-altin-tur").focus();return;}
    if(!adet||adet<=0){$("al-altin-adet").focus();return;}
    kayit={tip:"altin",kisi:kisi,aciklama:aciklama,altinTur:tur,altinAdet:adet,tarih:tarih3,odendi:false};
  }else if(_aktifTip==="pesin"){
    var tutar=parseFloat($("al-tutar").value)||0;if(!tutar||tutar<=0){$("al-tutar").focus();return;}
    var tarih=$("al-tarih").value;if(!tarih){alert("Tarih giriniz.");return;}
    kayit={tip:"pesin",kisi:kisi,tutar:tutar,aciklama:aciklama,tarih:tarih,odendi:false};
  }else{
    var tutar2=parseFloat($("al-tutar").value)||0;if(!tutar2||tutar2<=0){$("al-tutar").focus();return;}
    var ts=parseInt($("al-taksit-sayi").value,10)||1,bt=$("al-bas-tarih").value;
    if(!bt){alert("Başlangıç ayı giriniz.");return;}
    kayit={tip:"taksit",kisi:kisi,tutar:tutar2,aciklama:aciklama,taksitSayisi:ts,basTarih:bt,odemeler:{}};
  }
  if(_aktif){var idx=_kayitlar.findIndex(function(x){return x.id===_aktif;});if(idx>=0){kayit.id=_aktif;if(_kayitlar[idx].odemeler)kayit.odemeler=_kayitlar[idx].odemeler;_kayitlar[idx]=kayit;}}
  else{kayit.id=uid();_kayitlar.push(kayit);}
  _kisiAcikMap[kisi]=true;
  await fbKaydet();modalKapat();render();
}
async function init(){await fbYukle();_kayitlar=_kayitlar.map(normalizeKayit);await altinGuncelFiyatYukle();render();}
return{init:init};
})();
