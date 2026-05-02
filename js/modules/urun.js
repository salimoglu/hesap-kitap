/* urun.js - Urun Takip: tarih + ad + fiyat + gunluk maliyet (fiyat / kullanim gunu) */
var UrunModule=(function(){
var $=function(id){return document.getElementById(id);};
var _urunler=[],_aktif=null;

function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "u"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}

/* Satis tarihinden bugune kadar (her iki uç dahil) gun sayisi; min 1 */
function kullanimGunSayisi(tarihStr){
  if(!tarihStr)return 1;
  var p=tarihStr.split("-");
  if(p.length!==3)return 1;
  var alis=new Date(parseInt(p[0],10),parseInt(p[1],10)-1,parseInt(p[2],10));
  var b=new Date();
  var bugun=new Date(b.getFullYear(),b.getMonth(),b.getDate());
  var diff=Math.round((bugun-alis)/(86400000));
  return Math.max(1,diff+1);
}
function gunlukMaliyet(tarihStr,fiyat){
  var g=kullanimGunSayisi(tarihStr);
  var f=Number(fiyat)||0;
  if(f<=0)return 0;
  return f/g;
}

async function fbYukle(){
  if(typeof window._fbDb==="undefined"||!window._fbDb)return;
  try{
    var s=await window._fbDb.ref("urunler").once("value");
    var v=s.val();
    _urunler=v?Object.values(v):[];
  }catch(e){_urunler=[];}
}

async function fbKaydet(){
  if(typeof window._fbDb==="undefined"||!window._fbDb)return;
  try{
    var obj={};
    _urunler.forEach(function(x){obj[x.id]=x;});
    await window._fbDb.ref("urunler").set(obj);
  }catch(e){}
}

function render(){
  var c=$("urun-container");if(!c)return;
  var toplamFiyat=_urunler.reduce(function(s,u){return s+u.fiyat;},0);

  var h='<div class="ur-wrap">';

  /* Ozet header */
  h+='<div class="ur-header">';
  h+='<div class="ur-ozet">';
  h+='<div class="ur-ozet-item">';
  h+='<span class="ur-oz-label">TOPLAM URUN</span>';
  h+='<span class="ur-oz-val" style="color:var(--text-primary)">'+_urunler.length+' adet</span>';
  h+='</div>';
  h+='<div class="ur-ozet-item">';
  h+='<span class="ur-oz-label">TOPLAM HARCAMA</span>';
  h+='<span class="ur-oz-val" style="color:var(--gold)">'+para(toplamFiyat)+' TL</span>';
  h+='</div>';
  h+='</div>';
  h+='<button class="ur-yeni-btn" id="ur-yeni-btn">+ Ürün Ekle</button>';
  h+='</div>';
  h+='<p class="ur-legend">Günlük maliyet = ödenen fiyat ÷ gün sayısı. Gün sayısı, satın alma tarihi ile bugün arasında (her iki gün dahil) hesaplanır.</p>';

  /* Tablo */
  h+='<div class="ur-tablo-wrap">';
  if(!_urunler.length){
    h+='<div class="ur-bos">';
    h+='<div style="font-size:40px;margin-bottom:12px">&#128230;</div>';
    h+='<div>Henüz ürün kaydı yok</div>';
    h+='</div>';
  } else {
    h+='<table class="ur-tablo"><thead><tr>';
    h+='<th title="Satın alma tarihi">TARİH</th>';
    h+='<th>ÜRÜN</th>';
    h+='<th title="Ödenen toplam tutar">FİYAT</th>';
    h+='<th title="Satın almadan bugüne (dahil)">GÜN</th>';
    h+='<th title="Fiyat ÷ gün">GÜNLÜK</th>';
    h+='<th></th>';
    h+='</tr></thead><tbody>';
    _urunler.slice().sort(function(a,b){return b.tarih.localeCompare(a.tarih);}).forEach(function(u){
      var gun=kullanimGunSayisi(u.tarih);
      var gunluk=gunlukMaliyet(u.tarih,u.fiyat);
      h+='<tr class="ur-satir">';
      h+='<td class="ur-td-tarih">'+tarihFmt(u.tarih)+'</td>';
      h+='<td class="ur-td-urun">'+u.urun+'</td>';
      h+='<td class="ur-td-fiyat">'+para(u.fiyat)+' TL</td>';
      h+='<td class="ur-td-gun">'+gun+'</td>';
      h+='<td class="ur-td-gunluk">'+para(gunluk)+' <span class="ur-gunluk-birim">TL/gün</span></td>';
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
  h+='<div class="modal-header">';
  h+='<h2 class="modal-title" id="ur-modal-baslik">Ürün Ekle</h2>';
  h+='<button class="modal-close" id="ur-modal-kapat">&#10005;</button>';
  h+='</div>';
  h+='<div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Tarih</label>';
  h+='<input type="date" id="ur-tarih" class="field-input"/></div>';
  h+='<div class="field-group"><label class="field-label">Ürün Adı</label>';
  h+='<input type="text" id="ur-urun" class="field-input" placeholder="Telefon, Laptop, Buzdolabı..." maxlength="100"/></div>';
  h+='<div class="field-group"><label class="field-label">Alınan Fiyat (TL)</label>';
  h+='<input type="number" id="ur-fiyat" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="ur-hesap-panel" id="ur-hesap-panel"><div class="ur-hesap-baslik">Hesap</div><div class="ur-hesap-metin" id="ur-hesap-metin"></div></div>';
  h+='</div>';
  h+='<div class="modal-footer">';
  h+='<button class="btn-secondary" id="ur-iptal">İptal</button>';
  h+='<button class="btn-primary" id="ur-kaydet">Kaydet</button>';
  h+='</div></div></div>';

  c.innerHTML=h;
  bagla();
}

function bagla(){
  $("ur-yeni-btn").addEventListener("click",function(){modalAc(null);});
  $("ur-modal-kapat").addEventListener("click",modalKapat);
  $("ur-iptal").addEventListener("click",modalKapat);
  $("ur-modal").addEventListener("click",function(e){if(e.target===$("ur-modal"))modalKapat();});
  $("ur-kaydet").addEventListener("click",kaydet);
  document.querySelectorAll(".ur-duz-btn").forEach(function(btn){
    btn.addEventListener("click",function(){modalAc(btn.dataset.id);});
  });
  document.querySelectorAll(".ur-sil-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      if(!confirm("Bu ürünü silmek istiyor musunuz?"))return;
      _urunler=_urunler.filter(function(x){return x.id!==btn.dataset.id;});
      fbKaydet();render();
    });
  });
}

function modalHesapGuncelle(){
  var el=$("ur-hesap-metin");if(!el)return;
  var tEl=$("ur-tarih"),fEl=$("ur-fiyat");
  if(!tEl||!fEl)return;
  var t=tEl.value,f=parseFloat(fEl.value)||0;
  if(!t){el.innerHTML='<span class="ur-hesap-muted">Tarih seçin.</span>';return;}
  var gun=kullanimGunSayisi(t);
  if(f<=0){
    el.innerHTML='<div class="ur-hesap-line"><span class="ur-hesap-etik">Kullanım</span> <strong>'+gun+'</strong> gün <span class="ur-hesap-hint">(satın alma günü dahil, bugüne kadar)</span></div>'+
      '<div class="ur-hesap-muted">Fiyat girince günlük maliyet = Fiyat ÷ gün hesaplanır.</div>';
    return;
  }
  var gl=gunlukMaliyet(t,f);
  el.innerHTML='<div class="ur-hesap-line"><span class="ur-hesap-etik">Kullanım</span> <strong>'+gun+'</strong> gün</div>'+
    '<div class="ur-hesap-line"><span class="ur-hesap-etik">Günlük maliyet</span> <strong class="ur-hesap-vurgu">'+para(gl)+' TL</strong><span class="ur-hesap-formul"> = '+para(f)+' ÷ '+gun+'</span></div>';
}

function modalAc(id){
  _aktif=id;
  $("ur-modal-baslik").textContent=id?"Ürünü Düzenle":"Ürün Ekle";
  var today=new Date().toISOString().split("T")[0];
  $("ur-tarih").value=today;
  $("ur-urun").value="";
  $("ur-fiyat").value="";
  if(id){
    var u=_urunler.find(function(x){return x.id===id;});
    if(u){
      $("ur-tarih").value=u.tarih;
      $("ur-urun").value=u.urun;
      $("ur-fiyat").value=u.fiyat;
    }
  }
  $("ur-modal").classList.remove("hidden");
  var tIn=$("ur-tarih"),fIn=$("ur-fiyat");
  if(tIn&&fIn){
    var upd=function(){modalHesapGuncelle();};
    tIn.oninput=upd;fIn.oninput=upd;
    modalHesapGuncelle();
  }
  setTimeout(function(){$("ur-urun").focus();},100);
}

function modalKapat(){
  $("ur-modal").classList.add("hidden");
  _aktif=null;
}

async function kaydet(){
  var tarih=$("ur-tarih").value;
  var urun=($("ur-urun").value||"").trim();
  var fiyat=parseFloat($("ur-fiyat").value)||0;
  if(!tarih){alert("Tarih giriniz.");return;}
  if(!urun){$("ur-urun").focus();return;}
  if(!fiyat||fiyat<=0){$("ur-fiyat").focus();return;}
  var kayit={tarih:tarih,urun:urun,fiyat:fiyat};
  if(_aktif){
    var idx=_urunler.findIndex(function(x){return x.id===_aktif;});
    if(idx>=0){kayit.id=_aktif;_urunler[idx]=kayit;}
  } else {
    kayit.id=uid();
    _urunler.push(kayit);
  }
  await fbKaydet();
  modalKapat();
  render();
}

async function init(){
  await fbYukle();
  render();
}

return{init:init};
})();
