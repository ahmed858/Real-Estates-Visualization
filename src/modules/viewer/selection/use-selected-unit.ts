"use client";
// Viewer selections live in the URL (?unit=G-01, ?floor=3) so they can be
// shared by link. Any component can read or change them; components in
// different layout slots stay in sync without knowing about each other.
import { useSyncExternalStore } from "react";
import { FLOOR_PARAM, UNIT_PARAM } from "./params";

const CHANGE_EVENT = "viewer:url-selection";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Sets (or, with null, removes) query parameters in the current URL without a navigation. */
export function setUrlParams(values: Readonly<Record<string, string | null>>) {
  const url = new URL(window.location.href);
  for (const [name, value] of Object.entries(values)) {
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
  }
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The current value of one query parameter (null when absent, and always null on the server). */
export function useUrlParam(name: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

/** Writes the unit selection into the URL; null clears it. */
export function selectUnit(code: string | null) {
  setUrlParams({ [UNIT_PARAM]: code });
}

/** The selected unit code (null when none) and a setter. */
export function useSelectedUnit(): [string | null, (code: string | null) => void] {
  return [useUrlParam(UNIT_PARAM), selectUnit];
}

/** Picks a concrete floor of a typical floor scene; clears the unit selection, which belonged to the old floor. */
export function selectFloor(floor: number) {
  setUrlParams({ [FLOOR_PARAM]: String(floor), [UNIT_PARAM]: null });
}

/** The floor in the URL if it is one of `floors`, otherwise the first of them (undefined when there are none). */
export function useSelectedFloor(floors: readonly number[]): number | undefined {
  const raw = useUrlParam(FLOOR_PARAM);
  const wanted = raw === null ? NaN : Number(raw);
  return floors.includes(wanted) ? wanted : floors[0];
}
