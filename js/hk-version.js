/* Uygulama sürümü: major.minor — minor 0..99, sonra major artar (1.99 → 2.0) */
(function (global) {
  var VERSION = { major: 1, minor: 2 };

  function formatVersion(v) {
    var maj = Math.max(0, parseInt(v.major, 10) || 0);
    var min = Math.max(0, parseInt(v.minor, 10) || 0);
    if (min > 99) {
      maj += Math.floor(min / 100);
      min = min % 100;
    }
    return maj + "." + min;
  }

  function bump(v) {
    var next = { major: v.major, minor: v.minor + 1 };
    if (next.minor > 99) {
      next.major += 1;
      next.minor = 0;
    }
    return next;
  }

  function applyToDom() {
    var el = document.getElementById("app-version");
    if (el) el.textContent = "v" + formatVersion(VERSION);
  }

  global.HK_VERSION = VERSION;
  global.HK_VERSION_STR = formatVersion(VERSION);
  global.hkVersionFormat = formatVersion;
  global.hkVersionBump = function () {
    VERSION = bump(VERSION);
    global.HK_VERSION = VERSION;
    global.HK_VERSION_STR = formatVersion(VERSION);
    applyToDom();
    return global.HK_VERSION_STR;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyToDom);
  } else {
    applyToDom();
  }
})(typeof window !== "undefined" ? window : this);
