// Decorator: keeps the last rows that passed validation. When a later read
// fails (the sheet is unreachable, no longer shared, or a client edit made it
// invalid) it serves those rows with a stale notice and logs the problems for
// the owner. Without earlier good rows the failure is passed on unchanged.
import { formatSheetIssue, type UnitRow } from "@/modules/schema";
import type { Clock } from "./cached-unit-source";
import { UnitSourceError, type LoadedUnits, type UnitSource } from "./unit-source";

export type ProblemLogger = (message: string, problems: readonly string[]) => void;

const defaultLogger: ProblemLogger = (message, problems) => console.warn(message, problems);

export function describeFailure(error: unknown): string[] {
  if (error instanceof UnitSourceError) return error.issues.map(formatSheetIssue);
  return [error instanceof Error ? error.message : String(error)];
}

export class LastGoodUnitSource implements UnitSource {
  private lastGood?: { rows: UnitRow[]; at: number };

  constructor(
    private readonly inner: UnitSource,
    private readonly label: string,
    private readonly now: Clock = Date.now,
    private readonly log: ProblemLogger = defaultLogger,
  ) {}

  async load(): Promise<UnitRow[]> {
    return (await this.loadWithStatus()).rows;
  }

  async loadWithStatus(): Promise<LoadedUnits> {
    try {
      const rows = await this.inner.load();
      this.lastGood = { rows, at: this.now() };
      return { rows };
    } catch (error) {
      if (!this.lastGood) throw error;
      const problems = describeFailure(error);
      this.log(`${this.label}: serving units read at ${new Date(this.lastGood.at).toISOString()} because the latest read failed`, problems);
      return { rows: this.lastGood.rows, stale: { lastGoodAt: this.lastGood.at, problems } };
    }
  }
}
