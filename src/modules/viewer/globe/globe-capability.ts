// Which globe a device gets: the WebGL globe, or the flat SVG map for
// browsers without WebGL and for weak or data-saving devices.

export type GlobeMode = "webgl" | "static";

/** The parts of `navigator` the decision reads (all optional, as browsers differ). */
export interface DeviceHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Two cores or two gigabytes and less, or data saver on, counts as weak. */
export function isWeakDevice(hints: DeviceHints | undefined): boolean {
  if (!hints) return false;
  if (hints.connection?.saveData) return true;
  if (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 2) return true;
  return hints.deviceMemory !== undefined && hints.deviceMemory <= 2;
}

export function globeMode(webgl: boolean, hints: DeviceHints | undefined): GlobeMode {
  return webgl && !isWeakDevice(hints) ? "webgl" : "static";
}
