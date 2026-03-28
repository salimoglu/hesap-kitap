/* butce.js — Aylik Butce Planlama */
var ButceModule = (function() {
  var $ = function(id){return document.getElementById(id);};
  var AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
  var _aktifAy=new Date().getMonth();
  var _aktifYil=new Date().getFullYear();
  var _veri={};

  var YAPI=[
    {bolum:"gelir",baslik:"GELİR",satirlar:[
      {id:"salim_maas",   label:"SALİM MAAŞ / TAHMİNİ"},
      {id:"bugra_maas",   label:"BUĞRA MAAŞ / TAHMİNİ"},
      {id:"toplam_maas",  label:"TOPLAM MAAŞ / TAHMİNİ", hesaplanan:true, hesapla:function(d){return (d.salim_maas||0)+(d.bugra_maas||0);}},
      {id:"gelecek_borc", label:"GELECEK OLAN BORÇLAR"},
      {id:"hedef_birikim",label:"HEDEF BİRİKİM MİKTARI"},
      {id:"zekat_tahmini",label:"ZEKAT TAHMİNİ"},
    ]},
    {bolum:"zorunlu",baslik:"ZORUNLU GİDERLER",satirlar:[
      {id:"mutfak",       label:"MUTFAK"},
      {id:"kira",         label:"KİRA"},
      {id:"iase",         label:"İAŞE"},
      {id:"faturalar",    label:"FATURALAR (DOGALGAZ-ELEKTRİK-SU-TELEFON)"},
      {id:"google_vs",    label:"GOOGLE-YOUTUBE-SPOTLFY"},
      {id:"saglik",       label:"SAĞLIK/GÖZLÜK"},
      {id:"zekat",        label:"ZEKAT"},
      {id:"arac_bakim",   label:"ARAÇ BAKIM"},
      {id:"arac_sigorta", label:"ARAÇ SİGORTA"},
      {id:"arac_muayene", label:"ARAÇ MUAYENE"},
      {id:"arac_mtv",     label:"ARAÇ MTV"},
      {id:"mazot",        label:"MAZOT"},
      {id:"zorunlu_top",  label:"TOPLAM", hesaplanan:true, hesapla:function(d){
        return ["mutfak","kira","iase","faturalar","google_vs","saglik","zekat","arac_bakim","arac_sigorta","arac_muayene","arac_mtv","mazot"].reduce(function(s,k){return s+(d[k]||0);},0);
      }},
    ]},
    {bolum:"istege",baslik:"İSTEĞE BAĞLI GİDERLER",satirlar:[
      {id:"eglence",       label:"EĞLENCE-D.YEMEK-EĞİTİM-HOBİ VS"},
      {id:"cocuk",         label:"ÇOCUK"},
      {id:"giyim",         label:"GİYİM"},
      {id:"kredi_kart_ev", label:"KREDİ KARTI (EV EŞYASI)"},
      {id:"oyle",          label:"ÖYLE"},
      {id:"istege_top",    label:"TOPLAM", hesaplanan:true, hesapla:function(d){
        return ["eglence","cocuk","giyim","kredi_kart_ev","oyle"].reduce(function(s,k){return s+(d[k]||0);},0);
      }},
    ]},
    {bolum:"yatirim",baslik:"YATIRIM",satirlar:[
      {id:"bes",          label:"BES"},
      {id:"fon",          label:"FON / YATIRIM VS"},
      {id:"kardes_fon",   label:"KARDESLER ORTAK FON"},
      {id:"vefa",         label:"VEFA BİRLİĞİ"},
      {id:"nakit",        label:"NAKİT KALAN"},
      {id:"atalira",      label:"ATALİRA"},
      {id:"kripto",       label:"KRİPTO"},
      {id:"yatirim_top",  label:"TOPLAM", hesaplanan:true, hesapla:function(d){
        return ["bes","fon","kardes_fon","vefa","nakit","atalira","kripto"].reduce(function(s,k){return s+(d[k]||0);},0);
      }},
    ]},
  ];

  function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function pct(n,top){if(!top)return "0,00";return ((n/top)*100).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}

  function hesapla(){
    YAPI.forEach(function(b){
      b.satirlar.forEach(function(s){
        if(s.hesaplanan) _veri[s.id]=s.hesapla(_veri);
      });
    });
  }

  function toplamGelir(){return (_veri.salim_maas||0)+(_veri.bugra_maas||0)+(_veri.gelecek_borc||0);}
  function toplamHarcanan(){return (_veri.zorunlu_top||0)+(_veri.istege_top||0)+(_veri.yatirim_top||0);}

  async function veriYukle(){
    var key="butce_"+_aktifYil+"_"+(_aktifAy+1);
    _veri={};
    if(typeof _fbDb!=="undefined"&&_fbDb){
      try{var snap=await _fbDb.ref(key).once("value"); _veri=snap.val()||{};}catch(e){}
    }
  }

  async function veriKaydet(){
    var key="butce_"+_aktifYil+"_"+(_aktifAy+1);
    if(typeof _fbDb!=="undefined"&&_fbDb){
      try{await _fbDb.ref(key).set(_veri);}catch(e){}
    }
  }

  function render(){
    hesapla();
    var container=$("butce-container");
    if(!container)return;
    var gelir=toplamGelir();
    var harcanan=toplamHarcanan();
    var kalan=gelir-harcanan;
    var h="";
    h+='<div class="butce-ay-bar">';
    h+='<button class="butce-ay-btn" id="butce-ay-geri">&#8249;</button>';
    h+='<span class="butce-ay-label">'+AYLAR[_aktifAy]+" "+_aktifYil+"</span>";
    h+='<button class="butce-ay-btn" id="butce-ay-ileri">&#8250;</button>';
    h+='<button class="butce-rapor-btn" id="butce-rapor-btn">&#8595; CSV İndir</button>';
    h+="</div>";
    h+='<div class="butce-tablo-wrap">';
    h+='<table class="butce-tablo">';
    h+='<thead><tr>';
    h+='<th class="bt-col-label">KATEGORİ</th>';
    h+='<th class="bt-col-tutar">TAHMİNİ TUTAR</th>';
    h+='<th class="bt-col-pct">YÜZDE</th>';
    h+='</tr></thead><tbody>';
    YAPI.forEach(function(bolum){
      h+='<tr class="bt-bolum-baslik"><td colspan="3">'+bolum.baslik+"</td></tr>";
      bolum.satirlar.forEach(function(satir){
        var val=_veri[satir.id]||0;
        var isTop=satir.label==="TOPLAM";
        var rowCls=satir.hesaplanan?(isTop?"bt-toplam-row":"bt-hesap-row"):"bt-satir";
        h+='<tr class="'+rowCls+'">';
        h+='<td class="bt-col-label">'+satir.label+"</td>";
        if(satir.hesaplanan){
          h+='<td class="bt-col-tutar" data-hesap="'+satir.id+'">'+para(val)+"</td>";
          h+='<td class="bt-col-pct" data-pct="'+satir.id+'">'+pct(val,gelir)+"</td>";
        } else {
          h+='<td class="bt-col-tutar"><input type="number" class="bt-input" data-id="'+satir.id+'" value="'+( val||"" )+'" placeholder="0" min="0" step="0.01" inputmode="decimal"/></td>';
          h+='<td class="bt-col-pct" data-pct="'+satir.id+'">'+pct(val,gelir)+"</td>";
        }
        h+="</tr>";
      });
    });
    h+='<tr class="bt-bolum-baslik"><td colspan="3">SONUÇ</td></tr>';
    h+='<tr class="bt-sonuc-row bt-harcanan">';
    h+='<td class="bt-col-label">TOPLAM HARCANAN</td>';
    h+='<td class="bt-col-tutar" id="bt-harcanan-val">'+para(harcanan)+"</td>";
    h+='<td class="bt-col-pct">'+pct(harcanan,gelir)+"</td></tr>";
    h+='<tr class="bt-sonuc-row '+( kalan>=0?"bt-kalan":"bt-kalan-negatif" )+'" id="bt-kalan-row">';
    h+='<td class="bt-col-label">KALAN</td>';
    h+='<td class="bt-col-tutar" id="bt-kalan-val">'+para(kalan)+"</td>";
    h+='<td class="bt-col-pct" id="bt-kalan-pct">'+pct(kalan,gelir)+"</td></tr>";
    h+="</tbody></table></div>";
    container.innerHTML=h;
    baglaInputlar();
    baglaButtons();
  }

  function guncelle(){
    hesapla();
    var gelir=toplamGelir();
    var harcanan=toplamHarcanan();
    var kalan=gelir-harcanan;
    document.querySelectorAll("[data-hesap]").forEach(function(el){
      var v=_veri[el.dataset.hesap]||0;
      el.textContent=para(v);
    });
    document.querySelectorAll("[data-pct]").forEach(function(el){
      var v=_veri[el.dataset.pct]||0;
      el.textContent=pct(v,gelir);
    });
    document.querySelectorAll(".bt-input").forEach(function(inp){
      var pctEl=inp.closest("tr").querySelector("[data-pct]");
      if(pctEl) pctEl.textContent=pct(parseFloat(inp.value)||0,gelir);
    });
    var hEl=$("bt-harcanan-val"); if(hEl)hEl.textContent=para(harcanan);
    var kEl=$("bt-kalan-val"); if(kEl)kEl.textContent=para(kalan);
    var kPct=$("bt-kalan-pct"); if(kPct)kPct.textContent=pct(kalan,gelir);
    var kRow=$("bt-kalan-row");
    if(kRow)kRow.className="bt-sonuc-row "+(kalan>=0?"bt-kalan":"bt-kalan-negatif");
  }

  function baglaInputlar(){
    document.querySelectorAll(".bt-input").forEach(function(inp){
      inp.addEventListener("change",async function(){
        _veri[this.dataset.id]=parseFloat(this.value)||0;
        guncelle();
        await veriKaydet();
      });
      inp.addEventListener("keydown",function(e){
        if(e.key==="Enter"){
          var all=[...document.querySelectorAll(".bt-input")];
          var idx=all.indexOf(this);
          if(all[idx+1])all[idx+1].focus();
        }
      });
    });
  }

  function baglaButtons(){
    var g=$("butce-ay-geri");
    var i=$("butce-ay-ileri");
    var r=$("butce-rapor-btn");
    if(g)g.addEventListener("click",async function(){
      _aktifAy--; if(_aktifAy<0){_aktifAy=11;_aktifYil--;} await veriYukle(); render();
    });
    if(i)i.addEventListener("click",async function(){
      _aktifAy++; if(_aktifAy>11){_aktifAy=0;_aktifYil++;} await veriYukle(); render();
    });
    if(r)r.addEventListener("click",csvIndir);
  }

  function csvIndir(){
    hesapla();
    var gelir=toplamGelir();
    var harcanan=toplamHarcanan();
    var kalan=gelir-harcanan;
    var ay=AYLAR[_aktifAy]+" "+_aktifYil;
    var rows=[];
    rows.push(["HESAP KITAP - AYLIK BUTCE"]);
    rows.push([ay]);
    rows.push([]);
    rows.push(["KATEGORI","TAHMINI TUTAR","YUZDE %"]);
    YAPI.forEach(function(b){
      rows.push([b.baslik,"",""]);
      b.satirlar.forEach(function(s){
        var v=_veri[s.id]||0;
        rows.push([s.label,v.toFixed(2),gelir?((v/gelir)*100).toFixed(2):"0.00"]);
      });
      rows.push([]);
    });
    rows.push(["SONUC","",""]);
    rows.push(["TOPLAM HARCANAN",harcanan.toFixed(2),gelir?((harcanan/gelir)*100).toFixed(2):"0.00"]);
    rows.push(["KALAN",kalan.toFixed(2),gelir?((kalan/gelir)*100).toFixed(2):"0.00"]);
    var csv=rows.map(function(r){return r.map(function(c){return '"'+c+'"';}).join(";");}).join("\n");
    var bom="\uFEFF";
    var blob=new Blob([bom+csv],{type:"text/csv;charset=utf-8;"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url; a.download="butce_"+AYLAR[_aktifAy]+"_"+_aktifYil+".csv";
    a.click(); URL.revokeObjectURL(url);
  }

  async function init(){
    await veriYukle();
    render();
  }

  return {init:init};
})();
