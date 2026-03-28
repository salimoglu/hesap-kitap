const IslemlerModule = (() => {
  let _islemler = [], _kategoriler = [], _duzenleId = null, _silId = null, _aktifTip = 'gider', _katTip = 'gider';
  const $ = id => document.getElementById(id);

  function paraBicim(s) {
    return Number(s).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function tarihBicim(t) {
    if (!t) return '';
    const [y,m,d] = t.split('-');
    const ay = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara'];
    return d + ' ' + ay[parseInt(m)-1];
  }
  function bugunTarih() {
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }

  async function yukle() {
    _islemler    = await IslemlerDB.getAll();
    _kategoriler = await KategorilerDB.getAll();
    _islemler.sort((a,b) => b.tarih.localeCompare(a.tarih) || (b.olusturma||0)-(a.olusturma||0));
    renderList(); renderSummary(); doldurAyFilter(); doldurHgKat();
  }

  function renderSummary() {
    const gelir = _islemler.filter(i=>i.tip==='gelir').reduce((s,i)=>s+parseFloat(i.tutar),0);
    const gider = _islemler.filter(i=>i.tip==='gider').reduce((s,i)=>s+parseFloat(i.tutar),0);
    const net = gelir - gider;
    $('total-gelir').textContent = paraBicim(gelir);
    $('total-gider').textContent = paraBicim(gider);
    const el = $('total-net');
    el.textContent = paraBicim(net);
    el.style.color = net >= 0 ? 'var(--green)' : 'var(--red)';
  }

  function filtreliIslemler() {
    const tip = $('filter-type').value, ay = $('filter-ay').value;
    return _islemler.filter(i => (tip==='hepsi'||i.tip===tip) && (ay==='hepsi'||i.tarih.startsWith(ay)));
  }

  function renderList() {
    const liste = $('islem-list'), empty = $('empty-state');
    const items = filtreliIslemler();
    [...liste.querySelectorAll('.islem-row,.islem-grup-baslik')].forEach(el=>el.remove());
    if (!items.length) { empty.style.display='flex'; return; }
    empty.style.display='none';

    // Kayan bakiye (tum islemlere gore kronolojik)
    const sirali = [..._islemler].sort((a,b)=>a.tarih.localeCompare(b.tarih)||(a.olusturma||0)-(b.olusturma||0));
    const bakiyeMap = {};
    let b = 0;
    for (const i of sirali) {
      b += i.tip==='gelir' ? parseFloat(i.tutar) : -parseFloat(i.tutar);
      bakiyeMap[i.id] = b;
    }
    const gruplar = {};
    for (const i of items) {
      const k = i.tarih.substring(0,7);
      if (!gruplar[k]) gruplar[k]=[];
      gruplar[k].push(i);
    }
    const aylar=['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
    for (const [key,grup] of Object.entries(gruplar)) {
      const [y,m] = key.split('-');
      const bas = document.createElement('div');
      bas.className='islem-grup-baslik';
      bas.textContent = aylar[parseInt(m)-1]+' '+y;
      liste.appendChild(bas);
      for (const islem of grup) liste.appendChild(rowOlustur(islem, bakiyeMap[islem.id]));
    }
  }

  function rowOlustur(islem, bakiye) {
    const div = document.createElement('div');
    div.className = 'islem-row ' + islem.tip;
    div.innerHTML =
      '<div class="sol-bar"></div>'+
      '<div class="islem-row-left">'+
        '<div class="islem-kat-adi">'+esc(islem.kategori)+'</div>'+
        (islem.aciklama?'<div class="islem-aciklama-kisa">'+esc(islem.aciklama)+'</div>':'')+
        '<div class="islem-tarih-kisa">'+tarihBicim(islem.tarih)+'</div>'+
      '</div>'+
      '<div class="islem-row-right">'+
        '<span class="islem-tutar-val">'+(islem.tip==='gider'?'-':'+')+paraBicim(islem.tutar)+'</span>'+
        '<span class="islem-bakiye-val">'+paraBicim(bakiye||0)+'</span>'+
        '<div class="islem-row-actions">'+
          '<button class="row-action-btn duzenle" data-id="'+islem.id+'">&#9998;</button>'+
          '<button class="row-action-btn sil" data-id="'+islem.id+'">&#128465;</button>'+
        '</div>'+
      '</div>';
    div.querySelector('.duzenle').addEventListener('click',e=>{e.stopPropagation();modalAc(islem.id);});
    div.querySelector('.sil').addEventListener('click',e=>{e.stopPropagation();silModalAc(islem.id);});
    return div;
  }

  function esc(s) { const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

  function doldurAyFilter() {
    const sel=$('filter-ay'), prev=sel.value;
    while(sel.options.length>1) sel.remove(1);
    const aylar=['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
    const aySet=new Set(_islemler.map(i=>i.tarih.substring(0,7)));
    [...aySet].sort((a,b)=>b.localeCompare(a)).forEach(key=>{
      const [y,m]=key.split('-');
      const o=document.createElement('option'); o.value=key; o.textContent=aylar[parseInt(m)-1]+' '+y; sel.appendChild(o);
    });
    if([...sel.options].some(o=>o.value===prev)) sel.value=prev;
  }

  function doldurHgKat() {
    const sel=$('hg-kat'); if(!sel) return;
    sel.innerHTML='';
    const kats=_kategoriler.sort((a,b)=>a.grup.localeCompare(b.grup)||a.ad.localeCompare(b.ad));
    const gruplar={};
    for(const k of kats){ if(!gruplar[k.grup]) gruplar[k.grup]=[]; gruplar[k.grup].push(k); }
    for(const [g,ks] of Object.entries(gruplar)){
      const og=document.createElement('optgroup'); og.label=g;
      for(const k of ks){ const o=document.createElement('option'); o.value=g+' - '+k.ad+'|'+k.tip; o.textContent=k.ad; og.appendChild(o); }
      sel.appendChild(og);
    }
  }

  function doldurKategoriSelect(tip) {
    const sel=$('sel-kategori'); sel.innerHTML='';
    const kats=_kategoriler.filter(k=>k.tip===tip).sort((a,b)=>a.grup.localeCompare(b.grup)||a.ad.localeCompare(b.ad));
    const gruplar={};
    for(const k of kats){ if(!gruplar[k.grup]) gruplar[k.grup]=[]; gruplar[k.grup].push(k); }
    for(const [g,ks] of Object.entries(gruplar)){
      const og=document.createElement('optgroup'); og.label=g;
      for(const k of ks){ const o=document.createElement('option'); o.value=g+' - '+k.ad; o.textContent=k.ad; og.appendChild(o); }
      sel.appendChild(og);
    }
  }

  // YENİ KATEGORİ — grup dropdown
  function doldurGrupSelect(tip) {
    const sel=$('sel-kat-grup'); if(!sel) return;
    sel.innerHTML='';
    // Mevcut gruplari getir
    const gruplar=[...new Set(_kategoriler.filter(k=>k.tip===tip).map(k=>k.grup))].sort();
    gruplar.forEach(g=>{
      const o=document.createElement('option'); o.value=g; o.textContent=g; sel.appendChild(o);
    });
    // Yeni grup secenegi
    const yeni=document.createElement('option'); yeni.value='__YENI__'; yeni.textContent='+ Yeni grup olustur...'; sel.appendChild(yeni);
    // Ilk kez yeni-grup-wrap gizli olsun
    const wrap=$('yeni-grup-wrap');
    if(wrap) wrap.style.display='none';
  }

  function hgKaydet_onceki_tip(t) { return t; }

  async function hgKaydet(tip) {
    const aciklama=$('hg-aciklama').value.trim();
    const tutar=parseFloat($('hg-tutar').value);
    const katVal=$('hg-kat').value;
    const kategori=katVal?katVal.split('|')[0]:'';
    if(!tutar||tutar<=0){$('hg-tutar').focus();return;}
    if(!kategori){$('hg-kat').focus();return;}
    await IslemlerDB.add({tip,kategori,tutar,aciklama,tarih:bugunTarih()});
    $('hg-aciklama').value='';
    $('hg-tutar').value='';
    await yukle();
  }

  async function modalAc(duzenleId) {
    _duzenleId=duzenleId;
    const islem=_islemler.find(x=>x.id===duzenleId); if(!islem) return;
    tipSec(islem.tip);
    doldurKategoriSelect(islem.tip);
    $('sel-kategori').value=islem.kategori;
    $('inp-tutar').value=islem.tutar;
    $('inp-aciklama').value=islem.aciklama||'';
    $('inp-tarih').value=islem.tarih;
    $('modal-islem').classList.remove('hidden');
  }
  function modalKapat(){$('modal-islem').classList.add('hidden');_duzenleId=null;}
  function tipSec(tip){_aktifTip=tip;$('btn-gider').classList.toggle('active',tip==='gider');$('btn-gelir').classList.toggle('active',tip==='gelir');doldurKategoriSelect(tip);}

  async function kaydet(){
    const tutar=parseFloat($('inp-tutar').value);
    const kategori=$('sel-kategori').value;
    const aciklama=$('inp-aciklama').value.trim();
    const tarih=$('inp-tarih').value;
    if(!tutar||tutar<=0){alert('Gecerli bir tutar girin.');return;}
    if(!kategori){alert('Kategori secin.');return;}
    if(!tarih){alert('Tarih secin.');return;}
    const islem={tip:_aktifTip,kategori,tutar,aciklama,tarih};
    if(_duzenleId){islem.id=_duzenleId;await IslemlerDB.update(islem);}
    else{await IslemlerDB.add(islem);}
    modalKapat(); await yukle();
  }

  function silModalAc(id){_silId=id;$('modal-sil').classList.remove('hidden');}
  function silModalKapat(){$('modal-sil').classList.add('hidden');_silId=null;}
  async function silOnayla(){if(_silId){await IslemlerDB.delete(_silId);silModalKapat();await yukle();}}

  function katTipSec(tip){
    _katTip=tip;
    $('kat-btn-gider').classList.toggle('active',tip==='gider');
    $('kat-btn-gelir').classList.toggle('active',tip==='gelir');
    doldurGrupSelect(tip);
  }

  function yeniKatAc(){
    $('inp-kat-ad').value='';
    if($('inp-kat-grup-yeni')) $('inp-kat-grup-yeni').value='';
    katTipSec('gider');
    $('modal-kategori').classList.remove('hidden');
    setTimeout(()=>$('inp-kat-ad').focus(),300);
  }
  function yeniKatKapat(){$('modal-kategori').classList.add('hidden');}

  async function yeniKatKaydet(){
    const sel=$('sel-kat-grup');
    let grup=sel.value;
    if(grup==='__YENI__'){
      const yeniGrup=($('inp-kat-grup-yeni').value||'').trim().toUpperCase();
      if(!yeniGrup){alert('Yeni grup adi girin.');$('inp-kat-grup-yeni').focus();return;}
      grup=yeniGrup;
    }
    const ad=($('inp-kat-ad').value||'').trim();
    if(!ad){alert('Kategori adi girin.');$('inp-kat-ad').focus();return;}
    await KategorilerDB.add({tip:_katTip,grup,ad,varsayilan:false});
    _kategoriler=await KategorilerDB.getAll();
    doldurHgKat();
    if($('sel-kategori')) doldurKategoriSelect(_aktifTip);
    yeniKatKapat();
  }

  function baglaEventler(){
    $('hg-btn-gelir').addEventListener('click',()=>hgKaydet('gelir'));
    $('hg-btn-gider').addEventListener('click',()=>hgKaydet('gider'));
    $('hg-tutar').addEventListener('keydown',e=>{if(e.key==='Enter')hgKaydet('gider');});
    $('filter-type').addEventListener('change',renderList);
    $('filter-ay').addEventListener('change',renderList);
    $('btn-yeni-kat-bar').addEventListener('click',yeniKatAc);
    $('modal-close').addEventListener('click',modalKapat);
    $('btn-iptal').addEventListener('click',modalKapat);
    $('btn-kaydet').addEventListener('click',kaydet);
    $('btn-gider').addEventListener('click',()=>tipSec('gider'));
    $('btn-gelir').addEventListener('click',()=>tipSec('gelir'));
    $('btn-yeni-kat').addEventListener('click',yeniKatAc);
    $('modal-islem').addEventListener('click',e=>{if(e.target===$('modal-islem'))modalKapat();});
    [$('inp-tutar'),$('inp-aciklama'),$('inp-tarih')].forEach(el=>el&&el.addEventListener('keydown',e=>{if(e.key==='Enter')kaydet();}));
    $('sil-close').addEventListener('click',silModalKapat);
    $('sil-iptal').addEventListener('click',silModalKapat);
    $('sil-onayla').addEventListener('click',silOnayla);
    $('modal-sil').addEventListener('click',e=>{if(e.target===$('modal-sil'))silModalKapat();});
    $('kat-close').addEventListener('click',yeniKatKapat);
    $('kat-iptal').addEventListener('click',yeniKatKapat);
    $('kat-kaydet').addEventListener('click',yeniKatKaydet);
    $('kat-btn-gider').addEventListener('click',()=>katTipSec('gider'));
    $('kat-btn-gelir').addEventListener('click',()=>katTipSec('gelir'));
    $('inp-kat-ad').addEventListener('keydown',e=>{if(e.key==='Enter')yeniKatKaydet();});
    $('modal-kategori').addEventListener('click',e=>{if(e.target===$('modal-kategori'))yeniKatKapat();});
    // Grup seciminde "Yeni grup" secilince input goster
    $('sel-kat-grup').addEventListener('change',function(){
      const wrap=$('yeni-grup-wrap');
      if(this.value==='__YENI__'){
        wrap.style.display='flex';
        setTimeout(()=>$('inp-kat-grup-yeni').focus(),100);
      } else {
        wrap.style.display='none';
      }
    });
  }

  async function init(){baglaEventler();await yukle();}
  return {init};
})();
