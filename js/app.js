(async () => {

  // 1. Firebase baslat (hata olsa bile devam et)
  try { if (typeof fbInit !== "undefined") fbInit(); } catch(e) {}

  // 2. IndexedDB baslat
  await initApp();

  // SIFRE KILIDI
  const lockScreen = document.getElementById("lock-screen");
  const appEl = document.getElementById("app");
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
    document.getElementById("pin-error").textContent = "";
  }

  async function pinKontrol() {
    const kayitliSifre = await AyarlarDB.get("sifre");
    if (pinGiris === kayitliSifre) {
      lockScreen.style.animation = "fade-out 0.3s ease forwards";
      setTimeout(async () => {
        lockScreen.classList.add("hidden");
        appEl.classList.remove("hidden");
        // 3. Firebase sync — uygulama actiktan sonra arka planda
        const syncEl = document.getElementById("sync-durum");
        if (syncEl) syncEl.textContent = "☁";
        try {
          if (typeof fbVerileriYukle !== "undefined") {
            const yuklendi = await fbVerileriYukle();
            if (yuklendi) {
              await IslemlerModule.init();
            }
          }
          if (syncEl) syncEl.textContent = "✓";
        } catch(e) {
          if (syncEl) syncEl.textContent = "";
          console.warn("Firebase sync:", e.message);
        }
      }, 280);
    } else {
      document.getElementById("pin-error").textContent = "Hatali sifre!";
      const pinDisp = document.querySelector(".pin-display");
      pinDisp.style.animation = "shake 0.4s ease";
      setTimeout(() => { pinDisp.style.animation = ""; pinTemizle(); }, 400);
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

  document.getElementById("pin-del").addEventListener("click", () => {
    if (pinGiris.length > 0) {
      pinGiris = pinGiris.slice(0, -1);
      pinGoster();
      document.getElementById("pin-error").textContent = "";
    }
  });

  document.addEventListener("keydown", async (e) => {
    if (!lockScreen.classList.contains("hidden")) {
      if (e.key >= "0" && e.key <= "9" && pinGiris.length < MAX_PIN) {
        pinGiris += e.key; pinGoster();
        if (pinGiris.length === MAX_PIN) setTimeout(pinKontrol, 100);
      } else if (e.key === "Backspace") {
        pinGiris = pinGiris.slice(0, -1); pinGoster();
        document.getElementById("pin-error").textContent = "";
      }
    }
  });

  document.getElementById("lock-btn").addEventListener("click", () => {
    appEl.classList.add("hidden");
    lockScreen.classList.remove("hidden");
    lockScreen.style.animation = "";
    pinTemizle();
  });

  // SEKME YONETIMI
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
  }));

  // MODULLERI BASLAT
  await IslemlerModule.init();
  if (typeof ButceModule !== "undefined") ButceModule.init();
  if (typeof BirikimModule !== "undefined") BirikimModule.init();

  // ANIMASYONLAR
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
    .sync-durum { font-size: 13px; color: var(--text-muted); padding: 0 6px; transition: color 0.3s; }
    .sync-durum.ok { color: var(--green); }
  `;
  document.head.appendChild(style);

  // SERVICE WORKER
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("/hesap-kitap/sw.js"); }
    catch (err) { console.warn("SW hatasi:", err); }
  }

})();
