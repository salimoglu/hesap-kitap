(async () => {
  var _hizliDonus = false;
  try { _hizliDonus = !!localStorage.getItem("hk-oturum-uid"); } catch (eHd) {}

  /* Firebase init ile IndexedDB acilisini paralel calistir — donus ziyaretinde initApp hizli mod */
  await Promise.all([
    typeof fbInit !== "undefined" ? fbInit().catch(function() {}) : Promise.resolve(),
    typeof initApp !== "undefined"
      ? initApp(_hizliDonus ? { hizli: true } : undefined).catch(function() {})
      : Promise.resolve()
  ]);

  try {
    var redErr = sessionStorage.getItem("hk-auth-redirect-err");
    if (redErr) {
      sessionStorage.removeItem("hk-auth-redirect-err");
      var elRed = document.getElementById("fb-auth-error");
      if (elRed) elRed.textContent = redErr;
    }
  } catch (e) {}

  const lockScreen = document.getElementById("lock-screen");
  const appEl = document.getElementById("app");
  let _kilitKayitModu = false;

  function hkMobilMi() {
    try {
      var ua = navigator.userAgent || "";
      return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    } catch (e) { return false; }
  }

  function kilitKayitArayuz() {
    const btnG = document.getElementById("lock-btn-giris");
    const btnK = document.getElementById("lock-btn-kayit");
    const tKayit = document.getElementById("lock-toggle-kayit");
    const tGiris = document.getElementById("lock-toggle-giris");
    if (_kilitKayitModu) {
      if (btnG) btnG.classList.add("hidden");
      if (btnK) btnK.classList.remove("hidden");
      if (tKayit) tKayit.classList.add("hidden");
      if (tGiris) tGiris.classList.remove("hidden");
    } else {
      if (btnG) btnG.classList.remove("hidden");
      if (btnK) btnK.classList.add("hidden");
      if (tKayit) tKayit.classList.remove("hidden");
      if (tGiris) tGiris.classList.add("hidden");
    }
  }

  function girisFormuSifirla() {
    /* fb-auth-error burada silinmez: onAuthStateChanged her tetiklendiginde Firebase yonlendirme hatalarini yok ediyordu. */
    _kilitKayitModu = false;
    kilitKayitArayuz();
  }

  let _hkSwRegisterDenendi = false;
  async function hkServiceWorkerKaydet() {
    if (_hkSwRegisterDenendi || !("serviceWorker" in navigator)) return;
    try {
      if (hkMobilMi()) {
        _hkSwRegisterDenendi = true;
        return;
      }
    } catch (e) {}
    _hkSwRegisterDenendi = true;
    try {
      const reg = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        }
      });
    } catch (err) {
      console.warn("SW hatasi:", err);
    }
  }

  function hkScopeHazir(uid) {
    if (!uid) return false;
    try { return localStorage.getItem("hk-root-cleaned-" + uid) === "1"; } catch (e) { return false; }
  }

  function hkOturumKaydet(uid) {
    if (!uid) return;
    try { localStorage.setItem("hk-oturum-uid", String(uid)); } catch (e) {}
    document.documentElement.classList.add("hk-hizli-ac");
  }

  function hkOturumSil() {
    try { localStorage.removeItem("hk-oturum-uid"); } catch (e) {}
    document.documentElement.classList.remove("hk-auth-bekleniyor");
    document.documentElement.classList.remove("hk-hizli-ac");
  }

  function hkOturumBeklemeGoster() {
    document.documentElement.classList.add("hk-auth-bekleniyor");
    var bek = document.getElementById("lock-auth-bekliyor");
    if (bek) bek.setAttribute("aria-busy", "true");
  }

  function hkOturumBeklemeBitir() {
    document.documentElement.classList.remove("hk-auth-bekleniyor");
    var bek = document.getElementById("lock-auth-bekliyor");
    if (bek) bek.setAttribute("aria-busy", "false");
  }

  function girisEkraniGoster() {
    hkOturumBeklemeBitir();
    if (typeof HK_AYARLAR !== "undefined") HK_AYARLAR.gizle();
    appEl.classList.add("hidden");
    lockScreen.classList.remove("hidden");
    lockScreen.style.animation = "";
  }

  async function hkAuthIlkKullaniciOku(user) {
    if (typeof firebase === "undefined" || !firebase.auth) return user;
    if (window._fbAuthStateHazir) {
      try {
        var cu0 = firebase.auth().currentUser;
        if (cu0 && !cu0.isAnonymous) return cu0;
      } catch (e0) {}
      return user;
    }
    if (user && !user.isAnonymous) {
      window._fbAuthStateHazir = true;
      return user;
    }
    if (typeof firebase.auth().authStateReady === "function") {
      try {
        await Promise.race([
          firebase.auth().authStateReady(),
          new Promise(function(r) { setTimeout(r, hkKayitliOturumVarMi() ? 800 : 1500); })
        ]);
      } catch (e) {}
    }
    try {
      var cu = firebase.auth().currentUser;
      if (cu && !cu.isAnonymous) {
        window._fbAuthStateHazir = true;
        return cu;
      }
    } catch (e2) {}
    return user;
  }

  function hkOAuthBekleGerekliMi() {
    try {
      if (typeof fbOAuthDonusUrlMu === "function" && fbOAuthDonusUrlMu()) return true;
      var rp = sessionStorage.getItem("hk-google-redirect-pending");
      if (!rp) return false;
      var ts = parseInt(rp, 10);
      return !isNaN(ts) && Date.now() - ts < 15 * 60 * 1000;
    } catch (e) { return false; }
  }

  function hkKayitliOturumVarMi() {
    try { return !!localStorage.getItem("hk-oturum-uid"); } catch (e) { return false; }
  }

  async function hkBulutSenkron(u) {
    const syncEl = document.getElementById("sync-durum");
    if (syncEl) syncEl.textContent = "\u2601";
    try {
      if (typeof fbRtdbOturumHazir === "function") await fbRtdbOturumHazir();
      if (typeof fbKimlikTokenAl === "function") await fbKimlikTokenAl(false);
      var scopeHazir = hkScopeHazir(u && u.uid);
      if (scopeHazir) {
        if (typeof fbVerileriYukle !== "undefined") await fbVerileriYukle();
        if (typeof fbEnsureUserDataScope === "function") {
          fbEnsureUserDataScope().catch(function() {});
        }
      } else {
        if (typeof fbAuthEpostalariTopla === "function") await fbAuthEpostalariTopla(u);
        if (typeof fbEnsureUserDataScope === "function") await fbEnsureUserDataScope();
        if (typeof fbVerileriYukle !== "undefined") await fbVerileriYukle();
      }
      if (window._hkKokOkumaKapali) {
        var kokUy = document.getElementById("fb-auth-error");
        if (kokUy) {
          kokUy.textContent =
            "Eski veriler kokte ama uygulama okuyamiyor. Firebase kurallarini guncelleyin: PowerShell'de .\\tools\\deploy-database-rules.ps1 — sonra cikis yapip tekrar girin.";
        }
      }
      if (syncEl) syncEl.textContent = "\u2713";
      return true;
    } catch (e) {
      if (syncEl) syncEl.textContent = "";
      return false;
    }
  }

  async function uygulamaAcIc() {
    let u = null;
    try {
      u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
    } catch (e) { u = null; }
    if (!u || u.isAnonymous) return;

    _acikOturumUid = u.uid;
    hkOturumKaydet(u.uid);

    try { await hkServiceWorkerKaydet(); } catch (eSw) {}

    const fbErrOk = document.getElementById("fb-auth-error");
    if (fbErrOk) fbErrOk.textContent = "";

    lockScreen.classList.add("hidden");
    appEl.classList.remove("hidden");
    hkOturumBeklemeBitir();
    document.documentElement.classList.add("hk-hizli-ac");

    u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : u;
    if (typeof HK_ERISIM !== "undefined") {
      HK_ERISIM.sekmeleriUygula(u);
    }
    if (typeof HK_AYARLAR !== "undefined") HK_AYARLAR.guncelle(u);

    /* Hizli acilis: butce onbellekten aninda; islemler yerelden; bulut arka planda */
    if (modulIzinli("islemler")) {
      if (typeof ButceModule !== "undefined" && typeof ButceModule.goster === "function") {
        ButceModule.goster();
      }
      var butceBulut = (typeof ButceModule !== "undefined" && typeof ButceModule.yukle === "function")
        ? ButceModule.yukle()
        : null;
      if (typeof IslemlerModule !== "undefined") {
        await IslemlerModule.init();
      }
      if (butceBulut && typeof butceBulut.catch === "function") {
        butceBulut.catch(function () {});
      }
    }
    var izinli = getTabSira();
    if (izinli.length) modulAc(izinli[0]);
    if (typeof HK_TANITIM !== "undefined") {
      setTimeout(function() { HK_TANITIM.belkiGoster(u).catch(function() {}); }, 400);
    }
    if (typeof HK_ERISIM !== "undefined") HK_ERISIM.misafirBilgiGoster(u);

    /* Bulut senkronu arka planda; bitince islemler + diger moduller guncellenir */
    hkBulutSenkron(u).then(async function () {
      u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : u;
      if (window._hkIslemlerBulutDegisti && modulIzinli("islemler") && typeof IslemlerModule !== "undefined" && typeof IslemlerModule.yukle === "function") {
        await IslemlerModule.yukle({ zorla: true });
        window._hkIslemlerBulutDegisti = false;
      }
      await modulleriBaslat(u, { atlaIslemler: true });
    });
  }

  var _uygulamaAcPromise = null;
  var _acikOturumUid = null;
  async function uygulamaAc() {
    if (_uygulamaAcPromise) return _uygulamaAcPromise;
    _uygulamaAcPromise = uygulamaAcIc().finally(function () {
      _uygulamaAcPromise = null;
    });
    return _uygulamaAcPromise;
  }

  window.sayfaYenile = async function() {
    let u = null;
    try { u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null; } catch (e) { u = null; }
    if (!u || u.isAnonymous) return;
    await hkBulutSenkron(u);
    u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : u;
    if (typeof HK_ERISIM !== "undefined") {
      HK_ERISIM.sekmeleriUygula(u);
      HK_ERISIM.misafirBilgiGoster(u);
    }
    await modulleriBaslat(u);
  };

  /** SW/cache temizle + bulut senkron + hard reload (yeni ozellikler icin). */
  window.hkGuncelleVeYenidenYukle = async function() {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(async function(reg) {
          try { await reg.update(); } catch (eUp) {}
          if (reg.waiting) {
            try { reg.waiting.postMessage({ type: "SKIP_WAITING" }); } catch (eSk) {}
          }
        }));
      }
    } catch (eSw) {}
    try {
      if (typeof caches !== "undefined" && caches.keys) {
        var keys = await caches.keys();
        await Promise.all(keys.map(function(k) { return caches.delete(k); }));
      }
    } catch (eCa) {}
    try {
      if (typeof window.sayfaYenile === "function") await window.sayfaYenile();
    } catch (eSy) {}
    try {
      var url = new URL(location.href);
      url.searchParams.set("hk_r", String(Date.now()));
      location.replace(url.toString());
    } catch (eRl) {
      location.reload();
    }
  };

  try {
    const uAn = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
    if (uAn && uAn.isAnonymous && typeof fbCikisBulut === "function") await fbCikisBulut();
  } catch (e) {}

  if (typeof firebase !== "undefined" && firebase.auth) {
    var _authIlkSnap = true;
    firebase.auth().onAuthStateChanged(async function(user) {
      if (_authIlkSnap) {
        _authIlkSnap = false;
        if (!window._fbAuthStateHazir && (hkKayitliOturumVarMi() || hkOAuthBekleGerekliMi())) {
          hkOturumBeklemeGoster();
        }
        user = await hkAuthIlkKullaniciOku(user);
      }

      /**
       * OAuth redirect donusunde: ilk callback bazen null geliyor.
       */
      if ((!user || user.isAnonymous) && hkOAuthBekleGerekliMi()) {
        hkOturumBeklemeGoster();
        var dly = hkMobilMi() ? 350 : 150;
        await new Promise(function(r) { setTimeout(r, dly); });
        try {
          var u2 = firebase.auth().currentUser;
          if (u2 && !u2.isAnonymous) user = u2;
        } catch (e) {}
      }

      girisFormuSifirla();
      if (user && !user.isAnonymous) {
        if (_acikOturumUid === user.uid && !appEl.classList.contains("hidden")) return;
        await uygulamaAc();
      } else {
        _acikOturumUid = null;
        hkOturumSil();
        girisEkraniGoster();
      }
    });

    /* fbInit oturumu bulduysa authStateChanged'i beklemeden ac */
    try {
      var uErken = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
      if (uErken && !uErken.isAnonymous && window._fbAuthStateHazir) {
        uygulamaAc();
      }
    } catch (eEr) {}
  }

  // PWA yukleme (masaustu + Android)
  const installBtn = document.getElementById("install-btn");
  let deferredInstallPrompt = null;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (installBtn && standalone) installBtn.classList.add("hidden");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn && !standalone) installBtn.classList.remove("hidden");
  });
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      try { await deferredInstallPrompt.userChoice; } catch (err) {}
      deferredInstallPrompt = null;
      installBtn.classList.add("hidden");
    });
  }
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (installBtn) installBtn.classList.add("hidden");
  });

  (function hkIosAnaEkranIpucu() {
    try {
      var el = document.getElementById("lock-ios-install");
      if (!el) return;
      var ua = navigator.userAgent || "";
      var ios = /iPhone|iPad|iPod/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
      if (ios && !standalone) el.classList.remove("hidden");
    } catch (e) {}
  })();

  var misafirBannerKapat = document.getElementById("hk-misafir-banner-kapat");
  if (misafirBannerKapat) {
    misafirBannerKapat.addEventListener("click", function () {
      var el = document.getElementById("hk-misafir-banner");
      if (el) el.classList.add("hidden");
      try { sessionStorage.setItem("hk-misafir-banner-kapali", "1"); } catch (e) {}
    });
  }

  const lockToggleKayit = document.getElementById("lock-toggle-kayit");
  const lockToggleGiris = document.getElementById("lock-toggle-giris");
  if (lockToggleKayit) lockToggleKayit.addEventListener("click", () => { _kilitKayitModu = true; kilitKayitArayuz(); });
  if (lockToggleGiris) lockToggleGiris.addEventListener("click", () => { _kilitKayitModu = false; kilitKayitArayuz(); });

  async function fbAuthCalistir(fonk) {
    const errEl = document.getElementById("fb-auth-error");
    if (errEl) errEl.textContent = "";
    if (typeof fbAuthBekleyenTemizle === "function") fbAuthBekleyenTemizle();
    const emEl = document.getElementById("lock-email");
    const pwEl = document.getElementById("lock-sifre");
    const em = emEl ? emEl.value : "";
    const pw = pwEl ? pwEl.value : "";
    try {
      await fonk(em, pw);
      if (pwEl) pwEl.value = "";
    } catch (e) {
      if (errEl) errEl.textContent = typeof fbAuthHataMetni === "function" ? fbAuthHataMetni(e) : "Hata";
    }
  }

  const lockBtnGiris = document.getElementById("lock-btn-giris");
  const lockBtnKayit = document.getElementById("lock-btn-kayit");
  const lockBtnGoogle = document.getElementById("lock-btn-google");
  if (lockBtnGiris) lockBtnGiris.addEventListener("click", () => fbAuthCalistir(fbGirisEmail));
  if (lockBtnKayit) lockBtnKayit.addEventListener("click", () => fbAuthCalistir(fbKayitEmail));
  if (lockBtnGoogle && typeof fbGirisGoogle === "function") {
    lockBtnGoogle.addEventListener("click", async () => {
      const errEl = document.getElementById("fb-auth-error");
      if (errEl) errEl.textContent = "";
      try {
        await fbGirisGoogle();
      } catch (e) {
        if (errEl) errEl.textContent = typeof fbAuthHataMetni === "function" ? fbAuthHataMetni(e) : "Hata";
      }
    });
  }

  const lockSifreEl = document.getElementById("lock-sifre");
  if (lockSifreEl) {
    lockSifreEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (_kilitKayitModu) fbAuthCalistir(fbKayitEmail);
      else fbAuthCalistir(fbGirisEmail);
    });
  }

  // Sekme yonetimi
  const TAB_SIRA_TUM = ["islemler", "birikim", "arabam", "kredi", "alacaklar", "urun", "cocugum", "altin", "verilen-altin", "vefa", "muhtac"];

  function getTabSira() {
    let u = null;
    try { u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null; } catch (e) { u = null; }
    if (typeof HK_ERISIM !== "undefined" && u) return HK_ERISIM.izinliSekmeler(u);
    return TAB_SIRA_TUM.slice();
  }

  function modulIzinli(tabId) {
    let u = null;
    try { u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null; } catch (e) { u = null; }
    if (typeof HK_ERISIM === "undefined" || !u) return true;
    return HK_ERISIM.modulErisilebilir(tabId, u);
  }

  async function modulleriBaslat(u, opt) {
    opt = opt || {};
    if (modulIzinli("islemler")) {
      if (!opt.atlaIslemler && typeof IslemlerModule !== "undefined") await IslemlerModule.init();
      if (typeof ButceModule !== "undefined") {
        if (opt.atlaIslemler && typeof ButceModule.yukle === "function") await ButceModule.yukle();
        else if (!opt.atlaIslemler) await ButceModule.init();
      }
    }
    var jobs = [];
    if (modulIzinli("birikim") && typeof BirikimModule !== "undefined") jobs.push(BirikimModule.init());
    if (modulIzinli("kredi") && typeof KrediModule !== "undefined") jobs.push(KrediModule.init());
    if (modulIzinli("alacaklar") && typeof AlacaklarModule !== "undefined") jobs.push(AlacaklarModule.init());
    if (modulIzinli("urun") && typeof UrunModule !== "undefined") jobs.push(UrunModule.init());
    if (modulIzinli("cocugum") && typeof CocugumModule !== "undefined") jobs.push(CocugumModule.init());
    if (modulIzinli("altin") && typeof AltinModule !== "undefined") jobs.push(AltinModule.init());
    if (modulIzinli("vefa") && typeof VefaModule !== "undefined") jobs.push(VefaModule.init());
    if (modulIzinli("arabam") && typeof ArabamModule !== "undefined") jobs.push(ArabamModule.init());
    if (modulIzinli("muhtac") && typeof MuhtacModule !== "undefined") jobs.push(MuhtacModule.init());
    if (modulIzinli("verilen-altin") && typeof VerilenAltinlarModule !== "undefined") jobs.push(VerilenAltinlarModule.init());
    if (jobs.length) await Promise.all(jobs);
  }

  const tabBtnler = document.querySelectorAll(".tab-btn");
  const tabPaneller = document.querySelectorAll(".tab-panel");

  function tabSec(tabId) {
    tabBtnler.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
    tabPaneller.forEach(panel => panel.classList.toggle("active", panel.id === "tab-" + tabId));
  }

  function modulAc(tabId) {
    if (!modulIzinli(tabId)) return;
    if (tabId === "islemler") {
      if (typeof IslemlerModule !== "undefined") IslemlerModule.init();
      if (typeof ButceModule !== "undefined" && typeof ButceModule.goster === "function") {
        ButceModule.goster();
      } else if (typeof ButceModule !== "undefined") {
        ButceModule.init();
      }
    }
    if (tabId === "birikim" && typeof BirikimModule !== "undefined") BirikimModule.init();
    if (tabId === "kredi" && typeof KrediModule !== "undefined") KrediModule.init();
    if (tabId === "alacaklar" && typeof AlacaklarModule !== "undefined") AlacaklarModule.init();
    if (tabId === "urun" && typeof UrunModule !== "undefined") UrunModule.init();
    if (tabId === "cocugum" && typeof CocugumModule !== "undefined") CocugumModule.init();
    if (tabId === "altin" && typeof AltinModule !== "undefined") AltinModule.init();
    if (tabId === "vefa" && typeof VefaModule !== "undefined") VefaModule.init();
    if (tabId === "arabam" && typeof ArabamModule !== "undefined") ArabamModule.init();
    if (tabId === "muhtac" && typeof MuhtacModule !== "undefined") MuhtacModule.init();
    if (tabId === "verilen-altin" && typeof VerilenAltinlarModule !== "undefined") VerilenAltinlarModule.init();
  }

  function aktifTabId() {
    const a = document.querySelector(".tab-btn.active:not(.hidden)");
    return a && a.dataset.tab ? a.dataset.tab : getTabSira()[0];
  }

  function tabKaydir(adim) {
    const sira = getTabSira();
    const i = sira.indexOf(aktifTabId());
    if (i < 0) return;
    const yeni = sira[(i + adim + sira.length) % sira.length];
    tabSec(yeni);
    modulAc(yeni);
    const b = document.querySelector('.tab-btn[data-tab="' + yeni + '"]');
    if (b && b.scrollIntoView) b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  tabBtnler.forEach(btn => btn.addEventListener("click", () => {
    if (!modulIzinli(btn.dataset.tab)) return;
    tabSec(btn.dataset.tab);
    modulAc(btn.dataset.tab);
  }));

  /* Mobil: ana içerikte yatay kaydır — sola = sonraki modül, sağa = önceki */
  (function tabSwipeBagla() {
    const mainEl = document.querySelector("main.content");
    if (!mainEl) return;
    let sx, sy, swipeOk = false, scrollKutu = null, startScrollLeft = 0;

    function yatayKaydiriciBul(el) {
      while (el && el !== mainEl && el !== document.body) {
        if (el.scrollWidth > el.clientWidth + 2) {
          var st = window.getComputedStyle(el);
          var ox = st.overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "overlay") return el;
        }
        el = el.parentElement;
      }
      return null;
    }

    function swipeSifirla() {
      sx = sy = undefined;
      swipeOk = false;
      scrollKutu = null;
      startScrollLeft = 0;
    }

    mainEl.addEventListener("touchstart", e => {
      swipeSifirla();
      if (e.touches.length !== 1) return;
      const el = e.target;
      if (el && el.closest && el.closest("input, textarea, select, button, a, label")) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      scrollKutu = yatayKaydiriciBul(el);
      startScrollLeft = scrollKutu ? scrollKutu.scrollLeft : 0;
      swipeOk = true;
    }, { passive: true });
    mainEl.addEventListener("touchcancel", () => { swipeSifirla(); }, { passive: true });
    mainEl.addEventListener("touchend", e => {
      if (!swipeOk || sx === undefined) { swipeSifirla(); return; }
      const ls = document.getElementById("lock-screen");
      if (ls && !ls.classList.contains("hidden")) { swipeSifirla(); return; }
      if (document.querySelector(".modal-overlay:not(.hidden), .bk-modal-overlay:not(.hidden), .hk-tanitim-overlay:not(.hidden)")) { swipeSifirla(); return; }
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const kutu = scrollKutu;
      const basScroll = startScrollLeft;
      swipeSifirla();
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax < 56) return;
      if (ay > ax * 0.78) return;
      /* Verilen Altın / Altın tablosu: önce yatay kaydır, kenara gelince sekme değişsin */
      if (kutu) {
        if (Math.abs(kutu.scrollLeft - basScroll) > 6) return;
        var maxS = kutu.scrollWidth - kutu.clientWidth;
        if (dx < 0 && kutu.scrollLeft < maxS - 4) return;
        if (dx > 0 && kutu.scrollLeft > 4) return;
      }
      if (dx < 0) tabKaydir(1);
      else tabKaydir(-1);
    }, { passive: true });
  })();

  /* Mobil: asagi cekince guncelleme + yeni ozellikler + veri senkronu */
  (function hkPullRefreshBagla() {
    if (!hkMobilMi()) return;

    var ESik = 62;
    var MAX_CEK = 120;
    var MIN_ARALIK = 5000;
    var ptr = document.getElementById("hk-ptr");
    var ptrMetin = document.getElementById("hk-ptr-metin");
    var sx, sy, cekiyor = false, cekMesafe = 0, yenileniyor = false, sonYenile = 0;
    /* Islemler listesi alta yasli: en alttan asagi-cek ile yenile */
    var ptrAltKenar = false;
    var ptrSerit = false;

    function engelliMi() {
      if (yenileniyor) return true;
      var ls = document.getElementById("lock-screen");
      if (ls && !ls.classList.contains("hidden")) return true;
      var app = document.getElementById("app");
      if (!app || app.classList.contains("hidden")) return true;
      if (document.querySelector(".modal-overlay:not(.hidden), .bk-modal-overlay:not(.hidden), .hk-tanitim-overlay:not(.hidden)")) return true;
      var ayarMenu = document.getElementById("hk-ayar-menu");
      if (ayarMenu && !ayarMenu.classList.contains("hidden")) return true;
      return false;
    }

    /** display:none panellerde clientHeight=0 ama scrollHeight/scrollTop kalabilir — sadece gorunen kaydiricilar */
    function gorunurKaydiriciMi(el) {
      if (!el || !el.getClientRects || !el.getClientRects().length) return false;
      var st = window.getComputedStyle(el);
      var oy = st.overflowY;
      if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") return false;
      return el.scrollHeight > el.clientHeight + 1;
    }

    function kaydirmaKutusu(el) {
      while (el && el !== document.body) {
        if (gorunurKaydiriciMi(el)) return el;
        el = el.parentElement;
      }
      return null;
    }

    function islemListesiMi(el) {
      return !!(el && (el.id === "islem-list" || (el.classList && el.classList.contains("islem-scroll"))));
    }

    function enAlttaMi(kutu) {
      if (!kutu) return false;
      var max = kutu.scrollHeight - kutu.clientHeight;
      return max > 2 && kutu.scrollTop >= max - 4;
    }

    /** Ust sabit serit (filtre/ozet/nav): liste kaydirilmis olsa da PTR */
    function ptrSeritMi(el) {
      return !!(el && el.closest && el.closest(
        "#tab-islemler .islemler-mobil-nav, #tab-islemler .islemler-sol-head, #tab-islemler .islemler-sol > .filtre-bar"
      ));
    }

    /** true = asagi-cek yenilemeye izin ver */
    function kaydirmaUstteMi(el) {
      if (ptrSeritMi(el)) return true;
      var kutu = kaydirmaKutusu(el);
      if (!kutu) return true;
      if (kutu.scrollTop <= 1) return true;
      /* Islemler: yeni kayitlar altta — en alttan da yenilemeye izin */
      if (islemListesiMi(kutu) && enAlttaMi(kutu)) return true;
      return false;
    }

    function ptrGuncelle(mesafe, durum) {
      if (!ptr) return;
      ptr.classList.remove("hidden", "hk-ptr-loading", "hk-ptr-ready");
      ptr.setAttribute("aria-hidden", "false");
      ptr.style.opacity = String(Math.min(1, Math.max(0.35, mesafe / ESik)));
      ptr.style.setProperty("--hk-ptr-offset", Math.min(mesafe, MAX_CEK) + "px");
      if (durum === "loading") {
        ptr.classList.add("hk-ptr-loading");
        if (ptrMetin) ptrMetin.textContent = "Guncelleme cekiliyor\u2026";
      } else if (durum === "ready") {
        ptr.classList.add("hk-ptr-ready");
        if (ptrMetin) ptrMetin.textContent = "Birak, guncellensin";
      } else if (ptrMetin) {
        ptrMetin.textContent = "Asagi cek, guncelle";
      }
    }

    function ptrSifirla() {
      if (!ptr) return;
      ptr.classList.add("hidden");
      ptr.classList.remove("hk-ptr-loading", "hk-ptr-ready");
      ptr.setAttribute("aria-hidden", "true");
      ptr.style.opacity = "";
      ptr.style.removeProperty("--hk-ptr-offset");
    }

    function dokunusBitir() {
      sx = sy = undefined;
      cekiyor = false;
      cekMesafe = 0;
      ptrAltKenar = false;
      ptrSerit = false;
    }

    document.addEventListener("touchstart", function (e) {
      if (engelliMi() || e.touches.length !== 1) return;
      var hedef = e.target;
      if (hedef && hedef.closest && hedef.closest("input, textarea, select, button, a, label, .bt-drag-handle, .hk-ayar-wrap")) return;
      ptrAltKenar = false;
      ptrSerit = ptrSeritMi(hedef);
      if (!ptrSerit) {
        var kutu = kaydirmaKutusu(hedef);
        if (islemListesiMi(kutu) && enAlttaMi(kutu)) ptrAltKenar = true;
        else if (!kaydirmaUstteMi(hedef)) return;
      }
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      cekiyor = false;
      cekMesafe = 0;
    }, { passive: true });

    document.addEventListener("touchmove", function (e) {
      if (sy === undefined || engelliMi()) return;
      var dx = e.touches[0].clientX - sx;
      var dy = e.touches[0].clientY - sy;

      /* En alttan yukari kaydirma = eski kayitlara bak; PTR iptal */
      if (ptrAltKenar && dy <= 0) {
        dokunusBitir();
        ptrSifirla();
        return;
      }

      /* Serit disinda, ortada kaydirirken PTR kapansin */
      if (!ptrSerit && !ptrAltKenar && !kaydirmaUstteMi(e.target)) {
        dokunusBitir();
        ptrSifirla();
        return;
      }

      /* Parmak yukari / ters hareket = native scroll; PTR iptal */
      if (dy <= 0) {
        if (cekiyor) {
          dokunusBitir();
          ptrSifirla();
        }
        return;
      }
      if (!cekiyor && Math.abs(dx) > Math.abs(dy) * 0.85) return;

      /*
       * Alt kenarda: erken preventDefault — yoksa scrollTop dusup PTR iptal olur.
       * Seritte / listenin en ustunde: onceki esiklerle ayni.
       */
      var esik = (ptrAltKenar || ptrSerit) ? 12 : 22;
      if (dy < esik) {
        if (ptrAltKenar && dy > 6 && e.cancelable) e.preventDefault();
        return;
      }
      cekiyor = true;
      cekMesafe = Math.min((dy - (esik - 8)) * 0.42, MAX_CEK);
      ptrGuncelle(cekMesafe, cekMesafe >= ESik ? "ready" : "idle");
      if ((cekMesafe > 12 || ptrAltKenar || ptrSerit) && e.cancelable) e.preventDefault();
    }, { passive: false });

    async function cekBitir() {
      if (!cekiyor) {
        dokunusBitir();
        ptrSifirla();
        return;
      }
      var tetik = cekMesafe >= ESik;
      dokunusBitir();
      if (!tetik) {
        ptrSifirla();
        return;
      }
      var now = Date.now();
      if (now - sonYenile < MIN_ARALIK) {
        ptrSifirla();
        return;
      }
      sonYenile = now;
      yenileniyor = true;
      ptrGuncelle(ESik, "loading");
      try {
        if (typeof window.hkGuncelleVeYenidenYukle === "function") {
          await window.hkGuncelleVeYenidenYukle();
        } else if (typeof window.sayfaYenile === "function") {
          await window.sayfaYenile();
          location.reload();
        } else {
          location.reload();
        }
      } catch (ePtr) {
        try { location.reload(); } catch (eRl) {}
      }
      yenileniyor = false;
      ptrSifirla();
    }

    document.addEventListener("touchend", function () { cekBitir(); }, { passive: true });
    document.addEventListener("touchcancel", function () { cekBitir(); }, { passive: true });
  })();

  // Animasyonlar
  const style = document.createElement("style");
  style.textContent = `
    @keyframes shake {
      0%,100%{ transform: translateX(0); }
      20%{ transform: translateX(-8px); }
      40%{ transform: translateX(8px); }
      60%{ transform: translateX(-6px); }
      80%{ transform: translateX(6px); }
    }
    @keyframes fade-out { to { opacity: 0; transform: scale(0.97); } }
    .sync-durum { font-size: 13px; color: var(--text-muted); padding: 0 6px; }
  `;
  document.head.appendChild(style);

  /** Mobil Safari / BFCache ve uygulamaya donuste veri tazele (sik gecislerde gereksiz yuk yok). */
  (function hkMobilBulutYenileBagla() {
    if (!hkMobilMi()) return;
    var bek = null;
    var sonYenile = 0;
    var minAralikMs = 45 * 1000;
    function istekCevir() {
      clearTimeout(bek);
      bek = setTimeout(function() {
        try {
          var now = Date.now();
          if (now - sonYenile < minAralikMs) return;
          var u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
          if (!u || u.isAnonymous) return;
          var katModal = document.getElementById("modal-kat-duzenle");
          var katYonet = document.getElementById("modal-kategori");
          var krModal = document.getElementById("kr-modal");
          if (katModal && !katModal.classList.contains("hidden")) return;
          if (katYonet && !katYonet.classList.contains("hidden")) return;
          if (krModal && !krModal.classList.contains("hidden")) return;
          sonYenile = now;
          if (typeof window.sayfaYenile === "function") window.sayfaYenile();
        } catch (eSy) {}
      }, 400);
    }
    window.addEventListener(
      "pageshow",
      function(ev) {
        try {
          if (ev && ev.persisted) istekCevir();
        } catch (ePs) {}
      },
      false
    );
    document.addEventListener("visibilitychange", function() {
      try {
        if (document.visibilityState === "visible") istekCevir();
      } catch (eVc) {}
    }, false);
  })();
})();
