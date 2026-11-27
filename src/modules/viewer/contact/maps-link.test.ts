import { describe, expect, it } from "vitest";
import { mapsSearchUrl } from "../index";

describe("mapsSearchUrl", () => {
  it("builds a Google Maps search link for the coordinates", () => {
    expect(mapsSearchUrl({ lat: 30.0444, lng: 31.2357 })).toBe("https://www.google.com/maps/search/?api=1&query=30.0444,31.2357");
  });

  it("keeps negative coordinates and zero", () => {
    expect(mapsSearchUrl({ lat: -33.8688, lng: 0 })).toBe("https://www.google.com/maps/search/?api=1&query=-33.8688,0");
  });

  it("is a valid URL whose query is the point", () => {
    const url = new URL(mapsSearchUrl({ lat: 21.4225, lng: 39.8262 }));
    expect(url.host).toBe("www.google.com");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("query")).toBe("21.4225,39.8262");
  });
});
