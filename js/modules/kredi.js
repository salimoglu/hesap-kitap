/* kredi.js */
var KrediModule=(function(){
var $=function(id){return document.getElementById(id);};
var _h=[],_k=[],_aktif=null,_ay=new Date().getMonth(),_yil=new Date().getFullYear();
var AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "k"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function buAy(){return _yil+"-"+String(_ay+1).padStart(2,"0");}
function ayEkle(bas,n){var d=new Date(bas+"-01");d.setMonth(d.getMonth()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function ayInput(){return _yil+"-"+String(_ay+1).padStart(2,"0");}
async function fbYukle(){
  if(typeof window._fbDb==="undefined"||!window._fbDb)return;
  try{
    var s=await window._fbDb.ref("kredi_harcamalar").once("value");
    var v=s.val();_h=v?Object.values(v):[];
    var sk=await window._fbDb.ref("kredi_kartlar").once("value");
    _k=sk.val()||[];
  }catch(e){_h=[];_k=[];}
}
async function fbKaydet(){
  if(typeof window._fbDb==="undefined"||!window._fbDb)return;
  try{
    var obj={};_h.forEach(function(x){obj[x.id]=x;});
    await window._fbDb.ref("kredi_harcamalar").set(obj);
    await window._fbDb.ref("kredi_kartlar").set(_k);
  }catch(e){}
}
function taksitler(h){
  var r=[];
  for(var i=0;i<h.taksit;i++){r.push({ay:ayEkle(h.basTarih,i),tutar:h.tutar/h.taksit,no:i+1});}
  return r;
}
function kartlar(){
  var s={};_h.forEach(function(h){s[h.kart]=1;});_k.forEach(function(k){s[k]=1;});
  return Object.keys(s).sort();
}
function ayToplam(ay,kart){
  var t=0;
  _h.forEach(function(h){
    if(kart&&h.kart!==kart)return;
    taksitler(h).forEach(function(x){if(x.ay===ay)t+=x.tutar;});
  });
  return t;
}
function kalanBorc(kart){
  var bugun=buAy(),t=0;
  _h.forEach(function(h){
    if(kart&&h.kart!==kart)return;
    taksitler(h).forEach(function(x){if(x.ay>=bugun)t+=x.tutar;});
  });
  return t;
}
function ayDetay(ay){
  var liste=[];
  _h.forEach(function(h){
    taksitler(h).forEach(function(x){
      if(x.ay===ay)liste.push({id:h.id,kart:h.kart,aciklama:h.aciklama,taksitTutar:x.tutar,no:x.no,toplamTaksit:h.taksit,toplamTutar:h.tutar});
    });
  });
  return liste.sort(function(a,b){return a.kart.localeCompare(b.kart);});
}
function render(){
  var c=$("kredi-container");if(!c)return;
  var aktifAy=buAy(),ayItems=ayDetay(aktifAy),ks=kartlar();
  var genelBuAy=ayToplam(aktifAy,null),genelKalan=kalanBorc(null);
  var h='<div class="kr-wrap">';
  h+='<div class="kr-header"><div class="kr-ozet">';
  h+='<div class="kr-ozet-item"><span class="kr-oz-label">BU AY ÖDEME</span><span class="kr-oz-val" style="color:var(--red)">'+para(genelBuAy)+' TL</span></div>';
  h+='<div class="kr-ozet-item"><span class="kr-oz-label">KALAN TOPLAM</span><span class="kr-oz-val" style="color:var(--gold)">'+para(genelKalan)+' TL</span></div>';
  h+='</div><button class="kr-yeni-btn" id="kr-yeni-btn">+ Harcama Ekle</button></div>';
  if(ks.length){
    h+='<div class="kr-kart-ozet">';
    ks.forEach(function(kart){
      h+='<div class="kr-kart-chip"><div class="kr-chip-adi">'+kart+'</div>';
      h+='<div class="kr-chip-buay">Bu ay: <b>'+para(ayToplam(aktifAy,kart))+' TL</b></div>';
      h+='<div class="kr-chip-kalan">Kalan: '+para(kalanBorc(kart))+' TL</div></div>';
    });
    h+='</div>';
  }
  h+='<div class="kr-ay-bar"><button class="kr-ay-btn" id="kr-geri">&#8249;</button>';
  h+='<span class="kr-ay-label">'+AYLAR[_ay]+" "+_yil+'</span>';
  h+='<button class="kr-ay-btn" id="kr-ileri">&#8250;</button></div>';
  h+='<div class="kr-tablo-wrap">';
  if(!ayItems.length){
    h+='<div class="kr-bos">'+AYLAR[_ay]+' '+_yil+' için ödeme yok</div>';
  } else {
    h+='<table class="kr-tablo"><thead><tr><th>KART</th><th>AÇIKLAMA</th><th>TAKSTİT</th><th>TUTAR</th><th></th></tr></thead><tbody>';
    ayItems.forEach(function(r){
      h+='<tr><td class="kr-td-kart">'+r.kart+'</td><td class="kr-td-aciklama">'+r.aciklama+'</td>';
      h+='<td class="kr-td-no" style="text-align:center">'+r.no+'/'+r.toplamTaksit+'</td>';
      h+='<td class="kr-td-tutar">'+para(r.taksitTutar)+' TL</td>';
      h+='<td style="white-space:nowrap"><button class="kr-duz-btn row-action-btn duzenle" data-id="'+r.id+'">&#9998;</button> ';
      h+='<button class="kr-sil-btn row-action-btn sil" data-id="'+r.id+'">&#10005;</button></td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div></div>';
  h+='<div class="bk-modal-overlay hidden" id="kr-modal">';
  h+='<div class="modal-box modal-sm">';
  h+='<div class="modal-header"><h2 class="modal-title" id="kr-modal-baslik">Harcama Ekle</h2>';
  h+='<button class="modal-close" id="kr-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Kart Adı</label>';
  h+='<input type="text" id="kr-kart" class="field-input" placeholder="Garanti, Ziraat..." list="kr-dl" autocomplete="off"/>';
  h+='<datalist id="kr-dl">'+ks.map(function(k){return'<option value="'+k+'"/>';}).join('')+'</datalist></div>';
  h+='<div class="field-group"><label class="field-label">Açıklama (Ürün/Hizmet)</label>';
  h+='<input type="text" id="kr-aciklama" class="field-input" placeholder="Ürün adı..." maxlength="100"/></div>';
  h+='<div class="field-group"><label class="field-label">Toplam Tutar (TL)</label>';
  h+='<input type="number" id="kr-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="field-group"><label class="field-label">Taksit Sayısı</label>';
  h+='<input type="number" id="kr-taksit" class="field-input" value="1" min="1" max="60" step="1"/></div>';
  h+='<div class="field-group"><label class="field-label">1. Taksit Ayı</label>';
  h+='<input type="month" id="kr-bastarihi" class="field-input" value="'+ayInput()+'"/></div>';
  h+='</div><div class="modal-footer">';
  h+='<button class="btn-secondary" id="kr-iptal">İptal</button>';
  h+='<button class="btn-primary" id="kr-kaydet">Kaydet</button>';
  h+='</div></div></div>';
  c.innerHTML=h;bagla();
}
function bagla(){
  $("kr-yeni-btn").addEventListener("click",function(){modalAc(null);});
  $("kr-modal-kapat").addEventListener("click",modalKapat);
  $("kr-iptal").addEventListener("click",modalKapat);
  $("kr-modal").addEventListener("click",function(e){if(e.target===$("kr-modal"))modalKapat();});
  $("kr-kaydet").addEventListener("click",kaydet);
  $("kr-geri").addEventListener("click",function(){_ay--;if(_ay<0){_ay=11;_yil--;}render();});
  $("kr-ileri").addEventListener("click",function(){_ay++;if(_ay>11){_ay=0;_yil++;}render();});
  document.querySelectorAll(".kr-duz-btn").forEach(function(btn){btn.addEventListener("click",function(){modalAc(btn.dataset.id);});});
  document.querySelectorAll(".kr-sil-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      if(!confirm("Silmek istiyor musunuz?"))return;
      _h=_h.filter(function(x){return x.id!==btn.dataset.id;});
      fbKaydet();render();
    });
  });
}
function modalAc(id){
  _aktif=id;
  $("kr-modal-baslik").textContent=id?"Harcamayı Düzenle":"Harcama Ekle";
  if(id){var x=_h.find(function(h){return h.id===id;});if(x){$("kr-kart").value=x.kart;$("kr-aciklama").value=x.aciklama;$("kr-tutar").value=x.tutar;$("kr-taksit").value=x.taksit;$("kr-bastarihi").value=x.basTarih;}}
  else{$("kr-kart").value="";$("kr-aciklama").value="";$("kr-tutar").value="";$("kr-taksit").value="1";$("kr-bastarihi").value=ayInput();}
  $("kr-modal").classList.remove("hidden");
  setTimeout(function(){$("kr-kart").focus();},100);
}
function modalKapat(){$("kr-modal").classList.add("hidden");_aktif=null;}
async function kaydet(){
  var kart=($("kr-kart").value||"").trim();
  var aciklama=($("kr-aciklama").value||"").trim();
  var tutar=parseFloat($("kr-tutar").value)||0;
  var taksit=parseInt($("kr-taksit").value)||1;
  var basTarih=$("kr-bastarihi").value;
  if(!kart){$("kr-kart").focus();return;}
  if(!aciklama){$("kr-aciklama").focus();return;}
  if(!tutar||tutar<=0){$("kr-tutar").focus();return;}
  if(!basTarih){alert("Başlangıç ayı giriniz.");return;}
  if(_k.indexOf(kart)<0)_k.push(kart);
  if(_aktif){var i=_h.findIndex(function(x){return x.id===_aktif;});if(i>=0)_h[i]={id:_aktif,kart:kart,aciklama:aciklama,tutar:tutar,taksit:taksit,basTarih:basTarih};}
  else{_h.push({id:uid(),kart:kart,aciklama:aciklama,tutar:tutar,taksit:taksit,basTarih:basTarih});}
  await fbKaydet();modalKapat();render();
}
async function init(){await fbYukle();render();}
return{init:init};
})();
