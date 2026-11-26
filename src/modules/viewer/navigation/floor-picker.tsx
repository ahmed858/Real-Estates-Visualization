"use client";
// Floor selector for a typical floor scene: one plan, many real floors.
// The chosen floor goes into the URL (?floor=), where the scene reads it.
import { useId } from "react";
import { viewerText, type ViewerLocale } from "../layout/viewer-text";
import { selectFloor, useSelectedFloor } from "../selection/use-selected-unit";

export interface FloorPickerProps {
  floors: readonly number[];
  locale: ViewerLocale;
}

export function FloorPicker({ floors, locale }: FloorPickerProps) {
  const id = useId();
  const selected = useSelectedFloor(floors);
  const text = viewerText(locale);
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  if (floors.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="font-medium">
        {text.panel.floor}
      </label>
      <select
        id={id}
        value={selected}
        onChange={(e) => selectFloor(Number(e.target.value))}
        className="rounded-md border border-white/20 bg-zinc-900/80 px-2 py-1 text-zinc-100"
      >
        {floors.map((f) => (
          <option key={f} value={f}>
            {num.format(f)}
          </option>
        ))}
      </select>
    </div>
  );
}
