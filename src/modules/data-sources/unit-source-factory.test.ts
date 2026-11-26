import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createUnitSource, createUnitSourceFactory, LastGoodUnitSource, UnsupportedUnitSourceError, XlsxFileSource, type FetchLike, type UnitSource } from "./index";

const demoVilla = fileURLToPath(new URL("../../../projects/demo-villa", import.meta.url));

describe("createUnitSource", () => {
  it("reads the project's units.xlsx for the xlsx source", async () => {
    const source = createUnitSource({ source: "xlsx" }, demoVilla);
    expect(source).toBeInstanceOf(XlsxFileSource);
    expect((await source.load()).map((u) => u.code)).toEqual(["G-01", "G-02", "F-01", "F-02", "R-01"]);
  });

  it("reads a Google Sheet through a cached source", () => {
    expect(createUnitSource({ source: "google-sheet", sheetId: "x".repeat(44), gid: "0", refreshSeconds: 60 }, demoVilla)).toBeInstanceOf(LastGoodUnitSource);
  });

  it("reports a source this build does not know", () => {
    const create = (): UnitSource => createUnitSource({ source: "airtable" } as never, demoVilla);
    expect(create).toThrow(UnsupportedUnitSourceError);
    expect(create).toThrow('units source "airtable" is not supported yet');
  });
});

describe("createUnitSourceFactory: Google Sheet refresh interval", () => {
  const CSV = "code,scene,floor,type,bedrooms,bathrooms,area_m2,price,status\nG-01,ground,0,Apartment,2,1,100,1000000,";
  const sheet = (refreshSeconds = 60, gid = "0") => ({ source: "google-sheet" as const, sheetId: "x".repeat(44), gid, refreshSeconds });

  function setup() {
    let time = 0;
    let status = "available";
    const fetchFn = vi.fn<FetchLike>(async () => new Response(CSV + status, { headers: { "content-type": "text/csv" } }));
    const log = vi.fn();
    const factory = createUnitSourceFactory({ now: () => time, fetch: fetchFn, log });
    const statusNow = async (units = sheet()) => (await factory(units, demoVilla).load())[0].status;
    return {
      fetchFn,
      log,
      factory,
      statusNow,
      advance: (ms: number) => (time += ms),
      edit: (next: string) => (status = next),
    };
  }

  it("reuses the rows inside the interval and re-reads the sheet after it, across page requests", async () => {
    const { fetchFn, statusNow, advance, edit } = setup();
    expect(await statusNow()).toBe("available");
    edit("sold");
    advance(59_999);
    expect(await statusNow()).toBe("available");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    advance(1);
    expect(await statusNow()).toBe("sold");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("uses the project's own refresh interval", async () => {
    const { fetchFn, statusNow, advance } = setup();
    await statusNow(sheet(300));
    advance(299_000);
    await statusNow(sheet(300));
    expect(fetchFn).toHaveBeenCalledTimes(1);
    advance(1_000);
    await statusNow(sheet(300));
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("keeps a separate cache per sheet tab", async () => {
    const { fetchFn, statusNow } = setup();
    await statusNow(sheet(60, "0"));
    await statusNow(sheet(60, "7"));
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls.map(([url]) => url.slice(-5))).toEqual(["gid=0", "gid=7"]);
  });
});

describe("createUnitSourceFactory: a sheet that breaks after a good read", () => {
  it("keeps serving the last good rows with a stale notice and logs why", async () => {
    let time = 0;
    let body = "code,scene,floor,type,bedrooms,bathrooms,area_m2,price,status\nG-01,ground,0,Apartment,2,1,100,1000000,available";
    const log = vi.fn();
    const factory = createUnitSourceFactory({ now: () => time, fetch: async () => new Response(body, { headers: { "content-type": "text/csv" } }), log });
    const units = { source: "google-sheet" as const, sheetId: "x".repeat(44), gid: "0", refreshSeconds: 60 };

    const first = await factory(units, demoVilla).loadWithStatus!();
    expect(first.stale).toBeUndefined();

    body = body.replace("available", "maybe");
    time = 61_000;
    const second = await factory(units, demoVilla).loadWithStatus!();
    expect(second.rows).toEqual(first.rows);
    expect(second.stale).toEqual({ lastGoodAt: 0, problems: [expect.stringMatching(/^row 2, status: "maybe" is not a known status/)] });
    expect(log).toHaveBeenCalledOnce();
  });
});
