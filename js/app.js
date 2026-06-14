(async () => {
  // Firebase + IndexedDB baslat
  try { if (typeof fbInit !== "undefined") await fbInit(); } catch (e) {}
  await initApp();

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
      var ua = navigator.userAgent || "";
      var mobil =
        /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (mobil) {
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

  async function uygulamaAcIc() {
    let u = null;
    try {
      u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
    } catch (e) { u = null; }
    if (!u || u.isAnonymous) return;

    try {
      if (u.reload) await u.reload();
      u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : u;
    } catch (eRel) {}

    try { await hkServiceWorkerKaydet(); } catch (eSw) {}

    const fbErrOk = document.getElementById("fb-auth-error");
    if (fbErrOk) fbErrOk.textContent = "";

    lockScreen.classList.add("hidden");
    appEl.classList.remove("hidden");

    const syncEl = document.getElementById("sync-durum");
    if (syncEl) syncEl.textContent = "\u2601";

    try {
      if (typeof fbRtdbOturumHazir === "function") await fbRtdbOturumHazir();
      if (typeof fbKimlikTokenAl === "function") await fbKimlikTokenAl();
      if (typeof fbAuthEpostalariTopla === "function") await fbAuthEpostalariTopla(u);
      if (typeof fbEnsureUserDataScope === "function") await fbEnsureUserDataScope();
      else if (typeof fbDetectRtdbScope === "function") await fbDetectRtdbScope();
      if (typeof fbVerileriYukle !== "undefined") await fbVerileriYukle();
      if (syncEl) syncEl.textContent = "\u2713";
    } catch(e) {
      if (syncEl) syncEl.textContent = "";
    }

    u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : u;
    if (typeof HK_ERISIM !== "undefined") {
      HK_ERISIM.sekmeleriUygula(u);
      HK_ERISIM.misafirBilgiGoster(u);
    }
    await modulleriBaslat(u);
    var izinli = getTabSira();
    if (izinli.length) modulAc(izinli[0]);
  }

  var _uygulamaAcPromise = null;
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
    const syncEl = document.getElementById("sync-durum");
    if (syncEl) syncEl.textContent = "\u2601";
    try {
      if (typeof fbRtdbOturumHazir === "function") await fbRtdbOturumHazir();
      if (typeof fbKimlikTokenAl === "function") await fbKimlikTokenAl();
      if (typeof fbAuthEpostalariTopla === "function") await fbAuthEpostalariTopla(u);
      if (typeof fbEnsureUserDataScope === "function") await fbEnsureUserDataScope();
      else if (typeof fbDetectRtdbScope === "function") await fbDetectRtdbScope();
      if (typeof fbVerileriYukle !== "undefined") await fbVerileriYukle();
      if (syncEl) syncEl.textContent = "\u2713";
    } catch(e) {
      if (syncEl) syncEl.textContent = "";
    }
    u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : u;
    if (typeof HK_ERISIM !== "undefined") {
      HK_ERISIM.sekmeleriUygula(u);
      HK_ERISIM.misafirBilgiGoster(u);
    }
    await modulleriBaslat(u);
  };

  try {
    const uAn = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
    if (uAn && uAn.isAnonymous && typeof fbCikisBulut === "function") await fbCikisBulut();
  } catch (e) {}

  if (typeof firebase !== "undefined" && firebase.auth) {
    firebase.auth().onAuthStateChanged(async function(user) {
      /**
       * OAuth redirect donusunde: ilk callback bazen null geliyor; getRedirectResult
       * cogu cihazda currentUser'i hemen dolduruyor. Kisa gecikme ile tekrar oku.
       */
      if (!user || user.isAnonymous) {
        var uaCb = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
        var dly = /Android/i.test(uaCb) ? 900 : 400;
        await new Promise(function(r) { setTimeout(r, dly); });
        try {
          var u2 = firebase.auth().currentUser;
          if (u2 && !u2.isAnonymous) user = u2;
        } catch (e) {}
      }
      girisFormuSifirla();
      if (user && !user.isAnonymous) {
        await uygulamaAc();
      } else {
        appEl.classList.add("hidden");
        lockScreen.classList.remove("hidden");
        lockScreen.style.animation = "";
      }
    });
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

  // Kilitle — bulut hesabından çık, giriş ekranına dön
  const lockBtn = document.getElementById("lock-btn");
  if (lockBtn) lockBtn.addEventListener("click", async () => {
    try {
      if (typeof fbCikisBulut === "function") await fbCikisBulut();
    } catch (e) {}
  });

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
  const TAB_SIRA_TUM = ["islemler", "birikim", "arabam", "kredi", "alacaklar", "urun", "altin", "verilen-altin", "vefa", "muhtac"];

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

  async function modulleriBaslat(u) {
    if (modulIzinli("islemler")) {
      if (typeof IslemlerModule !== "undefined") await IslemlerModule.init();
      if (typeof ButceModule !== "undefined") await ButceModule.init();
    }
    if (modulIzinli("birikim") && typeof BirikimModule !== "undefined") await BirikimModule.init();
    if (modulIzinli("kredi") && typeof KrediModule !== "undefined") await KrediModule.init();
    if (modulIzinli("alacaklar") && typeof AlacaklarModule !== "undefined") await AlacaklarModule.init();
    if (modulIzinli("urun") && typeof UrunModule !== "undefined") await UrunModule.init();
    if (modulIzinli("altin") && typeof AltinModule !== "undefined") await AltinModule.init();
    if (modulIzinli("vefa") && typeof VefaModule !== "undefined") await VefaModule.init();
    if (modulIzinli("arabam") && typeof ArabamModule !== "undefined") await ArabamModule.init();
    if (modulIzinli("muhtac") && typeof MuhtacModule !== "undefined") await MuhtacModule.init();
    if (modulIzinli("verilen-altin") && typeof VerilenAltinlarModule !== "undefined") await VerilenAltinlarModule.init();
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
      if (typeof ButceModule !== "undefined") ButceModule.init();
    }
    if (tabId === "birikim" && typeof BirikimModule !== "undefined") BirikimModule.init();
    if (tabId === "kredi" && typeof KrediModule !== "undefined") KrediModule.init();
    if (tabId === "alacaklar" && typeof AlacaklarModule !== "undefined") AlacaklarModule.init();
    if (tabId === "urun" && typeof UrunModule !== "undefined") UrunModule.init();
    if (tabId === "altin" && typeof AltinModule !== "undefined") {
      AltinModule.init();
      if (typeof guncelAltinCek === "function") {
        guncelAltinCek().then(function (f) {
          if (f > 0) {
            if (typeof _guncelGramFiyat !== "undefined") window._guncelGramFiyat = f;
            if (typeof afbFiyatKaydet === "function") afbFiyatKaydet(f);
            var el = document.getElementById("alt-fiyat-val");
            if (el) el.textContent = f.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
            if (typeof arender === "function") arender();
          }
        });
      }
      if (!window._altinBtnReady) {
        window._altinBtnReady = true;
        document.addEventListener("click", async function (e) {
          var t = e.target;
          if (!t || (t.id !== "alt-fiyat-guncelle" && !(t.closest && t.closest("#alt-fiyat-guncelle")))) return;
          var btn2 = document.getElementById("alt-fiyat-guncelle");
          if (!btn2 || btn2._busy) return;
          btn2._busy = true;
          btn2.style.animation = "spin 1s linear infinite";
          btn2.disabled = true;
          if (typeof guncelAltinCek === "function") {
            var f2 = await guncelAltinCek();
            var btn3 = document.getElementById("alt-fiyat-guncelle");
            if (btn3) { btn3.style.animation = ""; btn3.disabled = false; btn3._busy = false; }
            if (f2 > 0) {
              if (typeof _guncelGramFiyat !== "undefined") window._guncelGramFiyat = f2;
              if (typeof afbFiyatKaydet === "function") await afbFiyatKaydet(f2);
              if (typeof arender === "function") arender();
            } else {
              alert("Fiyat alınamadı, lütfen tekrar deneyin.");
            }
          }
        }, true);
      }
    }
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
    let sx, sy, swipeOk = false;
    mainEl.addEventListener("touchstart", e => {
      sx = sy = undefined;
      swipeOk = false;
      if (e.touches.length !== 1) return;
      const el = e.target;
      if (el && el.closest && el.closest("input, textarea, select, button, a, label")) return;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      swipeOk = true;
    }, { passive: true });
    mainEl.addEventListener("touchcancel", () => { sx = sy = undefined; swipeOk = false; }, { passive: true });
    mainEl.addEventListener("touchend", e => {
      if (!swipeOk || sx === undefined) { sx = sy = undefined; return; }
      const ls = document.getElementById("lock-screen");
      if (ls && !ls.classList.contains("hidden")) { sx = sy = undefined; return; }
      if (document.querySelector(".modal-overlay:not(.hidden), .bk-modal-overlay:not(.hidden)")) { sx = sy = undefined; return; }
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      sx = sy = undefined;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax < 56) return;
      if (ay > ax * 0.78) return;
      if (dx < 0) tabKaydir(1);
      else tabKaydir(-1);
    }, { passive: true });
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
    var ua = "";
    try { ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""; } catch (eUa) {}
    var mobil =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!mobil) return;
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
          if (katModal && !katModal.classList.contains("hidden")) return;
          if (katYonet && !katYonet.classList.contains("hidden")) return;
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
