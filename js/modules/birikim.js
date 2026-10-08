/* birikim.js */
var BirikimModule = (function() {
  var $ = function(id){return document.getElementById(id);};
  var _islemler = [];
  var _kategoriler = [];
  var _manuelIslemler = {}; // { kalemAd: [{id,tarih,tutar,aciklama}] }
  var _besKayitlar = []; // [{id, ad, aylik}] — sadece hatırlatma, alttaki birikime karışmaz
  var _donusumler = []; // [{id,tarih,hedef,not,bozulan:[{kalem,tutar}],eklenen:[{aciklama,tutar}]}]
  var _besYuklendi = false;
  var _dnKaydediyor = false;
  var _aktifKalem = null;
  var _aktifBesId = null;
  var _modalKoruma = 0;

  function para(n){return Number(n||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function kurus(n){
    var x=parseFloat(n);
    if(!isFinite(x)) return 0;
    return Math.round(x*100)/100;
  }
  function kalemEsit(a,b){
    return String(a||"").trim().toLocaleLowerCase("tr")===String(b||"").trim().toLocaleLowerCase("tr");
  }
  function kalemKanun(ad,adlar){
    var temiz=String(ad||"").trim().replace(/\s+/g," ");
    if(!temiz) return "";
    for(var i=0;i<(adlar||[]).length;i++){
      if(kalemEsit(adlar[i],temiz)) return adlar[i];
    }
    return temiz.slice(0,60);
  }
  function bugun(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function buAy(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
  function tarihFmt(t){if(!t)return"";var p=t.split("-");return p[2]+"."+p[1]+"."+p[0];}
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}

  function birikimGrupMu(grup) {
    if (typeof HKKategori !== "undefined" && HKKategori.isBirikimGrup) {
      return HKKategori.isBirikimGrup(grup);
    }
    var g = typeof HKKategori !== "undefined" && HKKategori.normGrup
      ? HKKategori.normGrup(grup)
      : String(grup || "").trim().toLocaleUpperCase("tr");
    return g === "BIRIKIM";
  }

  /** Islem hangi birikim kalemine ait — BIRIKIM/BİRİKİM yazim farklarini kategori listesiyle eslestirir. */
  function islemBirikimKalem(islem) {
    if (!islem) return null;
    var katRaw = String(islem.kategori || "").trim();
    if (!katRaw) return null;
    var kat = kategoriEtiket(islem) || katRaw;

    if (typeof HKKategori !== "undefined" && HKKategori.normKey && _kategoriler.length) {
      var arananKey = HKKategori.normKey(kat);
      if (!arananKey && katRaw !== kat) arananKey = HKKategori.normKey(katRaw);
      for (var i = 0; i < _kategoriler.length; i++) {
        var k = _kategoriler[i];
        if (!birikimGrupMu(k.grup)) continue;
        var canon = HKKategori.canonicalEtiket(k.grup, k.ad);
        if (HKKategori.normKey(canon) === arananKey) {
          return { ad: String(k.ad || "").trim(), kategori: canon };
        }
      }
    }

    var parca = kat.split(" - ");
    if (parca.length < 2) return null;
    var grup = parca[0].trim();
    var ad = parca.slice(1).join(" - ").trim();
    if (!birikimGrupMu(grup) || !ad) return null;
    return { ad: ad, kategori: kat };
  }

  function kategoriEtiket(islem) {
    if (typeof HKKategori !== "undefined" && HKKategori.resolve) {
      return HKKategori.resolve(islem.kategori, _kategoriler) || String(islem.kategori || "").trim();
    }
    return String(islem.kategori || "").trim();
  }

  function besNormalize(v){
    var out=[];
    if(!v) return out;
    var arr=Array.isArray(v)?v:Object.values(v);
    arr.forEach(function(x){
      if(!x||typeof x!=="object") return;
      var ad=String(x.ad||x.isim||"").trim();
      if(!ad) return;
      out.push({
        id:x.id||("bes"+Date.now()+"_"+Math.random().toString(36).slice(2,6)),
        ad:ad.slice(0,40),
        aylik:parseFloat(x.aylik!=null?x.aylik:x.tutar)||0
      });
    });
    return out;
  }

  function besYerelOku(){
    try { return besNormalize(JSON.parse(localStorage.getItem("hk-birikim-bes") || "null")); }
    catch (e) { return []; }
  }
  function besYerelYaz(){
    try { localStorage.setItem("hk-birikim-bes", JSON.stringify(_besKayitlar)); } catch (e) {}
  }

  /* Firebase */
  function donusumNormalize(v){
    var out=[];
    if(!v) return out;
    var arr=Array.isArray(v)?v:Object.values(v);
    arr.forEach(function(x){
      if(!x||typeof x!=="object") return;
      var hedef=String(x.hedef||x.ad||"").trim().replace(/\s+/g," ");
      var tarih=String(x.tarih||"").trim();
      if(!hedef||!/^\d{4}-\d{2}-\d{2}/.test(tarih)) return;
      var birlesik={};
      var sira=[];
      (Array.isArray(x.bozulan)?x.bozulan:[]).forEach(function(b){
        if(!b||typeof b!=="object") return;
        var kalem=String(b.kalem||b.ad||"").trim().replace(/\s+/g," ");
        var tutar=kurus(b.tutar);
        if(!kalem||tutar<=0||kalemEsit(kalem,hedef)) return;
        var key=kalem.toLocaleLowerCase("tr");
        if(!birlesik[key]){
          birlesik[key]={kalem:kalem.slice(0,60),tutar:0};
          sira.push(key);
        }
        birlesik[key].tutar=kurus(birlesik[key].tutar+tutar);
      });
      var bozulan=sira.map(function(key){return birlesik[key];}).filter(function(b){return b.tutar>0;});
      var eklenen=[];
      (Array.isArray(x.eklenen)?x.eklenen:[]).forEach(function(e){
        if(!e||typeof e!=="object") return;
        var tutar=kurus(e.tutar);
        if(tutar<=0) return;
        var aciklama=String(e.aciklama||e.ad||"").trim().replace(/\s+/g," ");
        if(!aciklama) aciklama="Eklenen";
        eklenen.push({aciklama:aciklama.slice(0,80),tutar:tutar});
      });
      if(!bozulan.length) return;
      out.push({
        id:String(x.id||("dn"+Date.now()+"_"+Math.random().toString(36).slice(2,6))),
        tarih:tarih.substr(0,10),
        hedef:hedef.slice(0,60),
        not:String(x.not||"").trim().slice(0,120),
        bozulan:bozulan,
        eklenen:eklenen
      });
    });
    out.sort(function(a,b){return b.tarih.localeCompare(a.tarih)||String(b.id).localeCompare(String(a.id));});
    return out;
  }
  function donusumYerelOku(){
    try { return donusumNormalize(JSON.parse(localStorage.getItem("hk-birikim-donusum") || "null")); }
    catch (e) { return []; }
  }
  function donusumYerelYaz(){
    try { localStorage.setItem("hk-birikim-donusum", JSON.stringify(_donusumler)); } catch (e) {}
  }
  function donusumBozulanToplam(d){
    var t=0;
    ((d&&d.bozulan)||[]).forEach(function(b){t+=kurus(b.tutar);});
    return kurus(t);
  }
  function donusumEklenenToplam(d){
    var t=0;
    ((d&&d.eklenen)||[]).forEach(function(e){t+=kurus(e.tutar);});
    return kurus(t);
  }
  function donusumToplam(d){
    return kurus(donusumBozulanToplam(d)+donusumEklenenToplam(d));
  }
  function donusumlerHedef(ad){
    return _donusumler.filter(function(d){return kalemEsit(d.hedef,ad);});
  }
  function donusumlerKaynak(ad){
    return _donusumler.filter(function(d){
      return (d.bozulan||[]).some(function(b){return kalemEsit(b.kalem,ad);});
    });
  }

  async function fbYukle(){
    var besFbOk = false;
    var dnFbOk = false;
    if(typeof window._fbDb!=="undefined"&&window._fbDb){
      try{var v=await fbRtdbOku("birikim_manuel");_manuelIslemler=v||{};}
      catch(e){_manuelIslemler={};console.error("[Birikim] yukle",(e&&e.code)||e.message||e);}
      try{var b=await fbRtdbOku("birikim_bes");_besKayitlar=besNormalize(b);besFbOk=true;}
      catch(e){_besKayitlar=[];console.error("[Birikim] bes yukle",(e&&e.code)||e.message||e);}
      try{var dn=await fbRtdbOku("birikim_donusum");_donusumler=donusumNormalize(dn);dnFbOk=true;}
      catch(e){_donusumler=[];console.error("[Birikim] donusum yukle",(e&&e.code)||e.message||e);}
    }
    if(!besFbOk || !_besKayitlar.length){
      var yerel = besYerelOku();
      if(yerel.length) _besKayitlar = yerel;
    }
    besYerelYaz();
    if(!dnFbOk){
      var yerelDn = donusumYerelOku();
      if(yerelDn.length) _donusumler = yerelDn;
    }
    donusumYerelYaz();
    _besYuklendi = true;
  }
  function besRapor(){
    var kayitlar = _besKayitlar.map(function(k){
      return { ad: k.ad, tutar: parseFloat(k.aylik) || 0 };
    });
    var toplam = 0;
    kayitlar.forEach(function(k){ toplam += k.tutar; });
    return { kayitlar: kayitlar, toplam: toplam };
  }
  async function besRaporGetir(){
    if(!_besYuklendi){
      if(typeof window._fbDb !== "undefined" && window._fbDb){
        try { await fbYukle(); } catch (e) {}
      }
      if(!_besKayitlar.length){
        var yerel = besYerelOku();
        if(yerel.length) _besKayitlar = yerel;
      }
    }
    return besRapor();
  }
  async function fbKaydet(){
    if(typeof window._fbDb!=="undefined"&&window._fbDb){
      try{await fbRtdbRef("birikim_manuel").set(_manuelIslemler);}catch(e){console.error("[Birikim] kaydet",e);}
    }
  }
  async function fbBesKaydet(){
    besYerelYaz();
    if(typeof window._fbDb!=="undefined"&&window._fbDb){
      try{
        var obj={};
        _besKayitlar.forEach(function(x){if(x&&x.id)obj[x.id]=x;});
        await fbRtdbRef("birikim_bes").set(obj);
      }catch(e){console.error("[Birikim] bes kaydet",e);}
    }
  }
  async function fbDonusumKaydet(){
    donusumYerelYaz();
    if(typeof window._fbDb!=="undefined"&&window._fbDb){
      try{
        if(!_donusumler.length){
          await fbRtdbRef("birikim_donusum").set(null);
          return;
        }
        var obj={};
        _donusumler.forEach(function(x){if(x&&x.id)obj[x.id]=x;});
        await fbRtdbRef("birikim_donusum").set(obj);
      }catch(e){console.error("[Birikim] donusum kaydet",e);}
    }
  }

  /* İşlemlerden BİRİKİM grubunu çek */
  function islemKalemleri(){
    var kalemler = {};
    _islemler.forEach(function(i){
      var eslesme = islemBirikimKalem(i);
      if (!eslesme || !eslesme.ad) return;
      var ad = eslesme.ad;
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

  /** Kategori yönetimindeki BIRIKIM grubu kalemleri (işlem olmasa da kart olarak gösterilir). */
  function birikimKategoriAdlari(){
    var adSet = {};
    _kategoriler.forEach(function(k){
      if(!birikimGrupMu(k.grup)) return;
      var ad = String(k.ad || "").trim();
      if(ad) adSet[ad] = true;
    });
    return Object.keys(adSet).sort(function(a,b){ return a.localeCompare(b, "tr"); });
  }

  /* Yıl çıkar — YYYY-MM-DD veya YYYY-MM için ilk 4 hane */
  function tarihtenYil(t){
    if(!t)return null;
    var s=String(t).trim();
    if(s.length < 4) return null;
    var yy=s.substr(0,4);
    if(!/^\d{4}$/.test(yy)) return null;
    var n=parseInt(yy,10);
    if(n < 1900 || n > 2200) return null;
    return yy;
  }

  /* Ay çıkar — YYYY-MM-DD veya YYYY-MM için ilk 7 hane */
  function tarihtenAy(t){
    if(!t)return null;
    var s=String(t).trim();
    if(s.length < 7) return null;
    var ym=s.substr(0,7);
    if(!/^\d{4}-\d{2}$/.test(ym)) return null;
    var mm=parseInt(ym.substr(5,2),10);
    if(mm < 1 || mm > 12) return null;
    return ym;
  }

  var AY_ADLARI=["Ocak","\u015eubat","Mart","Nisan","May\u0131s","Haziran","Temmuz","A\u011fustos","Eyl\u00fcl","Ekim","Kas\u0131m","Aral\u0131k"];
  var AY_RENK=["var(--green)","var(--gold)","#60a5fa","#c084fc","#fb923c","#2dd4bf","#f472b6"];

  function ayEtiket(ym){
    var p=String(ym||"").split("-");
    var y=p[0]||"";
    var m=parseInt(p[1],10)||0;
    var ad=(m>=1&&m<=12)?AY_ADLARI[m-1]:(p[1]||"");
    return ad+(y?" "+y:"");
  }

  function tarihGunEtiket(t){
    var s=String(t||"").trim();
    var p=s.split("-");
    var y=p[0]||"";
    var m=parseInt(p[1],10)||0;
    var d=p[2]?parseInt(p[2],10):0;
    var ad=(m>=1&&m<=12)?AY_ADLARI[m-1]:(p[1]||"");
    if(d) return d+" "+ad+" "+y;
    return ad+(y?" "+y:"");
  }

  function tarihKey(t){
    var s=String(t||"").trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substr(0,10);
    if(/^\d{4}-\d{2}$/.test(s)) return s+"-01";
    return null;
  }

  function ilkBirikimTarihi(kmap){
    var min=null;
    Object.keys(kmap||{}).forEach(function(ad){
      (kmap[ad]||[]).forEach(function(i){
        var k=tarihKey(i&&i.tarih);
        if(!k) return;
        if(!min||k<min) min=k;
      });
    });
    return min;
  }

  function kalemKirilimHtml(kalemler,toplam){
    var ham=[];
    Object.keys(kalemler||{}).forEach(function(ad){
      var amt=parseFloat(kalemler[ad])||0;
      if(amt===0) return;
      ham.push({ad:ad,amt:amt});
    });
    if(!ham.length) return "";
    var pozitif=ham.filter(function(s){return s.amt>0;});
    var negatif=ham.filter(function(s){return s.amt<0;});
    pozitif.sort(function(a,b){return b.amt-a.amt;});
    negatif.sort(function(a,b){return a.amt-b.amt;});
    var pozToplam=0;
    pozitif.forEach(function(s){pozToplam+=s.amt;});
    var kalan=100;
    pozitif.forEach(function(s,i){
      if(pozToplam<=0){s.pct=0;return;}
      if(i===pozitif.length-1){
        s.pct=Math.max(0,kalan);
      }else{
        s.pct=Math.round((s.amt/pozToplam)*100);
        kalan-=s.pct;
      }
    });
    var h="";
    if(pozitif.length){
      h+='<span class="bk-ay-stack" aria-hidden="true">';
      pozitif.forEach(function(s,i){
        h+='<span class="bk-ay-stack-dilim" style="flex-grow:'+Math.max(s.pct,1)+';background:'+AY_RENK[i%AY_RENK.length]+'"></span>';
      });
      h+='</span>';
    }
    h+='<div class="bk-ay-kalemler">';
    pozitif.forEach(function(s,i){
      h+='<div class="bk-ay-satir">';
      h+='<span class="bk-ay-renk" style="background:'+AY_RENK[i%AY_RENK.length]+'" aria-hidden="true"></span>';
      h+='<span class="bk-ay-ad" title="'+esc(s.ad)+'">'+esc(s.ad)+'</span>';
      h+='<span class="bk-ay-tutar">'+para(s.amt)+' TL</span>';
      if(!negatif.length) h+='<span class="bk-ay-pct">%'+s.pct+'</span>';
      h+='</div>';
    });
    negatif.forEach(function(s){
      h+='<div class="bk-ay-satir bk-ay-satir-eksi">';
      h+='<span class="bk-ay-renk bk-ay-renk-eksi" aria-hidden="true"></span>';
      h+='<span class="bk-ay-ad" title="'+esc(s.ad)+'">'+esc(s.ad)+'</span>';
      h+='<span class="bk-ay-tutar bk-ay-tutar-eksi">'+para(s.amt)+' TL</span>';
      h+='<span class="bk-ay-pct bk-ay-bozuldu">bozuldu</span>';
      h+='</div>';
    });
    h+='</div>';
    return h;
  }

  function donemKartIcerik(etiket,birikim,gelir,kalemler,barPct,ipucu){
    ipucu=ipucu||{};
    var gelirOran=gelir>0?Math.round((birikim/gelir)*100):null;
    var h='<span class="bk-yil-eti">'+esc(etiket)+'</span>';
    h+='<span class="bk-yil-satir bk-yil-birikim"><span class="bk-yil-satir-lbl">Birikim</span> '+para(birikim)+' TL</span>';
    h+='<span class="bk-yil-satir bk-yil-gelir" title="'+esc(ipucu.gelir||"Gelir")+'"><span class="bk-yil-satir-lbl">Gelir</span> '+para(gelir)+' TL</span>';
    if(gelirOran!==null){
      h+='<span class="bk-yil-oran" title="'+esc(ipucu.oran||"Birikimin gelire oran\u0131")+'">Gelirin %'+gelirOran+'</span>';
    }else{
      h+='<span class="bk-yil-oran bk-yil-oran-yok" title="'+esc(ipucu.yok||"Bu d\u00f6nem gelir kayd\u0131 yok")+'">Gelir yok</span>';
    }
    h+=kalemKirilimHtml(kalemler,birikim);
    if(barPct!=null){
      h+='<span class="bk-yil-bar-track" aria-hidden="true"><span class="bk-yil-bar-fill"></span></span>';
    }
    return h;
  }

  /* Tüm kalemlerde aya göre tür kırılımı (aylık özet) */
  function aylaraGoreOzet(kmap){
    var ayMap={};
    Object.keys(kmap).forEach(function(ad){
      (kmap[ad]||[]).forEach(function(i){
        var ay=tarihtenAy(i.tarih);
        if(!ay) return;
        var tutar=parseFloat(i.tutar)||0;
        if(!ayMap[ay]) ayMap[ay]={toplam:0,kalemler:{}};
        ayMap[ay].toplam+=tutar;
        ayMap[ay].kalemler[ad]=(ayMap[ay].kalemler[ad]||0)+tutar;
      });
    });
    var aylar=Object.keys(ayMap).filter(function(a){return (ayMap[a].toplam||0)!==0;}).sort(function(a,b){return b.localeCompare(a);});
    var maxAyAmt=0;
    aylar.forEach(function(a){if(ayMap[a].toplam>maxAyAmt)maxAyAmt=ayMap[a].toplam;});
    return {ayMap:ayMap,aylar:aylar,maxAyAmt:maxAyAmt};
  }

  function aylaraGoreGelir(){
    var aGelir={};
    _islemler.forEach(function(i){
      if(i.tip!=="gelir") return;
      var ay=tarihtenAy(i.tarih);
      if(!ay) return;
      aGelir[ay]=(aGelir[ay]||0)+(parseFloat(i.tutar)||0);
    });
    return aGelir;
  }

  function aylikOzetHtml(ayOz,aGel,buAyKey){
    if(!ayOz||!ayOz.aylar.length) return "";
    aGel=aGel||{};
    var h='<aside class="bk-h-ay" aria-label="Ayl\u0131k birikim \u00f6zeti">';
    h+='<div class="bk-h-ay-title">Ayl\u0131k \u00f6zet</div>';
    h+='<div class="bk-ay-list">';
    ayOz.aylar.forEach(function(ym){
      var kayit=ayOz.ayMap[ym]||{toplam:0,kalemler:{}};
      var amt=kayit.toplam||0;
      var gel=aGel[ym]||0;
      var pct=ayOz.maxAyAmt>0?Math.round((amt/ayOz.maxAyAmt)*100):100;
      h+='<div class="bk-ay-kart'+(ym===buAyKey?" bk-ay-bu-ay":"")+'" style="--bk-yil-bar:'+pct+'%">';
      h+=donemKartIcerik(ayEtiket(ym),amt,gel,kayit.kalemler,pct,{
        gelir:"O ayki maa\u015f / gelir",
        oran:"Birikimin o ayki gelire oran\u0131",
        yok:"Bu ay gelir kayd\u0131 yok"
      });
      h+='</div>';
    });
    h+='</div></aside>';
    return h;
  }

  /* İşlemlerden yıla göre toplam gelir */
  function yillaraGoreGelir(){
    var yGelir={};
    _islemler.forEach(function(i){
      if(i.tip!=="gelir") return;
      var y=tarihtenYil(i.tarih);
      if(!y) return;
      yGelir[y]=(yGelir[y]||0)+(parseFloat(i.tutar)||0);
    });
    return yGelir;
  }

  /* Tüm kalemlerde yıla göre toplam TL ve tür kırılımı */
  function yillaraGoreGenel(kmap){
    var yToplam={}, yKalem={}, y;
    Object.keys(kmap).forEach(function(ad){
      kmap[ad].forEach(function(i){
        y=tarihtenYil(i.tarih);
        if(!y) return;
        var tutar=parseFloat(i.tutar)||0;
        yToplam[y]=(yToplam[y]||0)+tutar;
        if(!yKalem[y]) yKalem[y]={};
        yKalem[y][ad]=(yKalem[y][ad]||0)+tutar;
      });
    });
    var yillar=Object.keys(yToplam).filter(function(yy){return (yToplam[yy]||0)!==0;}).sort(function(a,b){return b.localeCompare(a);});
    var maxYearAmt=0;
    yillar.forEach(function(yy){if(yToplam[yy]>maxYearAmt)maxYearAmt=yToplam[yy];});
    return { yToplam:yToplam,yKalem:yKalem,yillar:yillar,maxYearAmt:maxYearAmt };
  }

  function yillikOzetHtml(yOz,yGel,buYil){
    if(!yOz||!yOz.yillar.length) return "";
    yGel=yGel||{};
    var h='<aside class="bk-h-yil" aria-label="Y\u0131ll\u0131k birikim \u00f6zeti">';
    h+='<div class="bk-h-yil-title">Y\u0131ll\u0131k \u00f6zet</div>';
    h+='<div class="bk-yil-list">';
    yOz.yillar.forEach(function(yy){
      var amt=yOz.yToplam[yy]||0;
      var pct=yOz.maxYearAmt>0?Math.round((amt/yOz.maxYearAmt)*100):100;
      var gel=yGel[yy]||0;
      h+='<div class="bk-yil-kart'+(yy===buYil?" bk-yil-bu-yil":"")+'" style="--bk-yil-bar:'+pct+'%">';
      h+=donemKartIcerik(yy,amt,gel,yOz.yKalem[yy]||{},pct,{
        gelir:"O y\u0131l toplam gelir",
        oran:"Birikimin o y\u0131lki gelire oran\u0131",
        yok:"Bu y\u0131l gelir kayd\u0131 yok"
      });
      h+='</div>';
    });
    h+='</div></aside>';
    return h;
  }

  /** Üst özetin sağındaki BES hatırlatma kartı — alttaki birikim kartlarına eklenmez. */
  function besKartHtml(){
    var h='<aside class="bk-h-bes" aria-label="BES \u00f6demeleri">';
    h+='<div class="bk-h-bes-ust">';
    h+='<div class="bk-h-bes-title">BES</div>';
    h+='<button type="button" class="bk-bes-ekle-btn" id="bk-bes-ekle" title="BES ki\u015fisi ekle">+</button>';
    h+='</div>';
    if(!_besKayitlar.length){
      h+='<button type="button" class="bk-bes-bos" id="bk-bes-bos-ekle">\u0130sim ve ayl\u0131k \u00f6deme ekle</button>';
    } else {
      h+='<div class="bk-bes-liste">';
      var aylikToplam=0;
      _besKayitlar.forEach(function(k){
        aylikToplam+=(parseFloat(k.aylik)||0);
        h+='<button type="button" class="bk-bes-satir" data-id="'+esc(k.id)+'" title="D\u00fczenle">';
        h+='<span class="bk-bes-ad">'+esc(k.ad)+'</span>';
        h+='<span class="bk-bes-tutar">'+para(k.aylik)+' <span class="bk-bes-ay">TL/ay</span></span>';
        h+='</button>';
      });
      h+='</div>';
      if(_besKayitlar.length>1){
        h+='<div class="bk-bes-toplam">Ayl\u0131k toplam <strong>'+para(aylikToplam)+' TL</strong></div>';
      }
    }
    h+='</aside>';
    return h;
  }

  function donusumleriUygula(sonuc){
    var dokunulan={};
    _donusumler.forEach(function(d){
      (d.bozulan||[]).forEach(function(b){
        if(!sonuc[b.kalem]) sonuc[b.kalem]=[];
        sonuc[b.kalem].push({
          id:d.id+"_boz_"+b.kalem,
          tarih:d.tarih,
          tutar:-kurus(b.tutar),
          aciklama:d.hedef+" için bozuldu",
          kaynak:"donusum",
          yon:"bozulan",
          donusumId:d.id,
          hedef:d.hedef
        });
        dokunulan[b.kalem]=true;
      });
      if(!sonuc[d.hedef]) sonuc[d.hedef]=[];
      var ekNot=d.not?" · "+d.not:"";
      sonuc[d.hedef].push({
        id:d.id+"_hedef",
        tarih:d.tarih,
        tutar:donusumToplam(d),
        aciklama:"Dönüşümle oluştu"+ekNot,
        kaynak:"donusum",
        yon:"hedef",
        donusumId:d.id
      });
      dokunulan[d.hedef]=true;
    });
    Object.keys(dokunulan).forEach(function(ad){
      (sonuc[ad]||[]).sort(function(a,b){return String(b.tarih||"").localeCompare(String(a.tarih||""));});
    });
  }

  /* Manuel + İşlemler + tanımlı BIRIKIM kategorileri + dönüşümler */
  function tumKalemler(){
    var islem = islemKalemleri();
    var manuel = _manuelIslemler;
    var kalemAdlari = new Set(Object.keys(islem).concat(Object.keys(manuel)));
    birikimKategoriAdlari().forEach(function(ad){ kalemAdlari.add(ad); });
    _donusumler.forEach(function(d){
      if(d.hedef) kalemAdlari.add(d.hedef);
      (d.bozulan||[]).forEach(function(b){ if(b.kalem) kalemAdlari.add(b.kalem); });
    });
    var sonuc = {};
    Array.from(kalemAdlari).sort(function(a,b){ return a.localeCompare(b, "tr"); }).forEach(function(ad){
      var liste = [];
      (islem[ad]||[]).forEach(function(i){liste.push(i);});
      (manuel[ad]||[]).forEach(function(m){
        liste.push({id:m.id,tarih:m.tarih,tutar:parseFloat(m.tutar)||0,aciklama:m.aciklama||"",kaynak:"manuel"});
      });
      liste.sort(function(a,b){return String(b.tarih||"").localeCompare(String(a.tarih||""));});
      sonuc[ad] = liste;
    });
    donusumleriUygula(sonuc);
    return sonuc;
  }

  function donusumHikayeHtml(ad){
    var gelen=donusumlerHedef(ad);
    if(!gelen.length) return "";
    var h='<div class="bk-hikaye">';
    h+='<div class="bk-hikaye-baslik">Bu birikim nasıl oluştu</div>';
    gelen.forEach(function(d){
      var bozT=donusumBozulanToplam(d);
      var ekT=donusumEklenenToplam(d);
      h+='<div class="bk-hikaye-kart">';
      h+='<div class="bk-hikaye-tarih">'+esc(tarihGunEtiket(d.tarih))+'</div>';
      if(d.not) h+='<div class="bk-hikaye-not">'+esc(d.not)+'</div>';
      h+='<div class="bk-hikaye-icerik">';
      h+='<div class="bk-hikaye-grup">';
      h+='<div class="bk-hikaye-eti">Bozulan birikimler</div>';
      d.bozulan.forEach(function(b){
        h+='<div class="bk-hikaye-satir"><span>'+esc(b.kalem)+'</span><span>'+para(b.tutar)+' TL</span></div>';
      });
      h+='<div class="bk-hikaye-satir bk-hikaye-ara"><span>Bozulan toplam</span><span>'+para(bozT)+' TL</span></div>';
      h+='</div>';
      h+='<div class="bk-hikaye-grup">';
      h+='<div class="bk-hikaye-eti">Eklenen</div>';
      if(d.eklenen.length){
        d.eklenen.forEach(function(e){
          h+='<div class="bk-hikaye-satir"><span>'+esc(e.aciklama)+'</span><span>'+para(e.tutar)+' TL</span></div>';
        });
        h+='<div class="bk-hikaye-satir bk-hikaye-ara"><span>Eklenen toplam</span><span>'+para(ekT)+' TL</span></div>';
      }else{
        h+='<div class="bk-hikaye-bos">Bu dönüşümde birikim dışında eklenen tutar yok.</div>';
      }
      h+='</div>';
      h+='</div>';
      h+='<div class="bk-hikaye-satir bk-hikaye-son"><span>'+esc(d.hedef)+'</span><span>'+para(donusumToplam(d))+' TL</span></div>';
      h+='<button type="button" class="bk-hikaye-geri" data-id="'+esc(d.id)+'">Bu dönüşümü geri al</button>';
      h+='</div>';
    });
    h+='</div>';
    return h;
  }

  function donusumGittiHtml(ad){
    var giden=donusumlerKaynak(ad);
    if(!giden.length) return "";
    var h='<div class="bk-gitti">';
    giden.forEach(function(d){
      var parca=null;
      (d.bozulan||[]).forEach(function(b){ if(kalemEsit(b.kalem,ad)) parca=b; });
      if(!parca) return;
      h+='<div class="bk-gitti-satir">';
      h+='<span class="bk-gitti-eti">Dönüştü</span>';
      h+='<span class="bk-gitti-metin">'+esc(tarihGunEtiket(d.tarih))+' · '+para(parca.tutar)+' TL → '+esc(d.hedef)+'</span>';
      h+='</div>';
    });
    h+='</div>';
    return h;
  }

  function render(){
    var c=$("birikim-container");if(!c)return;
    var kalemler = tumKalemler();
    var adlar = Object.keys(kalemler);
    var toplamGenel = 0;
    var bakiyeler = {};
    var donusturulebilir = false;
    adlar.forEach(function(ad){
      var bakiye=0;
      kalemler[ad].forEach(function(i){bakiye+=i.tutar;});
      bakiye=kurus(bakiye);
      bakiyeler[ad]=bakiye;
      toplamGenel+=bakiye;
      if(bakiye>0.009) donusturulebilir=true;
    });
    adlar.sort(function(a,b){
      var ah=donusumlerHedef(a).length?0:1;
      var bh=donusumlerHedef(b).length?0:1;
      if(ah!==bh) return ah-bh;
      return a.localeCompare(b,"tr");
    });

    var yOz=yillaraGoreGenel(kalemler);
    var yGel=yillaraGoreGelir();
    var ayOz=aylaraGoreOzet(kalemler);
    var aGel=aylaraGoreGelir();
    var buYil=String(new Date().getFullYear());
    var buAyKey=buAy();
    var baslangic=ilkBirikimTarihi(kalemler);

    var h='<div class="bk-wrap">';
    h+='<div class="bk-header">';
    h+='<div class="bk-h-total">';
    h+='<div class="bk-gt-label">TOPLAM B\u0130R\u0130K\u0130M</div>';
    h+='<div class="bk-gt-val">'+para(toplamGenel)+' TL</div>';
    if(baslangic){
      h+='<div class="bk-gt-baslangic" title="\u0130lk birikim kayd\u0131">Ba\u015flang\u0131\u00e7: '+esc(tarihGunEtiket(baslangic))+'</div>';
    }
    if(donusturulebilir){
      h+='<button type="button" class="bk-donustur-btn" id="bk-donustur-ac">D\u00f6n\u00fc\u015ft\u00fcr</button>';
    }
    h+='</div>';
    h+=besKartHtml();
    if(yOz.yillar.length>0||ayOz.aylar.length>0){
      h+='<div class="bk-h-ozetler">';
      h+=yillikOzetHtml(yOz,yGel,buYil);
      h+=aylikOzetHtml(ayOz,aGel,buAyKey);
      h+='</div>';
    }
    h+='</div>';

    if(adlar.length===0){
      h+='<div style="padding:40px;text-align:center;color:var(--text-muted)">';
      h+='<div style="font-size:40px;margin-bottom:12px">\uD83C\uDFE6</div>';
      h+='<div>\u0130\u015flemler b\u00f6l\u00fcm\u00fcnden B\u0130R\u0130K\u0130M grubuna i\u015flem girin veya kategori y\u00f6netiminden yeni kalem ekleyin</div>';
      h+='</div>';
    } else {
      h+='<div class="bk-kartlar">';
      var ay = buAy();
      adlar.forEach(function(ad){
        var liste = kalemler[ad];
        var toplam = bakiyeler[ad]||0;
        var buay = liste.filter(function(i){return i.tarih&&i.tarih.startsWith(ay);}).reduce(function(s,i){return s+i.tutar;},0);
        var hikayeVar = donusumlerHedef(ad).length>0;
        var gittiVar = donusumlerKaynak(ad).length>0;
        var toplamSinif = "bk-kart-toplam";
        if(toplam<-0.009) toplamSinif += " bk-kart-toplam-eksi";
        else if(Math.abs(toplam)<0.009 && gittiVar) toplamSinif += " bk-kart-toplam-bitti";

        h+='<div class="bk-kart'+(hikayeVar?" bk-kart-hikaye":"")+'">';
        h+='<div class="bk-kart-ust">';
        h+='<div class="bk-kart-info">';
        h+='<div class="bk-kart-label">'+esc(ad)+'</div>';
        h+='<div class="'+toplamSinif+'">'+para(toplam)+' TL</div>';
        h+='</div>';
        h+='<button class="bk-ekle-btn" data-id="'+encodeURIComponent(ad)+'" title="Manuel ekle">+</button>';
        h+='</div>';
        h+='<div class="bk-kart-alt">';
        h+='<div class="bk-buay">Bu ay: <strong class="'+(buay<-0.009?"bk-buay-eksi":"")+'">'+(buay>0?"+":"")+para(buay)+' TL</strong></div>';
        h+=donusumHikayeHtml(ad);
        h+=donusumGittiHtml(ad);

        if(liste.length){
          h+='<div class="bk-islem-liste">';
          liste.forEach(function(i){
            var sinif="bk-db";
            if(i.kaynak==="manuel") sinif="bk-manuel";
            else if(i.kaynak==="donusum") sinif=i.yon==="bozulan"?"bk-donusum-cikis":"bk-donusum-giris";
            h+='<div class="bk-islem-row '+sinif+'">';
            h+='<span class="bk-islem-tarih">'+tarihFmt(i.tarih)+'</span>';
            h+='<span class="bk-islem-aciklama">'+esc(i.aciklama||"")+'</span>';
            h+='<span class="bk-islem-tutar'+(i.tutar<-0.009?" bk-tutar-eksi":"")+'">'+para(i.tutar)+' TL</span>';
            if(i.kaynak==="manuel"){
              h+='<button class="bk-sil-btn" data-kalem="'+encodeURIComponent(ad)+'" data-id="'+esc(i.id)+'" title="Sil">&#10005;</button>';
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

    /* Birikimi başka birikime dönüştürme */
    h+='<div class="bk-modal-overlay hidden" id="bk-donusum-modal">';
    h+='<div class="modal-box bk-donusum-kutu">';
    h+='<div class="modal-header"><h2 class="modal-title">Birikimi d\u00f6n\u00fc\u015ft\u00fcr</h2>';
    h+='<button class="modal-close" id="bk-dn-kapat" type="button">&#10005;</button></div>';
    h+='<div class="modal-body">';
    h+='<p class="bk-dn-giris">Birikimleri bozup yeni bir birikime aktar\u0131n. Eve ekledi\u011finiz paray\u0131 da yaz\u0131n; sonra neyi bozdu\u011funuzu ve ne ekledi\u011finizi kart\u0131nda g\u00f6r\u00fcrs\u00fcn\u00fcz.</p>';
    h+='<div class="field-group"><label class="field-label" for="bk-dn-tarih">Tarih</label>';
    h+='<input type="date" id="bk-dn-tarih" class="field-input" value="'+bugun()+'"/></div>';
    h+='<div class="field-group"><label class="field-label" for="bk-dn-hedef">Neye d\u00f6n\u00fc\u015fs\u00fcn</label>';
    h+='<input type="text" id="bk-dn-hedef" class="field-input" placeholder="\u00d6rn. Ev" maxlength="60" autocomplete="off"/></div>';
    h+='<div class="field-group"><label class="field-label" for="bk-dn-not">Not</label>';
    h+='<input type="text" id="bk-dn-not" class="field-input" placeholder="\u0130ste\u011fe ba\u011fl\u0131, \u00f6rn. kad\u0131k\u00f6y daire" maxlength="120"/></div>';
    h+='<div class="bk-dn-blok">';
    h+='<div class="bk-dn-blok-ust">';
    h+='<div class="bk-dn-blok-baslik">Bozulan birikimler</div>';
    h+='<button type="button" class="bk-dn-tumunu" id="bk-dn-tumunu">T\u00fcm birikimi boz</button>';
    h+='</div>';
    h+='<div id="bk-dn-kaynaklar"></div>';
    h+='</div>';
    h+='<div class="bk-dn-blok">';
    h+='<div class="bk-dn-blok-ust">';
    h+='<div class="bk-dn-blok-baslik">Eklenen</div>';
    h+='<button type="button" class="bk-dn-satir-ekle" id="bk-dn-ekle-satir">+ sat\u0131r</button>';
    h+='</div>';
    h+='<p class="bk-dn-yardim">Birikim d\u0131\u015f\u0131ndan eklenen para. \u00d6rne\u011fin kredi, elden veya maa\u015f.</p>';
    h+='<div id="bk-dn-eklenen"></div>';
    h+='</div>';
    h+='<div class="bk-dn-ozet" id="bk-dn-ozet"></div>';
    h+='<p class="bk-dn-hata hidden" id="bk-dn-hata"></p>';
    h+='</div>';
    h+='<div class="modal-footer">';
    h+='<button class="btn-secondary" id="bk-dn-iptal" type="button">\u0130ptal</button>';
    h+='<button class="btn-primary" id="bk-dn-kaydet" type="button">D\u00f6n\u00fc\u015ft\u00fcr</button>';
    h+='</div></div></div>';

    /* BES hatırlatma modalı */
    h+='<div class="bk-modal-overlay hidden" id="bk-bes-modal">';
    h+='<div class="modal-box modal-sm">';
    h+='<div class="modal-header"><h2 class="modal-title" id="bk-bes-baslik">BES \u00f6demesi</h2>';
    h+='<button class="modal-close" id="bk-bes-kapat">&#10005;</button></div>';
    h+='<div class="modal-body">';
    h+='<div class="field-group"><label class="field-label" for="bk-bes-ad">Kimin ad\u0131na</label>';
    h+='<input type="text" id="bk-bes-ad" class="field-input" placeholder="\u0130sim" maxlength="40" autocomplete="name"/></div>';
    h+='<div class="field-group"><label class="field-label" for="bk-bes-aylik">Ayl\u0131k \u00f6deme (TL)</label>';
    h+='<input type="number" id="bk-bes-aylik" class="field-input" placeholder="0" min="0" step="0.01" inputmode="decimal"/></div>';
    h+='<p class="bk-bes-not">Bu kay\u0131t yaln\u0131zca hat\u0131rlatma i\u00e7indir; alttaki birikim kartlar\u0131na eklenmez.</p>';
    h+='</div>';
    h+='<div class="modal-footer">';
    h+='<button class="btn-danger hidden" id="bk-bes-sil">Sil</button>';
    h+='<button class="btn-secondary" id="bk-bes-iptal">\u0130ptal</button>';
    h+='<button class="btn-primary" id="bk-bes-kaydet">Kaydet</button>';
    h+='</div></div></div>';

    c.innerHTML = h;
    bagla();
  }

  function bagla(){
    /* + Ekle butonları */
    document.querySelectorAll(".bk-ekle-btn").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        _aktifKalem = decodeURIComponent(btn.dataset.id);
        $("bk-modal-baslik").textContent = _aktifKalem+" - Manuel Ekle";
        $("bk-inp-tutar").value="";
        $("bk-inp-aciklama").value="";
        $("bk-inp-tarih").value=bugun();
        _modalKoruma = Date.now() + 450;
        var modal = $("bk-modal");
        if (modal) {
          modal.classList.remove("hidden");
          modal.style.pointerEvents = "none";
        }
        setTimeout(function(){
          var m = $("bk-modal");
          if (m && !m.classList.contains("hidden")) m.style.pointerEvents = "";
          var t = $("bk-inp-tutar"); if (t) t.focus();
        }, 350);
      });
    });
    function bkModalKapat(){
      var m = $("bk-modal");
      if (m) { m.classList.add("hidden"); m.style.pointerEvents = ""; }
      _aktifKalem = null; _modalKoruma = 0;
    }
    /* Modal kapat */
    $("bk-modal-kapat").addEventListener("click",bkModalKapat);
    $("bk-iptal").addEventListener("click",bkModalKapat);
    $("bk-modal").addEventListener("click",function(e){
      if(e.target!==$("bk-modal"))return;
      if(Date.now()<_modalKoruma)return;
      bkModalKapat();
    });
    var bkBox = $("bk-modal") && $("bk-modal").querySelector(".modal-box");
    if (bkBox) bkBox.addEventListener("click", function(e){ e.stopPropagation(); });
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
    baglaBes();
    baglaDonusum();
  }

  function besModalAc(kayit){
    _aktifBesId = kayit && kayit.id ? kayit.id : null;
    var baslik = $("bk-bes-baslik");
    if (baslik) baslik.textContent = _aktifBesId ? "BES d\u00fczenle" : "BES \u00f6demesi";
    var adEl = $("bk-bes-ad");
    var tutEl = $("bk-bes-aylik");
    var silBtn = $("bk-bes-sil");
    if (adEl) adEl.value = kayit ? (kayit.ad || "") : "";
    if (tutEl) tutEl.value = kayit && kayit.aylik ? String(kayit.aylik) : "";
    if (silBtn) {
      if (_aktifBesId) silBtn.classList.remove("hidden");
      else silBtn.classList.add("hidden");
    }
    _modalKoruma = Date.now() + 450;
    var modal = $("bk-bes-modal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.style.pointerEvents = "none";
    }
    setTimeout(function(){
      var m = $("bk-bes-modal");
      if (m && !m.classList.contains("hidden")) m.style.pointerEvents = "";
      var t = $("bk-bes-ad"); if (t) t.focus();
    }, 350);
  }

  function besModalKapat(){
    var m = $("bk-bes-modal");
    if (m) { m.classList.add("hidden"); m.style.pointerEvents = ""; }
    _aktifBesId = null;
  }

  function baglaBes(){
    function acYeni(){ besModalAc(null); }
    var ekleBtn = $("bk-bes-ekle");
    var bosBtn = $("bk-bes-bos-ekle");
    if (ekleBtn) ekleBtn.addEventListener("click", acYeni);
    if (bosBtn) bosBtn.addEventListener("click", acYeni);
    document.querySelectorAll(".bk-bes-satir").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id = btn.dataset.id;
        var kayit = _besKayitlar.find(function(k){ return k.id === id; });
        if (kayit) besModalAc(kayit);
      });
    });
    function kapatClick(){ besModalKapat(); }
    var kapat = $("bk-bes-kapat");
    var iptal = $("bk-bes-iptal");
    var overlay = $("bk-bes-modal");
    if (kapat) kapat.addEventListener("click", kapatClick);
    if (iptal) iptal.addEventListener("click", kapatClick);
    if (overlay) {
      overlay.addEventListener("click", function(e){
        if (e.target !== overlay) return;
        if (Date.now() < _modalKoruma) return;
        besModalKapat();
      });
      var box = overlay.querySelector(".modal-box");
      if (box) box.addEventListener("click", function(e){ e.stopPropagation(); });
    }
    var kaydet = $("bk-bes-kaydet");
    var sil = $("bk-bes-sil");
    var adInp = $("bk-bes-ad");
    var tutInp = $("bk-bes-aylik");
    if (kaydet) kaydet.addEventListener("click", besKaydet);
    if (sil) sil.addEventListener("click", besSil);
    if (adInp) adInp.addEventListener("keydown", function(e){ if (e.key === "Enter") besKaydet(); });
    if (tutInp) tutInp.addEventListener("keydown", function(e){ if (e.key === "Enter") besKaydet(); });
  }

  async function besKaydet(){
    var adEl = $("bk-bes-ad");
    var tutEl = $("bk-bes-aylik");
    var ad = adEl ? String(adEl.value || "").trim() : "";
    var aylik = tutEl ? parseFloat(tutEl.value) : 0;
    if (!ad) { if (adEl) adEl.focus(); return; }
    if (!aylik || aylik < 0) { if (tutEl) tutEl.focus(); return; }
    if (_aktifBesId) {
      var mevcut = _besKayitlar.find(function(k){ return k.id === _aktifBesId; });
      if (mevcut) { mevcut.ad = ad.slice(0, 40); mevcut.aylik = aylik; }
    } else {
      _besKayitlar.push({
        id: "bes" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        ad: ad.slice(0, 40),
        aylik: aylik
      });
    }
    await fbBesKaydet();
    besModalKapat();
    render();
  }

  async function besSil(){
    if (!_aktifBesId) return;
    if (!confirm("Bu BES kayd\u0131n\u0131 silmek istiyor musunuz?")) return;
    _besKayitlar = _besKayitlar.filter(function(k){ return k.id !== _aktifBesId; });
    await fbBesKaydet();
    besModalKapat();
    render();
  }

  function eklenenSatirHtml(){
    return '<div class="bk-dn-ek">'+
      '<input type="text" class="field-input bk-dn-ek-ad" placeholder="Kredi, elden, maa\u015f..." maxlength="80"/>'+
      '<input type="number" class="field-input bk-dn-ek-tutar" placeholder="0" min="0" step="0.01" inputmode="decimal"/>'+
      '<button type="button" class="bk-dn-ek-sil" title="Sat\u0131r\u0131 sil">&#10005;</button>'+
      '</div>';
  }

  function donusumHata(msg){
    var el=$("bk-dn-hata");
    if(!el){ alert(msg); return; }
    el.textContent=msg;
    el.classList.remove("hidden");
  }

  function donusumFormOku(){
    var hedefHam=$("bk-dn-hedef")?$("bk-dn-hedef").value:"";
    var adlar=Object.keys(tumKalemler());
    var hedef=kalemKanun(hedefHam,adlar);
    var bozulan=[];
    document.querySelectorAll("#bk-donusum-modal .bk-dn-kaynak").forEach(function(row){
      var inp=row.querySelector(".bk-dn-tutar");
      if(!inp||inp.disabled) return;
      var tutar=kurus(inp.value);
      if(tutar<=0) return;
      bozulan.push({
        kalem:decodeURIComponent(row.getAttribute("data-kalem")||""),
        tutar:tutar,
        bakiye:kurus(row.getAttribute("data-bakiye"))
      });
    });
    var eklenen=[];
    document.querySelectorAll("#bk-donusum-modal .bk-dn-ek").forEach(function(row){
      var tutEl=row.querySelector(".bk-dn-ek-tutar");
      var adEl=row.querySelector(".bk-dn-ek-ad");
      var tutar=kurus(tutEl?tutEl.value:0);
      if(tutar<=0) return;
      eklenen.push({aciklama:String(adEl?adEl.value:"").trim(),tutar:tutar});
    });
    return {
      tarih:$("bk-dn-tarih")?$("bk-dn-tarih").value:"",
      hedef:hedef,
      not:$("bk-dn-not")?String($("bk-dn-not").value||"").trim():"",
      bozulan:bozulan,
      eklenen:eklenen
    };
  }

  function donusumKaynaklariKilitle(){
    var hedef=$("bk-dn-hedef")?String($("bk-dn-hedef").value||"").trim():"";
    document.querySelectorAll("#bk-donusum-modal .bk-dn-kaynak").forEach(function(row){
      var ad=decodeURIComponent(row.getAttribute("data-kalem")||"");
      var ayni=!!hedef&&kalemEsit(ad,hedef);
      row.classList.toggle("bk-dn-kaynak-kapali",ayni);
      var inp=row.querySelector(".bk-dn-tutar");
      var tumu=row.querySelector(".bk-dn-tumu");
      if(!inp) return;
      if(ayni){
        inp.value="";
        inp.disabled=true;
        if(tumu) tumu.disabled=true;
      }else{
        inp.disabled=false;
        if(tumu) tumu.disabled=false;
      }
    });
  }

  function donusumOzetGuncelle(){
    donusumKaynaklariKilitle();
    var o=donusumFormOku();
    var boz=0,ek=0;
    o.bozulan.forEach(function(b){boz+=b.tutar;});
    o.eklenen.forEach(function(e){ek+=e.tutar;});
    boz=kurus(boz); ek=kurus(ek);
    var el=$("bk-dn-ozet");
    if(!el) return;
    var ad=o.hedef||"Yeni birikim";
    el.innerHTML=
      '<div class="bk-dn-ozet-satir"><span>Bozulan</span><strong>'+para(boz)+' TL</strong></div>'+
      '<div class="bk-dn-ozet-satir"><span>Eklenen</span><strong>'+para(ek)+' TL</strong></div>'+
      '<div class="bk-dn-ozet-satir bk-dn-ozet-son"><span>'+esc(ad)+'</span><strong>'+para(kurus(boz+ek))+' TL</strong></div>';
  }

  function donusumModalDoldur(){
    var kalemler=tumKalemler();
    var adlar=Object.keys(kalemler).sort(function(a,b){return a.localeCompare(b,"tr");});
    var kutu=$("bk-dn-kaynaklar");
    var h="";
    var say=0;
    adlar.forEach(function(ad){
      var bakiye=0;
      (kalemler[ad]||[]).forEach(function(i){bakiye+=parseFloat(i.tutar)||0;});
      bakiye=kurus(bakiye);
      if(bakiye<=0.009) return;
      say++;
      h+='<div class="bk-dn-kaynak" data-kalem="'+encodeURIComponent(ad)+'" data-bakiye="'+bakiye+'">';
      h+='<div class="bk-dn-kaynak-ust">';
      h+='<span class="bk-dn-kaynak-ad">'+esc(ad)+'</span>';
      h+='<span class="bk-dn-kaynak-bak">Bakiye '+para(bakiye)+' TL</span>';
      h+='</div>';
      h+='<div class="bk-dn-kaynak-alt">';
      h+='<input type="number" class="field-input bk-dn-tutar" min="0" step="0.01" inputmode="decimal" placeholder="Bozulacak tutar" aria-label="'+esc(ad)+' bozulacak tutar"/>';
      h+='<button type="button" class="bk-dn-tumu">T\u00fcm\u00fc</button>';
      h+='</div></div>';
    });
    if(!say) h='<p class="bk-dn-yok">Bozulacak bakiyesi olan birikim yok.</p>';
    if(kutu) kutu.innerHTML=h;
    var ek=$("bk-dn-eklenen");
    if(ek) ek.innerHTML=eklenenSatirHtml();
    var hedef=$("bk-dn-hedef");
    var notEl=$("bk-dn-not");
    var tarih=$("bk-dn-tarih");
    var hata=$("bk-dn-hata");
    if(hedef) hedef.value="";
    if(notEl) notEl.value="";
    if(tarih) tarih.value=bugun();
    if(hata){ hata.textContent=""; hata.classList.add("hidden"); }
    donusumOzetGuncelle();
  }

  function donusumModalAc(){
    donusumModalDoldur();
    _modalKoruma=Date.now()+450;
    var modal=$("bk-donusum-modal");
    if(modal){
      modal.classList.remove("hidden");
      modal.style.pointerEvents="none";
    }
    setTimeout(function(){
      var m=$("bk-donusum-modal");
      if(m&&!m.classList.contains("hidden")) m.style.pointerEvents="";
      var t=$("bk-dn-hedef"); if(t) t.focus();
    },350);
  }

  function donusumModalKapat(){
    var m=$("bk-donusum-modal");
    if(m){ m.classList.add("hidden"); m.style.pointerEvents=""; }
  }

  function donusumTumunuBoz(){
    document.querySelectorAll("#bk-donusum-modal .bk-dn-kaynak").forEach(function(row){
      var inp=row.querySelector(".bk-dn-tutar");
      if(!inp||inp.disabled) return;
      inp.value=String(kurus(row.getAttribute("data-bakiye")));
    });
    donusumOzetGuncelle();
  }

  async function donusumKaydet(){
    if(_dnKaydediyor) return;
    var o=donusumFormOku();
    var hataEl=$("bk-dn-hata");
    if(hataEl){ hataEl.textContent=""; hataEl.classList.add("hidden"); }
    if(!o.tarih||!/^\d{4}-\d{2}-\d{2}$/.test(o.tarih)){ donusumHata("Tarih girin."); return; }
    if(!o.hedef){
      donusumHata("Neye d\u00f6n\u00fc\u015fece\u011fini yaz\u0131n. \u00d6rne\u011fin Ev.");
      var hedefEl=$("bk-dn-hedef"); if(hedefEl) hedefEl.focus();
      return;
    }
    if(!o.bozulan.length){
      donusumHata("En az bir birikimden tutar bozun. T\u00fcm\u00fcn\u00fc aktarmak i\u00e7in T\u00fcm birikimi boz d\u00fc\u011fmesini kullan\u0131n.");
      return;
    }
    for(var i=0;i<o.bozulan.length;i++){
      var b=o.bozulan[i];
      if(kalemEsit(b.kalem,o.hedef)){ donusumHata(b.kalem+" kendisine d\u00f6n\u00fc\u015femez."); return; }
      if(b.tutar-b.bakiye>0.009){
        donusumHata(b.kalem+" bakiyesinden fazla bozulamaz. Bakiye "+para(b.bakiye)+" TL.");
        return;
      }
    }
    for(var j=0;j<o.eklenen.length;j++){
      if(!o.eklenen[j].aciklama){
        donusumHata("Eklenen her tutar\u0131n ne oldu\u011funu yaz\u0131n. \u00d6rne\u011fin kredi veya elden.");
        return;
      }
    }
    _dnKaydediyor=true;
    _donusumler.push({
      id:"dn"+Date.now()+"_"+Math.random().toString(36).slice(2,6),
      tarih:o.tarih,
      hedef:o.hedef,
      not:o.not.slice(0,120),
      bozulan:o.bozulan.map(function(b){return {kalem:b.kalem,tutar:b.tutar};}),
      eklenen:o.eklenen.map(function(e){return {aciklama:e.aciklama.slice(0,80),tutar:e.tutar};})
    });
    _donusumler=donusumNormalize(_donusumler);
    try{ await fbDonusumKaydet(); }
    finally{ _dnKaydediyor=false; }
    donusumModalKapat();
    render();
  }

  async function donusumGeriAl(id){
    var d=null;
    for(var i=0;i<_donusumler.length;i++){ if(_donusumler[i].id===id) d=_donusumler[i]; }
    if(!d) return;
    if(!confirm(d.hedef+" d\u00f6n\u00fc\u015f\u00fcm\u00fc geri al\u0131ns\u0131n m\u0131? Bozulan birikimler eski bakiyesine d\u00f6ner, eklenen tutarlar da silinir.")) return;
    _donusumler=_donusumler.filter(function(x){return x.id!==id;});
    await fbDonusumKaydet();
    render();
  }

  function baglaDonusum(){
    var ac=$("bk-donustur-ac");
    if(ac) ac.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      donusumModalAc();
    });
    document.querySelectorAll(".bk-hikaye-geri").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        donusumGeriAl(btn.getAttribute("data-id"));
      });
    });
    var modal=$("bk-donusum-modal");
    if(!modal) return;
    function kapat(){ donusumModalKapat(); }
    var kapatBtn=$("bk-dn-kapat");
    var iptal=$("bk-dn-iptal");
    if(kapatBtn) kapatBtn.addEventListener("click",kapat);
    if(iptal) iptal.addEventListener("click",kapat);
    modal.addEventListener("click",function(e){
      if(e.target!==modal) return;
      if(Date.now()<_modalKoruma) return;
      donusumModalKapat();
    });
    var box=modal.querySelector(".modal-box");
    if(box) box.addEventListener("click",function(e){ e.stopPropagation(); });
    modal.addEventListener("click",function(e){
      var tumu=e.target.closest?e.target.closest(".bk-dn-tumu"):null;
      if(tumu&&modal.contains(tumu)){
        e.preventDefault();
        var row=tumu.closest(".bk-dn-kaynak");
        var inp=row&&row.querySelector(".bk-dn-tutar");
        if(inp&&!inp.disabled){
          inp.value=String(kurus(row.getAttribute("data-bakiye")));
          donusumOzetGuncelle();
        }
        return;
      }
      var sil=e.target.closest?e.target.closest(".bk-dn-ek-sil"):null;
      if(sil&&modal.contains(sil)){
        e.preventDefault();
        var satir=sil.closest(".bk-dn-ek");
        var liste=$("bk-dn-eklenen");
        if(satir&&liste){
          if(liste.querySelectorAll(".bk-dn-ek").length<=1){
            var ad=satir.querySelector(".bk-dn-ek-ad");
            var tut=satir.querySelector(".bk-dn-ek-tutar");
            if(ad) ad.value="";
            if(tut) tut.value="";
          }else satir.remove();
          donusumOzetGuncelle();
        }
      }
    });
    modal.addEventListener("input",function(){ donusumOzetGuncelle(); });
    var tumunu=$("bk-dn-tumunu");
    var satirEkle=$("bk-dn-ekle-satir");
    var kaydet=$("bk-dn-kaydet");
    if(tumunu) tumunu.addEventListener("click",function(e){ e.preventDefault(); donusumTumunuBoz(); });
    if(satirEkle) satirEkle.addEventListener("click",function(e){
      e.preventDefault();
      var liste=$("bk-dn-eklenen");
      if(!liste) return;
      liste.insertAdjacentHTML("beforeend",eklenenSatirHtml());
    });
    if(kaydet) kaydet.addEventListener("click",function(e){ e.preventDefault(); donusumKaydet(); });
    var hedef=$("bk-dn-hedef");
    if(hedef) hedef.addEventListener("keydown",function(e){ if(e.key==="Enter") donusumKaydet(); });
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
    var m=$("bk-modal");
    if(m){m.classList.add("hidden");m.style.pointerEvents="";}
    _aktifKalem=null;_modalKoruma=0;
    render();
  }

  async function birikimVeriYenile() {
    if (typeof IslemlerDB === "undefined") return;
    _islemler = await IslemlerDB.getAll();
    if (typeof KategorilerDB !== "undefined") {
      _kategoriler = await KategorilerDB.getAll();
    }
  }

  async function init(){
    await birikimVeriYenile();
    await fbYukle();
    render();
  }

  if (!window._hkBirikimKatEv) {
    window._hkBirikimKatEv = true;
    async function birikimCanliYenile() {
      if (typeof KategorilerDB === "undefined" || typeof IslemlerDB === "undefined") return;
      await birikimVeriYenile();
      var panel = document.getElementById("tab-birikim");
      if (panel && panel.classList.contains("active")) render();
    }
    window.addEventListener("hk-kategoriler-degisti", birikimCanliYenile);
    window.addEventListener("hk-islemler-degisti", birikimCanliYenile);
  }

  return{init:init, besRaporGetir:besRaporGetir};
})();
