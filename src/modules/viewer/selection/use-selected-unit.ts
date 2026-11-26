"use client";
// The selected unit lives in the URL (?unit=G-01) so a selection can be shared
// by link. Any component can read or change it; components in different
// layout slots stay in sync without knowing about each other.
import { useSyncExternalStore } from "react";

export const UNIT_PARAM = "unit";
const CHANGE_EVENT = "viewer:unit-selection";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const readSelected = () => new URLSearchParams(window.location.search).get(UNIT_PARAM);

/** Writes the selection into the current URL without a navigation; null clears it. */
export function selectUnit(code: string | null) {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set(UNIT_PARAM, code);
  else url.searchParams.delete(UNIT_PARAM);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The selected unit code (null when none) and a setter. Renders "none" on the server. */
export function useSelectedUnit(): [string | null, (code: string | null) => void] {
  const selected = useSyncExternalStore(subscribe, readSelected, () => null);
  return [selected, selectUnit];
}
