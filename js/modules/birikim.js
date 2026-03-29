/* birikim.js - Sadece islemlerden otomatik */
var BirikimModule = (function() {
  var $ = function(id){return document.getElementById(id);};
  var _islemler = [];

  function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function buAy(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
  function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}

  // BİRİKİM grubu altındaki işlemleri kategori adına göre grupla
  function birikimKalemleri(){
    var kalemler = {};
    _islemler.forEach(function(i){
      // kategori: "BIRIKIM - AltiN" veya "BES" gibi
      // BİRİKİM grubu kontrolü: kategori "BIRIKIM" veya grup eşleşmesi
      var kat = (i.kategori || "");
      var parca = kat.split(" - ");
      var grup = parca.length > 1 ? parca[0].trim().toUpperCase() : "";
      var ad = parca.length > 1 ? parca[1].trim() : kat.trim();

      // Grup BİRİKİM mi? veya doğrudan bilinen birikim kategorileri mi?
      var birikimGrubu = grup === "BIRIKIM" || grup === "B\u0130R\u0130K\u0130M";
      var birikimKelime = ["altin","bes","nakit","vefa","kardes","fon","birikim"]
        .some(function(k){return kat.toLowerCase().includes(k);});

      if(birikimGrubu || birikimKelime){
        var kalemAd = ad || kat;
        if(!kalemler[kalemAd]) kalemler[kalemAd] = [];
        kalemler[kalemAd].push(i);
      }
    });
    return kalemler;
  }

  function render(){
    var c = $("birikim-container");
    if(!c) return;

    var kalemler = birikimKalemleri();
    var kalemAdlari = Object.keys(kalemler).sort();
    var toplamGenel = 0;

    var h = '<div class="bk-wrap">';

    if(kalemAdlari.length === 0){
      h += '<div class="bk-bos-genel">';
      h += '<div style="font-size:48px;margin-bottom:12px">&#127974;</div>';
      h += '<div style="color:var(--text-secondary);font-size:15px;font-weight:700">Birikim i\u015flemi yok</div>';
      h += '<div style="color:var(--text-muted);font-size:12px;margin-top:6px">\u0130\u015flemler b\u00f6l\u00fcm\u00fcnden B\u0130R\u0130K\u0130M grubu alt\u0131na i\u015flem girin</div>';
      h += '</div></div>';
      c.innerHTML = h;
      return;
    }

    // Genel toplam hesapla
    kalemAdlari.forEach(function(ad){
      kalemler[ad].forEach(function(i){ toplamGenel += parseFloat(i.tutar)||0; });
    });

    h += '<div class="bk-header">';
    h += '<div class="bk-gt-label">TOPLAM B\u0130R\u0130K\u0130M</div>';
    h += '<div class="bk-gt-val">'+para(toplamGenel)+' TL</div>';
    h += '</div>';
    h += '<div class="bk-kartlar">';

    kalemAdlari.forEach(function(ad){
      var islemler = kalemler[ad];
      var toplam = islemler.reduce(function(s,i){return s+parseFloat(i.tutar)||0;},0);
      var ay = buAy();
      var buay = islemler.filter(function(i){return i.tarih.startsWith(ay);})
                         .reduce(function(s,i){return s+parseFloat(i.tutar)||0;},0);

      // Sıralı (en yeni önce)
      var sirali = islemler.slice().sort(function(a,b){return b.tarih.localeCompare(a.tarih);});

      h += '<div class="bk-kart">';
      h += '<div class="bk-kart-ust">';
      h += '<span class="bk-kart-icon">&#127974;</span>';
      h += '<div class="bk-kart-info">';
      h += '<div class="bk-kart-label">'+ad+'</div>';
      h += '<div class="bk-kart-toplam">'+para(toplam)+' TL</div>';
      h += '</div></div>';
      h += '<div class="bk-kart-alt">';
      h += '<div class="bk-buay">Bu ay: <strong>'+(buay>0?"+":"")+para(buay)+' TL</strong></div>';
      h += '<div class="bk-islem-liste">';
      sirali.forEach(function(i){
        h += '<div class="bk-islem-row bk-db">';
        h += '<span class="bk-islem-tarih">'+tarihFmt(i.tarih)+'</span>';
        h += '<span class="bk-islem-aciklama">'+(i.aciklama||"")+'</span>';
        h += '<span class="bk-islem-tutar">'+para(parseFloat(i.tutar)||0)+' TL</span>';
        h += '</div>';
      });
      h += '</div></div></div>';
    });

    h += '</div></div>';
    c.innerHTML = h;
  }

  async function init(){
    _islemler = await IslemlerDB.getAll();
    // Firebase'deki eski birikim_manuel verisini temizle
    if(typeof _fbDb !== "undefined" && _fbDb){
      try{ await _fbDb.ref("birikim_manuel").remove(); }catch(e){}
    }
    render();
  }

  return {init:init, render:function(){init();}};
})();
