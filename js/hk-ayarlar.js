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
      var vefaBtn = document.getElementById("hk-ayar-vefa");
      if (vefaBtn) {
        var yonetici = false;
        try {
          yonetici = typeof HK_ERISIM !== "undefined" && HK_ERISIM.yoneticiMi(u);
        } catch (eY) { yonetici = false; }
        vefaBtn.classList.toggle("hidden", !yonetici);
      }
    },
    gizle: function () {
      menuKapat();
      var wrap = document.getElementById("hk-ayar-wrap");
      if (wrap) wrap.classList.add("hidden");
    },
    temaMetinGuncelle: temaMetinGuncelle
  };

  function paylasimHata(metin) {
    var el = document.getElementById("hk-vefa-paylas-hata");
    if (el) el.textContent = metin || "";
  }

  function paylasimKacis(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function paylasimListeCiz(liste) {
    var kutu = document.getElementById("hk-vefa-paylas-liste");
    if (!kutu) return;
    if (!liste.length) {
      kutu.innerHTML = '<p class="hk-vefa-paylas-bos">Henüz paylaşılan hesap yok.</p>';
      return;
    }
    kutu.innerHTML = liste.map(function (r) {
      return '<div class="hk-vefa-paylas-kisi"><span class="hk-vefa-paylas-posta">' +
        paylasimKacis(r.email) +
        '</span><button type="button" class="hk-vefa-paylas-sil" data-id="' +
        paylasimKacis(r.id) + '">Kaldır</button></div>';
    }).join("");
    kutu.querySelectorAll(".hk-vefa-paylas-sil").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        paylasimHata("");
        btn.disabled = true;
        try {
          await fbVefaPaylasimSil(btn.getAttribute("data-id"));
          await paylasimYenile();
        } catch (e) {
          btn.disabled = false;
          paylasimHata(paylasimHataMetni(e));
        }
      });
    });
  }

  function paylasimHataMetni(e) {
    var mesaj = e && e.message ? String(e.message) : "";
    if (mesaj === "Kendi e-postanizi eklemeyin") return "Kendi e-postanızı eklemeyin.";
    if (mesaj === "E-posta gecersiz") return "Geçerli bir e-posta yazın.";
    var kod = e && e.code ? String(e.code) : "";
    if (kod.indexOf("PERMISSION_DENIED") >= 0 || mesaj.indexOf("PERMISSION_DENIED") >= 0) {
      return "Kaydedilemedi. Veritabanı kuralları henüz bu paylaşımı açmıyor.";
    }
    return "Kaydedilemedi. Bağlantıyı kontrol edip tekrar deneyin.";
  }

  async function paylasimYenile() {
    var liste = await fbVefaPaylasimListe();
    liste.sort(function (a, b) { return a.email.localeCompare(b.email, "tr"); });
    paylasimListeCiz(liste);
  }

  function vefaPaylasimAc() {
    var modal = document.getElementById("hk-vefa-paylasim-modal");
    if (!modal) return;
    paylasimHata("");
    var inp = document.getElementById("hk-vefa-paylas-eposta");
    if (inp) inp.value = "";
    modal.classList.remove("hidden");
    paylasimYenile().catch(function (e) { paylasimHata(paylasimHataMetni(e)); });
    if (inp) inp.focus();
  }

  function vefaPaylasimKapat() {
    var modal = document.getElementById("hk-vefa-paylasim-modal");
    if (modal) modal.classList.add("hidden");
  }

  function epostaGecerli(s) {
    var t = String(s || "").trim();
    var at = t.indexOf("@");
    return at > 0 && t.indexOf(".", at) > at + 1 && t.indexOf(" ") < 0;
  }

  function vefaPaylasimBagla() {
    var kapat = document.getElementById("hk-vefa-paylas-kapat");
    var ekle = document.getElementById("hk-vefa-paylas-ekle");
    var modal = document.getElementById("hk-vefa-paylasim-modal");
    var inp = document.getElementById("hk-vefa-paylas-eposta");
    if (kapat && !kapat._bound) {
      kapat._bound = true;
      kapat.addEventListener("click", vefaPaylasimKapat);
    }
    if (modal && !modal._bound) {
      modal._bound = true;
      modal.addEventListener("click", function (e) {
        if (e.target === modal) vefaPaylasimKapat();
      });
    }
    async function ekleCalistir() {
      if (!inp || !ekle) return;
      var email = inp.value.trim();
      paylasimHata("");
      if (!epostaGecerli(email)) {
        paylasimHata("Geçerli bir e-posta yazın.");
        inp.focus();
        return;
      }
      ekle.disabled = true;
      try {
        await fbVefaPaylasimEkle(email);
        inp.value = "";
        await paylasimYenile();
      } catch (e) {
        paylasimHata(paylasimHataMetni(e));
      } finally {
        ekle.disabled = false;
      }
    }
    if (ekle && !ekle._bound) {
      ekle._bound = true;
      ekle.addEventListener("click", ekleCalistir);
    }
    if (inp && !inp._bound) {
      inp._bound = true;
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          ekleCalistir();
        }
      });
    }
  }

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
      if (e.key === "Escape") {
        menuKapat();
        vefaPaylasimKapat();
      }
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

    var vefaBtn = document.getElementById("hk-ayar-vefa");
    if (vefaBtn && !vefaBtn._bound) {
      vefaBtn._bound = true;
      vefaBtn.addEventListener("click", function () {
        menuKapat();
        vefaPaylasimAc();
      });
    }
    vefaPaylasimBagla();

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
