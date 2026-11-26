// Command pattern: every edit is a plain object that knows how to apply itself
// to an editor document. Commands are pure: they return a new document, or
// null when they do not apply (e.g. closing a shape with fewer than 3 points),
// so the history only records edits that changed something.
import { clampToImage, roundPoint } from "@/modules/domain";
import type { Hotspot, HotspotTarget, Point, ProjectConfig, Scene } from "@/modules/schema";

/** A shape being drawn, not yet a hotspot. */
export interface DraftShape {
  sceneId: string;
  points: Point[];
}

/** What the editor edits: the project config plus the shape in progress. */
export interface EditorDocument {
  config: ProjectConfig;
  draft?: DraftShape;
}

export type EditorCommand =
  | { type: "start-hotspot"; sceneId: string }
  | { type: "add-point"; point: Point }
  /** Drops the shape in progress (Escape in the canvas). */
  | { type: "cancel-draft" }
  /** Moves a vertex of a saved hotspot, or of the draft when hotspotId is left out. */
  | { type: "move-vertex"; sceneId: string; hotspotId?: string; index: number; to: Point }
  | { type: "delete-vertex"; sceneId: string; hotspotId?: string; index: number }
  | { type: "close-polygon"; hotspotId: string; target: HotspotTarget }
  | { type: "delete-hotspot"; sceneId: string; hotspotId: string }
  | { type: "set-target"; sceneId: string; hotspotId: string; target: HotspotTarget };

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

/** Clamps a point to the scene image and rounds it to whole pixels. */
function placePoint(doc: EditorDocument, sceneId: string, point: Point): Point | null {
  const scene = findScene(doc.config.root, sceneId);
  return scene ? roundPoint(clampToImage(point, scene.image)) : null;
}

const replaceAt = <T,>(items: readonly T[], index: number, value: T) => items.map((v, i) => (i === index ? value : v));
const removeAt = <T,>(items: readonly T[], index: number) => items.filter((_, i) => i !== index);
const validIndex = (items: readonly unknown[], index: number) => Number.isInteger(index) && index >= 0 && index < items.length;

export function applyCommand(doc: EditorDocument, command: EditorCommand): EditorDocument | null {
  switch (command.type) {
    case "start-hotspot":
      return findScene(doc.config.root, command.sceneId) ? { ...doc, draft: { sceneId: command.sceneId, points: [] } } : null;

    case "add-point": {
      if (!doc.draft) return null;
      const point = placePoint(doc, doc.draft.sceneId, command.point);
      return point && { ...doc, draft: { ...doc.draft, points: [...doc.draft.points, point] } };
    }

    case "cancel-draft":
      return doc.draft ? { config: doc.config } : null;

    case "move-vertex": {
      const to = placePoint(doc, command.sceneId, command.to);
      if (!to) return null;
      if (command.hotspotId === undefined) {
        if (doc.draft?.sceneId !== command.sceneId || !validIndex(doc.draft.points, command.index)) return null;
        return { ...doc, draft: { ...doc.draft, points: replaceAt(doc.draft.points, command.index, to) } };
      }
      return editHotspot(doc, command.sceneId, command.hotspotId, (h) => (validIndex(h.points, command.index) ? { ...h, points: replaceAt(h.points, command.index, to) } : null));
    }

    case "delete-vertex": {
      if (command.hotspotId === undefined) {
        if (doc.draft?.sceneId !== command.sceneId || !validIndex(doc.draft.points, command.index)) return null;
        return { ...doc, draft: { ...doc.draft, points: removeAt(doc.draft.points, command.index) } };
      }
      // A saved hotspot keeps at least 3 points; delete the hotspot instead.
      return editHotspot(doc, command.sceneId, command.hotspotId, (h) =>
        validIndex(h.points, command.index) && h.points.length > MIN_POINTS ? { ...h, points: removeAt(h.points, command.index) } : null,
      );
    }

    case "close-polygon": {
      const draft = doc.draft;
      if (!draft || draft.points.length < MIN_POINTS) return null;
      const root = editScene(doc.config.root, draft.sceneId, (scene) =>
        scene.hotspots.some((h) => h.id === command.hotspotId)
          ? null
          : { ...scene, hotspots: [...scene.hotspots, { id: command.hotspotId, points: draft.points, target: command.target }] },
      );
      return root && { config: { ...doc.config, root } };
    }

    case "delete-hotspot": {
      const root = editScene(doc.config.root, command.sceneId, (scene) =>
        scene.hotspots.some((h) => h.id === command.hotspotId) ? { ...scene, hotspots: scene.hotspots.filter((h) => h.id !== command.hotspotId) } : null,
      );
      return root && { ...doc, config: { ...doc.config, root } };
    }

    case "set-target":
      return editHotspot(doc, command.sceneId, command.hotspotId, (h) => ({ ...h, target: command.target }));
  }
}
