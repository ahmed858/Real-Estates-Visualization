// Turns country shapes into drawing paths on an equirectangular map (the
// projection the globe texture and the flat fallback map both use).
import type { CountryShape, LatLng, Ring } from "@/modules/domain";

/** Map position of a point, for a map `width` x `height` pixels covering the whole world. */
export function toMap({ lat, lng }: LatLng, width: number, height: number): [number, number] {
  return [((lng + 180) / 360) * width, ((90 - lat) / 180) * height];
}

/**
 * The ring with longitudes made continuous: a ring that crosses the date line
 * (Russia, Fiji) jumps from +180 to -180, which would draw a stripe across the
 * whole map. Unwrapped, it runs past ±180 instead, and is drawn a second time
 * one world-width over so both halves show.
 */
export function unwrapRing(ring: Ring): { points: [number, number][]; crosses: boolean } {
  const points: [number, number][] = [];
  let shift = 0;
  let crosses = false;
  ring.forEach(([lng, lat], i) => {
    if (i > 0) {
      const prev = ring[i - 1][0];
      if (lng - prev > 180) shift -= 360;
      else if (prev - lng > 180) shift += 360;
    }
    if (shift !== 0) crosses = true;
    points.push([lng + shift, lat]);
  });
  return { points, crosses };
}

/** Horizontal copies to draw a ring at: itself, plus one world-width over when it leaves -180..180. */
export function ringOffsets(points: readonly [number, number][]): number[] {
  const min = Math.min(...points.map(([x]) => x));
  const max = Math.max(...points.map(([x]) => x));
  return [0, ...(min < -180 ? [360] : []), ...(max > 180 ? [-360] : [])];
}

/** An SVG path (`M … Z` per ring) of a country on a map `width` x `height`. */
export function countryPath(country: CountryShape, width: number, height: number): string {
  const parts: string[] = [];
  for (const polygon of country.polygons)
    for (const ring of polygon) {
      const { points } = unwrapRing(ring);
      for (const offset of ringOffsets(points)) {
        const xy = points.map(([lng, lat]) => toMap({ lat, lng: lng + offset }, width, height));
        parts.push(`M${xy.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L")}Z`);
      }
    }
  return parts.join("");
}
