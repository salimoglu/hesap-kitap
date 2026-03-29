/* birikim.js */
var BirikimModule = (function() {
  var $ = function(id){return document.getElementById(id);};
  var _islemler = [];
  var _manuelIslemler = {}; // { kalemAd: [{id,tarih,tutar,aciklama}] }
  var _aktifKalem = null;

  function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function bugun(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function buAy(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
  function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}

  /* Firebase */
  async function fbYukle(){
    if(typeof _fbDb!=="undefined"&&_fbDb){
      try{var s=await _fbDb.ref("birikim_manuel").once("value");_manuelIslemler=s.val()||{};}
      catch(e){_manuelIslemler={};}
    }
  }
  async function fbKaydet(){
    if(typeof _fbDb!=="undefined"&&_fbDb){
      try{await _fbDb.ref("birikim_manuel").set(_manuelIslemler);}catch(e){}
    }
  }

  /* İşlemlerden BİRİKİM grubunu çek — grup adı kontrolü */
  function islemKalemleri(){
    var kalemler = {};
    _islemler.forEach(function(i){
      var kat = (i.kategori||"");
      var parca = kat.split(" - ");
      if(parca.length < 2) return;
      var grup = parca[0].trim().toUpperCase();
      var ad = parca.slice(1).join(" - ").trim();
      // Sadece BIRIKIM grubundakileri al
      if(grup !== "BIRIKIM" && grup !== "B\u0130R\u0130K\u0130M") return;
      if(!kalemler[ad]) kalemler[ad] = [];
      kalemler[ad].push({
        id:"db_"+i.id, tarih:i.tarih,
        tutar:parseFloat(i.tutar)||0,
        aciklama:i.aciklama||"",
        kaynak:"islem"
      });
    });
    return kalemler;
  }

  /* Manuel + İşlemler birleştir */
  function tumKalemler(){
    var islem = islemKalemleri();
    var manuel = _manuelIslemler;
    var kalemAdlari = new Set(Object.keys(islem).concat(Object.keys(manuel)));
    var sonuc = {};
    kalemAdlari.forEach(function(ad){
      var liste = [];
      (islem[ad]||[]).forEach(function(i){liste.push(i);});
      (manuel[ad]||[]).forEach(function(m){
        liste.push({id:m.id,tarih:m.tarih,tutar:parseFloat(m.tutar)||0,aciklama:m.aciklama||"",kaynak:"manuel"});
      });
      liste.sort(function(a,b){return b.tarih.localeCompare(a.tarih);});
      sonuc[ad] = liste;
    });
    return sonuc;
  }

  function render(){
    var c=$("birikim-container");if(!c)return;
    var kalemler = tumKalemler();
    var adlar = Object.keys(kalemler).sort();
    var toplamGenel = 0;
    adlar.forEach(function(ad){
      kalemler[ad].forEach(function(i){toplamGenel+=i.tutar;});
    });

    var h='<div class="bk-wrap">';
    h+='<div class="bk-header"><div class="bk-gt-label">TOPLAM B\u0130R\u0130K\u0130M</div>';
    h+='<div class="bk-gt-val">'+para(toplamGenel)+' TL</div></div>';

    if(adlar.length===0){
      h+='<div style="padding:40px;text-align:center;color:var(--text-muted)">';
      h+='<div style="font-size:40px;margin-bottom:12px">\uD83C\uDFE6</div>';
      h+='<div>\u0130\u015flemler b\u00f6l\u00fcm\u00fcnden B\u0130R\u0130K\u0130M grubuna i\u015flem girin</div>';
      h+='</div>';
    } else {
      h+='<div class="bk-kartlar">';
      var ay = buAy();
      adlar.forEach(function(ad){
        var liste = kalemler[ad];
        var toplam = liste.reduce(function(s,i){return s+i.tutar;},0);
        var buay = liste.filter(function(i){return i.tarih.startsWith(ay);}).reduce(function(s,i){return s+i.tutar;},0);

        h+='<div class="bk-kart">';
        h+='<div class="bk-kart-ust">';
        h+='<div class="bk-kart-info">';
        h+='<div class="bk-kart-label">'+ad+'</div>';
        h+='<div class="bk-kart-toplam">'+para(toplam)+' TL</div>';
        h+='</div>';
        h+='<button class="bk-ekle-btn" data-id="'+encodeURIComponent(ad)+'" title="Manuel ekle">+</button>';
        h+='</div>';
        h+='<div class="bk-kart-alt">';
        h+='<div class="bk-buay">Bu ay: <strong>'+(buay>0?"+":"")+para(buay)+' TL</strong></div>';

        if(liste.length){
          h+='<div class="bk-islem-liste">';
          liste.forEach(function(i){
            h+='<div class="bk-islem-row '+(i.kaynak==="manuel"?"bk-manuel":"bk-db")+'">';
            h+='<span class="bk-islem-tarih">'+tarihFmt(i.tarih)+'</span>';
            h+='<span class="bk-islem-aciklama">'+(i.aciklama||"")+'</span>';
            h+='<span class="bk-islem-tutar">'+para(i.tutar)+' TL</span>';
            if(i.kaynak==="manuel"){
              h+='<button class="bk-sil-btn" data-kalem="'+encodeURIComponent(ad)+'" data-id="'+i.id+'" title="Sil">&#10005;</button>';
            }
            h+='</div>';
          });
          h+='</div>';
        } else {
          h+='<div class="bk-bos">Hen\u00fcz i\u015flem yok</div>';
        }
        h+='</div></div>';
      });
      h+='</div>';
    }
    h+='</div>';

    /* Modal */
    h+='<div class="bk-modal-overlay hidden" id="bk-modal">';
    h+='<div class="modal-box modal-sm">';
    h+='<div class="modal-header"><h2 class="modal-title" id="bk-modal-baslik">Manuel Ekle</h2>';
    h+='<button class="modal-close" id="bk-modal-kapat">&#10005;</button></div>';
    h+='<div class="modal-body">';
    h+='<div class="field-group"><label class="field-label">Tarih</label>';
    h+='<input type="date" id="bk-inp-tarih" class="field-input" value="'+bugun()+'"/></div>';
    h+='<div class="field-group"><label class="field-label">Tutar (TL)</label>';
    h+='<input type="number" id="bk-inp-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
    h+='<div class="field-group"><label class="field-label">A\u00e7\u0131klama</label>';
    h+='<input type="text" id="bk-inp-aciklama" class="field-input" placeholder="\u0130ste\u011fe ba\u011fl\u0131..." maxlength="100"/></div>';
    h+='</div>';
    h+='<div class="modal-footer">';
    h+='<button class="btn-secondary" id="bk-iptal">\u0130ptal</button>';
    h+='<button class="btn-primary" id="bk-kaydet">Ekle</button>';
    h+='</div></div></div>';

    c.innerHTML = h;
    bagla();
  }

  function bagla(){
    /* + Ekle butonları */
    document.querySelectorAll(".bk-ekle-btn").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.stopPropagation();
        _aktifKalem = decodeURIComponent(btn.dataset.id);
        $("bk-modal-baslik").textContent = _aktifKalem+" - Manuel Ekle";
        $("bk-inp-tutar").value="";
        $("bk-inp-aciklama").value="";
        $("bk-inp-tarih").value=bugun();
        $("bk-modal").classList.remove("hidden");
        setTimeout(function(){$("bk-inp-tutar").focus();},100);
      });
    });
    /* Modal kapat */
    $("bk-modal-kapat").addEventListener("click",function(){$("bk-modal").classList.add("hidden");});
    $("bk-iptal").addEventListener("click",function(){$("bk-modal").classList.add("hidden");});
    $("bk-modal").addEventListener("click",function(e){if(e.target===$("bk-modal"))$("bk-modal").classList.add("hidden");});
    /* Kaydet */
    $("bk-kaydet").addEventListener("click",ekle);
    $("bk-inp-tutar").addEventListener("keydown",function(e){if(e.key==="Enter")ekle();});
    /* Sil */
    document.querySelectorAll(".bk-sil-btn").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.stopPropagation();
        if(!confirm("Bu kayd\u0131 silmek istiyor musunuz?"))return;
        var kalemAd=decodeURIComponent(btn.dataset.kalem);
        var id=btn.dataset.id;
        if(_manuelIslemler[kalemAd]){
          _manuelIslemler[kalemAd]=_manuelIslemler[kalemAd].filter(function(i){return i.id!==id;});
          if(_manuelIslemler[kalemAd].length===0) delete _manuelIslemler[kalemAd];
        }
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
    var aciklama=($("bk-inp-aciklama").value||"").trim();
    var uid="m"+Date.now()+"_"+Math.random().toString(36).substring(2,6);
    if(!_manuelIslemler[_aktifKalem])_manuelIslemler[_aktifKalem]=[];
    _manuelIslemler[_aktifKalem].push({id:uid,tarih:tarih,tutar:tutar,aciklama:aciklama});
    await fbKaydet();
    $("bk-modal").classList.add("hidden");
    render();
  }

  async function init(){
    _islemler = await IslemlerDB.getAll();
    await fbYukle();
    render();
  }

  return{init:init};
})();
