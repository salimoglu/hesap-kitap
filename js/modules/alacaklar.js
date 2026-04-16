/* alacaklar.js */
var AlacaklarModule=(function(){
var $=function(id){return document.getElementById(id);};
var _kayitlar=[],_aktif=null,_aktifTip="pesin";
var AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "a"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}
function ayFmt(t){if(!t)return"";var p=t.split("-");return AYLAR[parseInt(p[1])-1]+" "+p[0];}
function buAy(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function ayEkle(bas,n){var d=new Date(bas+"-01");d.setMonth(d.getMonth()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
async function fbYukle(){if(!window._fbDb)return;try{var s=await window._fbDb.ref("alacaklar").once("value");var v=s.val();_kayitlar=v?Object.values(v):[];}catch(e){_kayitlar=[];}}
async function fbKaydet(){if(!window._fbDb)return;try{var obj={};_kayitlar.forEach(function(x){obj[x.id]=x;});await window._fbDb.ref("alacaklar").set(obj);}catch(e){}}
function taksitPlan(k){if(k.tip==="pesin")return [{ay:k.tarih?k.tarih.substring(0,7):"",tutar:k.tutar,no:1,odendi:k.odendi||false}];var plan=[];for(var i=0;i<k.taksitSayisi;i++)plan.push({ay:ayEkle(k.basTarih,i),tutar:k.tutar/k.taksitSayisi,no:i+1,odendi:(k.odemeler&&k.odemeler[i])||false});return plan;}
function kalanAlacak(k){return taksitPlan(k).filter(function(t){return !t.odendi;}).reduce(function(s,t){return s+t.tutar;},0);}
function toplamAlacak(){return _kayitlar.reduce(function(s,k){return s+kalanAlacak(k);},0);}
function buAyAlacak(){var ay=buAy();return _kayitlar.reduce(function(s,k){return s+taksitPlan(k).filter(function(t){return t.ay===ay&&!t.odendi;}).reduce(function(s2,t){return s2+t.tutar;},0);},0);}
function kisilerMap(){var m={};_kayitlar.forEach(function(k){var ad=(k.kisi||"?").trim();if(!m[ad])m[ad]=[];m[ad].push(k);});return m;}
function render(){
  var c=$("alacaklar-container");if(!c)return;
  var h='<div class="al-wrap">';
  h+='<div class="al-header"><div class="al-ozet">';
  h+='<div class="al-ozet-item"><span class="al-oz-label">TOPLAM ALACAK</span><span class="al-oz-val" style="color:var(--green)">'+para(toplamAlacak())+' TL</span></div>';
  h+='<div class="al-ozet-item"><span class="al-oz-label">BU AY GELECEK</span><span class="al-oz-val" style="color:var(--gold)">'+para(buAyAlacak())+' TL</span></div>';
  h+='</div><button class="al-yeni-btn" id="al-yeni-btn">+ Yeni Alacak</button></div>';
  if(!_kayitlar.length){h+='<div class="al-bos"><div style="font-size:40px;margin-bottom:12px">&#128184;</div><div>Henüz alacak kaydı yok</div></div>';}
  else{
    var km=kisilerMap();
    Object.keys(km).forEach(function(ad){
      var ks=km[ad];
      var kTL=ks.reduce(function(s,k){return s+kalanAlacak(k);},0);
      h+='<div style="margin-bottom:12px;border:1px solid var(--border);border-radius:12px;overflow:hidden">';
      h+='<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg-elevated);border-bottom:1px solid var(--border)">';
      h+='<div style="font-family:var(--font-brand);font-size:16px;letter-spacing:0.5px;flex:1">'+ad+'</div>';
      if(kTL>0)h+='<span style="color:var(--green);font-size:13px;font-weight:700">'+para(kTL)+' TL</span>';
      h+='<button class="al-kisi-ekle-btn btn-secondary" data-kisi="'+encodeURIComponent(ad)+'" style="font-size:12px;padding:4px 10px;border:1px solid var(--gold);color:var(--gold);background:transparent;border-radius:8px;cursor:pointer;flex-shrink:0">+ Ekle</button>';
      h+='</div>';
      h+='<div class="al-liste">';
      var aktif=ks.filter(function(k){return kalanAlacak(k)>0;});
      var kapali=ks.filter(function(k){return kalanAlacak(k)<=0;});
      aktif.forEach(function(k){h+=kartHtml(k);});
      kapali.forEach(function(k){h+=kartHtml(k);});
      h+='</div></div>';
    });
  }
  h+='</div>'+modalHtml();
  c.innerHTML=h;bagla();
}
function kartHtml(k){
  var plan=taksitPlan(k),kalan=kalanAlacak(k),tamOdendi=kalan<=0;
  var h='<div class="al-kart'+(tamOdendi?" al-kart-kapali":"")+'"><div class="al-kart-header"><div class="al-kart-sol">';
  if(k.aciklama)h+='<div class="al-kart-aciklama">'+k.aciklama+'</div>';
  h+='<div class="al-kart-meta"><span class="al-kart-tip '+(k.tip==="pesin"?"al-tip-p":"al-tip-t")+'">'+(k.tip==="pesin"?"Peşin":k.taksitSayisi+" Taksit")+'</span><span style="color:var(--text-muted);font-size:11px"> &middot; '+para(k.tutar)+' TL toplam</span></div></div>';
  h+='<div class="al-kart-sag">';
  if(!tamOdendi)h+='<div class="al-kalan-val">'+para(kalan)+' TL<span class="al-kalan-label">kalan</span></div>';
  else h+='<div class="al-odendi-badge">&#10003; TAM ODENDI</div>';
  h+='<div class="al-kart-actions"><button class="al-duz-btn row-action-btn duzenle" data-id="'+k.id+'">&#9998;</button><button class="al-sil-btn row-action-btn sil" data-id="'+k.id+'">&#10005;</button></div></div></div>';
  h+='<div class="al-plan">';
  plan.forEach(function(t){
    h+='<div class="al-plan-satir'+(t.odendi?" al-odendi":"")+'"><span class="al-plan-ay">'+(k.tip==="pesin"?tarihFmt(k.tarih):ayFmt(t.ay))+'</span>';
    if(k.tip!=="pesin")h+='<span class="al-plan-no">'+t.no+'/'+k.taksitSayisi+'</span>';
    h+='<span class="al-plan-tutar">'+para(t.tutar)+' TL</span><button class="al-odeme-btn'+(t.odendi?" al-odendi-aktif":"")+'" data-id="'+k.id+'" data-no="'+(t.no-1)+'">'+(t.odendi?'&#10003; Odendi':'Odendi işaretle')+'</button></div>';
  });
  h+='</div></div>';return h;
}
function modalHtml(){
  var today=new Date().toISOString().split("T")[0],thisMonth=today.substring(0,7);
  var h='<div class="bk-modal-overlay hidden" id="al-modal"><div class="modal-box" style="max-width:460px">';
  h+='<div class="modal-header"><h2 class="modal-title" id="al-modal-baslik">Yeni Alacak</h2><button class="modal-close" id="al-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Kisi Adı</label><input type="text" id="al-kisi" class="field-input" placeholder="Ad Soyad..." maxlength="60"/></div>';
  h+='<div class="field-group"><label class="field-label">Toplam Tutar (TL)</label><input type="number" id="al-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="field-group"><label class="field-label">Açıklama</label><input type="text" id="al-aciklama" class="field-input" placeholder="Konu..." maxlength="100"/></div>';
  h+='<div class="field-group"><label class="field-label">Odeme Tipi</label><div class="al-tip-secici"><button class="al-tip-btn active" data-tip="pesin">&#128184; Peşin</button><button class="al-tip-btn" data-tip="taksit">&#128200; Taksitli</button></div></div>';
  h+='<div id="al-pesin-wrap" class="field-group"><label class="field-label">Odeme Tarihi</label><input type="date" id="al-tarih" class="field-input" value="'+today+'"/></div>';
  h+='<div id="al-taksit-wrap" style="display:none"><div class="field-group"><label class="field-label">Taksit Sayısı</label><input type="number" id="al-taksit-sayi" class="field-input" value="1" min="1" max="60"/></div>';
  h+='<div class="field-group"><label class="field-label">1. Taksit Ayı</label><input type="month" id="al-bas-tarih" class="field-input" value="'+thisMonth+'"/></div></div>';
  h+='</div><div class="modal-footer"><button class="btn-secondary" id="al-iptal">İptal</button><button class="btn-primary" id="al-kaydet">Kaydet</button></div>';
  h+='</div></div>';return h;
}
function bagla(){
  $("al-yeni-btn").addEventListener("click",function(){modalAc(null,null);});
  $("al-modal-kapat").addEventListener("click",modalKapat);$("al-iptal").addEventListener("click",modalKapat);
  $("al-modal").addEventListener("click",function(e){if(e.target===$("al-modal"))modalKapat();});
  $("al-kaydet").addEventListener("click",kaydet);
  document.querySelectorAll(".al-tip-btn").forEach(function(btn){btn.addEventListener("click",function(){_aktifTip=btn.dataset.tip;document.querySelectorAll(".al-tip-btn").forEach(function(b){b.classList.toggle("active",b.dataset.tip===_aktifTip);});$("al-pesin-wrap").style.display=_aktifTip==="pesin"?"":"none";$("al-taksit-wrap").style.display=_aktifTip==="taksit"?"":"none";});});
  document.querySelectorAll(".al-kisi-ekle-btn").forEach(function(btn){btn.addEventListener("click",function(){modalAc(null,decodeURIComponent(btn.dataset.kisi));});});
  document.querySelectorAll(".al-duz-btn").forEach(function(btn){btn.addEventListener("click",function(){modalAc(btn.dataset.id,null);});});
  document.querySelectorAll(".al-sil-btn").forEach(function(btn){btn.addEventListener("click",function(){if(!confirm("Silmek istiyor musunuz?"))return;_kayitlar=_kayitlar.filter(function(x){return x.id!==btn.dataset.id;});fbKaydet();render();});});
  document.querySelectorAll(".al-odeme-btn").forEach(function(btn){btn.addEventListener("click",function(){var kid=btn.dataset.id,no=parseInt(btn.dataset.no),k=_kayitlar.find(function(x){return x.id===kid;});if(!k)return;if(k.tip==="pesin"){k.odendi=!k.odendi;}else{if(!k.odemeler)k.odemeler={};k.odemeler[no]=!k.odemeler[no];}fbKaydet();render();});});
}
function modalAc(id,kisiAdi){
  _aktif=id;_aktifTip="pesin";
  $("al-modal-baslik").textContent=id?"Alacağı Düzenle":"Yeni Alacak";
  $("al-pesin-wrap").style.display="";$("al-taksit-wrap").style.display="none";
  document.querySelectorAll(".al-tip-btn").forEach(function(b){b.classList.toggle("active",b.dataset.tip==="pesin");});
  var today=new Date().toISOString().split("T")[0],thisMonth=today.substring(0,7);
  $("al-kisi").value=kisiAdi||"";$("al-tutar").value="";$("al-aciklama").value="";$("al-tarih").value=today;$("al-taksit-sayi").value="1";$("al-bas-tarih").value=thisMonth;
  if(id){var k=_kayitlar.find(function(x){return x.id===id;});if(k){$("al-kisi").value=k.kisi;$("al-tutar").value=k.tutar;$("al-aciklama").value=k.aciklama||"";_aktifTip=k.tip;document.querySelectorAll(".al-tip-btn").forEach(function(b){b.classList.toggle("active",b.dataset.tip===k.tip);});if(k.tip==="pesin"){$("al-tarih").value=k.tarih||today;$("al-pesin-wrap").style.display="";}else{$("al-taksit-sayi").value=k.taksitSayisi;$("al-bas-tarih").value=k.basTarih;$("al-pesin-wrap").style.display="none";$("al-taksit-wrap").style.display="";}}}
  $("al-modal").classList.remove("hidden");setTimeout(function(){if(!kisiAdi)$("al-kisi").focus();else $("al-tutar").focus();},100);
}
function modalKapat(){$("al-modal").classList.add("hidden");_aktif=null;}
async function kaydet(){
  var kisi=($("al-kisi").value||"").trim(),tutar=parseFloat($("al-tutar").value)||0,aciklama=($("al-aciklama").value||"").trim();
  if(!kisi){$("al-kisi").focus();return;}if(!tutar||tutar<=0){$("al-tutar").focus();return;}
  var kayit;
  if(_aktifTip==="pesin"){var tarih=$("al-tarih").value;if(!tarih){alert("Tarih giriniz.");return;}kayit={tip:"pesin",kisi:kisi,tutar:tutar,aciklama:aciklama,tarih:tarih,odendi:false};}
  else{var ts=parseInt($("al-taksit-sayi").value)||1,bt=$("al-bas-tarih").value;if(!bt){alert("Başlangıç ayı giriniz.");return;}kayit={tip:"taksit",kisi:kisi,tutar:tutar,aciklama:aciklama,taksitSayisi:ts,basTarih:bt,odemeler:{}};}
  if(_aktif){var idx=_kayitlar.findIndex(function(x){return x.id===_aktif;});if(idx>=0){kayit.id=_aktif;if(_kayitlar[idx].odemeler)kayit.odemeler=_kayitlar[idx].odemeler;_kayitlar[idx]=kayit;}}
  else{kayit.id=uid();_kayitlar.push(kayit);}
  await fbKaydet();modalKapat();render();
}
async function init(){await fbYukle();render();}
return{init:init};
})();
