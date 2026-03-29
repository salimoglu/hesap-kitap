/* kredi.js - Kredi Kartı Taksit Takip */
var KrediModule = (function() {
  var $ = function(id){return document.getElementById(id);};
  var _harcamalar = []; // [{id, kart, aciklama, tutar, taksit, baslangicAy, olusturma}]
  var _aktifDuzenle = null;

  var KARTLAR = ["Kart 1","Kart 2","Kart 3","Kart 4"];

  function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function buAy(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
  function ayEkle(ay,n){
    var p=ay.split("-");var y=parseInt(p[0]),m=parseInt(p[1])-1;
    var d=new Date(y,m+n,1);
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  }
  function ayFormat(ay){
    var AYLAR=["Ocak","Sub","Mar","Nis","May","Haz","Tem","Agu","Eyl","Eki","Kas","Ara"];
    var p=ay.split("-");return AYLAR[parseInt(p[1])-1]+" "+p[0];
  }
  function uid(){return "k"+Date.now()+"_"+Math.random().toString(36).substring(2,5);}

  /* Firebase */
  async function fbYukle(){
    if(typeof window._fbDb!=="undefined"&&window._fbDb){
      try{var s=await window._fbDb.ref("kredi_harcamalar").once("value");
        var d=s.val();_harcamalar=d?Object.values(d):[];}
      catch(e){_harcamalar=[];}
    } else {
      // localStorage fallback
      try{var ls=localStorage.getItem("kredi_harcamalar");
        _harcamalar=ls?JSON.parse(ls):[];}catch(e){_harcamalar=[];}
    }
  }
  async function fbKaydet(){
    if(typeof window._fbDb!=="undefined"&&window._fbDb){
      try{
        var obj={};
        _harcamalar.forEach(function(h){obj[h.id]=h;});
        await window._fbDb.ref("kredi_harcamalar").set(obj);
      }catch(e){}
    } else {
      try{localStorage.setItem("kredi_harcamalar",JSON.stringify(_harcamalar));}catch(e){}
    }
  }

  /* Taksit hesaplama: hangi aylarda ne kadar */
  function taksitAylari(h){
    var aylik = h.tutar / h.taksit;
    var aylar = [];
    for(var i=0;i<h.taksit;i++){
      aylar.push({ay:ayEkle(h.baslangicAy,i), tutar:aylik, taksitNo:i+1});
    }
    return aylar;
  }

  /* Kartları dışarıdan yönet */
  function kartlariYukle(){
    try{
      var ls = localStorage.getItem("kredi_kartlar");
      if(ls) KARTLAR = JSON.parse(ls);
    }catch(e){}
  }
  function kartlariKaydet(){
    try{localStorage.setItem("kredi_kartlar",JSON.stringify(KARTLAR));}catch(e){}
  }

  /* Aktif harcamalar (henüz bitmemiş) */
  function aktifHarcamalar(){
    var simdi = buAy();
    return _harcamalar.filter(function(h){
      var sonAy = ayEkle(h.baslangicAy, h.taksit-1);
      return sonAy >= simdi;
    });
  }

  /* RENDER */
  function render(){
    var c=$("kredi-container");if(!c)return;
    var simdi=buAy();

    // Tüm ayları topla (geçmiş dahil son 3 ay + gelecek 12 ay)
    var baslangic = ayEkle(simdi,-2);
    var bitis = ayEkle(simdi,12);
    var ayListesi=[];
    var ay=baslangic;
    while(ay<=bitis){ayListesi.push(ay);ay=ayEkle(ay,1);}

    // Ay-kart matrisi
    var matris={}; // {ay: {kart: [{h,taksitNo,aylik}]}}
    var ayToplamlar={}; // {ay: toplam}
    _harcamalar.forEach(function(h){
      taksitAylari(h).forEach(function(t){
        if(t.ay<baslangic||t.ay>bitis)return;
        if(!matris[t.ay])matris[t.ay]={};
        if(!matris[t.ay][h.kart])matris[t.ay][h.kart]=[];
        matris[t.ay][h.kart].push({h:h,taksitNo:t.taksitNo,aylik:t.tutar});
        ayToplamlar[t.ay]=(ayToplamlar[t.ay]||0)+t.tutar;
      });
    });

    // Toplam kalan borç
    var toplamKalan=0;
    _harcamalar.forEach(function(h){
      taksitAylari(h).forEach(function(t){
        if(t.ay>=simdi)toplamKalan+=t.tutar;
      });
    });

    var h='<div class="kk-wrap">';

    // Üst özet
    h+='<div class="kk-ozet-bar">';
    h+='<div class="kk-ozet-item">';
    h+='<div class="kk-ozet-label">BU AY ÖDEME</div>';
    h+='<div class="kk-ozet-val kk-red">'+para(ayToplamlar[simdi]||0)+' TL</div>';
    h+='</div>';
    h+='<div class="kk-ozet-item">';
    h+='<div class="kk-ozet-label">TOPLAM KALAN</div>';
    h+='<div class="kk-ozet-val kk-red">'+para(toplamKalan)+' TL</div>';
    h+='</div>';
    h+='<div class="kk-ozet-item">';
    h+='<div class="kk-ozet-label">AKTİF TAKSİT</div>';
    h+='<div class="kk-ozet-val">'+aktifHarcamalar().length+' adet</div>';
    h+='</div>';
    h+='<button class="kk-ekle-btn" id="kk-yeni-btn">+ Harcama Ekle</button>';
    h+='</div>';

    // Aylık tablo
    h+='<div class="kk-tablo-wrap">';
    h+='<table class="kk-tablo">';
    h+='<thead><tr>';
    h+='<th class="kk-th-ay">AY</th>';
    h+='<th class="kk-th-toplam">TOPLAM</th>';
    h+='<th class="kk-th-detay">DETAY</th>';
    h+='</tr></thead><tbody>';

    ayListesi.forEach(function(ay){
      var toplam=ayToplamlar[ay]||0;
      var isSimdi=ay===simdi;
      var isGecmis=ay<simdi;
      var rowCls=isSimdi?"kk-row-simdi":(isGecmis?"kk-row-gecmis":"kk-row-gelecek");
      h+='<tr class="kk-row '+rowCls+'">';
      h+='<td class="kk-td-ay">'+(isSimdi?"&#128197; ":"")+ayFormat(ay)+'</td>';
      h+='<td class="kk-td-toplam">'+(toplam>0?'<span class="kk-tutar">'+para(toplam)+' TL</span>':'-')+'</td>';
      h+='<td class="kk-td-detay">';
      if(matris[ay]){
        Object.keys(matris[ay]).sort().forEach(function(kart){
          h+='<div class="kk-kart-grup">';
          h+='<span class="kk-kart-adi">'+kart+':</span>';
          matris[ay][kart].forEach(function(item){
            h+='<span class="kk-harcama-chip" title="'+item.h.aciklama+' ('+item.taksitNo+'/'+item.h.taksit+')">';
            h+=item.h.aciklama.substring(0,15)+(item.h.aciklama.length>15?"...":"");
            h+=' <em>'+para(item.aylik)+' TL</em>';
            h+='<small>('+item.taksitNo+'/'+item.h.taksit+')</small>';
            h+='</span>';
          });
          h+='</div>';
        });
      }
      h+='</td></tr>';
    });
    h+='</tbody></table></div>';

    // Tüm harcamalar listesi
    h+='<div class="kk-liste-wrap">';
    h+='<div class="kk-liste-baslik">TÜM HARCAMALAR</div>';
    if(_harcamalar.length===0){
      h+='<div class="kk-bos">Henüz harcama yok</div>';
    } else {
      var sirali=[..._harcamalar].sort(function(a,b){return b.olusturma-a.olusturma;});
      sirali.forEach(function(item){
        var sonAy=ayEkle(item.baslangicAy,item.taksit-1);
        var bitti=sonAy<simdi;
        h+='<div class="kk-liste-row'+(bitti?" kk-bitti":"'")+'>';
        h+='<div class="kk-liste-sol">';
        h+='<div class="kk-liste-aciklama">'+item.aciklama+'</div>';
        h+='<div class="kk-liste-meta">'+item.kart+' • '+para(item.tutar)+' TL • '+item.taksit+' taksit • '+ayFormat(item.baslangicAy)+''dan itibaren'+(bitti?' • <span class="kk-bitti-badge">Bitti</span>':'')+'</div>';
        h+='</div>';
        h+='<div class="kk-liste-sag">';
        h+='<span class="kk-aylik-tutar">'+para(item.tutar/item.taksit)+' TL/ay</span>';
        h+='<button class="kk-sil-btn" data-id="'+item.id+'">&#10005;</button>';
        h+='</div></div>';
      });
    }
    h+='</div></div>';

    // Modal
    h+='<div class="kk-modal-overlay hidden" id="kk-modal">';
    h+='<div class="modal-box modal-sm">';
    h+='<div class="modal-header"><h2 class="modal-title" id="kk-modal-baslik">Harcama Ekle</h2>';
    h+='<button class="modal-close" id="kk-modal-kapat">&#10005;</button></div>';
    h+='<div class="modal-body">';
    // Kart seç
    h+='<div class="field-group"><label class="field-label">Kredi Kartı</label>';
    h+='<select id="kk-inp-kart" class="field-input">';
    KARTLAR.forEach(function(k){h+='<option value="'+k+'">'+k+'</option>';});
    h+='</select></div>';
    // Açıklama
    h+='<div class="field-group"><label class="field-label">Ürün / Açıklama</label>';
    h+='<input type="text" id="kk-inp-aciklama" class="field-input" placeholder="Örn: iPhone, Market..." maxlength="100"/></div>';
    // Toplam tutar
    h+='<div class="field-group"><label class="field-label">Toplam Tutar (TL)</label>';
    h+='<input type="number" id="kk-inp-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
    // Taksit sayısı
    h+='<div class="field-group"><label class="field-label">Taksit Sayısı</label>';
    h+='<select id="kk-inp-taksit" class="field-input">';
    [1,2,3,4,5,6,7,8,9,10,11,12,18,24,36].forEach(function(n){
      h+='<option value="'+n+'">'+n+' taksit'+(n===1?" (peşin)":"")+'</option>';
    });
    h+='</select></div>';
    // Başlangıç ayı
    h+='<div class="field-group"><label class="field-label">İlk Taksit Ayı</label>';
    h+='<input type="month" id="kk-inp-ay" class="field-input" value="'+buAy()+'"/></div>';
    // Hesaplanan
    h+='<div class="kk-hesap-preview" id="kk-preview"></div>';
    h+='</div>';
    h+='<div class="modal-footer">';
    h+='<button class="btn-secondary" id="kk-iptal">İptal</button>';
    h+='<button class="btn-primary" id="kk-kaydet">Ekle</button>';
    h+='</div></div></div>';

    c.innerHTML=h;
    bagla();
  }

  function bagla(){
    $("kk-yeni-btn").addEventListener("click",function(){
      $("kk-modal-baslik").textContent="Harcama Ekle";
      $("kk-inp-kart").value=KARTLAR[0];
      $("kk-inp-aciklama").value="";
      $("kk-inp-tutar").value="";
      $("kk-inp-taksit").value="1";
      $("kk-inp-ay").value=buAy();
      $("kk-preview").innerHTML="";
      $("kk-modal").classList.remove("hidden");
      setTimeout(function(){$("kk-inp-aciklama").focus();},100);
    });
    // Preview güncelle
    ["kk-inp-tutar","kk-inp-taksit"].forEach(function(id){
      $(id)&&$(id).addEventListener("input",guncellePrev);
    });
    $("kk-modal-kapat").addEventListener("click",function(){$("kk-modal").classList.add("hidden");});
    $("kk-iptal").addEventListener("click",function(){$("kk-modal").classList.add("hidden");});
    $("kk-modal").addEventListener("click",function(e){if(e.target===$("kk-modal"))$("kk-modal").classList.add("hidden");});
    $("kk-kaydet").addEventListener("click",kaydet);
    // Sil butonları
    document.querySelectorAll(".kk-sil-btn").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.stopPropagation();
        if(!confirm("Bu harcamayı silmek istiyor musunuz?"))return;
        _harcamalar=_harcamalar.filter(function(h){return h.id!==btn.dataset.id;});
        fbKaydet();render();
      });
    });
  }

  function guncellePrev(){
    var tutar=parseFloat($("kk-inp-tutar").value)||0;
    var taksit=parseInt($("kk-inp-taksit").value)||1;
    var prev=$("kk-preview");
    if(tutar>0){
      prev.innerHTML='<span>Aylık ödeme: <strong>'+para(tutar/taksit)+' TL</strong></span>';
    } else {
      prev.innerHTML="";
    }
  }

  async function kaydet(){
    var kart=$("kk-inp-kart").value;
    var aciklama=($("kk-inp-aciklama").value||"").trim();
    var tutar=parseFloat($("kk-inp-tutar").value)||0;
    var taksit=parseInt($("kk-inp-taksit").value)||1;
    var baslangicAy=$("kk-inp-ay").value;
    if(!aciklama){alert("Ürün/açıklama girin.");$("kk-inp-aciklama").focus();return;}
    if(!tutar||tutar<=0){alert("Geçerli tutar girin.");$("kk-inp-tutar").focus();return;}
    if(!baslangicAy){alert("Başlangıç ayı seçin.");return;}
    var yeni={id:uid(),kart:kart,aciklama:aciklama,tutar:tutar,taksit:taksit,baslangicAy:baslangicAy,olusturma:Date.now()};
    _harcamalar.push(yeni);
    await fbKaydet();
    $("kk-modal").classList.add("hidden");
    render();
  }

  async function init(){
    kartlariYukle();
    await fbYukle();
    render();
  }

  return{init:init};
})();
