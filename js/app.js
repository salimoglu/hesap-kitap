(async () => {
  // Firebase + IndexedDB baslat
  try { if (typeof fbInit !== "undefined") await fbInit(); } catch (e) {}
  await initApp();

  const lockScreen = document.getElementById("lock-screen");
  const appEl = document.getElementById("app");
  const pinBlok = document.getElementById("lock-pin-blok");
  let _kilitKayitModu = false;

  function pinPanelAcik() {
    return pinBlok && !pinBlok.classList.contains("hidden");
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

  function kilitEkraniGuncelle() {
    const authPanel = document.getElementById("lock-auth-panel");
    const baslik = document.getElementById("lock-auth-baslik");
    const aciklama = document.getElementById("lock-auth-aciklama");
    const btnGiris = document.getElementById("lock-btn-giris");
    const btnBagla = document.getElementById("lock-btn-bagla");
    const btnKayit = document.getElementById("lock-btn-kayit");
    const toggleKayit = document.getElementById("lock-toggle-kayit");
    const toggleGiris = document.getElementById("lock-toggle-giris");
    const fbErr = document.getElementById("fb-auth-error");
    if (fbErr) fbErr.textContent = "";
    let u = null;
    try {
      u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
    } catch (e2) { u = null; }

    if (!authPanel || !pinBlok) return;

    if (!u) {
      _kilitKayitModu = false;
      authPanel.classList.remove("hidden");
      pinBlok.classList.add("hidden");
      if (btnBagla) btnBagla.classList.add("hidden");
      if (baslik) baslik.textContent = "Bulut hesabiniz";
      if (aciklama) aciklama.textContent = "E-posta ve sifre ile giris yapin. Yeni hesap icin asagidan kayit olun.";
      if (toggleKayit) toggleKayit.classList.remove("hidden");
      if (toggleGiris) toggleGiris.classList.add("hidden");
      kilitKayitArayuz();
      return;
    }

    if (u.isAnonymous) {
      authPanel.classList.remove("hidden");
      pinBlok.classList.add("hidden");
      if (btnBagla) btnBagla.classList.remove("hidden");
      if (btnGiris) btnGiris.classList.add("hidden");
      if (btnKayit) btnKayit.classList.add("hidden");
      if (toggleKayit) toggleKayit.classList.add("hidden");
      if (toggleGiris) toggleGiris.classList.add("hidden");
      if (baslik) baslik.textContent = "E-posta ekle";
      if (aciklama) aciklama.textContent = "Verileriniz ayni hesapta kalir. E-posta ve sifre belirleyin.";
      return;
    }

    authPanel.classList.add("hidden");
    pinBlok.classList.remove("hidden");
    pinTemizle();
  }

  // Uygulamayi ac — Firebase'den taze veri cek, modulleri baslat
  async function uygulamaAc() {
    let u = null;
    try {
      u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
    } catch (e) { u = null; }
    if (!u || u.isAnonymous) {
      sessionStorage.removeItem("girisYapildi");
      appEl.classList.add("hidden");
      lockScreen.classList.remove("hidden");
      lockScreen.style.animation = "";
      kilitEkraniGuncelle();
      return;
    }

    lockScreen.classList.add("hidden");
    appEl.classList.remove("hidden");
    sessionStorage.setItem("girisYapildi", "1");

    const syncEl = document.getElementById("sync-durum");
    if (syncEl) syncEl.textContent = "\u2601";

    try {
      if (typeof fbVerileriYukle !== "undefined") await fbVerileriYukle();
      if (syncEl) syncEl.textContent = "\u2713";
    } catch(e) {
      if (syncEl) syncEl.textContent = "";
    }

    if (typeof IslemlerModule !== "undefined") await IslemlerModule.init();
    if (typeof ButceModule !== "undefined") ButceModule.init();
    if (typeof KrediModule !== "undefined") KrediModule.init();
    if (typeof AlacaklarModule !== "undefined") AlacaklarModule.init();
    if (typeof UrunModule !== "undefined") UrunModule.init();
    if (typeof BirikimModule !== "undefined") BirikimModule.init();
    if (typeof AltinModule !== "undefined") AltinModule.init();
    if (typeof VefaModule !== "undefined") VefaModule.init();
    if (typeof ArabamModule !== "undefined") ArabamModule.init();
    if (typeof MuhtacModule !== "undefined") MuhtacModule.init();
  }

  // Logo tiklama: Firebase'den taze cek, modulleri yenile, sifre sorma
  window.sayfaYenile = async function() {
    const syncEl = document.getElementById("sync-durum");
    if (syncEl) syncEl.textContent = "\u2601";
    try {
      if (typeof fbVerileriYukle !== "undefined") await fbVerileriYukle();
      if (syncEl) syncEl.textContent = "\u2713";
    } catch(e) {
      if (syncEl) syncEl.textContent = "";
    }
    if (typeof IslemlerModule !== "undefined") await IslemlerModule.init();
    if (typeof ButceModule !== "undefined") ButceModule.init();
    if (typeof KrediModule !== "undefined") KrediModule.init();
    if (typeof AlacaklarModule !== "undefined") AlacaklarModule.init();
    if (typeof UrunModule !== "undefined") UrunModule.init();
    if (typeof BirikimModule !== "undefined") BirikimModule.init();
    if (typeof AltinModule !== "undefined") AltinModule.init();
    if (typeof VefaModule !== "undefined") VefaModule.init();
    if (typeof ArabamModule !== "undefined") ArabamModule.init();
    if (typeof MuhtacModule !== "undefined") MuhtacModule.init();
  };

  if (sessionStorage.getItem("girisYapildi") === "1") {
    let u0 = null;
    try {
      u0 = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
    } catch (e) { u0 = null; }
    if (u0 && !u0.isAnonymous) await uygulamaAc();
    else sessionStorage.removeItem("girisYapildi");
  }
  kilitEkraniGuncelle();

  if (typeof firebase !== "undefined" && firebase.auth) {
    firebase.auth().onAuthStateChanged(function() {
      kilitEkraniGuncelle();
    });
  }
  let pinGiris = "";
  const MAX_PIN = 4;

  function pinGoster() {
    for (let i = 1; i <= MAX_PIN; i++) {
      const dot = document.getElementById("d" + i);
      if (dot) dot.classList.toggle("filled", i <= pinGiris.length);
    }
  }
  function pinTemizle() {
    pinGiris = "";
    pinGoster();
    const err = document.getElementById("pin-error");
    if (err) err.textContent = "";
  }

  async function pinKontrol() {
    let u = null;
    try {
      u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null;
    } catch (e) { u = null; }
    if (!u || u.isAnonymous || !pinPanelAcik()) return;
    const kayitliSifre = await AyarlarDB.get("sifre");
    if (pinGiris === kayitliSifre) {
      lockScreen.style.animation = "fade-out 0.3s ease forwards";
      setTimeout(async () => { await uygulamaAc(); }, 280);
    } else {
      const err = document.getElementById("pin-error");
      if (err) err.textContent = "Hatali sifre!";
      const pinDisp = document.querySelector(".pin-display");
      if (pinDisp) {
        pinDisp.style.animation = "shake 0.4s ease";
        setTimeout(() => { pinDisp.style.animation = ""; pinTemizle(); }, 400);
      }
    }
  }

  document.querySelectorAll(".num-btn[data-n]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!pinPanelAcik()) return;
      if (pinGiris.length >= MAX_PIN) return;
      pinGiris += btn.dataset.n;
      pinGoster();
      if (pinGiris.length === MAX_PIN) setTimeout(pinKontrol, 100);
    });
  });

  const delBtn = document.getElementById("pin-del");
  if (delBtn) delBtn.addEventListener("click", () => {
    if (!pinPanelAcik()) return;
    if (pinGiris.length > 0) {
      pinGiris = pinGiris.slice(0, -1);
      pinGoster();
      const err = document.getElementById("pin-error");
      if (err) err.textContent = "";
    }
  });

  document.addEventListener("keydown", async (e) => {
    if (!lockScreen.classList.contains("hidden") && pinPanelAcik()) {
      if (e.key >= "0" && e.key <= "9" && pinGiris.length < MAX_PIN) {
        pinGiris += e.key; pinGoster();
        if (pinGiris.length === MAX_PIN) setTimeout(pinKontrol, 100);
      } else if (e.key === "Backspace") {
        pinGiris = pinGiris.slice(0, -1); pinGoster();
        const err = document.getElementById("pin-error");
        if (err) err.textContent = "";
      }
    }
  });

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

  // Kilitle butonu
  const lockBtn = document.getElementById("lock-btn");
  if (lockBtn) lockBtn.addEventListener("click", () => {
    sessionStorage.removeItem("girisYapildi");
    appEl.classList.add("hidden");
    lockScreen.classList.remove("hidden");
    lockScreen.style.animation = "";
    pinTemizle();
    kilitEkraniGuncelle();
  });

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
  const lockBtnBagla = document.getElementById("lock-btn-bagla");
  const lockBtnFbCikis = document.getElementById("lock-btn-fb-cikis");
  if (lockBtnGiris) lockBtnGiris.addEventListener("click", () => fbAuthCalistir(fbGirisEmail));
  if (lockBtnKayit) lockBtnKayit.addEventListener("click", () => fbAuthCalistir(fbKayitEmail));
  if (lockBtnBagla) lockBtnBagla.addEventListener("click", () => fbAuthCalistir(fbAnonimiPostayaBagla));
  if (lockBtnFbCikis) {
    lockBtnFbCikis.addEventListener("click", async () => {
      try {
        if (typeof fbCikisBulut === "function") await fbCikisBulut();
      } catch (e) {}
      sessionStorage.removeItem("girisYapildi");
      pinTemizle();
      kilitEkraniGuncelle();
    });
  }
  const lockPinBaska = document.getElementById("lock-pin-baska-hesap");
  if (lockPinBaska) {
    lockPinBaska.addEventListener("click", async () => {
      try {
        if (typeof fbCikisBulut === "function") await fbCikisBulut();
      } catch (e) {}
      sessionStorage.removeItem("girisYapildi");
      pinTemizle();
      _kilitKayitModu = false;
      kilitEkraniGuncelle();
    });
  }

  const lockSifreEl = document.getElementById("lock-sifre");
  if (lockSifreEl) {
    lockSifreEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const baglaBtn = document.getElementById("lock-btn-bagla");
      if (baglaBtn && !baglaBtn.classList.contains("hidden")) {
        fbAuthCalistir(fbAnonimiPostayaBagla);
        return;
      }
      if (_kilitKayitModu) fbAuthCalistir(fbKayitEmail);
      else fbAuthCalistir(fbGirisEmail);
    });
  }

  // Sekme yonetimi
  const TAB_SIRA = ["islemler", "butce", "birikim", "arabam", "kredi", "alacaklar", "urun", "altin", "vefa", "muhtac"];
  const tabBtnler = document.querySelectorAll(".tab-btn");
  const tabPaneller = document.querySelectorAll(".tab-panel");

  function tabSec(tabId) {
    tabBtnler.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
    tabPaneller.forEach(panel => panel.classList.toggle("active", panel.id === "tab-" + tabId));
  }

  function modulAc(tabId) {
    if (tabId === "butce" && typeof ButceModule !== "undefined") ButceModule.init();
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
  }

  function aktifTabId() {
    const a = document.querySelector(".tab-btn.active");
    return a && a.dataset.tab ? a.dataset.tab : TAB_SIRA[0];
  }

  function tabKaydir(adim) {
    const i = TAB_SIRA.indexOf(aktifTabId());
    if (i < 0) return;
    const yeni = TAB_SIRA[(i + adim + TAB_SIRA.length) % TAB_SIRA.length];
    tabSec(yeni);
    modulAc(yeni);
    const b = document.querySelector('.tab-btn[data-tab="' + yeni + '"]');
    if (b && b.scrollIntoView) b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  tabBtnler.forEach(btn => btn.addEventListener("click", () => {
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

  // Service Worker — her zaman en yeni versiyonu al
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("/hesap-kitap/sw.js", { updateViaCache: "none" });
      // Yeni SW gelince hemen aktive et
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
    } catch(err) { console.warn("SW hatasi:", err); }
  }
})();
