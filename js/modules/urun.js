/* urun.js - Urun Takip: tarih + ad + fiyat + gunluk maliyet; istege bagli son kullanim (omur) tarihi */
var UrunModule=(function(){
var $=function(id){return document.getElementById(id);};
var _urunler=[],_aktif=null,_omurId=null;

function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "u"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}

function parseYmd(str){
  if(!str)return null;
  var p=str.split("-");
  if(p.length!==3)return null;
  var y=parseInt(p[0],10),m=parseInt(p[1],10)-1,d=parseInt(p[2],10);
  if(isNaN(y)||isNaN(m)||isNaN(d))return null;
  return new Date(y,m,d);
}

/*
 * Satın alma ile bitiş arası (dahil) gün. sonTarihStr yoksa bitiş = bugün.
 */
function kullanimGunSayisi(tarihStr,sonTarihStr){
  if(!tarihStr)return 1;
  var alis=parseYmd(tarihStr);
  if(!alis)return 1;
  var bitis;
  if(sonTarihStr&&String(sonTarihStr).trim()){
    bitis=parseYmd(sonTarihStr.trim());
    if(!bitis)return 1;
  } else {
    var b=new Date();
    bitis=new Date(b.getFullYear(),b.getMonth(),b.getDate());
  }
  if(bitis<alis)return 1;
  var diff=Math.round((bitis-alis)/(86400000));
  return Math.max(1,diff+1);
}

function gunlukMaliyet(tarihStr,fiyat,sonTarihStr){
  var g=kullanimGunSayisi(tarihStr,sonTarihStr);
  var f=Number(fiyat)||0;
  if(f<=0)return 0;
  return f/g;
}

async function fbYukle(){
  if(!window._fbDb)return;
  try{
    var s=await fbRtdbRef("urunler").once("value");
    var v=s.val();
    _urunler=Array.isArray(v)?v:(v&&typeof v==="object"?Object.values(v):[]);
    if(!_urunler.length){
      var s2=await fbRtdbRef("urun").once("value");
      var v2=s2.val();
      _urunler=Array.isArray(v2)?v2:(v2&&typeof v2==="object"?Object.values(v2):[]);
    }
  }catch(e){_urunler=[];console.error("[Urun] yukle",(e&&e.code)||e.message||e);}
}

async function fbKaydet(){
  if(!window._fbDb)return;
  try{
    var obj={};
    _urunler.forEach(function(x){
      var o={id:x.id,tarih:x.tarih,urun:x.urun,fiyat:x.fiyat};
      if(x.sonTarih&&String(x.sonTarih).trim())o.sonTarih=String(x.sonTarih).trim();
      obj[x.id]=o;
    });
    await fbRtdbRef("urunler").set(obj);
  }catch(e){console.error("[Urun] kaydet",e);}
}

function render(){
  var c=$("urun-container");if(!c)return;
  var toplamFiyat=_urunler.reduce(function(s,u){return s+u.fiyat;},0);

  var h='<div class="ur-wrap">';

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
  h+='<p class="ur-legend">Günlük maliyet = ödenen fiyat ÷ gün. Gün: satın alma ile <strong>bugün</strong> arası (dahil), veya satırdaki <strong>Ömür</strong> ile seçtiğiniz <strong>son güne</strong> kadar (dahil).</p>';

  h+='<div class="ur-tablo-wrap">';
  if(!_urunler.length){
    h+='<div class="ur-bos">';
    h+='<div style="font-size:40px;margin-bottom:12px">&#128230;</div>';
    h+='<div>Henüz ürün kaydı yok</div>';
    h+='</div>';
  } else {
    h+='<table class="ur-tablo"><thead><tr>';
    h+='<th title="Satın alma tarihi"><span class="ur-th-desktop">TARİH</span><span class="ur-th-mob">TAR.</span></th>';
    h+='<th><span class="ur-th-desktop">ÜRÜN</span><span class="ur-th-mob">ÜRÜN</span></th>';
    h+='<th title="Ödenen toplam tutar"><span class="ur-th-desktop">FİYAT</span><span class="ur-th-mob">FİY.</span></th>';
    h+='<th title="Satın alma ile bugün veya son güne kadar (dahil)">GÜN</th>';
    h+='<th title="Planlanan son kullanım günü"><span class="ur-th-desktop">SON GÜN</span><span class="ur-th-mob">SON</span></th>';
    h+='<th title="Fiyat ÷ gün"><span class="ur-th-desktop">GÜNLÜK</span><span class="ur-th-mob">GÜN.LK</span></th>';
    h+='<th></th>';
    h+='</tr></thead><tbody>';
    _urunler.slice().sort(function(a,b){return b.tarih.localeCompare(a.tarih);}).forEach(function(u){
      var gun=kullanimGunSayisi(u.tarih,u.sonTarih);
      var gunluk=gunlukMaliyet(u.tarih,u.fiyat,u.sonTarih);
      var sonStr=u.sonTarih&&String(u.sonTarih).trim()?tarihFmt(u.sonTarih.trim()):"—";
      h+='<tr class="ur-satir">';
      h+='<td class="ur-td-tarih">'+tarihFmt(u.tarih)+'</td>';
      h+='<td class="ur-td-urun">'+u.urun+'</td>';
      h+='<td class="ur-td-fiyat">'+para(u.fiyat)+' TL</td>';
      h+='<td class="ur-td-gun">'+gun+'</td>';
      h+='<td class="ur-td-son">'+sonStr+'</td>';
      h+='<td class="ur-td-gunluk">'+para(gunluk)+' <span class="ur-gunluk-birim">TL/gün</span></td>';
      h+='<td class="ur-td-aksiyon">';
      h+='<button type="button" class="ur-omur-btn row-action-btn" data-id="'+u.id+'" title="Son kullanım (ömür) tarihi">Ömür</button> ';
      h+='<button class="ur-duz-btn row-action-btn duzenle" data-id="'+u.id+'">&#9998;</button> ';
      h+='<button class="ur-sil-btn row-action-btn sil" data-id="'+u.id+'">&#10005;</button>';
      h+='</td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div></div>';

  h+='<div class="bk-modal-overlay hidden" id="ur-modal">';
  h+='<div class="modal-box modal-sm ur-urun-dialog">';
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
  h+='<div class="field-group"><label class="field-label">Kullanım sonu <span class="ur-opt">(isteğe bağlı)</span></label>';
  h+='<input type="date" id="ur-son-tarih" class="field-input"/></div>';
  h+='<p class="ur-field-hint">Boş bırakırsanız gün sayısı bugüne kadar hesaplanır. Doluysa günlük maliyet = fiyat ÷ (satın alma → bu güne kadar gün).</p>';
  h+='<div class="ur-hesap-panel" id="ur-hesap-panel"><div class="ur-hesap-baslik">Hesap</div><div class="ur-hesap-metin" id="ur-hesap-metin"></div></div>';
  h+='</div>';
  h+='<div class="modal-footer">';
  h+='<button class="btn-secondary" id="ur-iptal">İptal</button>';
  h+='<button class="btn-primary" id="ur-kaydet">Kaydet</button>';
  h+='</div></div></div>';

  h+='<div class="bk-modal-overlay hidden" id="ur-omur-modal">';
  h+='<div class="modal-box modal-sm ur-urun-dialog">';
  h+='<div class="modal-header">';
  h+='<h2 class="modal-title">Kullanım ömrü — son gün</h2>';
  h+='<button type="button" class="modal-close" id="ur-omur-kapat">&#10005;</button>';
  h+='</div>';
  h+='<div class="modal-body">';
  h+='<p class="ur-omur-aciklama" id="ur-omur-urun-ad"></p>';
  h+='<div class="field-group"><label class="field-label">Son kullanım tarihi</label>';
  h+='<input type="date" id="ur-omur-tarih" class="field-input"/></div>';
  h+='<p class="ur-field-hint">Günlük maliyet, satın alma tarihi ile bu son gün arasındaki gün sayısına bölünür (her iki gün dahil). Bu tarihten önce satın alma olamaz.</p>';
  h+='</div>';
  h+='<div class="modal-footer">';
  h+='<button type="button" class="btn-secondary" id="ur-omur-temizle">Temizle</button>';
  h+='<button type="button" class="btn-primary" id="ur-omur-kaydet">Kaydet</button>';
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
  $("ur-omur-kapat").addEventListener("click",omurKapat);
  $("ur-omur-modal").addEventListener("click",function(e){if(e.target===$("ur-omur-modal"))omurKapat();});
  $("ur-omur-kaydet").addEventListener("click",omurKaydet);
  $("ur-omur-temizle").addEventListener("click",omurTemizle);
  document.querySelectorAll(".ur-duz-btn").forEach(function(btn){
    btn.addEventListener("click",function(){modalAc(btn.dataset.id);});
  });
  document.querySelectorAll(".ur-omur-btn").forEach(function(btn){
    btn.addEventListener("click",function(){omurModalAc(btn.dataset.id);});
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
  var tEl=$("ur-tarih"),fEl=$("ur-fiyat"),sEl=$("ur-son-tarih");
  if(!tEl||!fEl)return;
  var t=tEl.value,f=parseFloat(fEl.value)||0;
  var son=sEl&&sEl.value?sEl.value:"";
  if(!t){el.innerHTML='<span class="ur-hesap-muted">Tarih seçin.</span>';return;}
  if(son&&son<t){
    el.innerHTML='<span class="ur-hesap-muted">Son tarih, satın alma tarihinden önce olamaz.</span>';
    return;
  }
  var gun=kullanimGunSayisi(t,son);
  if(f<=0){
    el.innerHTML='<div class="ur-hesap-line"><span class="ur-hesap-etik">Kullanım</span> <strong>'+gun+'</strong> gün <span class="ur-hesap-hint">'+(son?"(son: "+tarihFmt(son)+")":"(bugüne kadar)")+'</span></div>'+
      '<div class="ur-hesap-muted">Fiyat girince günlük maliyet = Fiyat ÷ gün hesaplanır.</div>';
    return;
  }
  var gl=gunlukMaliyet(t,f,son);
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
  $("ur-son-tarih").value="";
  if(id){
    var u=_urunler.find(function(x){return x.id===id;});
    if(u){
      $("ur-tarih").value=u.tarih;
      $("ur-urun").value=u.urun;
      $("ur-fiyat").value=u.fiyat;
      $("ur-son-tarih").value=u.sonTarih&&String(u.sonTarih).trim()?String(u.sonTarih).trim():"";
    }
  }
  $("ur-modal").classList.remove("hidden");
  var tIn=$("ur-tarih"),fIn=$("ur-fiyat"),sIn=$("ur-son-tarih");
  if(tIn&&fIn&&sIn){
    var upd=function(){modalHesapGuncelle();};
    tIn.oninput=upd;fIn.oninput=upd;sIn.oninput=upd;
    modalHesapGuncelle();
  }
  setTimeout(function(){$("ur-urun").focus();},100);
}

function modalKapat(){
  $("ur-modal").classList.add("hidden");
  _aktif=null;
}

function omurModalAc(id){
  _omurId=id;
  var u=_urunler.find(function(x){return x.id===id;});
  var adEl=$("ur-omur-urun-ad");
  if(adEl)adEl.textContent=u?'"'+u.urun+'" için son kullanım günü':'';
  $("ur-omur-tarih").value=u&&u.sonTarih&&String(u.sonTarih).trim()?String(u.sonTarih).trim():"";
  $("ur-omur-modal").classList.remove("hidden");
  setTimeout(function(){$("ur-omur-tarih").focus();},80);
}

function omurKapat(){
  $("ur-omur-modal").classList.add("hidden");
  _omurId=null;
}

async function omurKaydet(){
  if(!_omurId)return;
  var idx=_urunler.findIndex(function(x){return x.id===_omurId;});
  if(idx<0){omurKapat();return;}
  var son=($("ur-omur-tarih").value||"").trim();
  var u=_urunler[idx];
  if(son&&son<u.tarih){alert("Son tarih, satın alma tarihinden önce olamaz.");return;}
  if(son)_urunler[idx].sonTarih=son;
  else delete _urunler[idx].sonTarih;
  await fbKaydet();
  omurKapat();
  render();
}

async function omurTemizle(){
  if(!_omurId)return;
  var idx=_urunler.findIndex(function(x){return x.id===_omurId;});
  if(idx<0){omurKapat();return;}
  delete _urunler[idx].sonTarih;
  await fbKaydet();
  omurKapat();
  render();
}

async function kaydet(){
  var tarih=$("ur-tarih").value;
  var urun=($("ur-urun").value||"").trim();
  var fiyat=parseFloat($("ur-fiyat").value)||0;
  var sonRaw=($("ur-son-tarih").value||"").trim();
  if(!tarih){alert("Tarih giriniz.");return;}
  if(!urun){$("ur-urun").focus();return;}
  if(!fiyat||fiyat<=0){$("ur-fiyat").focus();return;}
  if(sonRaw&&sonRaw<tarih){alert("Kullanım sonu, satın alma tarihinden önce olamaz.");return;}
  var kayit={tarih:tarih,urun:urun,fiyat:fiyat};
  if(sonRaw)kayit.sonTarih=sonRaw;
  if(_aktif){
    var idx=_urunler.findIndex(function(x){return x.id===_aktif;});
    if(idx>=0){
      kayit.id=_aktif;
      _urunler[idx]=kayit;
    }
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
