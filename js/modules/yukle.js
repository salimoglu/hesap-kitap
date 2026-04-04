/* yukle.js - ButceModule + KrediModule */

/* ===== BUTCE MODULE ===== */
var ButceModule=(function(){
var $=function(id){return document.getElementById(id);};
var AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
var _ay=new Date().getMonth(),_yil=new Date().getFullYear(),_veri={},_ozel={};
var YAPI=[
  {b:"gelir",t:"GELİR",s:[
    {id:"salim_maas",l:"SALİM MAAŞ"},{id:"bugra_maas",l:"BUĞRA MAAŞ"},
    {id:"toplam_maas",l:"TOPLAM MAAŞ",h:true,fn:function(d){return(d.salim_maas||0)+(d.bugra_maas||0);}},
    {id:"gelecek_borc",l:"GELECEK BORÇLAR"},
    {id:"hedef_bir",l:"HEDEF BİRİKİM %40",h:true,fn:function(d){return Math.round(((d.salim_maas||0)+(d.bugra_maas||0)+(d.gelecek_borc||0))*0.40);}},
    {id:"zekat_tah",l:"ZEKAT TAHMİNİ %2.5",h:true,fn:function(d){return Math.round(((d.salim_maas||0)+(d.bugra_maas||0)+(d.gelecek_borc||0))*0.025);}},
  ]},
  {b:"zorunlu",t:"ZORUNLU GİDERLER",s:[
    {id:"mutfak",l:"MUTFAK"},{id:"kira",l:"KİRA"},{id:"iase",l:"İAŞE"},
    {id:"faturalar",l:"FATURALAR"},{id:"google_vs",l:"GOOGLE/YOUTUBE/SPOTIFY"},
    {id:"saglik",l:"SAĞLIK"},{id:"zekat",l:"ZEKAT"},
    {id:"arac_bakim",l:"ARAÇ BAKIM"},{id:"arac_sig",l:"ARAÇ SİGORTA"},
    {id:"arac_muay",l:"ARAÇ MUAYENE"},{id:"arac_mtv",l:"ARAÇ MTV"},{id:"mazot",l:"MAZOT"},
    {id:"z_top",l:"TOPLAM",h:true,fn:function(d){return ["mutfak","kira","iase","faturalar","google_vs","saglik","zekat","arac_bakim","arac_sig","arac_muay","arac_mtv","mazot"].concat((_ozel.zorunlu||[]).map(function(x){return x.id;})).reduce(function(s,k){return s+(d[k]||0);},0);}},
  ]},
  {b:"istege",t:"İSTEĞE BAĞLI",s:[
    {id:"eglence",l:"EĞLENCE/YEMEK"},{id:"cocuk",l:"ÇOCUK"},{id:"giyim",l:"GİYİM"},
    {id:"kk_ev",l:"KREDİ KARTİ"},{id:"oyle",l:"ÖYLE"},
    {id:"i_top",l:"TOPLAM",h:true,fn:function(d){return ["eglence","cocuk","giyim","kk_ev","oyle"].concat((_ozel.istege||[]).map(function(x){return x.id;})).reduce(function(s,k){return s+(d[k]||0);},0);}},
  ]},
  {b:"yatirim",t:"YATIRIM",s:[
    {id:"bes",l:"BES"},{id:"fon",l:"FON/YATIRIM"},{id:"kardes_fon",l:"KARDESLER FON"},
    {id:"vefa",l:"VEFA BİRLİĞİ"},{id:"nakit",l:"NAKİT KALAN"},
    {id:"atalira",l:"ATALİRA"},{id:"kripto",l:"KRİPTO"},
    {id:"y_top",l:"TOPLAM",h:true,fn:function(d){return ["bes","fon","kardes_fon","vefa","nakit","atalira","kripto"].concat((_ozel.yatirim||[]).map(function(x){return x.id;})).reduce(function(s,k){return s+(d[k]||0);},0);}},
  ]},
];
function bpara(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function bpct(n,t){if(!t)return"0,00";return((n/t)*100).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "o"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function hesapla(){YAPI.forEach(function(b){b.s.forEach(function(s){if(s.h)_veri[s.id]=s.fn(_veri);});});}
function gelir(){return(_veri.salim_maas||0)+(_veri.bugra_maas||0)+(_veri.gelecek_borc||0);}
function harcanan(){return(_veri.z_top||0)+(_veri.i_top||0)+(_veri.y_top||0);}
async function byukle(){var key="butce_"+_yil+"_"+(_ay+1);_veri={};_ozel={};if(typeof window._fbDb==="undefined"||!window._fbDb)return;try{var s=await window._fbDb.ref(key).once("value");var d=s.val()||{};_veri=d.veri||{};_ozel=d.ozel||{};}catch(e){}}
async function bkaydet(){var key="butce_"+_yil+"_"+(_ay+1);if(typeof window._fbDb==="undefined"||!window._fbDb)return;try{await window._fbDb.ref(key).set({veri:_veri,ozel:_ozel});}catch(e){}}
function satirEkle(bolum){var label=prompt("Yeni satır adı:");if(!label||!label.trim())return;if(!_ozel[bolum])_ozel[bolum]=[];var id=uid();_ozel[bolum].push({id:id,label:label.trim().toUpperCase()});_veri[id]=0;bkaydet();brender();}
function satirSil(bolum,id){if(!confirm("Silmek?"))return;if(_ozel[bolum])_ozel[bolum]=_ozel[bolum].filter(function(s){return s.id!==id;});delete _veri[id];bkaydet();brender();}
function brender(){
  hesapla();var c=$("butce-container");if(!c)return;
  var g=gelir(),hr=harcanan(),kalan=g-hr;
  var h='<div class="butce-ay-bar"><button class="butce-ay-btn" id="b-geri">&#8249;</button><span class="butce-ay-label">'+AYLAR[_ay]+" "+_yil+'</span><button class="butce-ay-btn" id="b-ileri">&#8250;</button><button class="butce-rapor-btn" id="b-csv">&#8595; CSV</button></div>';
  h+='<div class="butce-tablo-wrap"><table class="butce-tablo"><thead><tr><th></th><th class="bt-col-label">KATEGORİ</th><th class="bt-col-tutar">TUTAR</th><th class="bt-col-pct">%</th><th></th></tr></thead><tbody>';
  YAPI.forEach(function(bolum){
    h+='<tr class="bt-bolum-baslik"><td colspan="5">'+bolum.t+'</td></tr>';
    var top=null;
    bolum.s.forEach(function(s){if(s.l==="TOPLAM"){top=s;return;}var v=_veri[s.id]||0;h+='<tr class="'+(s.h?"bt-hesap-row":"bt-satir")+'"><td></td><td class="bt-col-label">'+s.l+'</td>';if(s.h){h+='<td class="bt-col-tutar" data-hesap="'+s.id+'">'+bpara(v)+'</td><td class="bt-col-pct">'+bpct(v,g)+'</td><td></td>';}else{h+='<td class="bt-col-tutar"><input type="number" class="bt-input" data-id="'+s.id+'" value="'+(v||"")+'" placeholder="0" min="0" step="0.01" inputmode="decimal"/></td><td class="bt-col-pct" data-pct="'+s.id+'">'+bpct(v,g)+'</td><td></td>';}h+='</tr>';});
    (_ozel[bolum.b]||[]).forEach(function(s){var v=_veri[s.id]||0;h+='<tr class="bt-satir"><td></td><td class="bt-col-label">'+s.label+'</td><td class="bt-col-tutar"><input type="number" class="bt-input" data-id="'+s.id+'" value="'+(v||"")+'" placeholder="0" min="0" step="0.01" inputmode="decimal"/></td><td class="bt-col-pct" data-pct="'+s.id+'">'+bpct(v,g)+'</td><td><button class="bt-sil-btn" data-bolum="'+bolum.b+'" data-id="'+s.id+'">&#10005;</button></td></tr>';});
    h+='<tr class="bt-ekle-row"><td colspan="5"><button class="bt-ekle-btn" data-bolum="'+bolum.b+'">+ Satır Ekle</button></td></tr>';
    if(top){var v=_veri[top.id]||0;h+='<tr class="bt-toplam-row"><td></td><td class="bt-col-label">'+top.l+'</td><td class="bt-col-tutar" data-hesap="'+top.id+'">'+bpara(v)+'</td><td class="bt-col-pct">'+bpct(v,g)+'</td><td></td></tr>';}
  });
  h+='<tr class="bt-bolum-baslik"><td colspan="5">SONUÇ</td></tr>';
  h+='<tr class="bt-hesap-row"><td></td><td class="bt-col-label">TOPLAM HARCANAN</td><td class="bt-col-tutar" id="bt-harcanan">'+bpara(hr)+'</td><td class="bt-col-pct">'+bpct(hr,g)+'</td><td></td></tr>';
  h+='<tr class="'+(kalan>=0?"bt-kalan-row":"bt-kalan-negatif-row")+'"><td></td><td class="bt-col-label">KALAN</td><td class="bt-col-tutar" id="bt-kalan">'+bpara(kalan)+'</td><td class="bt-col-pct" id="bt-kalan-pct">'+bpct(kalan,g)+'</td><td></td></tr>';
  h+='</tbody></table></div>';
  c.innerHTML=h;bbagla();
}
function bguncelle(){hesapla();var g=gelir(),hr=harcanan(),kalan=g-hr;document.querySelectorAll("[data-hesap]").forEach(function(el){el.textContent=bpara(_veri[el.dataset.hesap]||0);});document.querySelectorAll("[data-pct]").forEach(function(el){el.textContent=bpct(_veri[el.dataset.pct]||0,g);});var hEl=$("bt-harcanan");if(hEl)hEl.textContent=bpara(hr);var kEl=$("bt-kalan");if(kEl)kEl.textContent=bpara(kalan);var kPct=$("bt-kalan-pct");if(kPct)kPct.textContent=bpct(kalan,g);}
function bbagla(){document.querySelectorAll(".bt-input").forEach(function(inp){inp.addEventListener("change",async function(){_veri[this.dataset.id]=parseFloat(this.value)||0;bguncelle();await bkaydet();});inp.addEventListener("keydown",function(e){if(e.key==="Enter"){var all=[...document.querySelectorAll(".bt-input")];var i=all.indexOf(this);if(all[i+1])all[i+1].focus();}});});document.querySelectorAll(".bt-ekle-btn").forEach(function(btn){btn.addEventListener("click",function(){satirEkle(btn.dataset.bolum);});});document.querySelectorAll(".bt-sil-btn").forEach(function(btn){btn.addEventListener("click",function(){satirSil(btn.dataset.bolum,btn.dataset.id);});});var bg=$("b-geri"),bi=$("b-ileri");if(bg)bg.addEventListener("click",async function(){_ay--;if(_ay<0){_ay=11;_yil--;}await byukle();brender();});if(bi)bi.addEventListener("click",async function(){_ay++;if(_ay>11){_ay=0;_yil++;}await byukle();brender();});}
async function binit(){await byukle();brender();}
return{init:binit};
})();

/* ===== KREDİ MODULE ===== */
var KrediModule=(function(){
var $=function(id){return document.getElementById(id);};
var _h=[],_k=[],_aktif=null,_ay=new Date().getMonth(),_yil=new Date().getFullYear();
var AYLAR=["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];
function kpara(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "k"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function buAy(){return _yil+"-"+String(_ay+1).padStart(2,"0");}
function ayEkle(bas,n){var d=new Date(bas+"-01");d.setMonth(d.getMonth()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function ayInput(){return _yil+"-"+String(_ay+1).padStart(2,"0");}
async function kfbYukle(){if(typeof window._fbDb==="undefined"||!window._fbDb)return;try{var s=await window._fbDb.ref("kredi_harcamalar").once("value");var v=s.val();_h=v?Object.values(v):[];var sk=await window._fbDb.ref("kredi_kartlar").once("value");_k=sk.val()||[];}catch(e){_h=[];_k=[];}}
async function kfbKaydet(){if(typeof window._fbDb==="undefined"||!window._fbDb)return;try{var obj={};_h.forEach(function(x){obj[x.id]=x;});await window._fbDb.ref("kredi_harcamalar").set(obj);await window._fbDb.ref("kredi_kartlar").set(_k);}catch(e){}}
function taksitler(h){var r=[];for(var i=0;i<h.taksit;i++){r.push({ay:ayEkle(h.basTarih,i),tutar:h.tutar/h.taksit,no:i+1});}return r;}
function kartlar(){var s={};_h.forEach(function(h){s[h.kart]=1;});_k.forEach(function(k){s[k]=1;});return Object.keys(s).sort();}
function ayToplam(ay,kart){var t=0;_h.forEach(function(h){if(kart&&h.kart!==kart)return;taksitler(h).forEach(function(x){if(x.ay===ay)t+=x.tutar;});});return t;}
function kalanBorc(kart){var bugun=buAy(),t=0;_h.forEach(function(h){if(kart&&h.kart!==kart)return;taksitler(h).forEach(function(x){if(x.ay>=bugun)t+=x.tutar;});});return t;}
function ayDetay(ay){var liste=[];_h.forEach(function(h){taksitler(h).forEach(function(x){if(x.ay===ay)liste.push({id:h.id,kart:h.kart,aciklama:h.aciklama,taksitTutar:x.tutar,no:x.no,toplamTaksit:h.taksit});});});return liste.sort(function(a,b){return a.kart.localeCompare(b.kart);});}
function krender(){
  var c=$("kredi-container");if(!c)return;
  var aktifAy=buAy(),ayItems=ayDetay(aktifAy),ks=kartlar();
  var h='<div class="kr-wrap"><div class="kr-header"><div class="kr-ozet">';
  h+='<div class="kr-ozet-item"><span class="kr-oz-label">BU AY ÖDEME</span><span class="kr-oz-val" style="color:var(--red)">'+kpara(ayToplam(aktifAy,null))+' TL</span></div>';
  h+='<div class="kr-ozet-item"><span class="kr-oz-label">KALAN TOPLAM</span><span class="kr-oz-val" style="color:var(--gold)">'+kpara(kalanBorc(null))+' TL</span></div>';
  h+='</div><button class="kr-yeni-btn" id="kr-yeni-btn">+ Harcama Ekle</button></div>';
  if(ks.length){h+='<div class="kr-kart-ozet">';ks.forEach(function(kart){h+='<div class="kr-kart-chip"><div class="kr-chip-adi">'+kart+'</div><div class="kr-chip-buay">Bu ay: <b>'+kpara(ayToplam(aktifAy,kart))+' TL</b></div><div class="kr-chip-kalan">Kalan: '+kpara(kalanBorc(kart))+' TL</div></div>';});h+='</div>';}
  h+='<div class="kr-ay-bar"><button class="kr-ay-btn" id="kr-geri">&#8249;</button><span class="kr-ay-label">'+AYLAR[_ay]+" "+_yil+'</span><button class="kr-ay-btn" id="kr-ileri">&#8250;</button></div>';
  h+='<div class="kr-tablo-wrap">';
  if(!ayItems.length){h+='<div class="kr-bos">'+AYLAR[_ay]+' '+_yil+' için ödeme yok</div>';}
  else{h+='<table class="kr-tablo"><thead><tr><th>KART</th><th>AÇIKLAMA</th><th>TAKSTİT</th><th>TUTAR</th><th></th></tr></thead><tbody>';ayItems.forEach(function(r){h+='<tr><td class="kr-td-kart">'+r.kart+'</td><td class="kr-td-aciklama">'+r.aciklama+'</td><td class="kr-td-no" style="text-align:center">'+r.no+'/'+r.toplamTaksit+'</td><td class="kr-td-tutar">'+kpara(r.taksitTutar)+' TL</td><td><button class="kr-duz-btn row-action-btn duzenle" data-id="'+r.id+'">&#9998;</button> <button class="kr-sil-btn row-action-btn sil" data-id="'+r.id+'">&#10005;</button></td></tr>';});h+='</tbody></table>';}
  h+='</div></div>';
  h+='<div class="bk-modal-overlay hidden" id="kr-modal"><div class="modal-box modal-sm"><div class="modal-header"><h2 class="modal-title" id="kr-modal-baslik">Harcama Ekle</h2><button class="modal-close" id="kr-modal-kapat">&#10005;</button></div><div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Kart Adı</label><input type="text" id="kr-kart" class="field-input" placeholder="Garanti..." list="kr-dl" autocomplete="off"/><datalist id="kr-dl">'+ks.map(function(k){return'<option value="'+k+'"/>';}).join('')+'</datalist></div>';
  h+='<div class="field-group"><label class="field-label">Açıklama</label><input type="text" id="kr-aciklama" class="field-input" placeholder="Ürün/hizmet" maxlength="100"/></div>';
  h+='<div class="field-group"><label class="field-label">Toplam Tutar (TL)</label><input type="number" id="kr-tutar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="field-group"><label class="field-label">Taksit Sayısı</label><input type="number" id="kr-taksit" class="field-input" value="1" min="1" max="60"/></div>';
  h+='<div class="field-group"><label class="field-label">1. Taksit Ayı</label><input type="month" id="kr-bastarihi" class="field-input" value="'+ayInput()+'"/></div>';
  h+='</div><div class="modal-footer"><button class="btn-secondary" id="kr-iptal">İptal</button><button class="btn-primary" id="kr-kaydet">Kaydet</button></div></div></div>';
  c.innerHTML=h;kbagla();
}
function kbagla(){
  $("kr-yeni-btn").addEventListener("click",function(){kmodalAc(null);});
  $("kr-modal-kapat").addEventListener("click",kmodalKapat);$("kr-iptal").addEventListener("click",kmodalKapat);
  $("kr-modal").addEventListener("click",function(e){if(e.target===$("kr-modal"))kmodalKapat();});
  $("kr-kaydet").addEventListener("click",kkaydet);
  $("kr-geri").addEventListener("click",function(){_ay--;if(_ay<0){_ay=11;_yil--;}krender();});
  $("kr-ileri").addEventListener("click",function(){_ay++;if(_ay>11){_ay=0;_yil++;}krender();});
  document.querySelectorAll(".kr-duz-btn").forEach(function(btn){btn.addEventListener("click",function(){kmodalAc(btn.dataset.id);});});
  document.querySelectorAll(".kr-sil-btn").forEach(function(btn){btn.addEventListener("click",function(){if(!confirm("Silmek?"))return;_h=_h.filter(function(x){return x.id!==btn.dataset.id;});kfbKaydet();krender();});});
}
function kmodalAc(id){_aktif=id;$("kr-modal-baslik").textContent=id?"Düzenle":"Harcama Ekle";if(id){var x=_h.find(function(h){return h.id===id;});if(x){$("kr-kart").value=x.kart;$("kr-aciklama").value=x.aciklama;$("kr-tutar").value=x.tutar;$("kr-taksit").value=x.taksit;$("kr-bastarihi").value=x.basTarih;}}else{$("kr-kart").value="";$("kr-aciklama").value="";$("kr-tutar").value="";$("kr-taksit").value="1";$("kr-bastarihi").value=ayInput();}$("kr-modal").classList.remove("hidden");setTimeout(function(){$("kr-kart").focus();},100);}
function kmodalKapat(){$("kr-modal").classList.add("hidden");_aktif=null;}
async function kkaydet(){var kart=($("kr-kart").value||"").trim(),aciklama=($("kr-aciklama").value||"").trim(),tutar=parseFloat($("kr-tutar").value)||0,taksit=parseInt($("kr-taksit").value)||1,basTarih=$("kr-bastarihi").value;if(!kart||!aciklama||!tutar||!basTarih)return;if(_k.indexOf(kart)<0)_k.push(kart);if(_aktif){var i=_h.findIndex(function(x){return x.id===_aktif;});if(i>=0)_h[i]={id:_aktif,kart:kart,aciklama:aciklama,tutar:tutar,taksit:taksit,basTarih:basTarih};}else{_h.push({id:uid(),kart:kart,aciklama:aciklama,tutar:tutar,taksit:taksit,basTarih:basTarih});}await kfbKaydet();kmodalKapat();krender();}
async function kinit(){await kfbYukle();krender();}
return{init:kinit};
})();


/* ===== ALTIN MODULE ===== */
var AltinModule=(function(){
var $=function(id){return document.getElementById(id);};
var _kayitlar=[],_aktif=null,_filtre="TUMU",_guncelGramFiyat=0;

function apara(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function agr(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function auid(){return "alt"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function atarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}

/* Guncel gram altin fiyati cek */
async function guncelAltinCek(){
  try{
    var r=await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json");
    var d=await r.json();
    var tryPerOz=d&&d.xau&&d.xau.try;
    if(tryPerOz&&tryPerOz>100){
      _guncelGramFiyat=tryPerOz/31.1035;
      return _guncelGramFiyat;
    }
  }catch(e){}
  return _guncelGramFiyat||0;
}

async function afbYukle(){
  if(typeof window._fbDb==="undefined"||!window._fbDb)return;
  try{
    var s=await window._fbDb.ref("altin_kayitlar").once("value");
    var v=s.val();
    _kayitlar=v?Object.values(v):[];
    _kayitlar.sort(function(a,b){return (a.tarih||"").localeCompare(b.tarih||"");});
    /* Kayıtlı güncel fiyat */
    var sf=await window._fbDb.ref("altin_guncel_fiyat").once("value");
    _guncelGramFiyat=sf.val()||0;
  }catch(e){_kayitlar=[];}
}
async function afbKaydet(){
  if(typeof window._fbDb==="undefined"||!window._fbDb)return;
  try{
    var obj={};_kayitlar.forEach(function(x){obj[x.id]=x;});
    await window._fbDb.ref("altin_kayitlar").set(obj);
  }catch(e){}
}
async function afbFiyatKaydet(f){
  if(typeof window._fbDb==="undefined"||!window._fbDb)return;
  try{await window._fbDb.ref("altin_guncel_fiyat").set(f);}catch(e){}
}

function filtreliListe(){
  if(_filtre==="TUMU")return _kayitlar;
  return _kayitlar.filter(function(k){return k.nerdeKullanildi===_filtre;});
}
function kullanımSecenekleri(){
  var set={};
  _kayitlar.forEach(function(k){if(k.nerdeKullanildi)set[k.nerdeKullanildi]=1;});
  return Object.keys(set).sort();
}

async function durumToggle(id){
  var k=_kayitlar.find(function(x){return x.id===id;});
  if(!k)return;
  k.durum=(k.durum==="satildi")?"elimde":"satildi";
  await afbKaydet();arender();
}

function arender(){
  var c=$("altin-container");if(!c)return;
  var liste=filtreliListe();

  /* Tüm kayıtlar özeti */
  var genelAdet=_kayitlar.reduce(function(s,k){return s+(parseFloat(k.adet)||0);},0);
  var genelGram=_kayitlar.reduce(function(s,k){return s+(parseFloat(k.gram)||0);},0);
  var genelTL=_kayitlar.reduce(function(s,k){return s+(parseFloat(k.tlKarsiligi)||0);},0);
  var genelOrt=genelGram>0?(genelTL/genelGram):0;

  /* Elimdeki özeti */
  var elimde=_kayitlar.filter(function(k){return !k.durum||k.durum==="elimde";});
  var elimdeGram=elimde.reduce(function(s,k){return s+(parseFloat(k.gram)||0);},0);
  var elimdeMaliyet=elimde.reduce(function(s,k){return s+(parseFloat(k.tlKarsiligi)||0);},0);
  var elimdeGuncelDeger=_guncelGramFiyat>0?(elimdeGram*_guncelGramFiyat):0;
  var elimdeKarZarar=elimdeGuncelDeger-elimdeMaliyet;
  var elimdeKarPct=elimdeMaliyet>0?((elimdeKarZarar/elimdeMaliyet)*100):0;

  var h='<div class="alt-wrap">';

  /* Header — özet kartlar */
  h+='<div class="alt-header">';
  /* Bölüm 1: Tüm altın */
  h+='<div class="alt-ozet-bolum">';
  h+='<div class="alt-ozet-baslik">TÜM ALTINIM</div>';
  h+='<div class="alt-ozet">';
  h+='<div class="alt-oz-item"><span class="alt-oz-label">TOPLAM ADET</span><span class="alt-oz-val">'+genelAdet+'</span></div>';
  h+='<div class="alt-oz-item"><span class="alt-oz-label">TOPLAM GRAM</span><span class="alt-oz-val" style="color:var(--gold)">'+agr(genelGram)+' gr</span></div>';
  h+='<div class="alt-oz-item"><span class="alt-oz-label">TOPLAM ÖDENEN</span><span class="alt-oz-val">'+apara(genelTL)+' TL</span></div>';
  h+='<div class="alt-oz-item"><span class="alt-oz-label">ORT. GRAM FİYATI</span><span class="alt-oz-val">'+apara(genelOrt)+' TL</span></div>';
  h+='</div></div>';

  h+='<div class="alt-ozet-ayrac"></div>';

  /* Bölüm 2: Elimdeki + güncel değer */
  h+='<div class="alt-ozet-bolum">';
  h+='<div class="alt-ozet-baslik alt-elimde-baslik">&#127950; ELİMDEKİ ALTIN</div>';
  h+='<div class="alt-ozet">';
  h+='<div class="alt-oz-item"><span class="alt-oz-label">GRAM</span><span class="alt-oz-val" style="color:var(--gold)">'+agr(elimdeGram)+' gr</span></div>';
  h+='<div class="alt-oz-item"><span class="alt-oz-label">MALİYET</span><span class="alt-oz-val">'+apara(elimdeMaliyet)+' TL</span></div>';
  if(_guncelGramFiyat>0){
    h+='<div class="alt-oz-item"><span class="alt-oz-label">GÜNCEL DEĞER</span><span class="alt-oz-val" style="color:var(--gold)">'+apara(elimdeGuncelDeger)+' TL</span></div>';
    var karRenk=elimdeKarZarar>=0?"var(--green)":"var(--red)";
    var karIsaret=elimdeKarZarar>=0?"+":"";
    h+='<div class="alt-oz-item"><span class="alt-oz-label">KAR / ZARAR</span>';
    h+='<span class="alt-oz-val" style="color:'+karRenk+'">'+karIsaret+apara(elimdeKarZarar)+' TL';
    h+='<span style="font-size:12px;margin-left:4px">('+karIsaret+elimdeKarPct.toFixed(1)+'%)</span></span></div>';
  }
  h+='</div></div>';

  /* Güncel fiyat göstergesi + güncelle butonu */
  h+='<div class="alt-fiyat-kutu">';
  h+='<span class="alt-fiyat-label">GRAM ALTIN</span>';
  h+='<span class="alt-fiyat-val" id="alt-fiyat-val">'+(_guncelGramFiyat>0?apara(_guncelGramFiyat)+' TL':'Yükleniyor...')+'</span>';
  h+='<button class="alt-fiyat-guncelle" id="alt-fiyat-guncelle" title="Fiyatı güncelle">&#8635;</button>';
  h+='</div>';
  h+='<button class="alt-yeni-btn" id="alt-yeni-btn">+ Altın Ekle</button>';
  h+='</div>';

  /* Filtre */
  var secenekler=kullanımSecenekleri();
  h+='<div class="alt-filtre-satir">';
  h+='<div class="alt-filtre-grup"><label class="alt-filtre-label">NEREDE KULLANILDI</label>';
  h+='<select class="alt-filtre-select" id="alt-filtre-nerde">';
  h+='<option value="TUMU">Tümü ('+_kayitlar.length+')</option>';
  secenekler.forEach(function(s){
    var sayi=_kayitlar.filter(function(k){return k.nerdeKullanildi===s;}).length;
    h+='<option value="'+s+'"'+(_filtre===s?" selected":"")+'>'+s+' ('+sayi+')</option>';
  });
  h+='</select></div>';
  if(_filtre!=="TUMU"){
    var fGram=liste.reduce(function(s,k){return s+(parseFloat(k.gram)||0);},0);
    var fTL=liste.reduce(function(s,k){return s+(parseFloat(k.tlKarsiligi)||0);},0);
    h+='<div class="alt-filtre-ozet-inline">'+liste.length+' kayıt &nbsp;·&nbsp; <b>'+agr(fGram)+' gr</b> &nbsp;·&nbsp; <b>'+apara(fTL)+' TL</b></div>';
  }
  h+='</div>';

  /* Tablo */
  h+='<div class="alt-tablo-dis"><table class="alt-tablo"><thead><tr>';
  h+='<th>DURUM</th><th>TARİH</th><th>ADET</th><th>GRAM</th><th>TL KARŞILIĞI</th><th>GRAM FİYATI</th><th>NASIL ALINDI</th><th>NEREDE KULLANILDI</th><th></th>';
  h+='</tr></thead><tbody>';
  if(!liste.length){
    h+='<tr><td colspan="9" class="alt-bos">Kayıt bulunamadı</td></tr>';
  } else {
    liste.forEach(function(k){
      var gF=k.gram>0?(k.tlKarsiligi/k.gram):0;
      var satildi=k.durum==="satildi";
      h+='<tr class="alt-satir'+(satildi?" alt-satir-satildi":"")+'">';
      h+='<td class="alt-td-durum"><button class="alt-durum-btn '+(satildi?"alt-satildi-btn":"alt-elimde-btn")+'" data-id="'+k.id+'">'+(satildi?"SATILDI":"ELİMDE")+'</button></td>';
      h+='<td class="alt-td-tarih">'+atarihFmt(k.tarih)+'</td>';
      h+='<td style="text-align:center;color:var(--text-muted)">'+k.adet+'</td>';
      h+='<td class="alt-td-gram">'+agr(k.gram)+' gr</td>';
      h+='<td class="alt-td-tl">'+apara(k.tlKarsiligi)+' TL</td>';
      h+='<td class="alt-td-gf">'+apara(gF)+' TL</td>';
      h+='<td class="alt-td-nasil">'+k.nasilAlindi+'</td>';
      h+='<td><span class="alt-tag">'+k.nerdeKullanildi+'</span></td>';
      h+='<td class="alt-td-aks"><button class="alt-duz-btn row-action-btn duzenle" data-id="'+k.id+'">&#9998;</button> <button class="alt-sil-btn row-action-btn sil" data-id="'+k.id+'">&#10005;</button></td>';
      h+='</tr>';
    });
  }
  h+='</tbody></table></div></div>';

  /* Modal */
  var bugun=new Date().toISOString().split("T")[0];
  h+='<div class="bk-modal-overlay hidden" id="alt-modal"><div class="modal-box" style="max-width:480px">';
  h+='<div class="modal-header"><h2 class="modal-title" id="alt-modal-baslik">Altın Ekle</h2><button class="modal-close" id="alt-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Tarih</label><input type="date" id="alt-tarih" class="field-input" value="'+bugun+'"/></div>';
  h+='<div class="field-group"><label class="field-label">Adet</label><input type="number" id="alt-adet" class="field-input" placeholder="1" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="field-group"><label class="field-label">Gram</label><input type="number" id="alt-gram" class="field-input" placeholder="7.20" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="field-group"><label class="field-label">TL Karşılığı</label><input type="number" id="alt-tl" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='<div class="field-group"><label class="field-label">Nasıl Alındı</label><input type="text" id="alt-nasil" class="field-input" placeholder="Nakit, Kredi Kartı..." maxlength="100"/></div>';
  h+='<div class="field-group"><label class="field-label">Nerede Kullanıldı</label><input type="text" id="alt-nerde" class="field-input" placeholder="Seç veya yaz..." list="alt-nerde-dl" autocomplete="off"/><datalist id="alt-nerde-dl">';
  secenekler.forEach(function(s){h+='<option value="'+s+'"/>';});
  h+='</datalist></div>';
  h+='<div class="field-group"><label class="field-label">Durum</label><div style="display:flex;gap:10px;margin-top:4px">';
  h+='<button class="alt-modal-durum-btn active" id="alt-modal-elimde" data-d="elimde">&#127950; Elimde</button>';
  h+='<button class="alt-modal-durum-btn" id="alt-modal-satildi" data-d="satildi">Satıldı</button>';
  h+='</div><input type="hidden" id="alt-durum-val" value="elimde"/></div>';
  h+='</div>';
  h+='<div class="modal-footer"><button class="btn-secondary" id="alt-iptal">İptal</button><button class="btn-primary" id="alt-kaydet">Kaydet</button></div>';
  h+='</div></div>';

  c.innerHTML=h;
  abagla();
}

function abagla(){
  $("alt-yeni-btn").addEventListener("click",function(){amodalAc(null);});
  $("alt-modal-kapat").addEventListener("click",amodalKapat);
  $("alt-iptal").addEventListener("click",amodalKapat);
  $("alt-modal").addEventListener("click",function(e){if(e.target===$("alt-modal"))amodalKapat();});
  $("alt-kaydet").addEventListener("click",akaydet);
  /* Fiyat güncelle */
  $("alt-fiyat-guncelle").addEventListener("click",async function(){
    var btn=$("alt-fiyat-guncelle");
    btn.style.animation="spin 1s linear infinite";btn.disabled=true;
    var f=await guncelAltinCek();
    btn.style.animation="";btn.disabled=false;
    if(f>0){
      _guncelGramFiyat=f;
      await afbFiyatKaydet(f);
      arender();
    } else alert("Fiyat alınamadı, lütfen tekrar deneyin.");
  });
  /* Filtre */
  var sel=$("alt-filtre-nerde");
  if(sel){sel.value=_filtre;sel.addEventListener("change",function(){_filtre=this.value;arender();});}
  /* Durum toggle */
  document.querySelectorAll(".alt-durum-btn").forEach(function(btn){
    btn.addEventListener("click",function(){durumToggle(btn.dataset.id);});
  });
  /* Modal durum */
  document.querySelectorAll(".alt-modal-durum-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      document.querySelectorAll(".alt-modal-durum-btn").forEach(function(b){b.classList.remove("active");});
      btn.classList.add("active");$("alt-durum-val").value=btn.dataset.d;
    });
  });
  document.querySelectorAll(".alt-duz-btn").forEach(function(btn){btn.addEventListener("click",function(){amodalAc(btn.dataset.id);});});
  document.querySelectorAll(".alt-sil-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      if(!confirm("Bu kaydı silmek istiyor musunuz?"))return;
      _kayitlar=_kayitlar.filter(function(x){return x.id!==btn.dataset.id;});
      afbKaydet();arender();
    });
  });
}

function amodalAc(id){
  _aktif=id;
  var bugun=new Date().toISOString().split("T")[0];
  $("alt-modal-baslik").textContent=id?"Kaydı Düzenle":"Altın Ekle";
  $("alt-tarih").value=bugun;$("alt-adet").value="";$("alt-gram").value="";
  $("alt-tl").value="";$("alt-nasil").value="";$("alt-nerde").value="";
  $("alt-durum-val").value="elimde";
  document.querySelectorAll(".alt-modal-durum-btn").forEach(function(b){b.classList.toggle("active",b.dataset.d==="elimde");});
  if(id){
    var k=_kayitlar.find(function(x){return x.id===id;});
    if(k){
      $("alt-tarih").value=k.tarih||bugun;$("alt-adet").value=k.adet;$("alt-gram").value=k.gram;
      $("alt-tl").value=k.tlKarsiligi;$("alt-nasil").value=k.nasilAlindi||"";$("alt-nerde").value=k.nerdeKullanildi||"";
      var d=k.durum||"elimde";$("alt-durum-val").value=d;
      document.querySelectorAll(".alt-modal-durum-btn").forEach(function(b){b.classList.toggle("active",b.dataset.d===d);});
    }
  }
  $("alt-modal").classList.remove("hidden");
  setTimeout(function(){$("alt-gram").focus();},100);
}
function amodalKapat(){$("alt-modal").classList.add("hidden");_aktif=null;}

async function akaydet(){
  var tarih=$("alt-tarih").value,adet=parseFloat($("alt-adet").value)||0;
  var gram=parseFloat($("alt-gram").value)||0,tl=parseFloat($("alt-tl").value)||0;
  var nasil=($("alt-nasil").value||"").trim(),nerde=($("alt-nerde").value||"").trim();
  var durum=$("alt-durum-val").value||"elimde";
  if(!tarih){alert("Tarih giriniz.");return;}
  if(!gram||gram<=0){$("alt-gram").focus();return;}
  if(!tl||tl<=0){$("alt-tl").focus();return;}
  var kayit={tarih:tarih,adet:adet,gram:gram,tlKarsiligi:tl,nasilAlindi:nasil,nerdeKullanildi:nerde,durum:durum};
  if(_aktif){
    var idx=_kayitlar.findIndex(function(x){return x.id===_aktif;});
    if(idx>=0){kayit.id=_aktif;_kayitlar[idx]=kayit;}
  } else {
    kayit.id=auid();_kayitlar.push(kayit);
    _kayitlar.sort(function(a,b){return (a.tarih||"").localeCompare(b.tarih||"");});
  }
  await afbKaydet();amodalKapat();arender();
}

async function ainit(){
  await afbYukle();
  arender();
  /* Arka planda güncel fiyatı çek */
  guncelAltinCek().then(function(f){
    if(f>0&&Math.abs(f-(_guncelGramFiyat||0))>50){
      _guncelGramFiyat=f;
      afbFiyatKaydet(f);
      var el=$("alt-fiyat-val");
      if(el)el.textContent=apara(f)+" TL";
      arender();
    } else if(f>0&&!_guncelGramFiyat){
      _guncelGramFiyat=f;
      arender();
    }
  });
}
return{init:ainit};
})();


/* ===== VEFA MODULE ===== */
var VefaModule=(function(){
var $=function(id){return document.getElementById(id);};
var _uyeler=[],_aylar=[],_guncelGramFiyat=0;
var AYLAR_TR=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
/* Altın türü varsayılan gram değerleri */
var TIP_GRAM={gram:7.20,ceyrek:1.75,yarim:3.50,tam:7.00};
var TIP_LABEL={gram:"1 Gram",ceyrek:"Çeyrek",yarim:"Yarım",tam:"Tam",nakit:"Nakit"};

function vpara(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function vgr(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:3,maximumFractionDigits:3});}
function vuid(){return "v"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function ayLabel(key){var p=key.split("-");return AYLAR_TR[parseInt(p[1])-1]+" "+p[0];}

/* Yatırım güncel değeri */
function yGuncel(y){
  if(y.tip==="nakit")return y.maliyet||0;
  return _guncelGramFiyat>0?((y.gram||0)*_guncelGramFiyat):(y.maliyet||0);
}

/* Tüm yatırımları düz liste olarak al */
function tumYatirimlar(){
  var liste=[];
  _aylar.forEach(function(ay){(ay.yatirimlar||[]).forEach(function(y){liste.push(y);});});
  return liste;
}

/* Tip bazlı özet */
function tipOzeti(){
  var ozet={};
  tumYatirimlar().forEach(function(y){
    if(!ozet[y.tip])ozet[y.tip]={tip:y.tip,adet:0,gram:0,maliyet:0,guncel:0};
    ozet[y.tip].adet+=(y.tip!=="nakit"?(y.adet||1):0);
    ozet[y.tip].gram+=(y.gram||0);
    ozet[y.tip].maliyet+=(y.maliyet||0);
    ozet[y.tip].guncel+=yGuncel(y);
  });
  return Object.values(ozet);
}

function toplamTahsilat(){
  return _aylar.reduce(function(s,ay){
    return s+_uyeler.reduce(function(s2,u){
      return s2+((ay.odemeler&&ay.odemeler[u.id])?(ay.toplamOdeme/_uyeler.length):0);
    },0);
  },0);
}
function toplamMaliyet(){return tumYatirimlar().reduce(function(s,y){return s+(y.maliyet||0);},0);}
function toplamGuncel(){return tumYatirimlar().reduce(function(s,y){return s+yGuncel(y);},0);}

async function vfbYukle(){
  if(!window._fbDb)return;
  try{
    var s=await window._fbDb.ref("vefa").once("value");
    var d=s.val()||{};
    _uyeler=d.uyeler||[
      {id:"u1",ad:"Zafer EROĞLU",rol:"Başkan"},
      {id:"u2",ad:"Fatma İNCE",rol:"Üye"},
      {id:"u3",ad:"Güler UÇAR",rol:"Üye"},
      {id:"u4",ad:"Salim EROĞLU",rol:"Üye"}
    ];
    _aylar=d.aylar||[];
    var gf=await window._fbDb.ref("altin_guncel_fiyat").once("value");
    _guncelGramFiyat=gf.val()||0;
  }catch(e){console.warn("vefaYukle:",e);}
}
async function vfbKaydet(){
  if(!window._fbDb)return;
  try{await window._fbDb.ref("vefa").set({uyeler:_uyeler,aylar:_aylar});}
  catch(e){console.warn("vefaKaydet:",e);}
}

function vrender(){
  var c=$("vefa-container");if(!c)return;
  var tTahsilat=toplamTahsilat();
  var tMaliyet=toplamMaliyet();
  var tGuncel=toplamGuncel();
  var karZarar=tGuncel-tMaliyet;
  var karPct=tMaliyet>0?((karZarar/tMaliyet)*100):0;
  var kRenk=karZarar>=0?"var(--green)":"var(--red)";
  var ozet=tipOzeti();

  var h='<div class="vf-wrap">';

  /* ── Üst Özet Kartlar ── */
  h+='<div class="vf-header">';
  /* Genel rakamlar */
  h+='<div class="vf-ozet">';
  h+='<div class="vf-oz-item"><span class="vf-oz-label">TOPLAM TAHSİLAT</span><span class="vf-oz-val">'+vpara(tTahsilat)+' TL</span></div>';
  h+='<div class="vf-oz-item"><span class="vf-oz-label">YATIRIM MALİYETİ</span><span class="vf-oz-val">'+vpara(tMaliyet)+' TL</span></div>';
  h+='<div class="vf-oz-item"><span class="vf-oz-label">GÜNCEL DEĞER</span><span class="vf-oz-val" style="color:var(--gold)">'+vpara(tGuncel)+' TL</span></div>';
  h+='<div class="vf-oz-item"><span class="vf-oz-label">KAR / ZARAR</span><span class="vf-oz-val" style="color:'+kRenk+'">'+(karZarar>=0?"+":"")+vpara(karZarar)+' TL <small>'+(karPct>=0?"+":"")+karPct.toFixed(1)+'%</small></span></div>';
  h+='</div>';
  /* Kalem bazlı yatırım özeti */
  if(ozet.length){
    h+='<div class="vf-kalem-ozet">';
    ozet.forEach(function(o){
      var kR=o.guncel>=o.maliyet?"var(--green)":"var(--red)";
      var kP=o.maliyet>0?(((o.guncel-o.maliyet)/o.maliyet)*100):0;
      h+='<div class="vf-kalem-oz-kart">';
      h+='<div class="vf-kalem-oz-tip"><span class="vf-tip-tag vf-tip-'+o.tip+'">'+TIP_LABEL[o.tip]+'</span></div>';
      if(o.tip!=="nakit"){
        h+='<div class="vf-kalem-oz-satir"><span>Adet</span><b>'+o.adet+'</b></div>';
        h+='<div class="vf-kalem-oz-satir"><span>Gram</span><b style="color:var(--gold)">'+vgr(o.gram)+' gr</b></div>';
      }
      h+='<div class="vf-kalem-oz-satir"><span>Maliyet</span><b>'+vpara(o.maliyet)+' TL</b></div>';
      h+='<div class="vf-kalem-oz-satir"><span>Güncel</span><b style="color:var(--gold)">'+vpara(o.guncel)+' TL</b></div>';
      h+='<div class="vf-kalem-oz-satir"><span>Kar/Zarar</span><b style="color:'+kR+'">'+(kP>=0?"+":"")+kP.toFixed(1)+'%</b></div>';
      h+='</div>';
    });
    h+='</div>';
  }
  h+='<div class="vf-header-btns">';
  if(_guncelGramFiyat>0)h+='<span class="vf-gram-badge">&#127950; '+vpara(_guncelGramFiyat)+' TL/gr</span>';
  h+='<button class="vf-btn-sec" id="vf-uye-ekle-btn">+ Üye</button>';
  h+='<button class="vf-btn-gold" id="vf-ay-ekle-btn">+ Yatırım Ekle</button>';
  h+='</div></div>';

  /* ── Tablar ── */
  h+='<div class="vf-tab-bar">';
  h+='<button class="vf-tab-btn vf-tab-aktif" data-vt="aylik">Aylık Takip</button>';
  h+='<button class="vf-tab-btn" data-vt="uyeler">Üyeler</button>';
  h+='</div>';

  /* ── Panel: Aylık Takip ── */
  h+='<div class="vf-panel" id="vf-panel-aylik">';
  if(!_aylar.length){
    h+='<div class="vf-bos">Henüz kayıt yok. "+ Yatırım Ekle" butonuna tıklayın.</div>';
  } else {
    var sirali=_aylar.slice().sort(function(a,b){return a.key.localeCompare(b.key);});
    var kisiBasi=_uyeler.length||1;

    /* Ödemeler tablosu */
    h+='<div class="vf-bolum-baslik">AYLIK ÖDEMELER</div>';
    h+='<div class="vf-tablo-dis"><table class="vf-tablo"><thead><tr>';
    h+='<th>AY</th><th>TOPLAM</th><th>KİŞİ BAŞI</th>';
    _uyeler.forEach(function(u){
      var kisa=u.ad.split(" ");
      h+='<th>'+kisa[0]+'<br><span style="font-weight:400;font-size:10px;opacity:0.7">'+kisa[1]+'</span></th>';
    });
    h+='<th>TAHSİLAT</th><th></th></tr></thead><tbody>';
    var genelTop=0;
    sirali.forEach(function(ay){
      var kp=(ay.toplamOdeme||0)/kisiBasi;
      var ayTah=0;
      h+='<tr class="vf-satir">';
      h+='<td class="vf-td-ay">'+ayLabel(ay.key)+'</td>';
      h+='<td class="vf-td-miktar">'+vpara(ay.toplamOdeme)+' TL</td>';
      h+='<td style="color:var(--text-muted);font-size:12px">'+vpara(kp)+' TL</td>';
      _uyeler.forEach(function(u){
        var odedi=(ay.odemeler&&ay.odemeler[u.id])||false;
        if(odedi)ayTah+=kp;
        h+='<td><button class="vf-odeme-btn '+(odedi?"vf-odedi":"vf-bekliyor")+'" data-ay="'+ay.key+'" data-uid="'+u.id+'">'+(odedi?(vpara(kp)+' TL'):'—')+'</button></td>';
      });
      genelTop+=ayTah;
      h+='<td class="vf-td-toplam">'+vpara(ayTah)+' TL</td>';
      h+='<td><button class="vf-duz-btn row-action-btn duzenle" data-ay="'+ay.key+'">&#9998;</button> ';
      h+='<button class="vf-sil-btn row-action-btn sil" data-ay="'+ay.key+'">&#10005;</button></td>';
      h+='</tr>';
    });
    var n=sirali.length||1;
    var ortTop=sirali.reduce(function(s,a){return s+(a.toplamOdeme||0);},0)/n;
    h+='<tr class="vf-ortalama-row"><td>Ortalama</td><td>'+vpara(ortTop)+' TL</td><td>'+vpara(ortTop/kisiBasi)+' TL</td>';
    _uyeler.forEach(function(u){h+='<td>'+vpara(ortTop/kisiBasi)+' TL</td>';});
    h+='<td>'+vpara(genelTop/n)+' TL</td><td></td></tr>';
    h+='<tr class="vf-toplam-row"><td>Toplam</td>';
    var genelTOdeme=sirali.reduce(function(s,a){return s+(a.toplamOdeme||0);},0);
    h+='<td>'+vpara(genelTOdeme)+' TL</td><td></td>';
    _uyeler.forEach(function(u){
      var ut=_aylar.reduce(function(s,ay){return s+((ay.odemeler&&ay.odemeler[u.id])?((ay.toplamOdeme||0)/kisiBasi):0);},0);
      h+='<td>'+vpara(ut)+' TL</td>';
    });
    h+='<td>'+vpara(genelTop)+' TL</td><td></td></tr>';
    h+='</tbody></table></div>';

    /* Yatırımlar tablosu */
    h+='<div class="vf-bolum-baslik" style="margin-top:18px">YATIRIMLAR</div>';
    h+='<div class="vf-tablo-dis"><table class="vf-tablo"><thead><tr>';
    h+='<th>AY</th><th>TİP</th><th>ADET</th><th>GRAM</th><th>MALİYET</th><th>GÜNCEL DEĞER</th><th>KAR/ZARAR</th><th>AÇIKLAMA</th><th></th></tr></thead><tbody>';
    var tyMal=0,tyGun=0,tyGr=0;
    var hanyat=false;
    sirali.forEach(function(ay){
      if(!ay.yatirimlar||!ay.yatirimlar.length)return;
      hanyat=true;
      ay.yatirimlar.forEach(function(y,i){
        var gd=yGuncel(y);var mal=y.maliyet||0;
        var kz=gd-mal;var kzp=mal>0?((kz/mal)*100):0;
        tyMal+=mal;tyGun+=gd;tyGr+=(y.gram||0);
        h+='<tr class="vf-satir">';
        if(i===0)h+='<td class="vf-td-ay" rowspan="'+ay.yatirimlar.length+'">'+ayLabel(ay.key)+'</td>';
        h+='<td><span class="vf-tip-tag vf-tip-'+y.tip+'">'+TIP_LABEL[y.tip]+'</span></td>';
        h+='<td style="text-align:center">'+(y.tip!=="nakit"?(y.adet||1):"—")+'</td>';
        h+='<td style="color:var(--gold);font-weight:700">'+(y.tip!=="nakit"?vgr(y.gram)+" gr":"—")+'</td>';
        h+='<td>'+vpara(mal)+' TL</td>';
        h+='<td style="color:var(--gold)">'+vpara(gd)+' TL</td>';
        h+='<td style="color:'+(kz>=0?"var(--green)":"var(--red)");
        h+=';font-weight:700">'+(kz>=0?"+":"")+kzp.toFixed(1)+'%</td>';
        h+='<td style="color:var(--text-muted);font-size:11px">'+(y.aciklama||"")+'</td>';
        h+='<td><button class="vf-sil-yatirim-btn row-action-btn sil" data-ay="'+ay.key+'" data-yid="'+y.id+'">&#10005;</button></td>';
        h+='</tr>';
      });
    });
    if(!hanyat){
      h+='<tr><td colspan="9" class="vf-bos" style="padding:16px">Yatırım eklenmemiş. ✏️ ile aya yatırım ekleyebilirsiniz.</td></tr>';
    } else {
      var tkz=tyGun-tyMal;var tkzp=tyMal>0?((tkz/tyMal)*100):0;
      h+='<tr class="vf-toplam-row"><td>Toplam</td><td></td><td></td>';
      h+='<td style="color:var(--gold);font-weight:700">'+vgr(tyGr)+' gr</td>';
      h+='<td>'+vpara(tyMal)+' TL</td><td style="color:var(--gold)">'+vpara(tyGun)+' TL</td>';
      h+='<td style="color:'+(tkz>=0?"var(--green)":"var(--red)")+';font-weight:800">'+(tkz>=0?"+":"")+tkzp.toFixed(1)+'%</td>';
      h+='<td></td><td></td></tr>';
    }
    h+='</tbody></table></div>';
  }
  h+='</div>';

  /* ── Panel: Üyeler ── */
  h+='<div class="vf-panel" id="vf-panel-uyeler" style="display:none">';
  h+='<div class="vf-uyeler-liste">';
  _uyeler.forEach(function(u){
    var kp=_uyeler.length||1;
    var ut=_aylar.reduce(function(s,ay){return s+((ay.odemeler&&ay.odemeler[u.id])?((ay.toplamOdeme||0)/kp):0);},0);
    h+='<div class="vf-uye-kart"><div class="vf-uye-avatar">'+u.ad.charAt(0)+'</div>';
    h+='<div class="vf-uye-info"><div class="vf-uye-ad">'+u.ad+'</div><div class="vf-uye-rol">'+u.rol+'</div></div>';
    h+='<div class="vf-uye-toplam">'+vpara(ut)+' TL<span class="vf-uye-top-label">toplam ödeme</span></div>';
    h+='<button class="vf-sil-btn row-action-btn sil" data-uid2="'+u.id+'" style="margin-left:auto">&#10005;</button></div>';
  });
  h+='</div></div>';

  /* ── Modal: Yatırım Ekle ── */
  var buAy=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");
  h+='<div class="bk-modal-overlay hidden" id="vf-modal"><div class="modal-box" style="max-width:620px">';
  h+='<div class="modal-header"><h2 class="modal-title" id="vf-modal-baslik">Yatırım Ekle</h2><button class="modal-close" id="vf-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div style="display:flex;gap:12px;flex-wrap:wrap">';
  h+='<div class="field-group" style="flex:1"><label class="field-label">Ay</label><input type="month" id="vf-ay-key" class="field-input" value="'+buAy+'"/></div>';
  h+='<div class="field-group" style="flex:1.2"><label class="field-label">Toplam Ödeme (TL) <span style="color:var(--text-muted);font-weight:400;font-size:11px">— '+_uyeler.length+' kişiye bölünecek</span></label><input type="number" id="vf-ay-miktar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
  h+='</div>';
  h+='<div class="field-group"><label class="field-label">Kim Ödedi?</label>';
  h+='<div class="vf-odeme-checklar" id="vf-odeme-checklar">';
  _uyeler.forEach(function(u){
    h+='<label class="vf-check-label"><input type="checkbox" class="vf-odeme-cb" value="'+u.id+'" checked> '+u.ad+'</label>';
  });
  h+='</div></div>';
  h+='<div class="field-group">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
  h+='<label class="field-label" style="margin:0">Yatırım Kalemleri</label>';
  h+='<button class="vf-btn-sec" id="vf-kalem-ekle-btn" style="font-size:11px;padding:4px 10px">+ Kalem Ekle</button>';
  h+='</div>';
  h+='<div class="vf-kalem-basliklar"><span>TİP</span><span>ADET</span><span>GRAM</span><span>MALİYET (TL)</span><span>AÇIKLAMA</span><span></span></div>';
  h+='<div id="vf-kalemler"></div>';
  h+='</div>';
  h+='</div>';
  h+='<div class="modal-footer"><button class="btn-secondary" id="vf-modal-iptal">İptal</button><button class="btn-primary" id="vf-modal-kaydet">Kaydet</button></div>';
  h+='</div></div>';

  /* Modal: Üye */
  h+='<div class="bk-modal-overlay hidden" id="vf-uye-modal"><div class="modal-box modal-sm">';
  h+='<div class="modal-header"><h2 class="modal-title">Üye Ekle</h2><button class="modal-close" id="vf-uye-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Ad Soyad</label><input type="text" id="vf-uye-ad" class="field-input" placeholder="Ad Soyad..." maxlength="60"/></div>';
  h+='<div class="field-group"><label class="field-label">Rol</label><input type="text" id="vf-uye-rol" class="field-input" value="Üye" maxlength="30"/></div>';
  h+='</div>';
  h+='<div class="modal-footer"><button class="btn-secondary" id="vf-uye-iptal">İptal</button><button class="btn-primary" id="vf-uye-kaydet">Kaydet</button></div>';
  h+='</div></div>';
  h+='</div>';
  c.innerHTML=h;
  vbagla();
}

var _kalemSayac=0;
function kalemSatiriEkle(y){
  var i=_kalemSayac++;
  var tip=y?y.tip:"gram";
  var nakit=tip==="nakit";
  var div=document.createElement("div");
  div.className="vf-kalem-satir";div.id="vf-kalem-"+i;
  div.innerHTML='<select class="vf-k-tip field-input" id="vf-k-tip-'+i+'">'+
    Object.keys(TIP_LABEL).map(function(t){return'<option value="'+t+'"'+(tip===t?" selected":"")+'>'+TIP_LABEL[t]+'</option>';}).join('')+
    '</select>'+
    '<input type="number" class="field-input vf-k-adet" id="vf-k-adet-'+i+'" placeholder="Adet" value="'+(y?y.adet:1)+'" min="1" step="1"'+(nakit?' style="display:none"':'')+'/>' +
    '<input type="number" class="field-input vf-k-gram" id="vf-k-gram-'+i+'" placeholder="Gram" value="'+(y&&y.gram?y.gram:'')+'" min="0" step="0.01" inputmode="decimal"'+(nakit?' style="display:none"':'')+'/>' +
    '<input type="number" class="field-input vf-k-maliyet" id="vf-k-maliyet-'+i+'" placeholder="TL" value="'+(y?y.maliyet:'')+'" min="0" step="0.01" inputmode="decimal"/>'+
    '<input type="text" class="field-input vf-k-aciklama" id="vf-k-aciklama-'+i+'" placeholder="Açıklama" value="'+(y&&y.aciklama?y.aciklama:'')+'" maxlength="80"/>'+
    '<button class="vf-kalem-sil-btn">&#10005;</button>';
  var wrap=$("vf-kalemler");
  wrap.appendChild(div);
  var tipSel=div.querySelector(".vf-k-tip");
  var adetInp=div.querySelector(".vf-k-adet");
  var gramInp=div.querySelector(".vf-k-gram");
  tipSel.addEventListener("change",function(){
    var n=this.value==="nakit";
    adetInp.style.display=n?"none":"";
    gramInp.style.display=n?"none":"";
    if(!n){var g=TIP_GRAM[this.value]||7.20;gramInp.value=(g*(parseInt(adetInp.value)||1)).toFixed(2);}
  });
  adetInp.addEventListener("input",function(){
    var g=TIP_GRAM[tipSel.value]||7.20;
    gramInp.value=(g*(parseInt(this.value)||1)).toFixed(2);
  });
  div.querySelector(".vf-kalem-sil-btn").addEventListener("click",function(){div.remove();});
}

function modalAc(ayKey){
  var mevcut=_aylar.find(function(a){return a.key===ayKey;});
  $("vf-modal-baslik").textContent=mevcut?"Yatırımı Düzenle":"Yatırım Ekle";
  $("vf-ay-key").value=ayKey;
  $("vf-ay-miktar").value=mevcut?(mevcut.toplamOdeme||""):"";
  $("vf-kalemler").innerHTML="";_kalemSayac=0;
  document.querySelectorAll(".vf-odeme-cb").forEach(function(cb){
    cb.checked=mevcut?(mevcut.odemeler&&mevcut.odemeler[cb.value]!==false):true;
  });
  if(mevcut&&mevcut.yatirimlar&&mevcut.yatirimlar.length){
    mevcut.yatirimlar.forEach(function(y){kalemSatiriEkle(y);});
  } else {
    kalemSatiriEkle(null); /* boş bir kalem başlangıç */
  }
  $("vf-modal").classList.remove("hidden");
  setTimeout(function(){$("vf-ay-miktar").focus();},100);
}

function vbagla(){
  document.querySelectorAll(".vf-tab-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      document.querySelectorAll(".vf-tab-btn").forEach(function(b){b.classList.remove("vf-tab-aktif");});
      document.querySelectorAll(".vf-panel").forEach(function(p){p.style.display="none";});
      btn.classList.add("vf-tab-aktif");
      $("vf-panel-"+btn.dataset.vt).style.display="";
    });
  });
  document.querySelectorAll(".vf-odeme-btn").forEach(function(btn){
    btn.addEventListener("click",async function(){
      var ay=_aylar.find(function(a){return a.key===btn.dataset.ay;});
      if(!ay)return;
      if(!ay.odemeler)ay.odemeler={};
      ay.odemeler[btn.dataset.uid]=!ay.odemeler[btn.dataset.uid];
      await vfbKaydet();vrender();
    });
  });
  document.querySelectorAll(".vf-duz-btn").forEach(function(btn){
    btn.addEventListener("click",function(){modalAc(btn.dataset.ay);});
  });
  document.querySelectorAll(".vf-sil-btn").forEach(function(btn){
    btn.addEventListener("click",async function(){
      if(btn.dataset.ay){if(!confirm("Bu ayı silmek istiyor musunuz?"))return;_aylar=_aylar.filter(function(a){return a.key!==btn.dataset.ay;});}
      else if(btn.dataset.uid2){if(!confirm("Bu üyeyi silmek istiyor musunuz?"))return;_uyeler=_uyeler.filter(function(u){return u.id!==btn.dataset.uid2;});}
      await vfbKaydet();vrender();
    });
  });
  document.querySelectorAll(".vf-sil-yatirim-btn").forEach(function(btn){
    btn.addEventListener("click",async function(){
      if(!confirm("Bu yatırımı silmek istiyor musunuz?"))return;
      var ay=_aylar.find(function(a){return a.key===btn.dataset.ay;});
      if(ay&&ay.yatirimlar)ay.yatirimlar=ay.yatirimlar.filter(function(y){return y.id!==btn.dataset.yid;});
      await vfbKaydet();vrender();
    });
  });
  $("vf-ay-ekle-btn").addEventListener("click",function(){
    var buAy=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");
    modalAc(buAy);
    $("vf-ay-key").onchange=function(){modalAc(this.value);};
  });
  $("vf-modal-kapat").addEventListener("click",function(){$("vf-modal").classList.add("hidden");});
  $("vf-modal-iptal").addEventListener("click",function(){$("vf-modal").classList.add("hidden");});
  $("vf-modal").addEventListener("click",function(e){if(e.target===$("vf-modal"))$("vf-modal").classList.add("hidden");});
  $("vf-kalem-ekle-btn").addEventListener("click",function(){kalemSatiriEkle(null);});
  $("vf-modal-kaydet").addEventListener("click",async function(){
    var key=$("vf-ay-key").value;
    var toplamOdeme=parseFloat($("vf-ay-miktar").value)||0;
    if(!key){alert("Ay seçiniz.");return;}
    if(!toplamOdeme||toplamOdeme<=0){$("vf-ay-miktar").focus();return;}
    var odemeler={};
    document.querySelectorAll(".vf-odeme-cb").forEach(function(cb){odemeler[cb.value]=cb.checked;});
    var yatirimlar=[];
    document.querySelectorAll(".vf-kalem-satir").forEach(function(satir){
      var i=satir.id.replace("vf-kalem-","");
      var tip=$("vf-k-tip-"+i)?.value||"gram";
      var maliyet=parseFloat($("vf-k-maliyet-"+i)?.value)||0;
      if(!maliyet||maliyet<=0)return;
      var kayit={id:vuid(),tip:tip,maliyet:maliyet,aciklama:($("vf-k-aciklama-"+i)?.value||"").trim()};
      if(tip!=="nakit"){kayit.adet=parseInt($("vf-k-adet-"+i)?.value)||1;kayit.gram=parseFloat($("vf-k-gram-"+i)?.value)||0;}
      yatirimlar.push(kayit);
    });
    var idx=_aylar.findIndex(function(a){return a.key===key;});
    var ayObj={key:key,toplamOdeme:toplamOdeme,odemeler:odemeler,yatirimlar:yatirimlar};
    if(idx>=0)_aylar[idx]=ayObj;else _aylar.push(ayObj);
    await vfbKaydet();$("vf-modal").classList.add("hidden");vrender();
  });
  $("vf-uye-ekle-btn").addEventListener("click",function(){
    $("vf-uye-ad").value="";$("vf-uye-rol").value="Üye";
    $("vf-uye-modal").classList.remove("hidden");
    setTimeout(function(){$("vf-uye-ad").focus();},100);
  });
  $("vf-uye-modal-kapat").addEventListener("click",function(){$("vf-uye-modal").classList.add("hidden");});
  $("vf-uye-iptal").addEventListener("click",function(){$("vf-uye-modal").classList.add("hidden");});
  $("vf-uye-modal").addEventListener("click",function(e){if(e.target===$("vf-uye-modal"))$("vf-uye-modal").classList.add("hidden");});
  $("vf-uye-kaydet").addEventListener("click",async function(){
    var ad=($("vf-uye-ad").value||"").trim(),rol=($("vf-uye-rol").value||"Üye").trim();
    if(!ad){$("vf-uye-ad").focus();return;}
    _uyeler.push({id:vuid(),ad:ad,rol:rol});
    await vfbKaydet();$("vf-uye-modal").classList.add("hidden");vrender();
  });
}

async function vinit(){await vfbYukle();vrender();}
return{init:vinit};
})();
