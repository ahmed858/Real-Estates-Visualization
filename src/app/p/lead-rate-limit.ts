// A fixed-window counter per key (the visitor's IP). It lives in the memory of
// one server instance, which is enough against casual form spam together with
// the honeypot; it is not a security boundary.

export interface RateLimitOptions {
  /** Requests allowed per key in one window. */
  limit: number;
  windowMs: number;
  /** Above this many tracked keys, expired ones are dropped, so memory stays bounded. */
  maxKeys?: number;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

interface Window {
  start: number;
  count: number;
}

export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly options: RateLimitOptions,
    private readonly now: () => number = Date.now,
  ) {}

  /** Counts one request for `key` and says whether it may go ahead. */
  hit(key: string): RateLimitResult {
    const now = this.now();
    let window = this.windows.get(key);
    if (window === undefined || now - window.start >= this.options.windowMs) {
      this.prune(now);
      window = { start: now, count: 0 };
      this.windows.set(key, window);
    }
    window.count += 1;
    if (window.count <= this.options.limit) return { allowed: true };
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((window.start + this.options.windowMs - now) / 1000)) };
  }

  private prune(now: number): void {
    if (this.windows.size < (this.options.maxKeys ?? 10_000)) return;
    for (const [key, window] of this.windows) {
      if (now - window.start >= this.options.windowMs) this.windows.delete(key);
    }
    // Still full of live windows (a flood from many addresses): start over rather than grow.
    if (this.windows.size >= (this.options.maxKeys ?? 10_000)) this.windows.clear();
  }
}

/** The visitor's IP as the hosting proxy reports it; "unknown" groups requests without one. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || "unknown";
}
