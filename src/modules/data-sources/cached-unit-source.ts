// Decorator: wraps any UnitSource and reuses its rows for a refresh interval,
// so a live source (a Google Sheet) is read at most once per interval per
// server instance instead of on every page request. Failed reads are not
// cached: the next request tries again.
import type { UnitRow } from "@/modules/schema";
import type { UnitSource } from "./unit-source";

export type Clock = () => number;

export class CachedUnitSource implements UnitSource {
  private rows?: { value: UnitRow[]; readAt: number };
  private pending?: Promise<UnitRow[]>;

  constructor(
    private readonly inner: UnitSource,
    private readonly refreshMs: number,
    private readonly now: Clock = Date.now,
  ) {}

  load(): Promise<UnitRow[]> {
    if (this.rows && this.now() - this.rows.readAt < this.refreshMs) return Promise.resolve(this.rows.value);
    // Visitors arriving while a read is in flight share it.
    this.pending ??= this.inner.load().then(
      (value) => {
        this.rows = { value, readAt: this.now() };
        this.pending = undefined;
        return value;
      },
      (error: unknown) => {
        this.pending = undefined;
        throw error;
      },
    );
    return this.pending;
  }
}
