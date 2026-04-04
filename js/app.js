(async () => {
  // Firebase + IndexedDB baslat
  try { if (typeof fbInit !== "undefined") fbInit(); } catch(e) {}
  await initApp();

  const lockScreen = document.getElementById("lock-screen");
  const appEl = document.getElementById("app");

  // Uygulamayi ac — Firebase'den taze veri cek, modulleri baslat
  async function uygulamaAc() {
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
  };

  // Session varsa sifre sorma
  if (sessionStorage.getItem("girisYapildi") === "1") {
    await uygulamaAc();
  }

  // PIN kilidi
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
      if (pinGiris.length >= MAX_PIN) return;
      pinGiris += btn.dataset.n;
      pinGoster();
      if (pinGiris.length === MAX_PIN) setTimeout(pinKontrol, 100);
    });
  });

  const delBtn = document.getElementById("pin-del");
  if (delBtn) delBtn.addEventListener("click", () => {
    if (pinGiris.length > 0) {
      pinGiris = pinGiris.slice(0, -1);
      pinGoster();
      const err = document.getElementById("pin-error");
      if (err) err.textContent = "";
    }
  });

  document.addEventListener("keydown", async (e) => {
    if (!lockScreen.classList.contains("hidden")) {
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

  // Kilitle butonu
  const lockBtn = document.getElementById("lock-btn");
  if (lockBtn) lockBtn.addEventListener("click", () => {
    sessionStorage.removeItem("girisYapildi");
    appEl.classList.add("hidden");
    lockScreen.classList.remove("hidden");
    lockScreen.style.animation = "";
    pinTemizle();
  });

  // Sekme yonetimi
  const tabBtnler = document.querySelectorAll(".tab-btn");
  const tabPaneller = document.querySelectorAll(".tab-panel");

  function tabSec(tabId) {
    tabBtnler.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
    tabPaneller.forEach(panel => panel.classList.toggle("active", panel.id === "tab-" + tabId));
  }

  tabBtnler.forEach(btn => btn.addEventListener("click", () => {
    tabSec(btn.dataset.tab);
    if (btn.dataset.tab === "butce" && typeof ButceModule !== "undefined") ButceModule.init();
    if (btn.dataset.tab === "birikim" && typeof BirikimModule !== "undefined") BirikimModule.init();
    if (btn.dataset.tab === "kredi" && typeof KrediModule !== "undefined") KrediModule.init();
    if (btn.dataset.tab === "alacaklar" && typeof AlacaklarModule !== "undefined") AlacaklarModule.init();
    if (btn.dataset.tab === "urun" && typeof UrunModule !== "undefined") UrunModule.init();
    if (btn.dataset.tab === "altin" && typeof AltinModule !== "undefined") AltinModule.init();
    if (btn.dataset.tab === "vefa" && typeof VefaModule !== "undefined") VefaModule.init();
    if (btn.dataset.tab === "muhtac" && typeof MuhtacModule !== "undefined") MuhtacModule.init();
  }));

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
      const reg = await navigator.serviceWorker.register("/hesap-kitap/sw.js");
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
