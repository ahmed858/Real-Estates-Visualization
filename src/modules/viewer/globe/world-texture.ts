// Paints the globe's texture on a canvas from the Natural Earth country
// shapes: a deep ocean, land shaded by climate band (ice, forest, desert),
// thin borders, a faint graticule and the project's country outlined in the
// brand accent. Everything is drawn here, so the globe ships no imagery.
import type { CountryShape } from "@/modules/domain";
import { ringOffsets, toMap, unwrapRing } from "./world-map";

/** Land colour by latitude, north to south: a stylised climate band, not satellite colour. */
const LAND_STOPS: readonly [number, string][] = [
  [90, "#e4ebef"],
  [68, "#9aa98c"],
  [55, "#4f6e48"],
  [40, "#6d7a4c"],
  [30, "#c2a46f"],
  [18, "#b8975f"],
  [8, "#3f6a3a"],
  [-8, "#3b6537"],
  [-20, "#8c8a55"],
  [-30, "#bb9d68"],
  [-45, "#58704a"],
  [-60, "#dfe7ec"],
  [-90, "#f1f5f7"],
];

function tracePolygonRings(ctx: CanvasRenderingContext2D, country: CountryShape, w: number, h: number) {
  for (const polygon of country.polygons)
    for (const ring of polygon) {
      const { points } = unwrapRing(ring);
      for (const offset of ringOffsets(points)) {
        points.forEach(([lng, lat], i) => {
          const [x, y] = toMap({ lat, lng: lng + offset }, w, h);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
    }
}

export function paintWorld(canvas: HTMLCanvasElement, countries: readonly CountryShape[], highlight: CountryShape | undefined, accent: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, "#0b2a45");
  ocean.addColorStop(0.5, "#0e3d63");
  ocean.addColorStop(1, "#0b2a45");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = Math.max(1, w / 4096);
  ctx.beginPath();
  for (let lng = -180; lng <= 180; lng += 15) {
    const [x] = toMap({ lat: 0, lng }, w, h);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const [, y] = toMap({ lat, lng: 0 }, w, h);
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  const land = ctx.createLinearGradient(0, 0, 0, h);
  for (const [lat, colour] of LAND_STOPS) land.addColorStop((90 - lat) / 180, colour);
  ctx.fillStyle = land;
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = Math.max(1, w / 3072);
  for (const country of countries) {
    ctx.beginPath();
    tracePolygonRings(ctx, country, w, h);
    ctx.fill("evenodd");
    ctx.stroke();
  }

  if (highlight) {
    ctx.beginPath();
    tracePolygonRings(ctx, highlight, w, h);
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = accent;
    ctx.fill("evenodd");
    ctx.globalAlpha = 1;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(2, w / 1024);
    ctx.shadowColor = accent;
    ctx.shadowBlur = w / 512;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
