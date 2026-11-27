// A generated close-up of the ground around the project, laid over the globe
// where the coarse country shapes have no detail left: an urban area with a
// light outline, a street grid, highways and a ring road, parks, and the
// project's plot in the brand accent. Not a map of the real city: a seeded
// drawing (the same project always gets the same city), so nothing is
// copied and nothing is downloaded. Its edges fade into the globe.

/** Half the height of the close-up, in degrees of latitude (about 130 km). */
export const CITY_PATCH_SPAN_DEG = 1.2;

/** A small seeded random generator (mulberry32), so a project's city looks the same on every visit. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seedOf = (lat: number, lng: number) => Math.round((lat + 90) * 1000) * 360_000 + Math.round((lng + 180) * 1000);

export function paintCityPatch(canvas: HTMLCanvasElement, seed: number, accent: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const s = canvas.width;
  const c = s / 2;
  const rnd = seededRandom(seed);
  ctx.clearRect(0, 0, s, s);

  // The urban area: an irregular blob around the project.
  const radius = s * 0.17;
  const outline: [number, number][] = [];
  const corners = 15;
  for (let i = 0; i < corners; i++) {
    const a = (i / corners) * Math.PI * 2;
    const r = radius * (0.62 + rnd() * 0.42);
    outline.push([c + Math.cos(a) * r, c + Math.sin(a) * r * 0.9]);
  }
  const blob = new Path2D();
  outline.forEach(([x, y], i) => (i === 0 ? blob.moveTo(x, y) : blob.lineTo(x, y)));
  blob.closePath();

  // Highways out to the edge, gently curved, and a ring road.
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255, 248, 235, 0.55)";
  ctx.lineWidth = s / 500;
  const highways = 6 + Math.floor(rnd() * 3);
  for (let i = 0; i < highways; i++) {
    const a = (i / highways) * Math.PI * 2 + rnd() * 0.5;
    const bend = (rnd() - 0.5) * 0.6;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.quadraticCurveTo(c + Math.cos(a + bend) * s * 0.25, c + Math.sin(a + bend) * s * 0.25, c + Math.cos(a) * s * 0.55, c + Math.sin(a) * s * 0.55);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(236, 218, 186, 0.5)";
  ctx.fill(blob);

  // Street grid inside the urban area, turned a little, plus parks.
  ctx.save();
  ctx.clip(blob);
  ctx.translate(c, c);
  ctx.rotate((rnd() - 0.5) * 0.7);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = Math.max(1, s / 1400);
  const step = s / 110;
  ctx.beginPath();
  for (let d = -radius * 1.2; d <= radius * 1.2; d += step) {
    ctx.moveTo(d, -radius * 1.2);
    ctx.lineTo(d, radius * 1.2);
    ctx.moveTo(-radius * 1.2, d);
    ctx.lineTo(radius * 1.2, d);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(86, 128, 72, 0.6)";
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.ellipse((rnd() - 0.5) * radius * 1.4, (rnd() - 0.5) * radius * 1.4, s * (0.006 + rnd() * 0.01), s * (0.004 + rnd() * 0.008), rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 248, 235, 0.7)";
  ctx.lineWidth = s / 600;
  ctx.beginPath();
  ctx.ellipse(c, c, radius * 0.55, radius * 0.5, rnd(), 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = s / 450;
  ctx.stroke(blob);

  // The project's plot.
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(rnd() * Math.PI);
  ctx.fillStyle = accent;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = s / 700;
  ctx.fillRect(-s * 0.006, -s * 0.004, s * 0.012, s * 0.008);
  ctx.strokeRect(-s * 0.006, -s * 0.004, s * 0.012, s * 0.008);
  ctx.restore();

  // Fade the square's edges into the globe.
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createRadialGradient(c, c, s * 0.3, c, c, s * 0.5);
  fade.addColorStop(0, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = "source-over";
}
