"use strict";
/**
 * Uygulama / PWA ikonlari — krem zemin seffaflastirma + dis siyah cerceve (koyu piksel) ile yaricap.
 * PowerShell/Drawing ile renk bozulmasi olabiliyor; Jimp ile RGBA korunur.
 */
const path = require("path");
const fs = require("fs/promises");
const { Jimp } = require("jimp");

const REPO_ROOT = path.join(__dirname, "..");
const SOURCE = path.join(REPO_ROOT, "icons", "logo-source-hesap-kitap.png");
const ICONS_DIR = path.join(REPO_ROOT, "icons");

const BACKDROP_TOL = 68;
const ALPHA_GATE = 20;
/** Dis cerceve: saf siyah + AA gri (bej disari) */
const LUM_MAX_BORDER = 108;
const FEATHER = 0.85;
/** Flood-fill: siyah cizgiyi gecmez (bej disi silinir) */
const LUM_INK_BLOCK = 125;

function cornerAvg(img, x0, y0, sz) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const d = img.bitmap.data;
  let tr = 0, tg = 0, tb = 0, n = 0;
  for (let y = y0; y < Math.min(y0 + sz, h); y++) {
    for (let x = x0; x < Math.min(x0 + sz, w); x++) {
      const i = (y * w + x) << 2;
      tr += d[i];
      tg += d[i + 1];
      tb += d[i + 2];
      n++;
    }
  }
  return n ? { r: (tr / n) | 0, g: (tg / n) | 0, b: (tb / n) | 0 } : { r: 245, g: 240, b: 230 };
}

function manhattan(r, g, b, c) {
  return Math.abs(r - c.r) + Math.abs(g - c.g) + Math.abs(b - c.b);
}

/**
 * Sadece kenara bagli krem/beyaz zemin: icteki krem alan cerceve ile ayrildigi icin korunur.
 */
function floodClearOutside(img) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const d = img.bitmap.data;
  const sz = Math.max(8, Math.floor(Math.min(w, h) / 10));
  const corner = cornerAvg(img, 0, 0, sz);
  const visited = new Uint8Array(w * h);
  const qx = [];
  const qy = [];

  function isInkAt(i) {
    if (d[i + 3] < 24) return false;
    return lum(d[i], d[i + 1], d[i + 2]) < LUM_INK_BLOCK;
  }

  function isCreamLike(i) {
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    if (d[i + 3] < 20) return false;
    return manhattan(r, g, b, corner) < BACKDROP_TOL || lum(r, g, b) > 210;
  }

  function tryEnqueue(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const id = y * w + x;
    if (visited[id]) return;
    const i = id << 2;
    if (isInkAt(i)) return;
    if (!isCreamLike(i)) return;
    visited[id] = 1;
    qx.push(x);
    qy.push(y);
  }

  for (let x = 0; x < w; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryEnqueue(0, y);
    tryEnqueue(w - 1, y);
  }

  let head = 0;
  while (head < qx.length) {
    const x = qx[head];
    const y = qy[head];
    head++;
    const i = (y * w + x) << 2;
    d[i + 3] = 0;
    tryEnqueue(x + 1, y);
    tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1);
    tryEnqueue(x, y - 1);
  }
}

function lum(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isBorderPixel(d, i, alphaGate, lumMax) {
  if (d[i + 3] <= alphaGate) return false;
  return lum(d[i], d[i + 1], d[i + 2]) <= lumMax;
}

function pixelIndex(img, xi, yi) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  if (xi < 0 || xi >= w || yi < 0 || yi >= h) return -1;
  return (yi * w + xi) << 2;
}

function measureOuter(img, cx, cy, alphaGate, lumMax) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const d = img.bitmap.data;
  const Rmax = Math.ceil(Math.hypot(w / 2, h / 2)) + 6;
  const radii = [];
  for (let deg = 0; deg < 360; deg++) {
    const rad = (deg * Math.PI) / 180;
    const co = Math.cos(rad);
    const si = Math.sin(rad);
    let hit = false;
    for (let step = 0; step <= Rmax * 2; step++) {
      const r = Rmax - step * 0.5;
      if (r < 0) break;
      const xi = Math.round(cx + r * co);
      const yi = Math.round(cy + r * si);
      const idx = pixelIndex(img, xi, yi);
      if (idx < 0) continue;
      if (isBorderPixel(d, idx, alphaGate, lumMax)) {
        radii.push(r);
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (let step = 0; step <= Rmax * 2; step++) {
        const r = Rmax - step * 0.5;
        if (r < 0) break;
        const xi = Math.round(cx + r * co);
        const yi = Math.round(cy + r * si);
        const idx = pixelIndex(img, xi, yi);
        if (idx < 0) continue;
        if (d[idx + 3] > alphaGate) {
          radii.push(r);
          break;
        }
      }
    }
  }
  if (!radii.length) return (Math.min(w, h) / 2) * 0.48;
  radii.sort((a, b) => a - b);
  const n = radii.length;
  const mid = Math.floor(n / 2);
  return n % 2 ? radii[mid] : (radii[mid - 1] + radii[mid]) / 2;
}

function centerFromRays(img, cx0, cy0, alphaGate, lumMax, rGuess) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const d = img.bitmap.data;
  const Rmax = Math.max(rGuess + 8, Math.ceil(Math.hypot(w / 2, h / 2)) + 6);
  let sx = 0, sy = 0, cnt = 0;
  for (let deg = 0; deg < 360; deg++) {
    const rad = (deg * Math.PI) / 180;
    const co = Math.cos(rad);
    const si = Math.sin(rad);
    let got = false;
    for (let step = 0; step <= Rmax * 2; step++) {
      const r = Rmax - step * 0.5;
      if (r < 0) break;
      const xi = Math.round(cx0 + r * co);
      const yi = Math.round(cy0 + r * si);
      const idx = pixelIndex(img, xi, yi);
      if (idx < 0) continue;
      if (isBorderPixel(d, idx, alphaGate, lumMax)) {
        sx += xi;
        sy += yi;
        cnt++;
        got = true;
        break;
      }
    }
    if (!got) {
      for (let step = 0; step <= Rmax * 2; step++) {
        const r = Rmax - step * 0.5;
        if (r < 0) break;
        const xi = Math.round(cx0 + r * co);
        const yi = Math.round(cy0 + r * si);
        const idx = pixelIndex(img, xi, yi);
        if (idx < 0) continue;
        if (d[idx + 3] > alphaGate) {
          sx += xi;
          sy += yi;
          cnt++;
          break;
        }
      }
    }
  }
  if (!cnt) return { cx: cx0, cy: cy0 };
  return { cx: sx / cnt, cy: sy / cnt };
}

function applyCircle(img, cx, cy, R, feather) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const d = img.bitmap.data;
  const rIn = R - feather;
  const rOut = R + feather;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) << 2;
      const a = d[i + 3];
      if (!a) continue;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist >= rOut) d[i + 3] = 0;
      else if (dist > rIn) {
        const t = Math.max(0, Math.min(1, (rOut - dist) / (2 * feather)));
        d[i + 3] = Math.round(a * t);
      }
    }
  }
}

function alphaBbox(img) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const d = img.bitmap.data;
  let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) << 2;
      if (d[i + 3] > 12) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return { x: 0, y: 0, bw: w, bh: h };
  return { x: minX, y: minY, bw: maxX - minX + 1, bh: maxY - minY + 1 };
}

function squareCrop(img, box) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  let side = Math.max(box.bw, box.bh);
  let x0 = Math.floor(box.x + box.bw / 2 - side / 2);
  let y0 = Math.floor(box.y + box.bh / 2 - side / 2);
  if (x0 < 0) x0 = 0;
  if (y0 < 0) y0 = 0;
  if (x0 + side > w) x0 = w - side;
  if (y0 + side > h) y0 = h - side;
  if (side > w || side > h || x0 < 0 || y0 < 0) {
    side = Math.min(w, h);
    x0 = Math.floor((w - side) / 2);
    y0 = Math.floor((h - side) / 2);
  }
  const c = img.clone();
  c.crop({ x: x0, y: y0, w: side, h: side });
  return c;
}

function tightSquareOnOpaque(img) {
  const box = alphaBbox(img);
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const side = Math.max(box.bw, box.bh);
  let x0 = Math.floor(box.x + box.bw / 2 - side / 2);
  let y0 = Math.floor(box.y + box.bh / 2 - side / 2);
  x0 = Math.max(0, Math.min(x0, w - side));
  y0 = Math.max(0, Math.min(y0, h - side));
  if (side > w || side > h) {
    const s = Math.min(w, h);
    x0 = Math.floor((w - s) / 2);
    y0 = Math.floor((h - s) / 2);
    const c = img.clone();
    c.crop({ x: x0, y: y0, w: s, h: s });
    return c;
  }
  const c = img.clone();
  c.crop({ x: x0, y: y0, w: side, h: side });
  return c;
}

async function main() {
  let base = await Jimp.read(SOURCE);
  floodClearOutside(base);
  const box = alphaBbox(base);
  const square = squareCrop(base, box);

  const cx0 = square.bitmap.width / 2;
  const cy0 = square.bitmap.height / 2;
  const r0 = measureOuter(square, cx0, cy0, ALPHA_GATE, LUM_MAX_BORDER);
  const C = centerFromRays(square, cx0, cy0, ALPHA_GATE, LUM_MAX_BORDER, r0);
  const R = measureOuter(square, C.cx, C.cy, ALPHA_GATE, LUM_MAX_BORDER);
  applyCircle(square, C.cx, C.cy, R, FEATHER);
  const cropped = tightSquareOnOpaque(square);

  const master = cropped.clone();
  master.resize({ w: 1024, h: 1024 });

  const outputs = [
    [512, "icon-512.png"],
    [256, "icon-256.png"],
    [192, "icon-192.png"],
    [180, "icon-180.png"],
    [512, "pwa-win-512.png"],
    [256, "pwa-win-256.png"],
    [192, "pwa-win-192.png"],
    [180, "pwa-win-180.png"],
  ];
  for (const [size, name] of outputs) {
    const out = master.clone();
    out.resize({ w: size, h: size });
    await out.write(path.join(ICONS_DIR, name));
  }

  try {
    const { default: pngToIco } = await import("png-to-ico");
    const icoBuf = await pngToIco([
      path.join(ICONS_DIR, "pwa-win-192.png"),
      path.join(ICONS_DIR, "pwa-win-512.png"),
    ]);
    await fs.writeFile(path.join(ICONS_DIR, "favicon.ico"), Buffer.from(icoBuf));
  } catch (e) {
    console.warn("favicon.ico:", e.message);
  }

  console.log("OK", { R, cx: C.cx, cy: C.cy, out: ICONS_DIR });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
