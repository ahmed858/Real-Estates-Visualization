import { describe, expect, it, vi } from "vitest";
import type { UnitRow } from "@/modules/schema";
import { CachedUnitSource, type UnitSource } from "./index";

const row = (code: string) => ({ code }) as UnitRow;

function setup(refreshMs = 1000) {
  let time = 0;
  const load = vi.fn<UnitSource["load"]>();
  const source = new CachedUnitSource({ load }, refreshMs, () => time);
  return { source, load, advance: (ms: number) => (time += ms) };
}

describe("CachedUnitSource", () => {
  it("returns cached rows inside the interval and reads again after it", async () => {
    const { source, load, advance } = setup();
    load.mockResolvedValueOnce([row("A")]).mockResolvedValueOnce([row("B")]);
    expect(await source.load()).toEqual([row("A")]);
    advance(999);
    expect(await source.load()).toEqual([row("A")]);
    advance(1);
    expect(await source.load()).toEqual([row("B")]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one read between requests that arrive while it is in flight", async () => {
    const { source, load } = setup();
    let resolve!: (rows: UnitRow[]) => void;
    load.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const both = Promise.all([source.load(), source.load()]);
    resolve([row("A")]);
    expect(await both).toEqual([[row("A")], [row("A")]]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed read", async () => {
    const { source, load } = setup();
    load.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([row("A")]);
    await expect(source.load()).rejects.toThrow("offline");
    expect(await source.load()).toEqual([row("A")]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("counts the interval from when the read finished", async () => {
    const { source, load, advance } = setup();
    load.mockImplementationOnce(async () => {
      advance(600);
      return [row("A")];
    });
    await source.load();
    advance(900);
    await source.load();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
