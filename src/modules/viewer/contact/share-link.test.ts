import { describe, expect, it } from "vitest";
import { unitShareUrl } from "./share-link";

describe("unitShareUrl", () => {
  it("adds the unit to the scene page link", () => {
    expect(unitShareUrl("https://site.example/p/demo-villa/ground", "G-01")).toBe("https://site.example/p/demo-villa/ground?unit=G-01");
  });

  it("keeps the language and the picked typical floor, and replaces an older unit", () => {
    expect(unitShareUrl("https://site.example/p/tower/typical?floor=3&unit=T-1&lang=en", "T-2")).toBe(
      "https://site.example/p/tower/typical?floor=3&unit=T-2&lang=en",
    );
  });

  it("sets the floor when given", () => {
    expect(unitShareUrl("https://site.example/p/tower/typical", "T-2", 5)).toBe("https://site.example/p/tower/typical?unit=T-2&floor=5");
  });

  it("keeps a client's own domain and short paths, and drops the hash", () => {
    expect(unitShareUrl("https://units.client.com/ground#top", "G-01")).toBe("https://units.client.com/ground?unit=G-01");
  });
});
