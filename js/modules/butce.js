/* butce.js */
var ButceModule = (function() {
  var $ = function(id){return document.getElementById(id);};
  var AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
  var _aktifAy=new Date().getMonth();
  var _aktifYil=new Date().getFullYear();
  var _veri={};
  var _ozelSatirlar={};
  var _dragSrc=null;

  var YAPI=[
    {bolum:"gelir",baslik:"GELİR",satirlar:[
      {id:"salim_maas",label:"SALİM MAAŞ / TAHMİNİ"},
      {id:"bugra_maas",label:"BUĞRA MAAŞ / TAHMİNİ"},
      {id:"toplam_maas",label:"TOPLAM MAAŞ / TAHMİNİ",hesaplanan:true,hesapla:function(d){return (d.salim_maas||0)+(d.bugra_maas||0);}},
      {id:"gelecek_borc",label:"GELECEK OLAN BORÇLAR"},
      {id:"hedef_birikim",label:"HEDEF BİRİKİM (%40)",hesaplanan:true,hesapla:function(d){return Math.round(((d.salim_maas||0)+(d.bugra_maas||0)+(d.gelecek_borc||0))*0.40);}},
      {id:"zekat_tahmini",label:"ZEKAT TAHMİNİ (%2,5)",hesaplanan:true,hesapla:function(d){return Math.round(((d.salim_maas||0)+(d.bugra_maas||0)+(d.gelecek_borc||0))*0.025);}},
    ]},
    {bolum:"zorunlu",baslik:"ZORUNLU GİDERLER",satirlar:[
      {id:"mutfak",label:"MUTFAK"},{id:"kira",label:"KİRA"},{id:"iase",label:"İAŞE"},
      {id:"faturalar",label:"FATURALAR"},{id:"google_vs",label:"GOOGLE-YOUTUBE-SPOTIFY"},
      {id:"saglik",label:"SAĞLIK/GÖZLÜK"},{id:"zekat",label:"ZEKAT"},
      {id:"arac_bakim",label:"ARAÇ BAKIM"},{id:"arac_sigorta",label:"ARAÇ SİGORTA"},
      {id:"arac_muayene",label:"ARAÇ MUAYENE"},{id:"arac_mtv",label:"ARAÇ MTV"},{id:"mazot",label:"MAZOT"},
      {id:"zorunlu_top",label:"TOPLAM",hesaplanan:true,hesapla:function(d){
        var ids=["mutfak","kira","iase","faturalar","google_vs","saglik","zekat","arac_bakim","arac_sigorta","arac_muayene","arac_mtv","mazot"];
        var ozel=(_ozelSatirlar["zorunlu"]||[]).map(function(s){return s.id;});
        return ids.concat(ozel).reduce(function(s,k){return s+(d[k]||0);},0);
      }},
    ]},
    {bolum:"istege",baslik:"İSTEĞE BAĞLI GİDERLER",satirlar:[
      {id:"eglence",label:"EĞLENCE-YEMEK-EĞİTİM-HOBİ"},{id:"cocuk",label:"ÇOCUK"},
      {id:"giyim",label:"GİYİM"},{id:"kredi_kart_ev",label:"KREDİ KARTI (EV EŞYASI)"},{id:"oyle",label:"ÖYLE"},
      {id:"istege_top",label:"TOPLAM",hesaplanan:true,hesapla:function(d){
        var ids=["eglence","cocuk","giyim","kredi_kart_ev","oyle"];
        var ozel=(_ozelSatirlar["istege"]||[]).map(function(s){return s.id;});
        return ids.concat(ozel).reduce(function(s,k){return s+(d[k]||0);},0);
      }},
    ]},
    {bolum:"yatirim",baslik:"YATIRIM",satirlar:[
      {id:"bes",label:"BES"},{id:"fon",label:"FON / YATIRIM VS"},
      {id:"kardes_fon",label:"KARDESLER ORTAK FON"},{id:"vefa",label:"VEFA BİRLİĞİ"},
      {id:"nakit",label:"NAKİT KALAN"},{id:"atalira",label:"ATALİRA"},{id:"kripto",label:"KRİPTO"},
      {id:"yatirim_top",label:"TOPLAM",hesaplanan:true,hesapla:function(d){
        var ids=["bes","fon","kardes_fon","vefa","nakit","atalira","kripto"];
        var ozel=(_ozelSatirlar["yatirim"]||[]).map(function(s){return s.id;});
        return ids.concat(ozel).reduce(function(s,k){return s+(d[k]||0);},0);
      }},
    ]},
  ];

  function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function pct(n,top){if(!top)return "0,00";return ((n/top)*100).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function uid(){return "o"+Date.now()+"_"+Math.random().toString(36).substring(2,7);}

  function hesapla(){
    YAPI.forEach(function(b){b.satirlar.forEach(function(s){if(s.hesaplanan)_veri[s.id]=s.hesapla(_veri);});});
  }
  function toplamGelir(){return (_veri.salim_maas||0)+(_veri.bugra_maas||0)+(_veri.gelecek_borc||0);}
  function toplamHarcanan(){return (_veri.zorunlu_top||0)+(_veri.istege_top||0)+(_veri.yatirim_top||0);}

  async function veriYukle(){
    var key="butce_"+_aktifYil+"_"+(_aktifAy+1);
    _veri={};_ozelSatirlar={};
    if(typeof _fbDb!=="undefined"&&_fbDb){
      try{var snap=await _fbDb.ref(key).once("value");var d=snap.val()||{};_veri=d.veri||{};_ozelSatirlar=d.ozelSatirlar||{};}catch(e){}
    }
  }
  async function veriKaydet(){
    var key="butce_"+_aktifYil+"_"+(_aktifAy+1);
    if(typeof _fbDb!=="undefined"&&_fbDb){try{await _fbDb.ref(key).set({veri:_veri,ozelSatirlar:_ozelSatirlar});}catch(e){}}
  }

  function satirEkle(bolum){
    var label=prompt("Yeni satir adi:");
    if(!label||!label.trim())return;
    if(!_ozelSatirlar[bolum])_ozelSatirlar[bolum]=[];
    var max=_ozelSatirlar[bolum].length?Math.max.apply(null,_ozelSatirlar[bolum].map(function(s){return s.sira||0;})):0;
    var id=uid();
    _ozelSatirlar[bolum].push({id:id,label:label.trim().toUpperCase(),sira:max+1});
    _veri[id]=0;
    veriKaydet();render();
  }
  function satirSil(bolum,id){
    if(!confirm("Bu satiri silmek istiyor musunuz?"))return;
    if(_ozelSatirlar[bolum])_ozelSatirlar[bolum]=_ozelSatirlar[bolum].filter(function(s){return s.id!==id;});
    delete _veri[id];
    veriKaydet();render();
  }
  function satirRename(bolum,id){
    var s=(_ozelSatirlar[bolum]||[]).find(function(x){return x.id===id;});
    if(!s)return;
    var yeni=prompt("Yeni ad:",s.label);
    if(!yeni||!yeni.trim())return;
    s.label=yeni.trim().toUpperCase();
    veriKaydet();render();
  }

  function baglaOrtalama(bolum){
    var rows=document.querySelectorAll(".bt-satir-ozel[data-bolum='"+bolum+"']");
    rows.forEach(function(row){
      row.setAttribute("draggable","true");
      row.addEventListener("dragstart",function(e){_dragSrc=this;e.dataTransfer.effectAllowed="move";this.classList.add("bt-drag-active");});
      row.addEventListener("dragend",function(){this.classList.remove("bt-drag-active");document.querySelectorAll(".bt-drag-over").forEach(function(el){el.classList.remove("bt-drag-over");});});
      row.addEventListener("dragover",function(e){e.preventDefault();if(this!==_dragSrc)this.classList.add("bt-drag-over");});
      row.addEventListener("dragleave",function(){this.classList.remove("bt-drag-over");});
      row.addEventListener("drop",function(e){
        e.stopPropagation();this.classList.remove("bt-drag-over");
        if(_dragSrc===this)return;
        var srcId=_dragSrc.dataset.id,dstId=this.dataset.id;
        var list=_ozelSatirlar[bolum]||[];
        var si=list.findIndex(function(s){return s.id===srcId;});
        var di=list.findIndex(function(s){return s.id===dstId;});
        if(si<0||di<0)return;
        var rem=list.splice(si,1)[0];list.splice(di,0,rem);
        list.forEach(function(s,i){s.sira=i+1;});
        veriKaydet();render();
      });
    });
  }

  function buildRow(satir,gelir,isOzel,bolum){
    var val=_veri[satir.id]||0;
    var isTop=satir.label==="TOPLAM";
    var rowCls=isOzel?"bt-satir bt-satir-ozel":(satir.hesaplanan?(isTop?"bt-toplam-row":"bt-hesap-row"):"bt-satir");
    var attrs=isOzel?' draggable="true" data-id="'+satir.id+'" data-bolum="'+bolum+'"':'';
    var h='<tr class="'+rowCls+'"'+attrs+'>';
    h+='<td class="bt-col-sira">'+(isOzel?'<span class="bt-drag-handle" title="Surukle">&#8597;</span>':'')+'</td>';
    h+='<td class="bt-col-label">'+satir.label+'</td>';
    if(satir.hesaplanan){
      h+='<td class="bt-col-tutar" data-hesap="'+satir.id+'">'+para(val)+'</td>';
      h+='<td class="bt-col-pct" data-pct="'+satir.id+'">'+pct(val,gelir)+'</td>';
    } else {
      h+='<td class="bt-col-tutar"><input type="number" class="bt-input" data-id="'+satir.id+'" value="'+(val||"")+'" placeholder="0" min="0" step="0.01" inputmode="decimal"/></td>';
      h+='<td class="bt-col-pct" data-pct="'+satir.id+'">'+pct(val,gelir)+'</td>';
    }
    h+='<td class="bt-col-aksiyon">';
    if(isOzel){
      h+='<button class="bt-satir-btn bt-rename-btn" data-id="'+satir.id+'" data-bolum="'+bolum+'" title="Duzenle">&#9998;</button>';
      h+='<button class="bt-satir-btn bt-sil-btn" data-id="'+satir.id+'" data-bolum="'+bolum+'" title="Sil">&#10005;</button>';
    }
    h+='</td></tr>';
    return h;
  }

  function render(){
    hesapla();
    var container=$("butce-container");if(!container)return;
    var gelir=toplamGelir(),harcanan=toplamHarcanan(),kalan=gelir-harcanan;
    var h='';
    h+='<div class="butce-ay-bar">';
    h+='<button class="butce-ay-btn" id="butce-ay-geri">&#8249;</button>';
    h+='<span class="butce-ay-label">'+AYLAR[_aktifAy]+" "+_aktifYil+'</span>';
    h+='<button class="butce-ay-btn" id="butce-ay-ileri">&#8250;</button>';
    h+='<button class="butce-rapor-btn" id="butce-rapor-btn">&#8595; CSV İndir</button>';
    h+='</div>';
    h+='<div class="butce-tablo-wrap"><table class="butce-tablo">';
    h+='<thead><tr><th class="bt-col-sira"></th><th class="bt-col-label">KATEGORİ</th><th class="bt-col-tutar">TUTAR</th><th class="bt-col-pct">%</th><th class="bt-col-aksiyon"></th></tr></thead><tbody>';

    YAPI.forEach(function(bolum){
      h+='<tr class="bt-bolum-baslik"><td colspan="5">'+bolum.baslik+'</td></tr>';
      var topSatir=null;
      bolum.satirlar.forEach(function(s){
        if(s.label==="TOPLAM"){topSatir=s;return;}
        h+=buildRow(s,gelir,false,bolum.bolum);
      });
      var ozelList=(_ozelSatirlar[bolum.bolum]||[]).slice().sort(function(a,b){return (a.sira||0)-(b.sira||0);});
      ozelList.forEach(function(s){h+=buildRow(s,gelir,true,bolum.bolum);});
      h+='<tr class="bt-ekle-row"><td colspan="5"><button class="bt-ekle-btn" data-bolum="'+bolum.bolum+'">+ Satır Ekle</button></td></tr>';
      if(topSatir)h+=buildRow(topSatir,gelir,false,bolum.bolum);
    });

    h+='<tr class="bt-bolum-baslik"><td colspan="5">SONUÇ</td></tr>';
    h+='<tr class="bt-sonuc-row bt-harcanan"><td></td><td class="bt-col-label">TOPLAM HARCANAN</td><td class="bt-col-tutar" id="bt-harcanan-val">'+para(harcanan)+'</td><td class="bt-col-pct">'+pct(harcanan,gelir)+'</td><td></td></tr>';
    h+='<tr class="bt-sonuc-row '+(kalan>=0?"bt-kalan":"bt-kalan-negatif")+'" id="bt-kalan-row"><td></td><td class="bt-col-label">KALAN</td><td class="bt-col-tutar" id="bt-kalan-val">'+para(kalan)+'</td><td class="bt-col-pct" id="bt-kalan-pct">'+pct(kalan,gelir)+'</td><td></td></tr>';
    h+='</tbody></table></div>';
    container.innerHTML=h;
    baglaInputlar();baglaButtons();
    YAPI.forEach(function(b){baglaOrtalama(b.bolum);});
  }

  function guncelle(){
    hesapla();
    var gelir=toplamGelir(),harcanan=toplamHarcanan(),kalan=gelir-harcanan;
    document.querySelectorAll("[data-hesap]").forEach(function(el){el.textContent=para(_veri[el.dataset.hesap]||0);});
    document.querySelectorAll("[data-pct]").forEach(function(el){el.textContent=pct(_veri[el.dataset.pct]||0,gelir);});
    document.querySelectorAll(".bt-input").forEach(function(inp){
      var pctEl=inp.closest("tr").querySelector("[data-pct]");
      if(pctEl)pctEl.textContent=pct(parseFloat(inp.value)||0,gelir);
    });
    var hEl=$("bt-harcanan-val");if(hEl)hEl.textContent=para(harcanan);
    var kEl=$("bt-kalan-val");if(kEl)kEl.textContent=para(kalan);
    var kPct=$("bt-kalan-pct");if(kPct)kPct.textContent=pct(kalan,gelir);
    var kRow=$("bt-kalan-row");if(kRow)kRow.className="bt-sonuc-row "+(kalan>=0?"bt-kalan":"bt-kalan-negatif");
  }

  function baglaInputlar(){
    document.querySelectorAll(".bt-input").forEach(function(inp){
      inp.addEventListener("change",async function(){_veri[this.dataset.id]=parseFloat(this.value)||0;guncelle();await veriKaydet();});
      inp.addEventListener("keydown",function(e){if(e.key==="Enter"){var all=[...document.querySelectorAll(".bt-input")];var idx=all.indexOf(this);if(all[idx+1])all[idx+1].focus();}});
    });
  }

  function baglaButtons(){
    var g=$("butce-ay-geri"),i=$("butce-ay-ileri"),r=$("butce-rapor-btn");
    if(g)g.addEventListener("click",async function(){_aktifAy--;if(_aktifAy<0){_aktifAy=11;_aktifYil--;}await veriYukle();render();});
    if(i)i.addEventListener("click",async function(){_aktifAy++;if(_aktifAy>11){_aktifAy=0;_aktifYil++;}await veriYukle();render();});
    if(r)r.addEventListener("click",csvIndir);
    document.querySelectorAll(".bt-ekle-btn").forEach(function(btn){btn.addEventListener("click",function(){satirEkle(this.dataset.bolum);});});
    document.querySelectorAll(".bt-rename-btn").forEach(function(btn){btn.addEventListener("click",function(){satirRename(this.dataset.bolum,this.dataset.id);});});
    document.querySelectorAll(".bt-sil-btn").forEach(function(btn){btn.addEventListener("click",function(){satirSil(this.dataset.bolum,this.dataset.id);});});
  }

  function csvIndir(){
    hesapla();
    var gelir=toplamGelir(),harcanan=toplamHarcanan(),kalan=gelir-harcanan;
    var ay=AYLAR[_aktifAy]+" "+_aktifYil,rows=[];
    rows.push(["HESAP KITAP - AYLIK BUTCE"],[ay],[],["KATEGORI","TUTAR","YUZDE %"]);
    YAPI.forEach(function(b){
      rows.push([b.baslik,"",""]);
      b.satirlar.forEach(function(s){var v=_veri[s.id]||0;rows.push([s.label,v.toFixed(2),gelir?((v/gelir)*100).toFixed(2):"0.00"]);});
      (_ozelSatirlar[b.bolum]||[]).slice().sort(function(a,c){return (a.sira||0)-(c.sira||0);}).forEach(function(s){var v=_veri[s.id]||0;rows.push([s.label,v.toFixed(2),gelir?((v/gelir)*100).toFixed(2):"0.00"]);});
      rows.push([]);
    });
    rows.push(["SONUC","",""],["TOPLAM HARCANAN",harcanan.toFixed(2),gelir?((harcanan/gelir)*100).toFixed(2):"0.00"],["KALAN",kalan.toFixed(2),gelir?((kalan/gelir)*100).toFixed(2):"0.00"]);
    var csv=rows.map(function(r){return r.map(function(c){return '"'+c+'"';}).join(";");}).join("\n");
    var blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    var url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="butce_"+AYLAR[_aktifAy]+"_"+_aktifYil+".csv";a.click();URL.revokeObjectURL(url);
  }

  async function init(){await veriYukle();render();}
  return{init:init};
})();
