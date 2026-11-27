import { describe, expect, it } from "vitest";
import { buildFacadeGeometry, buildVillaGeometry, facadeBandPolygons, renderFacadeSvg } from "../../index";
import { polygonArea } from "../geometry/rect";
import { facadeFrame, turntableButtonPolygon } from "./facade-svg";
import { points } from "../svg/svg";

const villa = buildVillaGeometry();
const facade = buildFacadeGeometry(villa);
const svg = renderFacadeSvg(villa);

describe("facade", () => {
  it("matches the committed drawing", async () => {
    await expect(svg).toMatchFileSnapshot("./__snapshots__/facade.svg");
  });

  it("draws the 360° view button exactly where its hotspot is, below the building and inside the image", () => {
    const button = turntableButtonPolygon(villa);
    const [[x0, y0], , [x1, y1]] = button;
    expect(svg).toContain(`<g id="turntable-button"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"`);
    const frame = facadeFrame(facade);
    const groundY = frame.toPx([facade.left, 0])[1];
    expect(y0).toBeGreaterThan(groundY);
    expect(x1).toBeLessThanOrEqual(frame.width);
    expect(y1).toBeLessThanOrEqual(frame.height);
  });

  it("has one band per floor, stacked without gaps or overlaps", () => {
    expect(facade.bands.map((b) => b.floorId)).toEqual(["ground", "first", "roof"]);
    expect(facade.bands[0].base).toBe(0);
    facade.bands.slice(1).forEach((b, i) => expect(b.base).toBe(facade.bands[i].top));
    for (const band of facade.bands) {
      for (const [x, z] of band.outline) {
        expect(x).toBeGreaterThanOrEqual(facade.left);
        expect(x).toBeLessThanOrEqual(facade.right);
        expect(z).toBeGreaterThanOrEqual(band.base);
        expect(z).toBeLessThanOrEqual(band.top);
      }
    }
  });

  it("draws each band with exactly the hotspot polygon", () => {
    const polygons = facadeBandPolygons(villa);
    expect(polygons.map((p) => p.floorId)).toEqual(["ground", "first", "roof"]);
    for (const { floorId, points: pts } of polygons) {
      expect(svg).toContain(`<polygon id="band-${floorId}" points="${points(pts)}"`);
      expect(pts.length).toBeGreaterThanOrEqual(3);
      expect(polygonArea(pts)).toBeGreaterThan(0); // clockwise as drawn (y down)
    }
  });

  it("keeps the hotspot polygons inside the image", () => {
    const [, width, height] = svg.match(/width="(\d+)" height="(\d+)"/)!.map(Number);
    for (const { points: pts } of facadeBandPolygons(villa)) {
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(height);
      }
    }
  });

  it("places windows and doors inside their band", () => {
    for (const band of facade.bands) {
      expect(band.openings.length).toBeGreaterThan(0);
      for (const o of band.openings) {
        expect(o.z).toBeGreaterThanOrEqual(band.base);
        expect(o.z + o.height).toBeLessThanOrEqual(band.top);
        expect(o.x).toBeGreaterThanOrEqual(facade.left);
        expect(o.x + o.width).toBeLessThanOrEqual(facade.right);
      }
    }
  });

  it("is deterministic", () => {
    expect(renderFacadeSvg(buildVillaGeometry())).toBe(svg);
  });
});
