/* birikim.js */
var BirikimModule = (function() {
  var $ = function(id){return document.getElementById(id);};
  var KALEMLER = [
    {id:"altin",    label:"ALTIN",               icon:"&#129351;", altin:true,  katEsles:["altin"]},
    {id:"nakit",    label:"NAKİT",           icon:"&#128181;", altin:false, katEsles:["nakit"]},
    {id:"bes",      label:"BES",                  icon:"&#128200;", altin:false, katEsles:["bes"]},
    {id:"vefa",     label:"VEFA DERNEĞİ",icon:"&#129309;", altin:false, katEsles:["vefa"]},
    {id:"kardes",   label:"KARDES FON",           icon:"&#128184;", altin:false, katEsles:["kardes"]},
    {id:"bireysel", label:"BİREYSEL FON",    icon:"&#128202;", altin:false, katEsles:["fon","bireysel"]},
  ];
  var _islemler=[], _manuelIslemler={}, _aktifKalem=null;

  function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function bugun(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function buAy(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
  function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}

  async function yukle(){
    _islemler=await IslemlerDB.getAll();
    if(typeof _fbDb!=="undefined"&&_fbDb){
      try{var snap=await _fbDb.ref("birikim_manuel").once("value");_manuelIslemler=snap.val()||{};}
      catch(e){_manuelIslemler={};}
    }
  }
  async function fbKaydet(){
    if(typeof _fbDb!=="undefined"&&_fbDb){
      try{await _fbDb.ref("birikim_manuel").set(_manuelIslemler);}catch(e){}
    }
  }

  function kalemIslemleri(kalem){
    var liste=[];
    _islemler.forEach(function(i){
      var kat=(i.kategori||"").toLowerCase();
      var esles=kalem.katEsles.some(function(k){return kat.includes(k.toLowerCase());});
      if(esles){
        liste.push({id:"db_"+i.id,tarih:i.tarih,tutar:parseFloat(i.tutar)||0,gram:null,aciklama:i.aciklama||"",kaynak:"islem"});
      }
    });
    (_manuelIslemler[kalem.id]||[]).forEach(function(m){
      liste.push({id:m.id,tarih:m.tarih,tutar:parseFloat(m.tutar)||0,gram:m.gram||null,aciklama:m.aciklama||"",kaynak:"manuel"});
    });
    liste.sort(function(a,b){return b.tarih.localeCompare(a.tarih);});
    return liste;
  }
  function kalemToplam(k){return kalemIslemleri(k).reduce(function(s,i){return s+i.tutar;},0);}
  function kalemGram(k){return kalemIslemleri(k).reduce(function(s,i){return s+(i.gram||0);},0);}
  function kalemBuAy(k){var ay=buAy();return kalemIslemleri(k).filter(function(i){return i.tarih.startsWith(ay);}).reduce(function(s,i){return s+i.tutar;},0);}

  function render(){
    var c=$("birikim-container");if(!c)return;
    var toplamGenel=KALEMLER.reduce(function(s,k){return s+kalemToplam(k);},0);
    var h='<div class="bk-wrap">';
    h+='<div class="bk-header">';
    h+='<div class="bk-gt-label">TOPLAM BİRİKİM</div>';
    h+='<div class="bk-gt-val">'+para(toplamGenel)+' TL</div>';
    h+='</div>';
    h+='<div class="bk-kartlar">';
    KALEMLER.forEach(function(kalem){
      var toplam=kalemToplam(kalem);
      var buay=kalemBuAy(kalem);
      var gram=kalem.altin?kalemGram(kalem):null;
      var islemler=kalemIslemleri(kalem);
      h+='<div class="bk-kart">';
      h+='<div class="bk-kart-ust">';
      h+='<span class="bk-kart-icon">'+kalem.icon+'</span>';
      h+='<div class="bk-kart-info">';
      h+='<div class="bk-kart-label">'+kalem.label+'</div>';
      h+='<div class="bk-kart-toplam">'+para(toplam)+' TL</div>';
      if(gram!==null)h+='<div class="bk-kart-gram">'+gram.toFixed(3)+' gram</div>';
      h+='</div>';
      h+='<button class="bk-ekle-btn" data-id="'+kalem.id+'">+</button>';
      h+='</div>';
      h+='<div class="bk-kart-alt">';
      h+='<div class="bk-buay">Bu ay: <strong>'+(buay>0?"+":"")+para(buay)+' TL</strong></div>';
      if(islemler.length){
        h+='<div class="bk-islem-liste">';
        islemler.slice(0,15).forEach(function(i){
          h+='<div class="bk-islem-row '+(i.kaynak==="manuel"?"bk-manuel":"bk-db")+'">';
          h+='<span class="bk-islem-tarih">'+tarihFmt(i.tarih)+'</span>';
          h+='<span class="bk-islem-aciklama">'+(i.aciklama||"")+'</span>';
          if(i.gram)h+='<span class="bk-islem-gram">'+i.gram.toFixed(3)+'g</span>';
          h+='<span class="bk-islem-tutar">'+para(i.tutar)+' TL</span>';
          if(i.kaynak==="manuel")h+='<button class="bk-sil-btn" data-kalem="'+kalem.id+'" data-id="'+i.id+'">&#10005;</button>';
          h+='</div>';
        });
        if(islemler.length>15)h+='<div class="bk-devam">+ '+(islemler.length-15)+' islem daha</div>';
        h+='</div>';
      } else {
        h+='<div class="bk-bos">Henüz işlem yok</div>';
      }
      h+='</div></div>';
    });
    h+='</div></div>';
    h+='<div class="bk-modal-overlay hidden" id="bk-modal">';
    h+='<div class="modal-box modal-sm">';
    h+='<div class="modal-header"><h2 class="modal-title" id="bk-modal-baslik">Manuel Ekle</h2>';
    h+='<button class="modal-close" id="bk-modal-kapat">&#10005;</button></div>';
    h+='<div class="modal-body">';
    h+='<div class="field-group"><label class="field-label">Tarih</label>';
    h+='<input type="date" id="bk-inp-tarih" class="field-input" value="'+bugun()+'"/></div>';
    h+='<div class="field-group"><label class="field-label">Tutar (TL)</label>';
    h+='<input type="number" id="bk-inp-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
    h+='<div class="field-group hidden" id="bk-gram-wrap"><label class="field-label">Gram</label>';
    h+='<input type="number" id="bk-inp-gram" class="field-input" placeholder="0.000" min="0" step="0.001"/></div>';
    h+='<div class="field-group"><label class="field-label">Açıklama</label>';
    h+='<input type="text" id="bk-inp-aciklama" class="field-input" placeholder="İsteğe bağlı..." maxlength="100"/></div>';
    h+='</div>';
    h+='<div class="modal-footer">';
    h+='<button class="btn-secondary" id="bk-iptal">İptal</button>';
    h+='<button class="btn-primary" id="bk-kaydet">Ekle</button>';
    h+='</div></div></div>';
    c.innerHTML=h;
    bagla();
  }

  function bagla(){
    document.querySelectorAll(".bk-ekle-btn").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.stopPropagation();
        _aktifKalem=btn.dataset.id;
        var kalem=KALEMLER.find(function(k){return k.id===_aktifKalem;});
        $("bk-modal-baslik").textContent=(kalem?kalem.label:"")+' - Manuel Ekle';
        var gw=$("bk-gram-wrap");
        if(gw)gw.classList.toggle("hidden",!kalem||!kalem.altin);
        $("bk-inp-tutar").value="";
        if($("bk-inp-gram"))$("bk-inp-gram").value="";
        $("bk-inp-aciklama").value="";
        $("bk-inp-tarih").value=bugun();
        $("bk-modal").classList.remove("hidden");
        setTimeout(function(){$("bk-inp-tutar").focus();},100);
      });
    });
    $("bk-modal-kapat").addEventListener("click",function(){$("bk-modal").classList.add("hidden");});
    $("bk-iptal").addEventListener("click",function(){$("bk-modal").classList.add("hidden");});
    $("bk-modal").addEventListener("click",function(e){if(e.target===$("bk-modal"))$("bk-modal").classList.add("hidden");});
    $("bk-kaydet").addEventListener("click",ekle);
    $("bk-inp-tutar").addEventListener("keydown",function(e){if(e.key==="Enter")ekle();});
    document.querySelectorAll(".bk-sil-btn").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.stopPropagation();
        if(!confirm("Bu kaydi silmek istiyor musunuz?"))return;
        var kid=btn.dataset.kalem,id=btn.dataset.id;
        if(_manuelIslemler[kid])_manuelIslemler[kid]=_manuelIslemler[kid].filter(function(i){return i.id!==id;});
        fbKaydet();render();
      });
    });
  }

  async function ekle(){
    if(!_aktifKalem)return;
    var tutar=parseFloat($("bk-inp-tutar").value)||0;
    var tarih=$("bk-inp-tarih").value;
    if(!tutar||tutar<=0){$("bk-inp-tutar").focus();return;}
    if(!tarih){alert("Tarih giriniz.");return;}
    var kalem=KALEMLER.find(function(k){return k.id===_aktifKalem;});
    var gram=null;
    if(kalem&&kalem.altin&&$("bk-inp-gram"))gram=parseFloat($("bk-inp-gram").value)||0;
    var aciklama=($("bk-inp-aciklama").value||"").trim();
    var uid="m"+Date.now()+"_"+Math.random().toString(36).substring(2,6);
    if(!_manuelIslemler[_aktifKalem])_manuelIslemler[_aktifKalem]=[];
    _manuelIslemler[_aktifKalem].push({id:uid,tarih:tarih,tutar:tutar,gram:gram,aciklama:aciklama});
    await fbKaydet();
    $("bk-modal").classList.add("hidden");
    render();
  }

  async function init(){await yukle();render();}
  return{init:init,yukle:yukle,render:render};
})();
