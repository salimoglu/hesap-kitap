/* urun.js - Urun Altin Deger Takibi */
var UrunModule=(function(){
var $=function(id){return document.getElementById(id);};
var _urunler=[], _aktif=null, _guncelAltin=0;

function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function gram(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:3,maximumFractionDigits:3});}
function uid(){return "u"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}

/* Doviz.com'dan gram altin fiyati */
async function altinCek(){
  try{
    var r=await fetch("https://api.genelpara.com/embed/altin/");
    var d=await r.json();
    if(d&&d["gram-altin"]){
      var satis=parseFloat((d["gram-altin"].satis||"0").replace(/\./g,"").replace(",","."));
      if(satis>0){_guncelAltin=satis;return satis;}
    }
  }catch(e){}
  return _guncelAltin||0;
}

async function fbYukle(){
  if(typeof window._fbDb==="undefined"||!window._fbDb)return;
  try{
    var s=await window._fbDb.ref("urunler").once("value");
    var v=s.val();_urunler=v?Object.values(v):[];
    var sa=await window._fbDb.ref("guncel_altin").once("value");
    _guncelAltin=sa.val()||0;
  }catch(e){_urunler=[];}
}
async function fbKaydet(){
  if(typeof window._fbDb==="undefined"||!window._fbDb)return;
  try{
    var obj={};_urunler.forEach(function(x){obj[x.id]=x;});
    await window._fbDb.ref("urunler").set(obj);
    if(_guncelAltin>0)await window._fbDb.ref("guncel_altin").set(_guncelAltin);
  }catch(e){}
}

function render(){
  var c=$("urun-container");if(!c)return;
  var toplamUrunDeger=_urunler.reduce(function(s,u){return s+u.fiyat;},0);
  var toplamGuncelDeger=_guncelAltin>0?_urunler.reduce(function(s,u){return s+(u.altinGram*_guncelAltin);},0):0;
  var toplamDegisim=toplamGuncelDeger-toplamUrunDeger;

  var h='<div class="ur-wrap">';
  /* Header */
  h+='<div class="ur-header">';
  h+='<div class="ur-ozet">';
  h+='<div class="ur-ozet-item"><span class="ur-oz-label">ALINAN TOPLAM</span><span class="ur-oz-val" style="color:var(--text-primary)">'+para(toplamUrunDeger)+' TL</span></div>';
  if(_guncelAltin>0){
    h+='<div class="ur-ozet-item"><span class="ur-oz-label">GUNCEL DEGER</span><span class="ur-oz-val" style="color:var(--gold)">'+para(toplamGuncelDeger)+' TL</span></div>';
    h+='<div class="ur-ozet-item"><span class="ur-oz-label">DEGER DEGISIMI</span><span class="ur-oz-val" style="color:'+(toplamDegisim>=0?"var(--green)":"var(--red)") +'">'+(toplamDegisim>=0?"+":"")+para(toplamDegisim)+' TL</span></div>';
  }
  h+='</div>';
  h+='<div class="ur-header-sag">';
  h+='<div class="ur-altin-kutu">';
  h+='<span class="ur-altin-label">GRAM ALTIN</span>';
  h+='<span class="ur-altin-fiyat" id="ur-altin-val">'+ (_guncelAltin>0?para(_guncelAltin)+" TL":"Yukluyor...")+'</span>';
  h+='<button class="ur-guncelle-btn" id="ur-guncelle-btn" title="Fiyati guncelle">&#8635;</button>';
  h+='</div>';
  h+='<button class="ur-yeni-btn" id="ur-yeni-btn">+ Urun Ekle</button>';
  h+='</div></div>';

  /* Tablo */
  h+='<div class="ur-tablo-wrap">';
  if(!_urunler.length){
    h+='<div class="ur-bos"><div style="font-size:40px;margin-bottom:12px">&#128230;</div><div>Henüz ürün kaydı yok</div></div>';
  } else {
    h+='<table class="ur-tablo"><thead><tr>';
    h+='<th>TARIH</th><th>URUN</th><th>ALINAN FIYAT</th>';
    h+='<th>ALIMDAKI ALTIN</th><th>GRAM ALTIN KARSILIGI</th>';
    h+='<th>GUNCEL DEGER</th><th>DEGER DEGISIMI</th><th></th>';
    h+='</tr></thead><tbody>';
    _urunler.slice().sort(function(a,b){return b.tarih.localeCompare(a.tarih);}).forEach(function(u){
      var guncelDeger=_guncelAltin>0?(u.altinGram*_guncelAltin):0;
      var degisim=guncelDeger-u.fiyat;
      var degisimPct=u.fiyat>0?((degisim/u.fiyat)*100):0;
      h+='<tr class="ur-satir">';
      h+='<td class="ur-td-tarih">'+tarihFmt(u.tarih)+'</td>';
      h+='<td class="ur-td-urun">'+u.urun+'</td>';
      h+='<td class="ur-td-fiyat">'+para(u.fiyat)+' TL</td>';
      h+='<td class="ur-td-altin-fiyat">'+para(u.altinFiyat)+' TL/gr</td>';
      h+='<td class="ur-td-gram">'+gram(u.altinGram)+' gr</td>';
      h+='<td class="ur-td-guncel">'+(guncelDeger>0?para(guncelDeger)+" TL":"—")+'</td>';
      h+='<td class="ur-td-degisim '+(degisim>=0?"ur-artis":"ur-dusus")+'">';
      if(guncelDeger>0){
        h+=(degisim>=0?"+":"")+para(degisim)+' TL';
        h+='<br><small>'+(degisimPct>=0?"+":"")+degisimPct.toFixed(1)+'%</small>';
      } else { h+='—'; }
      h+='</td>';
      h+='<td class="ur-td-aksiyon">';
      h+='<button class="ur-duz-btn row-action-btn duzenle" data-id="'+u.id+'">&#9998;</button> ';
      h+='<button class="ur-sil-btn row-action-btn sil" data-id="'+u.id+'">&#10005;</button>';
      h+='</td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div></div>';

  /* Modal */
  h+='<div class="bk-modal-overlay hidden" id="ur-modal">';
  h+='<div class="modal-box modal-sm">';
  h+='<div class="modal-header"><h2 class="modal-title" id="ur-modal-baslik">Urun Ekle</h2>';
  h+='<button class="modal-close" id="ur-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Tarih</label><input type="date" id="ur-tarih" class="field-input"/></div>';
  h+='<div class="field-group"><label class="field-label">Urun Adi</label><input type="text" id="ur-urun" class="field-input" placeholder="Telefon, Laptop..." maxlength="100"/></div>';
  h+='<div class="field-group"><label class="field-label">Alinan Fiyat (TL)</label><input type="number" id="ur-fiyat" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="field-group"><label class="field-label">Alimdaki Gram Altin Fiyati (TL)</label>';
  h+='<input type="number" id="ur-altin-fiyat" class="field-input" placeholder="Ornek: 6400" min="0" step="1" inputmode="decimal"/></div>';
  h+='<div class="field-group ur-gram-sonuc" id="ur-gram-sonuc" style="display:none">';
  h+='<label class="field-label">GRAM ALTIN KARSILIGI</label>';
  h+='<div class="ur-gram-val" id="ur-gram-val">0.000 gram</div></div>';
  h+='</div>';
  h+='<div class="modal-footer"><button class="btn-secondary" id="ur-iptal">İptal</button><button class="btn-primary" id="ur-kaydet">Kaydet</button></div>';
  h+='</div></div>';

  c.innerHTML=h;
  bagla();
}

function bagla(){
  $("ur-yeni-btn").addEventListener("click",function(){modalAc(null);});
  $("ur-modal-kapat").addEventListener("click",modalKapat);
  $("ur-iptal").addEventListener("click",modalKapat);
  $("ur-modal").addEventListener("click",function(e){if(e.target===$("ur-modal"))modalKapat();});
  $("ur-kaydet").addEventListener("click",kaydet);

  /* Gram hesaplama — fiyat veya altin fiyati degisince otomatik hesapla */
  function gramHesapla(){
    var fiyat=parseFloat($("ur-fiyat").value)||0;
    var altinF=parseFloat($("ur-altin-fiyat").value)||0;
    var wrap=$("ur-gram-sonuc"),val=$("ur-gram-val");
    if(fiyat>0&&altinF>0){
      wrap.style.display="";
      val.textContent=gram(fiyat/altinF)+" gram";
    } else {
      wrap.style.display="none";
    }
  }
  $("ur-fiyat").addEventListener("input",gramHesapla);
  $("ur-altin-fiyat").addEventListener("input",gramHesapla);

  /* Guncelle butonu */
  $("ur-guncelle-btn").addEventListener("click",async function(){
    var btn=$("ur-guncelle-btn");
    btn.style.animation="spin 1s linear infinite";
    btn.disabled=true;
    var fiyat=await altinCek();
    btn.style.animation="";
    btn.disabled=false;
    if(fiyat>0){
      _guncelAltin=fiyat;
      $("ur-altin-val").textContent=para(fiyat)+" TL";
      await fbKaydet();
      render();
    } else {
      alert("Fiyat alınamadı. Manuel güncelleyiniz.");
    }
  });

  document.querySelectorAll(".ur-duz-btn").forEach(function(btn){btn.addEventListener("click",function(){modalAc(btn.dataset.id);});});
  document.querySelectorAll(".ur-sil-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      if(!confirm("Silmek istiyor musunuz?"))return;
      _urunler=_urunler.filter(function(x){return x.id!==btn.dataset.id;});
      fbKaydet();render();
    });
  });
}

function modalAc(id){
  _aktif=id;
  $("ur-modal-baslik").textContent=id?"Ürünü Düzenle":"Ürün Ekle";
  var today=new Date().toISOString().split("T")[0];
  $("ur-tarih").value=today;$("ur-urun").value="";$("ur-fiyat").value="";
  $("ur-altin-fiyat").value=_guncelAltin>0?Math.round(_guncelAltin):"";
  $("ur-gram-sonuc").style.display="none";
  if(id){
    var u=_urunler.find(function(x){return x.id===id;});
    if(u){$("ur-tarih").value=u.tarih;$("ur-urun").value=u.urun;$("ur-fiyat").value=u.fiyat;$("ur-altin-fiyat").value=u.altinFiyat;}
  }
  $("ur-modal").classList.remove("hidden");
  setTimeout(function(){$("ur-urun").focus();},100);
}
function modalKapat(){$("ur-modal").classList.add("hidden");_aktif=null;}

async function kaydet(){
  var tarih=$("ur-tarih").value;
  var urun=($("ur-urun").value||"").trim();
  var fiyat=parseFloat($("ur-fiyat").value)||0;
  var altinFiyat=parseFloat($("ur-altin-fiyat").value)||0;
  if(!tarih){alert("Tarih giriniz.");return;}
  if(!urun){$("ur-urun").focus();return;}
  if(!fiyat||fiyat<=0){$("ur-fiyat").focus();return;}
  if(!altinFiyat||altinFiyat<=0){$("ur-altin-fiyat").focus();return;}
  var altinGram=fiyat/altinFiyat;
  var kayit={tarih:tarih,urun:urun,fiyat:fiyat,altinFiyat:altinFiyat,altinGram:altinGram};
  if(_aktif){
    var idx=_urunler.findIndex(function(x){return x.id===_aktif;});
    if(idx>=0){kayit.id=_aktif;_urunler[idx]=kayit;}
  } else {kayit.id=uid();_urunler.push(kayit);}
  await fbKaydet();modalKapat();render();
}

async function init(){
  await fbYukle();
  /* Altin fiyatini otomatik cek */
  altinCek().then(function(f){
    if(f>0&&f!==_guncelAltin){
      _guncelAltin=f;
      fbKaydet();
      var el=$("ur-altin-val");
      if(el)el.textContent=para(f)+" TL";
      render();
    }
  });
  render();
}
return{init:init};
})();

