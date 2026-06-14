(function () {
  "use strict";

  function initialsAvatar(u) {
    var name = (u && (u.displayName || u.email)) || "?";
    var parts = name.split(/[@\s]+/);
    var init = "";
    if (parts[0]) init += parts[0][0] || "";
    if (parts.length > 1 && parts[1]) init += parts[1][0] || "";
    init = init.toUpperCase().slice(0, 2) || "?";
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
      '<rect fill="#b8862a" width="64" height="64" rx="32"/>' +
      '<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-family="Nunito,sans-serif" font-size="24" font-weight="700">' +
      init +
      "</text></svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function setAvatarImg(img, u) {
    if (!img) return;
    if (u && u.photoURL) {
      img.onerror = function () {
        img.onerror = null;
        img.src = initialsAvatar(u);
      };
      img.src = u.photoURL;
    } else {
      img.onerror = null;
      img.src = initialsAvatar(u);
    }
    img.alt = (u && u.email) ? u.email : "Profil";
  }

  function menuKapat() {
    var m = document.getElementById("hk-ayar-menu");
    var t = document.getElementById("hk-ayar-trigger");
    if (m) m.classList.add("hidden");
    if (t) t.setAttribute("aria-expanded", "false");
  }

  function menuToggle() {
    var m = document.getElementById("hk-ayar-menu");
    var t = document.getElementById("hk-ayar-trigger");
    if (!m || !t) return;
    if (m.classList.contains("hidden")) {
      m.classList.remove("hidden");
      t.setAttribute("aria-expanded", "true");
    } else {
      menuKapat();
    }
  }

  function temaMetinGuncelle() {
    var el = document.getElementById("hk-ayar-tema-metin");
    if (!el) return;
    el.textContent = document.documentElement.classList.contains("theme-light") ? "Koyu tema" : "Acik tema";
  }

  var HK_AYARLAR = {
    guncelle: function (u) {
      if (!u || u.isAnonymous) return;
      var wrap = document.getElementById("hk-ayar-wrap");
      if (wrap) wrap.classList.remove("hidden");
      setAvatarImg(document.getElementById("hk-ayar-avatar"), u);
      var emailEl = document.getElementById("hk-ayar-email");
      if (emailEl) emailEl.textContent = u.email || u.displayName || "";
      temaMetinGuncelle();
    },
    gizle: function () {
      menuKapat();
      var wrap = document.getElementById("hk-ayar-wrap");
      if (wrap) wrap.classList.add("hidden");
    },
    temaMetinGuncelle: temaMetinGuncelle
  };

  function bagla() {
    var trigger = document.getElementById("hk-ayar-trigger");
    var temaBtn = document.getElementById("hk-ayar-tema");
    var tanitimBtn = document.getElementById("hk-ayar-tanitim");
    var cikisBtn = document.getElementById("hk-ayar-cikis");

    if (trigger && !trigger._bound) {
      trigger._bound = true;
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        menuToggle();
      });
    }

    document.addEventListener("click", function (e) {
      var m = document.getElementById("hk-ayar-menu");
      if (!m || m.classList.contains("hidden")) return;
      var wrap = document.getElementById("hk-ayar-wrap");
      if (wrap && !wrap.contains(e.target)) menuKapat();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") menuKapat();
    });

    if (temaBtn && !temaBtn._bound) {
      temaBtn._bound = true;
      temaBtn.addEventListener("click", function () {
        if (typeof window.hkTemaToggle === "function") window.hkTemaToggle();
      });
    }

    if (tanitimBtn && !tanitimBtn._bound) {
      tanitimBtn._bound = true;
      tanitimBtn.addEventListener("click", function () {
        menuKapat();
        var u = null;
        try { u = typeof fbMevcutKullanici === "function" ? fbMevcutKullanici() : null; } catch (e) { u = null; }
        if (!u || u.isAnonymous) return;
        if (typeof HK_TANITIM !== "undefined") HK_TANITIM.goster(u, true);
      });
    }

    if (cikisBtn && !cikisBtn._bound) {
      cikisBtn._bound = true;
      cikisBtn.addEventListener("click", async function () {
        menuKapat();
        try {
          if (typeof fbCikisBulut === "function") await fbCikisBulut();
        } catch (e) {}
      });
    }

    temaMetinGuncelle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bagla);
  } else {
    bagla();
  }

  window.HK_AYARLAR = HK_AYARLAR;
})();
