// Procedural textures drawn on a canvas (browser module): plaster, stone
// cladding, parquet, paving, grass, fabric, sky. Seeded, so runs repeat.
import * as THREE from "three";
import { random } from "./kit.js";

function canvasTexture(size, draw, { srgb = true } = {}) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  // GLTFExporter embeds textures as PNG unless told otherwise; JPEG keeps noisy canvases small.
  t.userData.mimeType = "image/jpeg";
  return t;
}

const hex = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;

function speckle(ctx, size, rnd, base, spread, count) {
  ctx.fillStyle = hex(...base);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < count; i++) {
    const k = (rnd() - 0.5) * spread;
    ctx.fillStyle = hex(base[0] + k, base[1] + k, base[2] + k);
    ctx.globalAlpha = 0.25 + rnd() * 0.3;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 3, 1 + rnd() * 3);
  }
  ctx.globalAlpha = 1;
}

/** Painted render: a base colour with fine speckle. */
export const plaster = (base, seed = 1, size = 256) => canvasTexture(size, (ctx, s) => speckle(ctx, s, random(seed), base, 26, s * s * 0.15));

/** Split-face stone cladding in random-length courses of grey-brown slate. */
export const stone = (seed = 2) =>
  canvasTexture(256, (ctx, s) => {
    const rnd = random(seed);
    ctx.fillStyle = "#3d3a37";
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 40;
      const y = (r * s) / rows;
      while (x < s) {
        const w = 24 + rnd() * 50;
        const g = 85 + rnd() * 55;
        ctx.fillStyle = hex(g + 6, g + 2, g - 4);
        ctx.fillRect(x + 1.5, y + 1.5, w - 3, s / rows - 3);
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = rnd() > 0.5 ? "#000" : "#fff";
        ctx.fillRect(x + 1.5, y + 1.5 + rnd() * 10, w - 3, 3);
        ctx.globalAlpha = 1;
        x += w;
      }
    }
  });

/** Oak parquet: planks 1/8 of the tile wide with staggered joints and grain. */
export const parquet = (seed = 3, tone = [176, 128, 84]) =>
  canvasTexture(512, (ctx, s) => {
    const rnd = random(seed);
    const rows = 8;
    const h = s / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * s * 0.5;
      while (x < s) {
        const w = s * (0.35 + rnd() * 0.4);
        const k = (rnd() - 0.5) * 34;
        const [cr, cg, cb] = [tone[0] + k, tone[1] + k * 0.8, tone[2] + k * 0.6];
        ctx.fillStyle = hex(cr, cg, cb);
        ctx.fillRect(x, r * h, w, h);
        for (let i = 0; i < 14; i++) {
          ctx.strokeStyle = hex(cr - 22, cg - 20, cb - 16);
          ctx.globalAlpha = 0.18 + rnd() * 0.2;
          ctx.lineWidth = 0.6 + rnd();
          const yy = r * h + rnd() * h;
          ctx.beginPath();
          ctx.moveTo(x, yy);
          ctx.bezierCurveTo(x + w * 0.3, yy + (rnd() - 0.5) * 6, x + w * 0.7, yy + (rnd() - 0.5) * 6, x + w, yy);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "#3b2a1c";
        ctx.fillRect(x, r * h, 1.2, h);
        ctx.globalAlpha = 1;
        x += w;
      }
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "#3b2a1c";
      ctx.fillRect(0, r * h, s, 1.2);
      ctx.globalAlpha = 1;
    }
  });

/** Square stone tiles with grout lines (porcelain floors, paving). */
export const tiles = (base, grout, seed = 4, n = 4, spread = 14) =>
  canvasTexture(256, (ctx, s) => {
    const rnd = random(seed);
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, s, s);
    const t = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const k = (rnd() - 0.5) * spread;
      ctx.fillStyle = hex(base[0] + k, base[1] + k, base[2] + k);
      ctx.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3);
      for (let q = 0; q < 40; q++) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = rnd() > 0.5 ? "#fff" : "#000";
        ctx.fillRect(i * t + rnd() * t, j * t + rnd() * t, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  });

/** Lawn: dense blades of mixed greens. */
export const grass = (seed = 5) =>
  canvasTexture(256, (ctx, s) => {
    const rnd = random(seed);
    ctx.fillStyle = "#5f8a3a";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 9000; i++) {
      const g = 110 + rnd() * 70;
      ctx.fillStyle = hex(g * 0.55, g, g * 0.32);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(rnd() * s, rnd() * s, 1, 2 + rnd() * 3);
    }
    ctx.globalAlpha = 1;
  });

/** Woven fabric: a fine cross-hatch over a base colour. */
export const fabric = (base, seed = 6) =>
  canvasTexture(128, (ctx, s) => {
    speckle(ctx, s, random(seed), base, 18, 1500);
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#000";
    for (let i = 0; i < s; i += 2) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, s);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

/** A soft rug: border bands around a speckled field. */
export const rug = (field, border, seed = 7) =>
  canvasTexture(512, (ctx, s) => {
    speckle(ctx, s, random(seed), field, 20, 30000);
    ctx.strokeStyle = border;
    ctx.lineWidth = 18;
    ctx.strokeRect(30, 30, s - 60, s - 60);
    ctx.lineWidth = 4;
    ctx.strokeRect(62, 62, s - 124, s - 124);
  });

/** Abstract canvas painting for wall art. */
export const painting = (palette, seed = 8) =>
  canvasTexture(256, (ctx, s) => {
    const rnd = random(seed);
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = palette[1 + (i % (palette.length - 1))];
      ctx.globalAlpha = 0.55 + rnd() * 0.4;
      ctx.beginPath();
      ctx.arc(rnd() * s, rnd() * s, 20 + rnd() * 90, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

/** Equirectangular sky for exteriors and window views: gradient, sun glow and soft clouds. */
export function skyTexture({ seed = 9, sunAzimuth = 0.3, sunElevation = 0.55 } = {}) {
  const W = 2048, H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, H / 2);
  g.addColorStop(0, "#3f7fc4");
  g.addColorStop(0.6, "#8dbbe6");
  g.addColorStop(1, "#dfe9ef");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H / 2);
  const ground = ctx.createLinearGradient(0, H / 2, 0, H);
  ground.addColorStop(0, "#c9c1ae");
  ground.addColorStop(1, "#8b7f68");
  ctx.fillStyle = ground;
  ctx.fillRect(0, H / 2, W, H / 2);
  const sx = sunAzimuth * W, sy = (0.5 - sunElevation / Math.PI) * H;
  const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, 260);
  sun.addColorStop(0, "rgba(255,252,235,1)");
  sun.addColorStop(0.06, "rgba(255,248,220,0.9)");
  sun.addColorStop(1, "rgba(255,240,210,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H / 2);
  const rnd = random(seed);
  for (let i = 0; i < 26; i++) {
    const cx = rnd() * W, cy = H * (0.18 + rnd() * 0.25), r = 40 + rnd() * 90;
    for (let k = 0; k < 9; k++) {
      const px = cx + (rnd() - 0.5) * r * 3, py = cy + (rnd() - 0.5) * r * 0.5, pr = r * (0.4 + rnd() * 0.6);
      const cl = ctx.createRadialGradient(px, py, 0, px, py, pr);
      cl.addColorStop(0, "rgba(255,255,255,0.55)");
      cl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = cl;
      // Drawn again one width left and right, so clouds wrap across the seam.
      for (const dx of [-W, 0, W]) {
        ctx.save();
        ctx.translate(dx, 0);
        ctx.beginPath();
        ctx.ellipse(px, py, pr * 1.8, pr * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
