import { describe, expect, it, vi } from "vitest";
import { normalizeHost, parseProjectDomains, routeForHost } from "./project-domains";

describe("parseProjectDomains", () => {
  it("is empty when the variable is unset or blank", () => {
    expect(parseProjectDomains(undefined).size).toBe(0);
    expect(parseProjectDomains(" ").size).toBe(0);
  });

  it("maps each host to its slug, trimming spaces and lowercasing hosts", () => {
    const map = parseProjectDomains(" Units.Example.com = demo-villa , towers.example.org=demo-residence,");
    expect([...map]).toEqual([
      ["units.example.com", "demo-villa"],
      ["towers.example.org", "demo-residence"],
    ]);
  });

  it("ignores bad entries with a warning and keeps the good ones", () => {
    const warn = vi.fn();
    const map = parseProjectDomains("good.example.com=demo-villa,no-equals,bad host=x,ok.example.com=Bad_Slug,=demo-villa,good.example.com=other", warn);
    expect([...map]).toEqual([["good.example.com", "demo-villa"]]);
    expect(warn).toHaveBeenCalledTimes(5);
    expect(warn.mock.calls.map(([m]) => m)).toEqual([
      expect.stringContaining('"no-equals"'),
      expect.stringContaining('"bad host=x"'),
      expect.stringContaining('"ok.example.com=Bad_Slug"'),
      expect.stringContaining('"=demo-villa"'),
      expect.stringContaining('already mapped to "demo-villa"'),
    ]);
  });

  it("drops a port written in the host", () => {
    expect([...parseProjectDomains("localhost:3000=demo-villa")]).toEqual([["localhost", "demo-villa"]]);
  });
});

describe("normalizeHost", () => {
  it("lowercases and drops the port", () => {
    expect(normalizeHost("Units.Example.com:443")).toBe("units.example.com");
  });
});

describe("routeForHost", () => {
  const domains = parseProjectDomains("units.example.com=demo-villa");

  it("leaves hosts that are not mapped alone", () => {
    for (const path of ["/", "/p/demo-residence", "/editor/demo-villa"]) {
      expect(routeForHost(domains, "unit-explorer.vercel.app", path)).toEqual({ kind: "pass" });
    }
  });

  it("shows the project at / and its table at /units, on any port and case", () => {
    expect(routeForHost(domains, "units.example.com", "/")).toEqual({ kind: "rewrite", path: "/p/demo-villa" });
    expect(routeForHost(domains, "UNITS.example.com:443", "/units")).toEqual({ kind: "rewrite", path: "/p/demo-villa/units" });
  });

  it("opens a scene by its id at /<scene>", () => {
    expect(routeForHost(domains, "units.example.com", "/ground")).toEqual({ kind: "rewrite", path: "/p/demo-villa/ground" });
  });

  it("serves the project's own /p and /files paths, which the viewer links to", () => {
    for (const path of ["/p/demo-villa", "/p/demo-villa/ground", "/p/demo-villa/units", "/files/demo-villa/images/facade.svg"]) {
      expect(routeForHost(domains, "units.example.com", path)).toEqual({ kind: "pass" });
    }
  });

  it("does not reach other projects or the editor", () => {
    for (const path of ["/p/demo-residence", "/p/demo-villa-2", "/p", "/files/demo-residence/images/x.png", "/editor/demo-villa", "/editor"]) {
      expect(routeForHost(domains, "units.example.com", path)).toEqual({ kind: "not-found" });
    }
  });
});
