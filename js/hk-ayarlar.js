(function () {
  "use strict";

  function avatarUrl(u) {
    if (!u) return "icons/icon-256.png?v=20260209desk";
    if (u.photoURL) return u.photoURL;
    if (u.email) {
      return "https://unavatar.io/" + encodeURIComponent(u.email.trim().toLowerCase()) + "?fallback=false";
    }
    return "icons/icon-256.png?v=20260209desk";
  }

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
    img.onerror = function () {
      img.onerror = null;
      img.src = initialsAvatar(u);
    };
    img.src = avatarUrl(u);
    img.alt = (u && u.email) ? u.email : "Profil";
  }

  function menuAcikMi() {
    var m = document.getElementById("hk-ayar-menu");
    return m && !m.classList.contains("hidden");
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
    var acik = document.documentElement.classList.contains("theme-light");
    el.textContent = acik ? "Koyu tema" : "Acik tema";
  }

  var HK_AYARLAR = {
    guncelle: function (u) {
      if (!u || u.isAnonymous) return;
      var wrap = document.getElementById("hk-ayar-wrap");
      if (wrap) wrap.classList.remove("hidden");
      setAvatarImg(document.getElementById("hk-ayar-avatar"), u);
      setAvatarImg(document.getElementById("hk-ayar-menu-avatar"), u);
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
    var oneriLink = document.getElementById("hk-ayar-oneri");
    var cikisBtn = document.getElementById("hk-ayar-cikis");

    if (trigger && !trigger._bound) {
      trigger._bound = true;
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        menuToggle();
      });
    }

    document.addEventListener("click", function (e) {
      if (!menuAcikMi()) return;
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
        else temaMetinGuncelle();
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

    if (oneriLink && !oneriLink._bound) {
      oneriLink._bound = true;
      oneriLink.addEventListener("click", function () {
        menuKapat();
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
