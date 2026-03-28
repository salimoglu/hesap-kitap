const IslemlerModule = (() => {
  let _islemler = [], _kategoriler = [], _duzenleId = null, _silId = null, _aktifTip = 'gider';
  const $ = id => document.getElementById(id);

  function paraBicim(s) {
    return Number(s).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  }

  function tarihBicim(t) {
    if (!t) return '';
    const [y,m,d] = t.split('-');
    const ay = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara'];
    return d + ' ' + ay[parseInt(m)-1] + ' ' + y;
  }

  async function yukle() {
    _islemler    = await IslemlerDB.getAll();
    _kategoriler = await KategorilerDB.getAll();
    _islemler.sort((a,b) => { const td = b.tarih.localeCompare(a.tarih); return td !== 0 ? td : (b.olusturma||0)-(a.olusturma||0); });
    renderList(); renderSummary(); doldurAyFilter();
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
    const tip = $('filter-type').value;
    const ay  = $('filter-ay').value;
    return _islemler.filter(i => (tip==='hepsi'||i.tip===tip) && (ay==='hepsi'||i.tarih.startsWith(ay)));
  }

  function renderList() {
    const liste = $('islem-list');
    const empty = $('empty-state');
    const items = filtreliIslemler();
    [...liste.querySelectorAll('.islem-card,.islem-grup-baslik')].forEach(el=>el.remove());
    if (!items.length) { empty.style.display='flex'; return; }
    empty.style.display='none';
    const gruplar = {};
    for (const i of items) { const [y,m] = i.tarih.split('-'); const k=y+'-'+m; if(!gruplar[k]) gruplar[k]=[]; gruplar[k].push(i); }
    const aylar=['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
    for (const [key,grup] of Object.entries(gruplar)) {
      const [y,m] = key.split('-');
      const b = document.createElement('div'); b.className='islem-grup-baslik'; b.textContent=aylar[parseInt(m)-1]+' '+y; liste.appendChild(b);
      for (const islem of grup) liste.appendChild(kartOlustur(islem));
    }
  }

  function kartOlustur(islem) {
    const div = document.createElement('div');
    div.className = 'islem-card ' + islem.tip;
    div.dataset.id = islem.id;
    const icon = islem.tip==='gelir' ? '&#128229;' : '&#128228;';
    div.innerHTML = '<span class="islem-tip-icon">'+icon+'</span><div class="islem-info"><div class="islem-kat">'+esc(islem.kategori)+'</div>'+(islem.aciklama?'<div class="islem-aciklama">'+esc(islem.aciklama)+'</div>':'')+'<div class="islem-tarih">'+tarihBicim(islem.tarih)+'</div></div><div class="islem-right"><span class="islem-tutar">'+paraBicim(islem.tutar)+'</span><div class="islem-actions"><button class="islem-action-btn duzenle" data-id="'+islem.id+'" title="Duzenle">&#9998;</button><button class="islem-action-btn sil" data-id="'+islem.id+'" title="Sil">&#128465;</button></div></div>';
    div.querySelector('.duzenle').addEventListener('click', e => { e.stopPropagation(); modalAc(islem.id); });
    div.querySelector('.sil').addEventListener('click', e => { e.stopPropagation(); silModalAc(islem.id); });
    return div;
  }

  function esc(s) { const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

  function doldurAyFilter() {
    const sel = $('filter-ay');
    const prev = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    const aylar=['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
    const aySet = new Set(_islemler.map(i=>{ const [y,m]=i.tarih.split('-'); return y+'-'+m; }));
    [...aySet].sort((a,b)=>b.localeCompare(a)).forEach(key=>{
      const [y,m]=key.split('-');
      const o=document.createElement('option'); o.value=key; o.textContent=aylar[parseInt(m)-1]+' '+y; sel.appendChild(o);
    });
    if ([...sel.options].some(o=>o.value===prev)) sel.value=prev;
  }

  function doldurKategoriSelect() {
    const sel = $('sel-kategori');
    sel.innerHTML='';
    const kats = _kategoriler.filter(k=>k.tip===_aktifTip).sort((a,b)=>a.grup.localeCompare(b.grup)||a.ad.localeCompare(b.ad));
    if (!kats.length) { const o=document.createElement('option'); o.textContent='Kategori yok'; sel.appendChild(o); return; }
    const gruplar={};
    for(const k of kats){ if(!gruplar[k.grup]) gruplar[k.grup]=[]; gruplar[k.grup].push(k); }
    for(const [g,ks] of Object.entries(gruplar)){
      const og=document.createElement('optgroup'); og.label=g;
      for(const k of ks){ const o=document.createElement('option'); o.value=g+' - '+k.ad; o.textContent=k.ad; og.appendChild(o); }
      sel.appendChild(og);
    }
  }

  async function modalAc(duzenleId=null) {
    _duzenleId=duzenleId;
    $('modal-title').textContent = duzenleId ? 'Islemi Duzenle' : 'Yeni Islem';
    if (duzenleId) {
      const i=_islemler.find(x=>x.id===duzenleId); if(!i) return;
      tipSec(i.tip); doldurKategoriSelect();
      $('sel-kategori').value=i.kategori; $('inp-tutar').value=i.tutar; $('inp-aciklama').value=i.aciklama||''; $('inp-tarih').value=i.tarih;
    } else {
      tipSec('gider'); doldurKategoriSelect();
      $('inp-tutar').value=''; $('inp-aciklama').value=''; $('inp-tarih').value=bugunTarih();
    }
    $('modal-islem').classList.remove('hidden');
    setTimeout(()=>$('inp-tutar').focus(),300);
  }

  function modalKapat() { $('modal-islem').classList.add('hidden'); _duzenleId=null; }
  function tipSec(tip) { _aktifTip=tip; $('btn-gider').classList.toggle('active',tip==='gider'); $('btn-gelir').classList.toggle('active',tip==='gelir'); doldurKategoriSelect(); }
  function bugunTarih() { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

  async function kaydet() {
    const tutar=parseFloat($('inp-tutar').value);
    const kategori=$('sel-kategori').value;
    const aciklama=$('inp-aciklama').value.trim();
    const tarih=$('inp-tarih').value;
    if(!tutar||tutar<=0){alert('Lutfen gecerli bir tutar girin.');return;}
    if(!kategori){alert('Lutfen kategori secin.');return;}
    if(!tarih){alert('Lutfen tarih secin.');return;}
    const islem={tip:_aktifTip,kategori,tutar,aciklama,tarih};
    if(_duzenleId){islem.id=_duzenleId;await IslemlerDB.update(islem);}else{await IslemlerDB.add(islem);}
    modalKapat(); await yukle();
  }

  function silModalAc(id){_silId=id;$('modal-sil').classList.remove('hidden');}
  function silModalKapat(){$('modal-sil').classList.add('hidden');_silId=null;}
  async function silOnayla(){if(_silId){await IslemlerDB.delete(_silId);silModalKapat();await yukle();}}

  function yeniKatModalAc(){$('inp-kat-grup').value='';$('inp-kat-ad').value='';$('modal-kategori').classList.remove('hidden');setTimeout(()=>$('inp-kat-grup').focus(),300);}
  function yeniKatKapat(){$('modal-kategori').classList.add('hidden');}
  async function yeniKatKaydet(){
    const grup=$('inp-kat-grup').value.trim().toUpperCase();
    const ad=$('inp-kat-ad').value.trim();
    if(!grup||!ad){alert('Grup adi ve kategori adi gereklidir.');return;}
    await KategorilerDB.add({tip:_aktifTip,grup,ad,varsayilan:false});
    _kategoriler=await KategorilerDB.getAll();
    doldurKategoriSelect();
    $('sel-kategori').value=grup+' - '+ad;
    yeniKatKapat();
  }

  function baglaEventler(){
    $('btn-yeni-islem').addEventListener('click',()=>modalAc());
    $('modal-close').addEventListener('click',modalKapat);
    $('btn-iptal').addEventListener('click',modalKapat);
    $('btn-kaydet').addEventListener('click',kaydet);
    $('btn-gider').addEventListener('click',()=>tipSec('gider'));
    $('btn-gelir').addEventListener('click',()=>tipSec('gelir'));
    $('btn-yeni-kat').addEventListener('click',yeniKatModalAc);
    $('kat-close').addEventListener('click',yeniKatKapat);
    $('kat-iptal').addEventListener('click',yeniKatKapat);
    $('kat-kaydet').addEventListener('click',yeniKatKaydet);
    $('sil-close').addEventListener('click',silModalKapat);
    $('sil-iptal').addEventListener('click',silModalKapat);
    $('sil-onayla').addEventListener('click',silOnayla);
    $('filter-type').addEventListener('change',renderList);
    $('filter-ay').addEventListener('change',renderList);
    $('modal-islem').addEventListener('click',e=>{if(e.target===$('modal-islem'))modalKapat();});
    $('modal-sil').addEventListener('click',e=>{if(e.target===$('modal-sil'))silModalKapat();});
    $('modal-kategori').addEventListener('click',e=>{if(e.target===$('modal-kategori'))yeniKatKapat();});
    [$('inp-tutar'),$('inp-aciklama'),$('inp-tarih')].forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter')kaydet();}));
    $('inp-kat-ad').addEventListener('keydown',e=>{if(e.key==='Enter')yeniKatKaydet();});
  }

  async function init(){baglaEventler();await yukle();}
  return {init};
})();
