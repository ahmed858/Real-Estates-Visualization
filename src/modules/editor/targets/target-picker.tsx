"use client";
// Form for the selected hotspot's target: a child scene, a unit code (units
// not yet drawn listed first) or, on a typical floor, a unit suffix. The id
// field follows the suggestion from the target until the owner types their own.
// Renders options only; the parent turns "Apply" into a set-target command.
import { useState } from "react";
import type { HotspotTarget } from "@/modules/schema";
import { makeTarget, suggestHotspotId, targetKindOf, targetValueOf, toId, type CodeOption, type TargetKind, type TargetOptions } from "./target-options";

export interface TargetPickerProps {
  hotspotId: string;
  target: HotspotTarget;
  options: TargetOptions;
  /** Ids used by other hotspots in the project. */
  takenIds: ReadonlySet<string>;
  onApply: (target: HotspotTarget, id: string) => void;
}

const KIND_LABELS: Record<TargetKind, string> = { scene: "Scene", unit: "Unit", unitSuffix: "Unit suffix" };

function valuesOf(kind: TargetKind, options: TargetOptions): string[] {
  if (kind === "scene") return options.scenes.map((s) => s.id);
  return (kind === "unit" ? options.units : options.suffixes).map((o) => o.value);
}

function CodeOptions({ options }: { options: CodeOption[] }) {
  const groups = [
    { label: "Not yet drawn", items: options.filter((o) => !o.drawn) },
    { label: "Already drawn", items: options.filter((o) => o.drawn) },
  ].filter((g) => g.items.length > 0);
  return groups.map((g) => (
    <optgroup key={g.label} label={g.label}>
      {g.items.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value}
        </option>
      ))}
    </optgroup>
  ));
}

export function TargetPicker({ hotspotId, target, options, takenIds, onApply }: TargetPickerProps) {
  const currentKind = targetKindOf(target);
  // A new shape has no target yet: start on the first kind that has something to pick.
  const initialKind =
    options.kinds.includes(currentKind) && targetValueOf(target) ? currentKind : (options.kinds.find((k) => valuesOf(k, options).length > 0) ?? options.kinds[0]);
  const [kind, setKind] = useState<TargetKind>(initialKind);
  const [value, setValue] = useState(() => (initialKind === currentKind && targetValueOf(target)) || valuesOf(initialKind, options)[0] || "");
  const [typedId, setTypedId] = useState<string>();

  const chosen = value ? makeTarget(kind, value) : undefined;
  const unchanged = kind === currentKind && value === targetValueOf(target);
  const id = typedId ?? (chosen && !unchanged ? suggestHotspotId(chosen, takenIds) : hotspotId);
  const idProblem = id !== toId(id) || !id ? "Use lowercase letters, digits and single dashes." : takenIds.has(id) ? `Another hotspot already uses ${id}.` : undefined;
  const values = valuesOf(kind, options);

  const changeKind = (next: TargetKind) => {
    setKind(next);
    setValue(valuesOf(next, options)[0] ?? "");
  };

  const field = "rounded border border-white/20 bg-zinc-900 px-2 py-1 text-sm";
  return (
    <form
      aria-label="Hotspot target"
      className="flex flex-wrap items-end gap-3 rounded border border-white/10 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (chosen && !idProblem) onApply(chosen, id);
      }}
    >
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Leads to
        <select className={field} value={kind} onChange={(e) => changeKind(e.target.value as TargetKind)} disabled={options.kinds.length < 2}>
          {options.kinds.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        {KIND_LABELS[kind]}
        <select className={field} value={value} onChange={(e) => setValue(e.target.value)} disabled={values.length === 0}>
          {values.length === 0 && <option value="">None available</option>}
          {kind === "scene" ? (
            options.scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.id})
              </option>
            ))
          ) : (
            <CodeOptions options={kind === "unit" ? options.units : options.suffixes} />
          )}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Hotspot id
        <input className={field} value={id} onChange={(e) => setTypedId(e.target.value)} aria-invalid={idProblem ? true : undefined} />
      </label>
      <button type="submit" className="rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-40" disabled={!chosen || Boolean(idProblem)}>
        Apply
      </button>
      {idProblem && (
        <p role="alert" className="w-full text-xs text-amber-400">
          {idProblem}
        </p>
      )}
      {values.length === 0 && <p className="w-full text-xs text-zinc-400">{kind === "scene" ? "This scene has no child scenes yet." : "The units sheet has no matching units."}</p>}
    </form>
  );
}
