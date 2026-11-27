// The levels of the globe intro, from the whole earth down to the project's
// site, and the camera pose of each. The intro is the level above a project's
// root scene: earth → country → city → site, then the project's own tree
// (building → floor → unit) takes over.
import type { CameraPose, LatLng } from "./globe-camera";
import { latLngToVector } from "./globe-camera";

export const GLOBE_STAGES = ["earth", "country", "city", "site"] as const;
export type GlobeStage = (typeof GLOBE_STAGES)[number];

export const DEFAULT_GLOBE_STAGE: GlobeStage = "earth";

/** Camera height above the surface at each stage, in globe radii (earth radius ≈ 6371 km). */
export const STAGE_ALTITUDE: Readonly<Record<GlobeStage, number>> = {
  earth: 2.4,
  country: 0.42,
  city: 0.09,
  site: 0.022,
};

/** The stage from a `stage` query value, or the default for anything else. */
export function parseGlobeStage(raw: string | string[] | null | undefined): GlobeStage {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (GLOBE_STAGES as readonly unknown[]).includes(value) ? (value as GlobeStage) : DEFAULT_GLOBE_STAGE;
}

export const stageIndex = (stage: GlobeStage) => GLOBE_STAGES.indexOf(stage);

/** The stage one level up (towards the earth), or undefined at the earth. */
export const parentStage = (stage: GlobeStage): GlobeStage | undefined => GLOBE_STAGES[stageIndex(stage) - 1];

/** The stage one level down (towards the site), or undefined at the site. */
export const childStage = (stage: GlobeStage): GlobeStage | undefined => GLOBE_STAGES[stageIndex(stage) + 1];

/**
 * The whole-earth view is turned a little away from the project, so pressing
 * "explore" first swings the globe round to it before diving.
 */
const EARTH_OFFSET = { lat: -8, lng: 28 };

/** Camera pose of a stage for a project at `target`. */
export function stagePose(stage: GlobeStage, target: LatLng): CameraPose {
  const at =
    stage === "earth"
      ? { lat: Math.max(-60, Math.min(60, target.lat + EARTH_OFFSET.lat)), lng: ((target.lng + EARTH_OFFSET.lng + 540) % 360) - 180 }
      : target;
  return { dir: latLngToVector(at), altitude: STAGE_ALTITUDE[stage] };
}

/** The deepest stage whose altitude the camera has reached (for keeping the URL in step during a flight). */
export function stageAtAltitude(altitude: number): GlobeStage {
  let reached: GlobeStage = "earth";
  for (const stage of GLOBE_STAGES) if (altitude <= STAGE_ALTITUDE[stage] * 1.0001) reached = stage;
  return reached;
}

/** Milliseconds a flight between two stages takes: longer for more levels, never a jump. */
export function flightDuration(from: GlobeStage, to: GlobeStage): number {
  const levels = Math.abs(stageIndex(to) - stageIndex(from));
  return levels === 0 ? 0 : 900 + levels * 900;
}
