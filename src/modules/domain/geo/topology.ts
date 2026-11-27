// Decodes the country shapes of a TopoJSON file (the format of the Natural
// Earth data the globe ships in public/globe/) into plain polygons in
// degrees. Only what the globe needs: quantized arcs, Polygon and
// MultiPolygon geometries. Pure, so it is unit tested and runs in the browser.

/** [longitude, latitude] in degrees. */
export type LngLat = readonly [number, number];
/** A closed ring of points; the first ring of a polygon is its outline, the rest are holes. */
export type Ring = readonly LngLat[];
export type Polygon = readonly Ring[];

export interface CountryShape {
  /** ISO 3166-1 numeric code as in the source data, e.g. "818" for Egypt. */
  id: string;
  /** English name from the source data. */
  name: string;
  polygons: readonly Polygon[];
}

interface TopoGeometry {
  type: string;
  id?: string | number;
  arcs?: unknown;
  properties?: { name?: string };
}

export interface Topology {
  type: "Topology";
  transform?: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
  objects: Record<string, { type: string; geometries?: TopoGeometry[] }>;
}

/** Absolute coordinates of every arc (quantized arcs are stored as deltas). */
function decodeArcs(topology: Topology): LngLat[][] {
  const t = topology.transform;
  return topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]): LngLat => {
      if (!t) return [dx, dy];
      x += dx;
      y += dy;
      return [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]];
    });
  });
}

/** A ring from arc indexes; a negative index ~i means arc i reversed. Shared end points are not repeated. */
function ringOf(indexes: number[], arcs: LngLat[][]): Ring {
  const points: LngLat[] = [];
  for (const index of indexes) {
    const arc = index < 0 ? [...arcs[~index]].reverse() : arcs[index];
    arc.forEach((p, i) => {
      if (i === 0 && points.length > 0) return;
      points.push(p);
    });
  }
  return points;
}

/** Every country (Polygon or MultiPolygon geometry) of one object of the topology. */
export function decodeCountries(topology: Topology, objectName = "countries"): CountryShape[] {
  const object = topology.objects[objectName];
  if (!object?.geometries) throw new Error(`topology has no "${objectName}" geometry collection`);
  const arcs = decodeArcs(topology);
  return object.geometries.flatMap((g): CountryShape[] => {
    const rings = (polygon: number[][]): Polygon => polygon.map((r) => ringOf(r, arcs));
    let polygons: Polygon[];
    if (g.type === "Polygon") polygons = [rings(g.arcs as number[][])];
    else if (g.type === "MultiPolygon") polygons = (g.arcs as number[][][]).map(rings);
    else return [];
    return [{ id: String(g.id ?? ""), name: g.properties?.name ?? "", polygons }];
  });
}

/** Even-odd test of one ring (longitude/latitude treated as a plane, fine at country scale). */
function ringContains(ring: Ring, [x, y]: LngLat): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Whether the point lies inside the polygon (inside its outline and outside its holes). */
export function polygonContains(polygon: Polygon, point: LngLat): boolean {
  const [outline, ...holes] = polygon;
  return !!outline && ringContains(outline, point) && !holes.some((h) => ringContains(h, point));
}

/** The country the point lies in, or undefined at sea or on a shape the coarse data leaves out. */
export function countryAt(countries: readonly CountryShape[], point: LngLat): CountryShape | undefined {
  return countries.find((c) => c.polygons.some((p) => polygonContains(p, point)));
}
