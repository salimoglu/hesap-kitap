/* urun.js - Urun Takip (sade: tarih + ad + fiyat) */
var UrunModule=(function(){
var $=function(id){return document.getElementById(id);};
var _urunler=[],_aktif=null;

function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "u"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}

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

  /* Tablo */
  h+='<div class="ur-tablo-wrap">';
  if(!_urunler.length){
    h+='<div class="ur-bos">';
    h+='<div style="font-size:40px;margin-bottom:12px">&#128230;</div>';
    h+='<div>Henüz ürün kaydı yok</div>';
    h+='</div>';
  } else {
    h+='<table class="ur-tablo"><thead><tr>';
    h+='<th>TARİH</th><th>ÜRÜN ADI</th><th>ALINAN FİYAT</th><th></th>';
    h+='</tr></thead><tbody>';
    _urunler.slice().sort(function(a,b){return b.tarih.localeCompare(a.tarih);}).forEach(function(u){
      h+='<tr class="ur-satir">';
      h+='<td class="ur-td-tarih">'+tarihFmt(u.tarih)+'</td>';
      h+='<td class="ur-td-urun">'+u.urun+'</td>';
      h+='<td class="ur-td-fiyat">'+para(u.fiyat)+' TL</td>';
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
