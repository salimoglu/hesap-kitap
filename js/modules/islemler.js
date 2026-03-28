const IslemlerModule = (() => {
  let _islemler=[], _kategoriler=[], _duzenleId=null, _silId=null;
  let _aktifTip='gider', _katTip='gider';
  let _seciliKat = { value:'', label:'Kategori...', tip:'' };
  const $=id=>document.getElementById(id);

  /* ── YARDIMCI ── */
  function para(s){ return Number(s).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function tarihSaat(t){ if(!t)return''; const[y,m,d]=t.split('-'); return d+'.'+m+'.'+y; }
  function bugun(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function esc(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

  /* ── YÜKLE ── */
  async function yukle(){
    _islemler=await IslemlerDB.getAll();
    _kategoriler=await KategorilerDB.getAll();
    _islemler.sort((a,b)=>b.tarih.localeCompare(a.tarih)||(b.olusturma||0)-(a.olusturma||0));
    renderList(); renderSummary(); doldurAyFilter(); buildHgDropdown();
  }

  /* ── ÖZET ── */
  function renderSummary(){
    const gelir=_islemler.filter(i=>i.tip==='gelir').reduce((s,i)=>s+parseFloat(i.tutar),0);
    const gider=_islemler.filter(i=>i.tip==='gider').reduce((s,i)=>s+parseFloat(i.tutar),0);
    const net=gelir-gider;
    $('total-gelir').textContent=para(gelir);
    $('total-gider').textContent=para(gider);
    const el=$('total-net'); el.textContent=para(net);
    el.style.color=net>=0?'var(--green)':'var(--red)';
  }

  /* ── LİSTE ── */
  function filtreliIslemler(){
    const tip=$('filter-type').value, ay=$('filter-ay').value;
    return _islemler.filter(i=>(tip==='hepsi'||i.tip===tip)&&(ay==='hepsi'||i.tarih.startsWith(ay)));
  }

  function renderList(){
    const liste=$('islem-list'), empty=$('empty-state');
    const items=filtreliIslemler();
    [...liste.querySelectorAll('.islem-row,.islem-grup-baslik,.islem-ay-ozet,.islem-genel-toplam')].forEach(el=>el.remove());
    if(!items.length){empty.style.display='flex';return;}
    empty.style.display='none';

    // Kayan bakiye
    const sirali=[..._islemler].sort((a,b)=>a.tarih.localeCompare(b.tarih)||(a.olusturma||0)-(b.olusturma||0));
    const bakMap={}; let bak=0;
    for(const i of sirali){ bak+=i.tip==='gelir'?parseFloat(i.tutar):-parseFloat(i.tutar); bakMap[i.id]=bak; }

    const gruplar={};
    for(const i of items){ const k=i.tarih.substring(0,7); if(!gruplar[k])gruplar[k]=[]; gruplar[k].push(i); }
    const AYLAR=['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
    let genG=0,genGi=0;

    for(const [key,grup] of Object.entries(gruplar)){
      const [y,m]=key.split('-');
      const bas=document.createElement('div'); bas.className='islem-grup-baslik';
      bas.textContent=AYLAR[parseInt(m)-1]+' '+y; liste.appendChild(bas);
      let ayG=0,ayGi=0;
      for(const i of grup){
        liste.appendChild(rowOlustur(i,bakMap[i.id]));
        if(i.tip==='gelir') ayG+=parseFloat(i.tutar); else ayGi+=parseFloat(i.tutar);
      }
      genG+=ayG; genGi+=ayGi;
      const ayOzet=document.createElement('div'); ayOzet.className='islem-ay-ozet';
      const ayNet=ayG-ayGi;
      ayOzet.innerHTML='<span>'+AYLAR[parseInt(m)-1]+':</span>'+
        '<span class="ao-gelir">'+para(ayG)+'</span><span class="ao-sep">&#8722;</span>'+
        '<span class="ao-gider">'+para(ayGi)+'</span><span class="ao-sep">=</span>'+
        '<span class="ao-net">'+(ayNet>=0?'':'-')+para(Math.abs(ayNet))+'</span>';
      liste.appendChild(ayOzet);
    }

    if(Object.keys(gruplar).length){
      const gt=document.createElement('div'); gt.className='islem-genel-toplam';
      const gNet=genG-genGi;
      gt.innerHTML='<span>TOPLAM:</span>'+
        '<span style="color:var(--green);font-family:var(--font-brand)">'+para(genG)+'</span>'+
        '<span style="color:var(--text-muted)">&#8722;</span>'+
        '<span style="color:var(--red);font-family:var(--font-brand)">'+para(genGi)+'</span>'+
        '<span style="color:var(--text-muted)">=</span>'+
        '<span class="gt-val">'+(gNet>=0?'':'-')+para(Math.abs(gNet))+'</span>';
      liste.appendChild(gt);
    }
  }

  function rowOlustur(islem,bakiye){
    const div=document.createElement('div'); div.className='islem-row '+islem.tip;
    const katAdi=esc(islem.kategori)+(islem.aciklama?' <span class="islem-aciklama-inline">&#42; '+esc(islem.aciklama)+'</span>':'');
    div.innerHTML='<div class="sol-bar"></div>'+
      '<div class="islem-row-left"><div class="islem-kat-adi">'+katAdi+'</div></div>'+
      '<div class="islem-row-right">'+
        '<span class="islem-tarih-col">'+tarihSaat(islem.tarih)+'</span>'+
        '<span class="islem-tutar-col">'+(islem.tip==='gider'?'-':'+')+para(islem.tutar)+'</span>'+
        '<span class="islem-bakiye-col">'+para(bakiye||0)+'</span>'+
        '<div class="islem-row-actions">'+
          '<button class="row-action-btn duzenle">&#9998;</button>'+
          '<button class="row-action-btn sil">&#10005;</button>'+
        '</div></div>';
    div.querySelector('.duzenle').addEventListener('click',e=>{e.stopPropagation();modalAc(islem.id);});
    div.querySelector('.sil').addEventListener('click',e=>{e.stopPropagation();silModalAc(islem.id);});
    return div;
  }

  /* ── AY FİLTRE ── */
  function doldurAyFilter(){
    const sel=$('filter-ay'),prev=sel.value;
    while(sel.options.length>1) sel.remove(1);
    const AYLAR=['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
    const aySet=new Set(_islemler.map(i=>i.tarih.substring(0,7)));
    [...aySet].sort((a,b)=>b.localeCompare(a)).forEach(key=>{
      const[y,m]=key.split('-'); const o=document.createElement('option');
      o.value=key; o.textContent=AYLAR[parseInt(m)-1]+' '+y; sel.appendChild(o);
    });
    if([...sel.options].some(o=>o.value===prev)) sel.value=prev;
  }

  /* ══ ÖZEL KATEGORİ DROPDOWN (hızlı giriş) ══ */
  function buildHgDropdown(){
    const dropdown=$('hg-kat-dropdown'); if(!dropdown) return;
    dropdown.innerHTML='';
    const kats=[..._kategoriler].sort((a,b)=>a.grup.localeCompare(b.grup)||a.ad.localeCompare(b.ad));
    const gruplar={};
    for(const k of kats){ if(!gruplar[k.grup])gruplar[k.grup]=[]; gruplar[k.grup].push(k); }
    for(const [g,ks] of Object.entries(gruplar)){
      const lbl=document.createElement('div'); lbl.className='hg-kat-group-label'; lbl.textContent=g;
      dropdown.appendChild(lbl);
      for(const k of ks){
        const item=document.createElement('div'); item.className='hg-kat-option';
        if(_seciliKat.value===g+' - '+k.ad) item.classList.add('selected');
        item.textContent=k.ad;
        item.addEventListener('click',()=>{
          _seciliKat={value:g+' - '+k.ad, label:k.ad, tip:k.tip};
          $('hg-kat-trigger').textContent=k.ad;
          closeHgDropdown();
        });
        dropdown.appendChild(item);
      }
    }
  }

  function toggleHgDropdown(){
    const dd=$('hg-kat-dropdown');
    dd.classList.toggle('open');
    if(dd.classList.contains('open')) buildHgDropdown();
  }
  function closeHgDropdown(){ $('hg-kat-dropdown').classList.remove('open'); }

  /* ── MODAL KATEGORİ SELECT ── */
  function doldurKategoriSelect(tip){
    const sel=$('sel-kategori'); sel.innerHTML='';
    const kats=_kategoriler.filter(k=>k.tip===tip).sort((a,b)=>a.grup.localeCompare(b.grup)||a.ad.localeCompare(b.ad));
    const gruplar={};
    for(const k of kats){ if(!gruplar[k.grup])gruplar[k.grup]=[]; gruplar[k.grup].push(k); }
    for(const [g,ks] of Object.entries(gruplar)){
      const og=document.createElement('optgroup'); og.label=g;
      for(const k of ks){ const o=document.createElement('option'); o.value=g+' - '+k.ad; o.textContent=k.ad; og.appendChild(o); }
      sel.appendChild(og);
    }
  }

  /* ── GRUP SELECT (yeni kategori modal) ── */
  function doldurGrupSelect(tip){
    const sel=$('sel-kat-grup'); if(!sel) return;
    sel.innerHTML='';
    const gruplar=[...new Set(_kategoriler.filter(k=>k.tip===tip).map(k=>k.grup))].sort();
    gruplar.forEach(g=>{ const o=document.createElement('option'); o.value=g; o.textContent=g; sel.appendChild(o); });
    const yeni=document.createElement('option'); yeni.value='__YENI__'; yeni.textContent='+ Yeni grup olustur...'; sel.appendChild(yeni);
    const wrap=$('yeni-grup-wrap'); if(wrap) wrap.style.display='none';
  }

  /* ── HIZLI GİRİŞ KAYDET ── */
  async function hgKaydet(tip){
    const aciklama=$('hg-aciklama').value.trim();
    const tutar=parseFloat($('hg-tutar').value);
    if(!tutar||tutar<=0){ $('hg-tutar').focus(); return; }
    if(!_seciliKat.value){ toggleHgDropdown(); return; }
    await IslemlerDB.add({tip, kategori:_seciliKat.value, tutar, aciklama, tarih:bugun()});
    $('hg-aciklama').value=''; $('hg-tutar').value='';
    await yukle();
  }

  /* ── DÜZENLE MODAL ── */
  async function modalAc(id){
    _duzenleId=id;
    const islem=_islemler.find(x=>x.id===id); if(!islem) return;
    tipSec(islem.tip); doldurKategoriSelect(islem.tip);
    $('sel-kategori').value=islem.kategori;
    $('inp-tutar').value=islem.tutar;
    $('inp-aciklama').value=islem.aciklama||'';
    $('inp-tarih').value=islem.tarih;
    $('modal-islem').classList.remove('hidden');
  }
  function modalKapat(){ $('modal-islem').classList.add('hidden'); _duzenleId=null; }
  function tipSec(tip){ _aktifTip=tip; $('btn-gider').classList.toggle('active',tip==='gider'); $('btn-gelir').classList.toggle('active',tip==='gelir'); doldurKategoriSelect(tip); }

  async function kaydet(){
    const tutar=parseFloat($('inp-tutar').value);
    const kategori=$('sel-kategori').value;
    const aciklama=$('inp-aciklama').value.trim();
    const tarih=$('inp-tarih').value;
    if(!tutar||tutar<=0){alert('Gecerli tutar girin.');return;}
    if(!kategori){alert('Kategori secin.');return;}
    if(!tarih){alert('Tarih secin.');return;}
    const islem={tip:_aktifTip,kategori,tutar,aciklama,tarih};
    if(_duzenleId){islem.id=_duzenleId;await IslemlerDB.update(islem);}
    else{await IslemlerDB.add(islem);}
    modalKapat(); await yukle();
  }

  /* ── SİL ── */
  function silModalAc(id){ _silId=id; $('modal-sil').classList.remove('hidden'); }
  function silModalKapat(){ $('modal-sil').classList.add('hidden'); _silId=null; }
  async function silOnayla(){ if(_silId){ await IslemlerDB.delete(_silId); silModalKapat(); await yukle(); } }

  /* ── YENİ KATEGORİ ── */
  function katTipSec(tip){ _katTip=tip; $('kat-btn-gider').classList.toggle('active',tip==='gider'); $('kat-btn-gelir').classList.toggle('active',tip==='gelir'); doldurGrupSelect(tip); }
  function yeniKatAc(){ $('inp-kat-ad').value=''; if($('inp-kat-grup-yeni'))$('inp-kat-grup-yeni').value=''; katTipSec('gider'); $('modal-kategori').classList.remove('hidden'); setTimeout(()=>$('inp-kat-ad').focus(),300); }
  function yeniKatKapat(){ $('modal-kategori').classList.add('hidden'); }
  async function yeniKatKaydet(){
    const sel=$('sel-kat-grup'); let grup=sel.value;
    if(grup==='__YENI__'){ const yg=($('inp-kat-grup-yeni').value||'').trim().toUpperCase(); if(!yg){alert('Yeni grup adi girin.');return;} grup=yg; }
    const ad=($('inp-kat-ad').value||'').trim(); if(!ad){alert('Kategori adi girin.');return;}
    await KategorilerDB.add({tip:_katTip,grup,ad,varsayilan:false});
    _kategoriler=await KategorilerDB.getAll();
    buildHgDropdown(); if($('sel-kategori')) doldurKategoriSelect(_aktifTip);
    yeniKatKapat();
  }

  /* ── EVENTS ── */
  function baglaEventler(){
    // Hızlı giriş
    $('hg-btn-gelir').addEventListener('click',()=>hgKaydet('gelir'));
    $('hg-btn-gider').addEventListener('click',()=>hgKaydet('gider'));
    $('hg-tutar').addEventListener('keydown',e=>{ if(e.key==='Enter') hgKaydet('gider'); });
    $('hg-kat-trigger').addEventListener('click',e=>{ e.stopPropagation(); toggleHgDropdown(); });
    document.addEventListener('click',e=>{ if(!$('hg-kat-wrap').contains(e.target)) closeHgDropdown(); });

    // Filtre
    $('filter-type').addEventListener('change',renderList);
    $('filter-ay').addEventListener('change',renderList);
    $('btn-yeni-kat-bar').addEventListener('click',yeniKatAc);

    // Modal düzenle
    $('modal-close').addEventListener('click',modalKapat);
    $('btn-iptal').addEventListener('click',modalKapat);
    $('btn-kaydet').addEventListener('click',kaydet);
    $('btn-gider').addEventListener('click',()=>tipSec('gider'));
    $('btn-gelir').addEventListener('click',()=>tipSec('gelir'));
    $('btn-yeni-kat').addEventListener('click',yeniKatAc);
    $('modal-islem').addEventListener('click',e=>{ if(e.target===$('modal-islem')) modalKapat(); });
    [$('inp-tutar'),$('inp-aciklama'),$('inp-tarih')].forEach(el=>el&&el.addEventListener('keydown',e=>{ if(e.key==='Enter') kaydet(); }));

    // Modal sil
    $('sil-close').addEventListener('click',silModalKapat);
    $('sil-iptal').addEventListener('click',silModalKapat);
    $('sil-onayla').addEventListener('click',silOnayla);
    $('modal-sil').addEventListener('click',e=>{ if(e.target===$('modal-sil')) silModalKapat(); });

    // Modal kategori
    $('kat-close').addEventListener('click',yeniKatKapat);
    $('kat-iptal').addEventListener('click',yeniKatKapat);
    $('kat-kaydet').addEventListener('click',yeniKatKaydet);
    $('kat-btn-gider').addEventListener('click',()=>katTipSec('gider'));
    $('kat-btn-gelir').addEventListener('click',()=>katTipSec('gelir'));
    $('inp-kat-ad').addEventListener('keydown',e=>{ if(e.key==='Enter') yeniKatKaydet(); });
    $('modal-kategori').addEventListener('click',e=>{ if(e.target===$('modal-kategori')) yeniKatKapat(); });
    $('sel-kat-grup').addEventListener('change',function(){
      const wrap=$('yeni-grup-wrap');
      if(this.value==='__YENI__'){ wrap.style.display='flex'; setTimeout(()=>$('inp-kat-grup-yeni').focus(),100); }
      else{ wrap.style.display='none'; }
    });
  }

  async function init(){ baglaEventler(); await yukle(); }
  return { init };
})();
