import { describe, expect, it } from "vitest";
import { clientIp, FixedWindowRateLimiter } from "./lead-rate-limit";

function limiter(limit = 2, windowMs = 60_000, maxKeys?: number) {
  let now = 1_000_000;
  const l = new FixedWindowRateLimiter({ limit, windowMs, maxKeys }, () => now);
  return { l, advance: (ms: number) => (now += ms) };
}

describe("FixedWindowRateLimiter", () => {
  it("allows up to the limit per window, then says when to retry", () => {
    const { l, advance } = limiter();
    expect(l.hit("1.1.1.1")).toEqual({ allowed: true });
    expect(l.hit("1.1.1.1")).toEqual({ allowed: true });
    advance(15_000);
    expect(l.hit("1.1.1.1")).toEqual({ allowed: false, retryAfterSeconds: 45 });
  });

  it("counts each key on its own", () => {
    const { l } = limiter(1);
    expect(l.hit("a").allowed).toBe(true);
    expect(l.hit("b").allowed).toBe(true);
    expect(l.hit("a").allowed).toBe(false);
  });

  it("opens a new window once the old one has passed", () => {
    const { l, advance } = limiter(1);
    l.hit("a");
    expect(l.hit("a").allowed).toBe(false);
    advance(60_000);
    expect(l.hit("a").allowed).toBe(true);
  });

  it("drops expired keys when full, and keeps limiting live ones", () => {
    const { l, advance } = limiter(1, 60_000, 2);
    l.hit("old");
    advance(60_000);
    l.hit("live");
    l.hit("new");
    expect(l.hit("live").allowed).toBe(false);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for address, then x-real-ip", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": " 203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
