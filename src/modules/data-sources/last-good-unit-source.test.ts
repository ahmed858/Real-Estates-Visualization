import { describe, expect, it, vi } from "vitest";
import type { UnitRow } from "@/modules/schema";
import { LastGoodUnitSource, UnitSourceError, UnitSourceReadError, type UnitSource } from "./index";

const row = (code: string) => ({ code }) as UnitRow;

function setup() {
  let time = 1_000;
  const load = vi.fn<UnitSource["load"]>();
  const log = vi.fn();
  const source = new LastGoodUnitSource({ load }, "Google Sheet abc (gid 0)", () => time, log);
  return { source, load, log, advance: (ms: number) => (time += ms) };
}

describe("LastGoodUnitSource", () => {
  it("passes fresh rows through without a notice", async () => {
    const { source, load, log } = setup();
    load.mockResolvedValue([row("A")]);
    expect(await source.loadWithStatus()).toEqual({ rows: [row("A")] });
    expect(await source.load()).toEqual([row("A")]);
    expect(log).not.toHaveBeenCalled();
  });

  it("serves the last good rows when the sheet cannot be read", async () => {
    const { source, load, log, advance } = setup();
    load.mockResolvedValueOnce([row("A")]).mockRejectedValueOnce(new UnitSourceReadError("Google Sheet abc (gid 0)", "network", "cannot be reached: fetch failed"));
    await source.loadWithStatus();
    advance(5_000);
    expect(await source.loadWithStatus()).toEqual({
      rows: [row("A")],
      stale: { lastGoodAt: 1_000, problems: ["Google Sheet abc (gid 0): cannot be reached: fetch failed"] },
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("serving units read at 1970-01-01T00:00:01.000Z"), [
      "Google Sheet abc (gid 0): cannot be reached: fetch failed",
    ]);
  });

  it("serves the last good rows when a client edit makes the sheet invalid, and recovers once fixed", async () => {
    const { source, load } = setup();
    load
      .mockResolvedValueOnce([row("A")])
      .mockRejectedValueOnce(new UnitSourceError("sheet", [{ row: 4, column: "price", message: "must be a number" }]))
      .mockResolvedValueOnce([row("B")]);
    await source.loadWithStatus();
    expect(await source.loadWithStatus()).toMatchObject({ rows: [row("A")], stale: { problems: ["row 4, price: must be a number"] } });
    expect(await source.loadWithStatus()).toEqual({ rows: [row("B")] });
  });

  it("passes the failure on when there is no earlier good read", async () => {
    const { source, load, log } = setup();
    const error = new UnitSourceError("sheet", [{ row: 2, column: "status", message: "is required" }]);
    load.mockRejectedValueOnce(error);
    await expect(source.loadWithStatus()).rejects.toBe(error);
    expect(log).not.toHaveBeenCalled();
  });
});
