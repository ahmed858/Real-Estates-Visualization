// The link a visitor shares for a unit: the page they are on (same host, so a
// client's own domain is kept; same scene path; same ?lang=) with ?unit= set
// and, on a typical floor, ?floor=.
import { FLOOR_PARAM, UNIT_PARAM } from "../selection/params";

export function unitShareUrl(href: string, code: string, floor?: number): string {
  const url = new URL(href);
  url.searchParams.set(UNIT_PARAM, code);
  if (floor !== undefined) url.searchParams.set(FLOOR_PARAM, String(floor));
  url.hash = "";
  return url.toString();
}
