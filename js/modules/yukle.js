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
var _uyeler=[],_aylar=[],_gramFiyat=0;
var AY_TR=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
var TIP_GR={gram:1.00,ceyrek:1.75,yarim:3.50,tam:7.00};
var TIP_AD={gram:"1 GRAM",ceyrek:"1 ÇEYREK",yarim:"1 YARIM",tam:"1 TAM",nakit:"NAKİT"};
var ALTIN=["gram","ceyrek","yarim","tam"];
var TIPLER=["gram","ceyrek","yarim","tam","nakit"];

function p(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function uid(){return "vf"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function ayLbl(k){var s=k.split("-");return AY_TR[parseInt(s[1])-1]+" "+s[0];}
function kisiBasiOdeme(ay){return _uyeler.length>0?((ay.toplamOdeme||0)/_uyeler.length):0;}
function yGram(y){return y.tip==="nakit"?0:(y.adet||0)*(TIP_GR[y.tip]||0);}
function yDeger(y){
  if(y.tip==="nakit")return y.nakitTL||0;
  return _gramFiyat>0?((y.adet||0)*(TIP_GR[y.tip]||0)*_gramFiyat):0;
}
function tumY(){var r=[];_aylar.forEach(function(a){(a.yatirimlar||[]).forEach(function(y){r.push(y);});});return r;}
function tipToplam(){
  var o={};TIPLER.forEach(function(t){o[t]={adet:0,gram:0,deger:0};});
  tumY().forEach(function(y){if(!o[y.tip])return;o[y.tip].adet+=(y.tip!=="nakit"?(y.adet||0):0);o[y.tip].gram+=yGram(y);o[y.tip].deger+=yDeger(y);});
  return o;
}
function tTahsilat(){
  return _aylar.reduce(function(s,ay){
    return s+_uyeler.reduce(function(s2,u){return s2+((ay.odemeler&&ay.odemeler[u.id])?kisiBasiOdeme(ay):0);},0);
  },0);
}
function tDeger(){return tumY().reduce(function(s,y){return s+yDeger(y);},0);}
function tGram(){return tumY().reduce(function(s,y){return s+yGram(y);},0);}
function tNakit(){return tumY().filter(function(y){return y.tip==="nakit";}).reduce(function(s,y){return s+(y.nakitTL||0);},0);}

async function fbYukle(){
  if(!window._fbDb)return;
  try{
    var s=await window._fbDb.ref("vefa2").once("value");
    var d=s.val()||{};
    _uyeler=d.uyeler||[{id:"u1",ad:"Zafer EROĞLU",rol:"Başkan"},{id:"u2",ad:"Fatma İNCE",rol:"Üye"},{id:"u3",ad:"Güler UÇAR",rol:"Üye"},{id:"u4",ad:"Salim EROĞLU",rol:"Üye"}];
    _aylar=d.aylar||[];
    var gf=await window._fbDb.ref("altin_guncel_fiyat").once("value");
    _gramFiyat=gf.val()||0;
  }catch(e){}
}
async function fbKaydet(){
  if(!window._fbDb)return;
  try{await window._fbDb.ref("vefa2").set({uyeler:_uyeler,aylar:_aylar});}catch(e){}
}

function render(){
  var c=$("vefa-container");if(!c)return;
  var sirali=_aylar.slice().sort(function(a,b){return a.key.localeCompare(b.key);});
  var tt=tipToplam();
  var tah=tTahsilat();var deg=tDeger();var gr=tGram();var nak=tNakit();
  var kz=deg-tah;var kzp=tah>0?((kz/tah)*100):0;
  var kr=kz>=0?"var(--green)":"var(--red)";
  var buAy=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");

  var h='<div class="vf2-wrap">';

  /* ÖZET BAR */
  h+='<div class="vf2-ozet-bar">';
  h+='<div class="vf2-oz"><span class="vf2-oz-l">TOPLAM TAHSİLAT</span><span class="vf2-oz-v">'+p(tah)+' TL</span></div>';
  h+='<div class="vf2-oz"><span class="vf2-oz-l">TOPLAM ALTIN</span><span class="vf2-oz-v" style="color:var(--gold)">'+p(gr)+' gr</span></div>';
  if(nak>0)h+='<div class="vf2-oz"><span class="vf2-oz-l">NAKİT</span><span class="vf2-oz-v" style="color:var(--green)">'+p(nak)+' TL</span></div>';
  h+='<div class="vf2-oz"><span class="vf2-oz-l">GÜNCEL DEĞER</span><span class="vf2-oz-v" style="color:var(--gold)">'+(_gramFiyat>0?p(deg)+' TL':'—')+'</span></div>';
  h+='<div class="vf2-oz"><span class="vf2-oz-l">KAR / ZARAR</span><span class="vf2-oz-v" style="color:'+kr+'">'+(kz>=0?"+":"")+p(kz)+' TL <small>'+(kzp>=0?"+":"")+kzp.toFixed(1)+'%</small></span></div>';
  /* Tip kartları */
  var aktifTipler=TIPLER.filter(function(t){return tt[t]&&(tt[t].adet>0||tt[t].deger>0);});
  if(aktifTipler.length){
    h+='<div class="vf2-oz-sep"></div>';
    aktifTipler.forEach(function(t){
      var o=tt[t];
      h+='<div class="vf2-oz-kart"><span class="vf2-tip-tag vf2-tip-'+t+'">'+TIP_AD[t]+'</span>';
      if(t!=="nakit")h+='<span class="vf2-oz-kart-row"><b>'+o.adet+'</b> adet · <b style="color:var(--gold)">'+p(o.gram)+' gr</b></span>';
      h+='<span class="vf2-oz-kart-row">Güncel: <b style="color:var(--gold)">'+(_gramFiyat>0||t==="nakit"?p(o.deger)+' TL':'—')+'</b></span>';
      h+='</div>';
    });
  }
  if(_gramFiyat>0)h+='<span class="vf2-fiyat-badge">🥇 '+p(_gramFiyat)+' TL/gr</span>';
  h+='<div class="vf2-oz-btns"><button class="vf2-btn-sec" id="vf2-uye-btn">+ Üye</button><button class="vf2-btn-gold" id="vf2-yatirim-btn">+ Yatırım Ekle</button></div>';
  h+='</div>';

  /* ANA TABLO — tek tablo, ödemeler + yatırımlar */
  h+='<div class="vf2-tablo-dis"><table class="vf2-tablo"><thead><tr>';
  h+='<th class="vf2-th-ay">AY</th>';
  _uyeler.forEach(function(u){var k=u.ad.split(" ");h+='<th>'+k[0]+'<br><span class="vf2-th-soyad">'+k[1]+'</span></th>';});
  h+='<th>KİŞİ BAŞI</th>';
  h+='<th class="vf2-th-sep"></th>';
  TIPLER.forEach(function(t){h+='<th>'+TIP_AD[t]+'</th>';});
  h+='<th>TUTAR</th><th>GÜNCEL</th><th></th>';
  h+='</tr></thead><tbody>';

  /* Değişkenler */
  var cAdet={};TIPLER.forEach(function(t){cAdet[t]=0;});
  var cGram={};TIPLER.forEach(function(t){cGram[t]=0;});
  var cOdeme=0,cDeger=0;
  var uyeToplam={};_uyeler.forEach(function(u){uyeToplam[u.id]=0;});

  if(!sirali.length){
    var colCount=3+_uyeler.length+TIPLER.length+3;
    h+='<tr><td colspan="'+colCount+'" class="vf2-bos">Henüz kayıt yok. "+ Yatırım Ekle" butonuna tıklayın.</td></tr>';
  } else {
    sirali.forEach(function(ay){
      /* Yatırımları tipe göre grupla */
      var tg={};TIPLER.forEach(function(t){tg[t]=[];});
      (ay.yatirimlar||[]).forEach(function(y){if(tg[y.tip])tg[y.tip].push(y);});
      var maxR=Math.max(1,Math.max.apply(null,TIPLER.map(function(t){return tg[t].length;})));
      var ayOdeme=ay.toplamOdeme||0;
      var ayDeger=(ay.yatirimlar||[]).reduce(function(s,y){return s+yDeger(y);},0);
      var kp=kisiBasiOdeme(ay);
      cOdeme+=ayOdeme;cDeger+=ayDeger;

      /* Ödeme hesapla */
      _uyeler.forEach(function(u){if(ay.odemeler&&ay.odemeler[u.id])uyeToplam[u.id]+=kp;});

      for(var ri=0;ri<maxR;ri++){
        h+='<tr class="vf2-satir">';
        if(ri===0){
          /* AY + ödemeler + kişi başı + ayırıcı — hepsi rowspan ile */
          h+='<td class="vf2-td-ay" rowspan="'+maxR+'">'+ayLbl(ay.key)+'</td>';
          _uyeler.forEach(function(u){
            var odedi=(ay.odemeler&&ay.odemeler[u.id])||false;
            h+='<td rowspan="'+maxR+'"><button class="vf2-ode-btn '+(odedi?"vf2-odedi":"vf2-bek")+'" data-ay="'+ay.key+'" data-uid="'+u.id+'">'+(odedi?p(kp):'—')+'</button></td>';
          });
          h+='<td rowspan="'+maxR+'" class="vf2-td-top">'+p(ayOdeme)+'</td>';
          h+='<td rowspan="'+maxR+'" class="vf2-th-sep"></td>';
        }
        /* Yatırım hücreleri — her satır için ayrı */
        TIPLER.forEach(function(t){
          var y=tg[t][ri];
          if(ri===0&&y){
            cAdet[t]+=(t!=="nakit"?(y.adet||0):0);
            cGram[t]+=yGram(y);
          }
          if(y){
            if(t!=="nakit")h+='<td class="vf2-td-yat">'+y.adet+' adet</td>';
            else h+='<td class="vf2-td-yat vf2-td-nakit">'+p(y.nakitTL)+' TL</td>';
          } else {
            h+='<td class="vf2-td-bos">—</td>';
          }
        });
        /* Güncel ve aksiyonlar — sadece ilk satırda rowspan ile */
        if(ri===0){
          h+='<td rowspan="'+maxR+'" class="vf2-td-gun">'+(_gramFiyat>0?p(ayDeger):' — ')+'</td>';
          h+='<td rowspan="'+maxR+'" class="vf2-td-aks"><button class="vf2-duz-btn row-action-btn duzenle" data-ay="'+ay.key+'">&#9998;</button> <button class="vf2-sil-btn row-action-btn sil" data-ay="'+ay.key+'">&#10005;</button></td>';
        }
        h+='</tr>';
      }
    });

    /* Ortalama satırı */
    var n=sirali.length;
    var ortOdeme=sirali.reduce(function(s,a){return s+(a.toplamOdeme||0);},0)/n;
    h+='<tr class="vf2-ort-row"><td>Ortalama</td>';
    _uyeler.forEach(function(){h+='<td>'+p(ortOdeme/_uyeler.length)+'</td>';});
    h+='<td>'+p(ortOdeme)+'</td><td class="vf2-th-sep"></td>';
    TIPLER.forEach(function(){h+='<td>—</td>';});
    h+='<td></td><td></td></tr>';

    /* Toplam satırı */
    h+='<tr class="vf2-tot-row"><td>Toplam</td>';
    _uyeler.forEach(function(u){h+='<td>'+p(uyeToplam[u.id])+'</td>';});
    h+='<td>'+p(cOdeme)+'</td><td class="vf2-th-sep"></td>';
    TIPLER.forEach(function(t){
      if(t!=="nakit")h+='<td>'+(cAdet[t]>0?cAdet[t]+' adet':'—')+'</td>';
      else h+='<td>'+(tNakit()>0?p(tNakit())+' TL':'—')+'</td>';
    });
    h+='<td style="color:var(--gold)">'+(_gramFiyat>0?p(cDeger):'—')+'</td><td></td></tr>';

    /* Gram satırı */
    h+='<tr class="vf2-gr-row"><td>Gram</td>';
    _uyeler.forEach(function(){h+='<td>—</td>';});
    h+='<td>—</td><td class="vf2-th-sep"></td>';
    TIPLER.forEach(function(t){h+='<td>'+(cGram[t]>0?p(cGram[t])+' gr':'—')+'</td>';});
    h+='<td></td><td></td></tr>';
  }
  h+='</tbody></table></div>';

  /* DURUM ÖZETİ */
  var kzS=deg-tah;
  h+='<div class="vf2-durum-ozet"><div class="vf2-kolon-baslik">📋 DURUM ÖZETİ</div>';
  h+='<table class="vf2-oz-tablo"><thead><tr><th>AÇIKLAMA</th><th>TUTAR</th></tr></thead><tbody>';
  h+='<tr><td>Toplam Ödeme</td><td>'+p(tah)+' TL</td></tr>';
  h+='<tr><td>Yatırım Değerlemesi</td><td style="color:var(--gold)">'+(_gramFiyat>0?p(deg)+' TL':'—')+'</td></tr>';
  h+='<tr class="vf2-tot-row"><td>Kar / Zarar</td><td style="color:'+(kzS>=0?"var(--green)":"var(--red)")+'">'+(kzS>=0?"+":"")+p(kzS)+' TL</td></tr>';
  h+='</tbody></table></div>';

  /* MODALLER */
  h+='<div class="bk-modal-overlay hidden" id="vf2-modal"><div class="modal-box" style="max-width:560px">';
  h+='<div class="modal-header"><h2 class="modal-title" id="vf2-modal-baslik">Yatırım Ekle</h2><button class="modal-close" id="vf2-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div style="display:flex;gap:12px;flex-wrap:wrap">';
  h+='<div class="field-group" style="flex:1"><label class="field-label">Ay</label><input type="month" id="vf2-ay-key" class="field-input" value="'+buAy+'"/></div>';
  h+='<div class="field-group" style="flex:1.2"><label class="field-label">Toplam Ödeme (TL) <span style="color:var(--text-muted);font-weight:400;font-size:10px">÷ '+_uyeler.length+' kişi</span></label>';
  h+='<input type="number" id="vf2-ay-top" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div></div>';
  h+='<div class="field-group"><label class="field-label">Kim Ödedi?</label><div class="vf2-ode-checks">';
  _uyeler.forEach(function(u){h+='<label class="vf2-ck-lbl"><input type="checkbox" class="vf2-ode-cb" value="'+u.id+'" checked>'+u.ad+'</label>';});
  h+='</div></div>';
  h+='<div class="field-group">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
  h+='<label class="field-label" style="margin:0">Yatırım Kalemleri <span style="color:var(--text-muted);font-weight:400;font-size:11px">— gram otomatik hesaplanır</span></label>';
  h+='<button class="vf2-btn-sec" id="vf2-kalem-btn" style="padding:4px 10px;font-size:11px">+ Kalem Ekle</button></div>';
  h+='<div class="vf2-kalem-head"><span style="flex:1.5">TİP</span><span style="flex:0.8">ADET</span><span style="flex:1">GRAM</span><span style="flex:0.3"></span></div>';
  h+='<div id="vf2-kalemler"></div></div>';
  h+='</div>';
  h+='<div class="modal-footer"><button class="btn-secondary" id="vf2-iptal">İptal</button><button class="btn-primary" id="vf2-kaydet">Kaydet</button></div>';
  h+='</div></div>';
  h+='<div class="bk-modal-overlay hidden" id="vf2-uye-modal"><div class="modal-box modal-sm">';
  h+='<div class="modal-header"><h2 class="modal-title">Üye Ekle</h2><button class="modal-close" id="vf2-uye-kapat">&#10005;</button></div>';
  h+='<div class="modal-body"><div class="field-group"><label class="field-label">Ad Soyad</label><input type="text" id="vf2-uye-ad" class="field-input" placeholder="Ad Soyad..." maxlength="60"/></div>';
  h+='<div class="field-group"><label class="field-label">Rol</label><input type="text" id="vf2-uye-rol" class="field-input" value="Üye" maxlength="30"/></div></div>';
  h+='<div class="modal-footer"><button class="btn-secondary" id="vf2-uye-iptal">İptal</button><button class="btn-primary" id="vf2-uye-kaydet">Kaydet</button></div>';
  h+='</div></div></div>';
  c.innerHTML=h;
  bagla();
}

var _kc=0;
function yeniKalem(y){
  var i=_kc++;var tip=y?y.tip:"gram";var nakit=tip==="nakit";
  var gramVal=y?(y.tip==="nakit"?0:yGram(y)):(TIP_GR[tip]||0);
  var div=document.createElement("div");div.className="vf2-kalem-satir";div.id="vf2-k-"+i;
  div.innerHTML=
    '<select class="field-input vf2-k-tip" id="vf2-k-tip-'+i+'" style="flex:1.5">'+
    TIPLER.map(function(t){return'<option value="'+t+'"'+(tip===t?" selected":"")+'>'+TIP_AD[t]+'</option>';}).join('')+
    '</select>'+
    '<input type="number" class="field-input vf2-k-adet" id="vf2-k-adet-'+i+'" value="'+(y&&y.adet?y.adet:1)+'" min="1" step="1" style="flex:0.8;'+(nakit?'display:none':'')+'" placeholder="Adet"/>'+
    '<div class="vf2-gram-goster" id="vf2-k-gg-'+i+'" style="flex:1;'+(nakit?'display:none':'')+'">'+(!nakit?p(gramVal)+' gr':'')+'</div>'+
    '<input type="number" class="field-input vf2-k-nakit" id="vf2-k-nakit-'+i+'" value="'+(y&&y.nakitTL?y.nakitTL:"")+'" min="0" step="0.01" inputmode="decimal" style="flex:1;'+(nakit?"":"display:none")+'" placeholder="Nakit TL"/>'+
    '<button class="vf2-k-sil" style="flex-shrink:0">&#10005;</button>';
  $("vf2-kalemler").appendChild(div);
  var tipSel=div.querySelector(".vf2-k-tip");
  var adetInp=div.querySelector(".vf2-k-adet");
  var gramGos=div.querySelector(".vf2-gram-goster");
  var nakitInp=div.querySelector(".vf2-k-nakit");
  function upd(){
    var n=tipSel.value==="nakit";
    adetInp.style.display=n?"none":"";gramGos.style.display=n?"none":"";nakitInp.style.display=n?"":"none";
    if(!n)gramGos.textContent=p((TIP_GR[tipSel.value]||0)*(parseInt(adetInp.value)||1))+" gr";
  }
  tipSel.addEventListener("change",upd);adetInp.addEventListener("input",upd);
  div.querySelector(".vf2-k-sil").addEventListener("click",function(){div.remove();});
}

function modalAc(ayKey){
  var mevcut=_aylar.find(function(a){return a.key===ayKey;});
  $("vf2-modal-baslik").textContent=mevcut?"Yatırımı Düzenle":"Yatırım Ekle";
  $("vf2-ay-key").value=ayKey;$("vf2-ay-top").value=mevcut?(mevcut.toplamOdeme||""):"";
  $("vf2-kalemler").innerHTML="";_kc=0;
  document.querySelectorAll(".vf2-ode-cb").forEach(function(cb){cb.checked=mevcut?(mevcut.odemeler&&mevcut.odemeler[cb.value]!==false):true;});
  if(mevcut&&mevcut.yatirimlar&&mevcut.yatirimlar.length)mevcut.yatirimlar.forEach(function(y){yeniKalem(y);});
  $("vf2-modal").classList.remove("hidden");
  setTimeout(function(){$("vf2-ay-top").focus();},100);
}

function bagla(){
  document.querySelectorAll(".vf2-ode-btn").forEach(function(btn){
    btn.addEventListener("click",async function(){
      var ay=_aylar.find(function(a){return a.key===btn.dataset.ay;});
      if(!ay)return;if(!ay.odemeler)ay.odemeler={};
      ay.odemeler[btn.dataset.uid]=!ay.odemeler[btn.dataset.uid];
      await fbKaydet();render();
    });
  });
  document.querySelectorAll(".vf2-duz-btn").forEach(function(btn){btn.addEventListener("click",function(){modalAc(btn.dataset.ay);});});
  document.querySelectorAll(".vf2-sil-btn").forEach(function(btn){
    btn.addEventListener("click",async function(){
      if(!confirm("Bu ayı silmek istiyor musunuz?"))return;
      _aylar=_aylar.filter(function(a){return a.key!==btn.dataset.ay;});
      await fbKaydet();render();
    });
  });
  $("vf2-yatirim-btn").addEventListener("click",function(){
    var buAy=new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");
    modalAc(buAy);$("vf2-ay-key").onchange=function(){modalAc(this.value);};
  });
  $("vf2-modal-kapat").addEventListener("click",function(){$("vf2-modal").classList.add("hidden");});
  $("vf2-iptal").addEventListener("click",function(){$("vf2-modal").classList.add("hidden");});
  $("vf2-modal").addEventListener("click",function(e){if(e.target===$("vf2-modal"))$("vf2-modal").classList.add("hidden");});
  $("vf2-kalem-btn").addEventListener("click",function(){yeniKalem(null);});
  $("vf2-kaydet").addEventListener("click",async function(){
    var key=$("vf2-ay-key").value;var top=parseFloat($("vf2-ay-top").value)||0;
    if(!key){alert("Ay seçiniz.");return;}if(!top||top<=0){$("vf2-ay-top").focus();return;}
    var odemeler={};document.querySelectorAll(".vf2-ode-cb").forEach(function(cb){odemeler[cb.value]=cb.checked;});
    var yatirimlar=[];
    document.querySelectorAll(".vf2-kalem-satir").forEach(function(satir){
      var i=satir.id.replace("vf2-k-","");
      var tip=$("vf2-k-tip-"+i)?.value||"gram";
      if(tip==="nakit"){var ntl=parseFloat($("vf2-k-nakit-"+i)?.value)||0;if(ntl>0)yatirimlar.push({id:uid(),tip:"nakit",nakitTL:ntl});}
      else{var adet=parseInt($("vf2-k-adet-"+i)?.value)||1;if(adet>0)yatirimlar.push({id:uid(),tip:tip,adet:adet});}
    });
    var idx=_aylar.findIndex(function(a){return a.key===key;});
    var obj={key:key,toplamOdeme:top,odemeler:odemeler,yatirimlar:yatirimlar};
    if(idx>=0)_aylar[idx]=obj;else _aylar.push(obj);
    await fbKaydet();$("vf2-modal").classList.add("hidden");render();
  });
  $("vf2-uye-btn").addEventListener("click",function(){$("vf2-uye-ad").value="";$("vf2-uye-rol").value="Üye";$("vf2-uye-modal").classList.remove("hidden");setTimeout(function(){$("vf2-uye-ad").focus();},100);});
  $("vf2-uye-kapat").addEventListener("click",function(){$("vf2-uye-modal").classList.add("hidden");});
  $("vf2-uye-iptal").addEventListener("click",function(){$("vf2-uye-modal").classList.add("hidden");});
  $("vf2-uye-modal").addEventListener("click",function(e){if(e.target===$("vf2-uye-modal"))$("vf2-uye-modal").classList.add("hidden");});
  $("vf2-uye-kaydet").addEventListener("click",async function(){
    var ad=($("vf2-uye-ad").value||"").trim(),rol=($("vf2-uye-rol").value||"Üye").trim();
    if(!ad){$("vf2-uye-ad").focus();return;}
    _uyeler.push({id:uid(),ad:ad,rol:rol});
    await fbKaydet();$("vf2-uye-modal").classList.add("hidden");render();
  });
}

async function vinit(){await fbYukle();render();}
return{init:vinit};
})();


/* ===== MUHTAC MODULE ===== */
var MuhtacModule=(function(){
var $=function(id){return document.getElementById(id);};
var _kisiler=[],_aktifKisi=null;

function mp(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
function muid(){return "mh"+Date.now()+"_"+Math.random().toString(36).substr(2,5);}
function mTarih(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}
function kisiToplam(k){return (k.zekatlar||[]).reduce(function(s,z){return s+(z.miktar||0);},0);}

async function fbYukle(){
  if(!window._fbDb)return;
  try{var s=await window._fbDb.ref("muhtac").once("value");_kisiler=Object.values(s.val()||{});}catch(e){}
}
async function fbKaydet(){
  if(!window._fbDb)return;
  try{var obj={};_kisiler.forEach(function(k){obj[k.id]=k;});await window._fbDb.ref("muhtac").set(obj);}catch(e){}
}

function render(){
  var c=$("muhtac-container");if(!c)return;
  var genelToplam=_kisiler.reduce(function(s,k){return s+kisiToplam(k);},0);
  var bugun=new Date().toISOString().split("T")[0];

  var h='<div class="mh-wrap">';

  /* Özet */
  h+='<div class="mh-header"><div class="mh-ozet">';
  h+='<div class="mh-oz-item"><span class="mh-oz-label">Toplam Kişi</span><span class="mh-oz-val">'+_kisiler.length+'</span></div>';
  h+='<div class="mh-oz-item"><span class="mh-oz-label">Toplam Zekat</span><span class="mh-oz-val" style="color:var(--green);font-weight:300">'+mp(genelToplam)+' <small style="font-size:18px">TL</small></span></div>';
  h+='</div><button class="mh-ekle-btn" id="mh-kisi-ekle-btn">+ Kişi Ekle</button></div>';

  /* Kişi listesi */
  if(!_kisiler.length){
    h+='<div class="mh-bos">🤲<br><br>Henüz kişi eklenmemiş<br><span style="font-size:12px;opacity:0.5">Zekat verdiğin kişileri buraya ekle</span></div>';
  } else {
    h+='<div class="mh-liste">';
    _kisiler.forEach(function(k){
      var top=kisiToplam(k);
      var sonZ=(k.zekatlar&&k.zekatlar.length)?k.zekatlar[k.zekatlar.length-1]:null;
      var aktif=_aktifKisi===k.id?" aktif":"";
      h+='<div class="mh-kisi-kart'+aktif+'" data-id="'+k.id+'">';
      h+='<div class="mh-kisi-avatar">'+k.ad.charAt(0).toUpperCase()+'</div>';
      h+='<div class="mh-kisi-bilgi">';
      h+='<div class="mh-kisi-ad">'+k.ad+'</div>';
      if(k.not)h+='<div class="mh-kisi-not">'+k.not+'</div>';
      h+='<div class="mh-kisi-meta">';
      h+='<span class="mh-meta-item">'+( k.zekatlar?k.zekatlar.length:0)+' kayıt</span>';
      if(sonZ)h+='<span class="mh-meta-item">Son: '+mTarih(sonZ.tarih)+'</span>';
      h+='</div></div>';
      h+='<div class="mh-kisi-sag"><div class="mh-kisi-toplam">'+mp(top)+' TL</div>';
      h+='<div class="mh-kisi-toplam-label">toplam zekat</div></div>';
      h+='<button class="mh-sil-kisi-btn row-action-btn sil" data-id="'+k.id+'">&#10005;</button>';
      h+='</div>';

      /* Detay paneli — aktif kişinin hemen altında */
      if(_aktifKisi===k.id){
        var zList=k.zekatlar||[];
        var zTop=kisiToplam(k);
        h+='<div class="mh-detay-panel">';
        /* Başlık */
        h+='<div class="mh-detay-baslik">';
        h+='<div class="mh-detay-avatar">'+k.ad.charAt(0).toUpperCase()+'</div>';
        h+='<div class="mh-detay-isim-blok"><div class="mh-detay-ad">'+k.ad+'</div>'+(k.not?'<div class="mh-detay-not">'+k.not+'</div>':'')+'</div>';
        h+='<div class="mh-detay-toplam-blok"><div class="mh-detay-toplam-rakam">'+mp(zTop)+' TL</div><div class="mh-detay-toplam-label">toplam zekat</div></div>';
        h+='<button class="mh-detay-kapat" id="mh-detay-kapat">&#10005;</button>';
        h+='</div>';
        /* Form */
        h+='<div class="mh-zekat-form">';
        h+='<div class="mh-form-baslik">Zekat Ekle</div>';
        h+='<div class="mh-form-row">';
        h+='<div class="field-group"><label class="field-label">Tarih</label><input type="date" id="mh-z-tarih" class="field-input" value="'+bugun+'"/></div>';
        h+='<div class="field-group" style="flex:1.2"><label class="field-label">Miktar (TL)</label><input type="number" id="mh-z-miktar" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
        h+='<div class="field-group" style="flex:2"><label class="field-label">Açıklama</label><input type="text" id="mh-z-aciklama" class="field-input" placeholder="Ramazan zekatı, fitre..." maxlength="100"/></div>';
        h+='<button class="mh-zekat-ekle-btn" id="mh-zekat-kaydet-btn">Ekle</button>';
        h+='</div></div>';
        /* Geçmiş */
        h+='<div class="mh-zekat-liste">';
        if(!zList.length){
          h+='<div class="mh-bos" style="padding:28px">Henüz zekat kaydı yok</div>';
        } else {
          h+='<table class="mh-tablo"><thead><tr><th>TARİH</th><th>MİKTAR</th><th>AÇIKLAMA</th><th></th></tr></thead><tbody>';
          zList.slice().reverse().forEach(function(z){
            h+='<tr class="mh-satir">';
            h+='<td class="mh-td-tarih">'+mTarih(z.tarih)+'</td>';
            h+='<td class="mh-td-miktar">'+mp(z.miktar)+' TL</td>';
            h+='<td class="mh-td-aciklama">'+(z.aciklama||'<span style="opacity:0.3">—</span>')+'</td>';
            h+='<td style="padding:14px 16px"><button class="mh-sil-zekat-btn row-action-btn sil" data-zid="'+z.id+'">&#10005;</button></td>';
            h+='</tr>';
          });
          h+='<tr class="mh-toplam-row"><td>TOPLAM</td><td>'+mp(zTop)+' TL</td><td></td><td></td></tr>';
          h+='</tbody></table>';
        }
        h+='</div></div>';
      }
    });
    h+='</div>';
  }

  /* Kişi Ekle Modal */
  h+='<div class="bk-modal-overlay hidden" id="mh-modal"><div class="modal-box modal-sm">';
  h+='<div class="modal-header"><h2 class="modal-title">Kişi Ekle</h2><button class="modal-close" id="mh-modal-kapat">&#10005;</button></div>';
  h+='<div class="modal-body">';
  h+='<div class="field-group"><label class="field-label">Ad Soyad</label><input type="text" id="mh-kisi-ad" class="field-input" placeholder="Ad Soyad..." maxlength="60"/></div>';
  h+='<div class="field-group"><label class="field-label">Not (mahalle, açıklama...)</label><input type="text" id="mh-kisi-not" class="field-input" placeholder="isteğe bağlı" maxlength="100"/></div>';
  h+='</div>';
  h+='<div class="modal-footer"><button class="btn-secondary" id="mh-modal-iptal">İptal</button><button class="btn-primary" id="mh-modal-kaydet">Kaydet</button></div>';
  h+='</div></div>';
  h+='</div>';
  c.innerHTML=h;
  bagla();
}

function bagla(){
  /* Kişi kartı tıklama */
  document.querySelectorAll(".mh-kisi-kart").forEach(function(el){
    el.addEventListener("click",function(e){
      if(e.target.closest(".mh-sil-kisi-btn"))return;
      _aktifKisi=_aktifKisi===el.dataset.id?null:el.dataset.id;
      render();
      if(_aktifKisi){
        setTimeout(function(){
          var p=el.nextElementSibling;
          if(p&&p.classList.contains("mh-detay-panel"))p.scrollIntoView({behavior:"smooth",block:"nearest"});
        },60);
      }
    });
  });
  /* Detay kapat */
  var kb=$("mh-detay-kapat");
  if(kb)kb.addEventListener("click",function(){_aktifKisi=null;render();});
  /* Zekat ekle */
  var zb=$("mh-zekat-kaydet-btn");
  if(zb){
    zb.addEventListener("click",async function(){
      var tarih=$("mh-z-tarih").value;
      var miktar=parseFloat($("mh-z-miktar").value)||0;
      var aciklama=($("mh-z-aciklama").value||"").trim();
      if(!tarih||miktar<=0){$("mh-z-miktar").focus();return;}
      var k=_kisiler.find(function(x){return x.id===_aktifKisi;});
      if(!k)return;
      if(!k.zekatlar)k.zekatlar=[];
      k.zekatlar.push({id:muid(),tarih:tarih,miktar:miktar,aciklama:aciklama});
      await fbKaydet();
      $("mh-z-miktar").value="";$("mh-z-aciklama").value="";
      render();
    });
  }
  /* Zekat sil */
  document.querySelectorAll(".mh-sil-zekat-btn").forEach(function(btn){
    btn.addEventListener("click",async function(){
      if(!confirm("Bu zekat kaydını silmek istiyor musunuz?"))return;
      var k=_kisiler.find(function(x){return x.id===_aktifKisi;});
      if(k&&k.zekatlar)k.zekatlar=k.zekatlar.filter(function(z){return z.id!==btn.dataset.zid;});
      await fbKaydet();render();
    });
  });
  /* Kişi sil */
  document.querySelectorAll(".mh-sil-kisi-btn").forEach(function(btn){
    btn.addEventListener("click",async function(e){
      e.stopPropagation();
      if(!confirm("Bu kişiyi ve tüm zekat kayıtlarını silmek istiyor musunuz?"))return;
      _kisiler=_kisiler.filter(function(k){return k.id!==btn.dataset.id;});
      if(_aktifKisi===btn.dataset.id)_aktifKisi=null;
      await fbKaydet();render();
    });
  });
  /* Modal */
  $("mh-kisi-ekle-btn").addEventListener("click",function(){
    $("mh-kisi-ad").value="";$("mh-kisi-not").value="";
    $("mh-modal").classList.remove("hidden");
    setTimeout(function(){$("mh-kisi-ad").focus();},100);
  });
  $("mh-modal-kapat").addEventListener("click",function(){$("mh-modal").classList.add("hidden");});
  $("mh-modal-iptal").addEventListener("click",function(){$("mh-modal").classList.add("hidden");});
  $("mh-modal").addEventListener("click",function(e){if(e.target===$("mh-modal"))$("mh-modal").classList.add("hidden");});
  $("mh-modal-kaydet").addEventListener("click",async function(){
    var ad=($("mh-kisi-ad").value||"").trim();
    var not=($("mh-kisi-not").value||"").trim();
    if(!ad){$("mh-kisi-ad").focus();return;}
    _kisiler.push({id:muid(),ad:ad,not:not,zekatlar:[]});
    await fbKaydet();$("mh-modal").classList.add("hidden");render();
  });
}

async function minit(){await fbYukle();render();}
return{init:minit};
})();
