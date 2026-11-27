// Command pattern: every edit is a plain object that knows how to apply itself
// to an editor document. Commands are pure: they return a new document, or
// null when they do not apply (e.g. closing a shape with fewer than 3 points),
// so the history only records edits that changed something.
//
// On a rotation-360 scene a command may carry a 1-based `frame`: it then edits
// the hotspot's polygon on that frame (`hotspot.frames[frame]`, in frame
// pixels) instead of its poster polygon (`hotspot.points`).
import { clampToImage, roundPoint } from "@/modules/domain";
import type { Hotspot, HotspotTarget, Point, ProjectConfig, Scene } from "@/modules/schema";

/** A shape being drawn, not yet a hotspot. */
export interface DraftShape {
  sceneId: string;
  /** Rotation frame the shape is drawn on; undefined for the scene image. */
  frame?: number;
  /** Existing hotspot whose polygon on `frame` this shape becomes; undefined for a new hotspot. */
  hotspotId?: string;
  points: Point[];
}

/** What the editor edits: the project config plus the shape in progress. */
export interface EditorDocument {
  config: ProjectConfig;
  draft?: DraftShape;
}

export type EditorCommand =
  /** Starts a shape; with `frame` it is drawn on that rotation frame, with `hotspotId` too it becomes that hotspot's polygon there. */
  | { type: "start-hotspot"; sceneId: string; frame?: number; hotspotId?: string }
  | { type: "add-point"; point: Point }
  /** Drops the shape in progress (Escape in the canvas). */
  | { type: "cancel-draft" }
  /** Moves a vertex of a saved hotspot, or of the draft when hotspotId is left out. */
  | { type: "move-vertex"; sceneId: string; hotspotId?: string; frame?: number; index: number; to: Point }
  | { type: "delete-vertex"; sceneId: string; hotspotId?: string; frame?: number; index: number }
  /** Shifts a saved hotspot's whole polygon (on `frame`, or the poster polygon) by whole pixels, kept inside the image. */
  | { type: "nudge"; sceneId: string; hotspotId: string; frame?: number; dx: number; dy: number }
  /** Copies a hotspot's polygon from one rotation frame to another (replacing what was there). */
  | { type: "copy-frame"; sceneId: string; hotspotId: string; from: number; to: number }
  /** Hides a hotspot on one rotation frame by removing its polygon there. */
  | { type: "remove-frame"; sceneId: string; hotspotId: string; frame: number }
  /** On a model-3d scene: a new hotspot for a mesh of the model, with a placeholder poster polygon (refused when the mesh or id is taken). */
  | { type: "add-mesh-hotspot"; sceneId: string; mesh: string; hotspotId: string; target: HotspotTarget }
  | { type: "close-polygon"; hotspotId: string; target: HotspotTarget }
  | { type: "delete-hotspot"; sceneId: string; hotspotId: string }
  /** Adds a child scene under `parentId` (refused when the scene id is already used). */
  | { type: "add-scene"; parentId: string; scene: Scene }
  /** Sets where a hotspot leads; `id` also renames it (refused when another hotspot of the scene has that id). */
  | { type: "set-target"; sceneId: string; hotspotId: string; target: HotspotTarget; id?: string };

const MIN_POINTS = 3;

function findScene(scene: Scene, id: string): Scene | undefined {
  if (scene.id === id) return scene;
  for (const child of scene.children) {
    const found = findScene(child, id);
    if (found) return found;
  }
  return undefined;
}

/** Returns a copy of the tree with one scene replaced, or null when the scene does not exist or `edit` refuses. */
function editScene(scene: Scene, id: string, edit: (s: Scene) => Scene | null): Scene | null {
  if (scene.id === id) return edit(scene);
  for (let i = 0; i < scene.children.length; i++) {
    const next = editScene(scene.children[i], id, edit);
    if (next) return { ...scene, children: scene.children.map((c, j) => (j === i ? next : c)) };
  }
  return null;
}

function editHotspot(doc: EditorDocument, sceneId: string, hotspotId: string, edit: (h: Hotspot) => Hotspot | null): EditorDocument | null {
  const root = editScene(doc.config.root, sceneId, (scene) => {
    const index = scene.hotspots.findIndex((h) => h.id === hotspotId);
    if (index < 0) return null;
    const next = edit(scene.hotspots[index]);
    return next && { ...scene, hotspots: scene.hotspots.map((h, i) => (i === index ? next : h)) };
  });
  return root && { ...doc, config: { ...doc.config, root } };
}

/** Size of what is drawn on: the scene image, or a rotation frame (null when the scene has no such frame). */
function canvasSize(scene: Scene, frame: number | undefined): { width: number; height: number } | null {
  if (frame === undefined) return scene.image;
  const r = scene.rotation;
  return r && Number.isInteger(frame) && frame >= 1 && frame <= r.count ? { width: r.width, height: r.height } : null;
}

/** Clamps a point to the scene image (or the frame) and rounds it to whole pixels. */
function placePoint(doc: EditorDocument, sceneId: string, point: Point, frame?: number): Point | null {
  const scene = findScene(doc.config.root, sceneId);
  const size = scene && canvasSize(scene, frame);
  return size ? roundPoint(clampToImage(point, size)) : null;
}

/** A hotspot's polygon on `frame` (or its poster polygon). */
const polygonOf = (h: Hotspot, frame: number | undefined): Point[] | undefined => (frame === undefined ? h.points : h.frames?.[String(frame)]);

/** The hotspot with its polygon on `frame` (or its poster polygon) replaced. */
function withPolygon(h: Hotspot, frame: number | undefined, points: Point[]): Hotspot {
  return frame === undefined ? { ...h, points } : { ...h, frames: { ...h.frames, [String(frame)]: points } };
}

/** Edits a saved hotspot's polygon on `frame` (or its poster polygon); refused when it has none there. */
function editPolygon(doc: EditorDocument, sceneId: string, hotspotId: string, frame: number | undefined, edit: (points: Point[]) => Point[] | null): EditorDocument | null {
  return editHotspot(doc, sceneId, hotspotId, (h) => {
    const points = polygonOf(h, frame);
    const next = points && edit(points);
    return next ? withPolygon(h, frame, next) : null;
  });
}

const draftMatches = (doc: EditorDocument, sceneId: string, frame: number | undefined) => doc.draft?.sceneId === sceneId && doc.draft.frame === frame;

const replaceAt = <T,>(items: readonly T[], index: number, value: T) => items.map((v, i) => (i === index ? value : v));
const removeAt = <T,>(items: readonly T[], index: number) => items.filter((_, i) => i !== index);
const validIndex = (items: readonly unknown[], index: number) => Number.isInteger(index) && index >= 0 && index < items.length;

/**
 * A hotspot from a closed shape. Drawn on a rotation frame, it gets that frame's
 * polygon, and the same shape scaled to the poster as its poster polygon (the
 * poster is usually one of the frames; the owner can adjust it there).
 */
function newHotspot(scene: Scene, draft: DraftShape, id: string, target: HotspotTarget): Hotspot {
  if (draft.frame === undefined || !scene.rotation) return { id, points: draft.points, target };
  const sx = scene.image.width / scene.rotation.width;
  const sy = scene.image.height / scene.rotation.height;
  const poster = draft.points.map(([x, y]) => roundPoint(clampToImage([x * sx, y * sy], scene.image)));
  return { id, points: poster, frames: { [String(draft.frame)]: draft.points }, target };
}

/**
 * Poster polygon for a hotspot that only lives in the 3D model: a small square
 * in the middle of the poster, so the poster (and devices without WebGL) still
 * offer it. The owner can redraw it on the poster.
 */
function placeholderPolygon({ width, height }: { width: number; height: number }): Point[] {
  const half = Math.max(1, Math.round(Math.min(width, height) / 20));
  const [cx, cy] = [Math.round(width / 2), Math.round(height / 2)];
  return [
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
  ];
}

export function applyCommand(doc: EditorDocument, command: EditorCommand): EditorDocument | null {
  switch (command.type) {
    case "start-hotspot": {
      const { sceneId, frame, hotspotId } = command;
      const scene = findScene(doc.config.root, sceneId);
      if (!scene || !canvasSize(scene, frame)) return null;
      if (hotspotId !== undefined && (frame === undefined || !scene.hotspots.some((h) => h.id === hotspotId))) return null;
      return { ...doc, draft: { sceneId, ...(frame !== undefined && { frame }), ...(hotspotId !== undefined && { hotspotId }), points: [] } };
    }

    case "add-point": {
      if (!doc.draft) return null;
      const point = placePoint(doc, doc.draft.sceneId, command.point, doc.draft.frame);
      return point && { ...doc, draft: { ...doc.draft, points: [...doc.draft.points, point] } };
    }

    case "cancel-draft":
      return doc.draft ? { config: doc.config } : null;

    case "move-vertex": {
      const { sceneId, frame, index } = command;
      const to = placePoint(doc, sceneId, command.to, frame);
      if (!to) return null;
      if (command.hotspotId === undefined) {
        if (!draftMatches(doc, sceneId, frame) || !validIndex(doc.draft!.points, index)) return null;
        return { ...doc, draft: { ...doc.draft!, points: replaceAt(doc.draft!.points, index, to) } };
      }
      return editPolygon(doc, sceneId, command.hotspotId, frame, (points) => (validIndex(points, index) ? replaceAt(points, index, to) : null));
    }

    case "delete-vertex": {
      const { sceneId, frame, index } = command;
      if (command.hotspotId === undefined) {
        if (!draftMatches(doc, sceneId, frame) || !validIndex(doc.draft!.points, index)) return null;
        return { ...doc, draft: { ...doc.draft!, points: removeAt(doc.draft!.points, index) } };
      }
      // A saved polygon keeps at least 3 points; delete the hotspot (or remove the frame) instead.
      return editPolygon(doc, sceneId, command.hotspotId, frame, (points) => (validIndex(points, index) && points.length > MIN_POINTS ? removeAt(points, index) : null));
    }

    case "nudge": {
      const { sceneId, frame, dx, dy } = command;
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return null;
      return editPolygon(doc, sceneId, command.hotspotId, frame, (points) => {
        const moved = points.map(([x, y]) => placePoint(doc, sceneId, [x + dx, y + dy], frame)!);
        return moved.some((p, i) => p[0] !== points[i][0] || p[1] !== points[i][1]) ? moved : null;
      });
    }

    case "copy-frame": {
      const { sceneId, from, to } = command;
      const scene = findScene(doc.config.root, sceneId);
      if (!scene || from === to || !canvasSize(scene, from) || !canvasSize(scene, to)) return null;
      return editHotspot(doc, sceneId, command.hotspotId, (h) => {
        const points = polygonOf(h, from);
        return points ? withPolygon(h, to, points.map(([x, y]) => [x, y])) : null;
      });
    }

    case "add-mesh-hotspot": {
      const { mesh, hotspotId, target } = command;
      if (!mesh.trim() || !hotspotId) return null;
      const root = editScene(doc.config.root, command.sceneId, (scene) => {
        if (scene.type !== "model-3d" || scene.hotspots.some((h) => h.mesh === mesh || h.id === hotspotId)) return null;
        return { ...scene, hotspots: [...scene.hotspots, { id: hotspotId, points: placeholderPolygon(scene.image), mesh, target }] };
      });
      return root && { ...doc, config: { ...doc.config, root } };
    }

    case "remove-frame":
      return editHotspot(doc, command.sceneId, command.hotspotId, (h) => {
        const key = String(command.frame);
        if (!h.frames?.[key]) return null;
        const frames = Object.fromEntries(Object.entries(h.frames).filter(([n]) => n !== key));
        const rest: Hotspot = { ...h };
        delete rest.frames;
        return Object.keys(frames).length > 0 ? { ...rest, frames } : rest;
      });

    case "close-polygon": {
      const draft = doc.draft;
      if (!draft || draft.points.length < MIN_POINTS) return null;
      if (draft.frame !== undefined && draft.hotspotId !== undefined) {
        // The shape becomes an existing hotspot's polygon on this frame.
        const next = editHotspot(doc, draft.sceneId, draft.hotspotId, (h) => withPolygon(h, draft.frame, draft.points));
        return next && { config: next.config };
      }
      const root = editScene(doc.config.root, draft.sceneId, (scene) =>
        scene.hotspots.some((h) => h.id === command.hotspotId)
          ? null
          : { ...scene, hotspots: [...scene.hotspots, newHotspot(scene, draft, command.hotspotId, command.target)] },
      );
      return root && { config: { ...doc.config, root } };
    }

    case "delete-hotspot": {
      const root = editScene(doc.config.root, command.sceneId, (scene) =>
        scene.hotspots.some((h) => h.id === command.hotspotId) ? { ...scene, hotspots: scene.hotspots.filter((h) => h.id !== command.hotspotId) } : null,
      );
      return root && { ...doc, config: { ...doc.config, root } };
    }

    case "add-scene": {
      if (findScene(doc.config.root, command.scene.id)) return null;
      const root = editScene(doc.config.root, command.parentId, (scene) => ({ ...scene, children: [...scene.children, command.scene] }));
      return root && { ...doc, config: { ...doc.config, root } };
    }

    case "set-target": {
      const id = command.id ?? command.hotspotId;
      const scene = findScene(doc.config.root, command.sceneId);
      if (!id || (id !== command.hotspotId && scene?.hotspots.some((h) => h.id === id))) return null;
      return editHotspot(doc, command.sceneId, command.hotspotId, (h) => ({ ...h, id, target: command.target }));
    }
  }
}
