// Procedurally drawn textures. Everything is painted onto small canvases at
// startup, so the site ships zero image files for the house itself.
import * as THREE from "three";

const cache = new Map();

function canvasTexture(key, size, draw, { repeat = [1, 1], wrap = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  if (wrap) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

// Small deterministic PRNG so textures look identical on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return "#" + c.getHexString();
}

// ---------- Weathered gray cedar shingles ----------
export function shingleTexture(repeat = [4, 4]) {
  return canvasTexture(
    "shingle",
    512,
    (ctx, S) => {
      const r = rng(7);
      ctx.fillStyle = "#8a8f8c";
      ctx.fillRect(0, 0, S, S);
      const rows = 8;
      const h = S / rows;
      for (let row = 0; row < rows; row++) {
        const y = row * h;
        const offset = (row % 2) * 18 + r() * 10;
        let x = -offset;
        while (x < S + 40) {
          const w = 24 + r() * 26;
          const base = ["#8c918e", "#9a9e9a", "#7f847f", "#a3a7a2", "#949a95", "#878c88"][
            Math.floor(r() * 6)
          ];
          ctx.fillStyle = base;
          ctx.fillRect(x, y, w - 2, h + 6);
          // subtle vertical grain
          ctx.strokeStyle = shade(base, -0.06);
          ctx.lineWidth = 1;
          for (let g = 0; g < 3; g++) {
            const gx = x + 4 + r() * (w - 8);
            ctx.beginPath();
            ctx.moveTo(gx, y + 2);
            ctx.lineTo(gx + r() * 2 - 1, y + h - 2);
            ctx.stroke();
          }
          // gap between shingles
          ctx.fillStyle = "#5e635f";
          ctx.fillRect(x + w - 2, y, 2, h + 6);
          x += w;
        }
        // shadow line at bottom of row
        ctx.fillStyle = "rgba(40,45,42,0.55)";
        ctx.fillRect(0, y + h - 4, S, 4);
      }
    },
    { repeat }
  );
}

// ---------- Wide-plank wood floor ----------
export function plankTexture(repeat = [3, 3], tone = "#b27a4b") {
  return canvasTexture(
    "plank" + tone,
    512,
    (ctx, S) => {
      const r = rng(11);
      const planks = 5;
      const w = S / planks;
      ctx.fillStyle = tone;
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < planks; i++) {
        const x = i * w;
        const col = shade(tone, (r() - 0.5) * 0.12);
        ctx.fillStyle = col;
        ctx.fillRect(x, 0, w, S);
        // grain
        ctx.strokeStyle = shade(col, -0.08);
        ctx.lineWidth = 1;
        for (let g = 0; g < 14; g++) {
          const gx = x + r() * w;
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.bezierCurveTo(gx + 6, S * 0.3, gx - 6, S * 0.7, gx + (r() - 0.5) * 8, S);
          ctx.stroke();
        }
        // plank end seams
        const seamY = r() * S;
        ctx.fillStyle = "rgba(50,30,15,0.7)";
        ctx.fillRect(x, seamY, w, 3);
        // edge
        ctx.fillStyle = "rgba(50,30,15,0.8)";
        ctx.fillRect(x + w - 2, 0, 2, S);
      }
    },
    { repeat }
  );
}

// ---------- Basement wood paneling ----------
export function panelingTexture(repeat = [4, 1]) {
  return canvasTexture(
    "paneling",
    512,
    (ctx, S) => {
      const r = rng(23);
      const base = "#8a5a35";
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, S, S);
      const n = 6;
      const w = S / n;
      for (let i = 0; i < n; i++) {
        const x = i * w;
        const col = shade(base, (r() - 0.5) * 0.08);
        ctx.fillStyle = col;
        ctx.fillRect(x, 0, w, S);
        ctx.strokeStyle = shade(col, -0.1);
        for (let g = 0; g < 10; g++) {
          const gx = x + r() * w;
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx + (r() - 0.5) * 6, S);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(40,20,8,0.9)";
        ctx.fillRect(x + w - 4, 0, 4, S);
        ctx.fillStyle = "rgba(255,220,180,0.12)";
        ctx.fillRect(x, 0, 2, S);
      }
    },
    { repeat }
  );
}

// ---------- Painted brick (fireplace) ----------
export function brickTexture(repeat = [2, 2], color = "#c9c2b6") {
  return canvasTexture(
    "brick" + color,
    256,
    (ctx, S) => {
      const r = rng(5);
      ctx.fillStyle = shade(color, -0.18);
      ctx.fillRect(0, 0, S, S);
      const bh = 16,
        bw = 40;
      for (let y = 0, row = 0; y < S; y += bh, row++) {
        const off = row % 2 ? bw / 2 : 0;
        for (let x = -off; x < S; x += bw) {
          ctx.fillStyle = shade(color, (r() - 0.5) * 0.1);
          ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        }
      }
    },
    { repeat }
  );
}

// ---------- Grass / lawn ----------
export function grassTexture(repeat = [12, 12]) {
  return canvasTexture(
    "grass",
    256,
    (ctx, S) => {
      const r = rng(99);
      ctx.fillStyle = "#6f9a5a";
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 2500; i++) {
        ctx.fillStyle = ["#6a9455", "#7aa663", "#5f8a4e", "#86ad6c"][Math.floor(r() * 4)];
        ctx.fillRect(r() * S, r() * S, 2, 3 + r() * 4);
      }
    },
    { repeat }
  );
}

// ---------- Roof (dark architectural shingles) ----------
export function roofTexture(repeat = [6, 3]) {
  return canvasTexture(
    "roof",
    256,
    (ctx, S) => {
      const r = rng(3);
      ctx.fillStyle = "#4b4f54";
      ctx.fillRect(0, 0, S, S);
      const h = 24;
      for (let y = 0, row = 0; y < S; y += h, row++) {
        const off = row % 2 ? 20 : 0;
        for (let x = -off; x < S; x += 40) {
          ctx.fillStyle = ["#50555a", "#45494e", "#585d62", "#4c5056"][Math.floor(r() * 4)];
          ctx.fillRect(x, y, 38, h - 3);
        }
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, y + h - 3, S, 3);
      }
    },
    { repeat }
  );
}

// ---------- Stone walkway ----------
export function flagstoneTexture(repeat = [1, 4]) {
  return canvasTexture(
    "flag",
    256,
    (ctx, S) => {
      const r = rng(41);
      ctx.fillStyle = "#9a9284";
      ctx.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 64) {
        for (let x = 0; x < S; x += 64) {
          ctx.fillStyle = ["#b5aa98", "#a79d8c", "#bfb5a3", "#aea493"][Math.floor(r() * 4)];
          ctx.fillRect(x + 3, y + 3, 58, 58);
        }
      }
    },
    { repeat }
  );
}

// ---------- Rug (striped, coastal) ----------
export function rugTexture(colors = ["#2f4a6b", "#f3ead6", "#9fd3c7", "#f3ead6"]) {
  return canvasTexture(
    "rug" + colors.join(),
    256,
    (ctx, S) => {
      const n = 12;
      const h = S / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(0, i * h, S, h);
      }
    },
    { repeat: [1, 1] }
  );
}

// ---------- Simple text label sprite texture ----------
export function textTexture(text, { bg = "#fffdf7", fg = "#1f2a3a", w = 512, h = 128, size = 52, pad = 16 } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, w, h, 28);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = `600 ${size}px "Georgia", "Times New Roman", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 2, w - pad * 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Generic "draw on a canvas and get a texture" helper for one-off art
// (newspaper front page, polaroids, resume paper, laptop screen...).
export function artTexture(key, w, h, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}
