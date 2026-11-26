"use client";
// Drawing canvas: the scene image with an SVG layer in image pixels. It turns
// clicks and drags into editor commands (see state/commands.ts) and never edits
// the project itself, so every change goes through the undo history.
//
// - Click the image to start a shape and add points; click the first point
//   (or near it) to close the shape.
// - Drag a vertex of the shape in progress or of the selected hotspot to move it.
// - Click a hotspot (while not drawing) to select it; click the image to deselect.
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { closesPolygon } from "@/modules/domain";
import type { HotspotTarget, Point, Scene } from "@/modules/schema";
import { STATUS_STYLE, hotspotStyle } from "@/modules/viewer";
import type { EditorCommand } from "../state/commands";
import { imagePixels, toImagePoint } from "./image-point";

/** Target given to a newly closed shape until the target picker (U-605) sets a real one; validation reports it as missing. */
export const UNSET_TARGET: HotspotTarget = { unit: "" };

/** Screen pixels around a vertex that count as "on" it. */
const HANDLE_SCREEN_PX = 8;

export interface DrawingCanvasProps {
  scene: Pick<Scene, "id" | "image" | "hotspots">;
  imageUrl: string;
  title: string;
  /** Points of the shape in progress on this scene, if any. */
  draft?: readonly Point[];
  selectedId?: string;
  onSelect: (hotspotId: string | undefined) => void;
  onCommand: (command: EditorCommand) => void;
  /** Id for the next closed shape. */
  nextHotspotId: string;
}

interface Drag {
  hotspotId?: string;
  index: number;
  at?: Point;
}

const toPoints = (points: readonly Point[]) => points.map(([x, y]) => `${x},${y}`).join(" ");

export function DrawingCanvas({ scene, imageUrl, title, draft, selectedId, onSelect, onCommand, nextHotspotId }: DrawingCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag>();
  const { width, height } = scene.image;
  const box = () => svgRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
  const pointOf = (e: MouseEvent) => toImagePoint(e.clientX, e.clientY, box(), scene.image);
  const handleRadius = () => imagePixels(HANDLE_SCREEN_PX, box(), scene.image);
  // Drawn handle size in image pixels, re-measured when the canvas resizes (refs are not read during render).
  const [drawnRadius, setDrawnRadius] = useState(Math.max(width, height) / 100);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setDrawnRadius(imagePixels(HANDLE_SCREEN_PX, svg.getBoundingClientRect(), scene.image)));
    observer.observe(svg);
    return () => observer.disconnect();
  }, [scene.image]);

  const close = () => onCommand({ type: "close-polygon", hotspotId: nextHotspotId, target: UNSET_TARGET });

  const onCanvasClick = (e: MouseEvent) => {
    const p = pointOf(e);
    if (!p) return;
    if (draft) {
      if (closesPolygon(draft, p, handleRadius())) close();
      else onCommand({ type: "add-point", point: p });
      return;
    }
    if (selectedId) {
      onSelect(undefined);
      return;
    }
    onCommand({ type: "start-hotspot", sceneId: scene.id });
    onCommand({ type: "add-point", point: p });
  };

  const onMove = (e: MouseEvent) => {
    if (!drag) return;
    const at = pointOf(e);
    if (at) setDrag({ ...drag, at });
  };

  const endDrag = () => {
    if (!drag) return;
    setDrag(undefined);
    if (drag.at) onCommand({ type: "move-vertex", sceneId: scene.id, hotspotId: drag.hotspotId, index: drag.index, to: drag.at });
    else if (drag.hotspotId === undefined && drag.index === 0 && draft && draft.length >= 3) close();
  };

  /** Points with the vertex being dragged moved to the pointer. */
  const withDrag = (points: readonly Point[], hotspotId: string | undefined) =>
    drag?.at && drag.hotspotId === hotspotId ? points.map((p, i) => (i === drag.index ? drag.at! : p)) : points;

  const handles = (points: readonly Point[], hotspotId: string | undefined) =>
    points.map(([x, y], index) => (
      <circle
        key={index}
        data-vertex={`${hotspotId ?? "draft"}:${index}`}
        cx={x}
        cy={y}
        r={drawnRadius}
        fill={index === 0 && hotspotId === undefined ? "#facc15" : "#ffffff"}
        stroke="#09090b"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        className="cursor-move"
        onMouseDown={(e) => {
          e.stopPropagation();
          setDrag({ hotspotId, index });
        }}
        onClick={(e) => e.stopPropagation()}
      />
    ));

  const draftPoints = draft && withDrag(draft, undefined);
  const selected = scene.hotspots.find((h) => h.id === selectedId);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      role="application"
      aria-label={`${title}: drawing canvas`}
      data-drawing={draft ? "true" : "false"}
      className="h-auto w-full max-w-full cursor-crosshair select-none bg-zinc-900"
      onClick={onCanvasClick}
      onMouseMove={onMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      <image href={imageUrl} width={width} height={height} />
      {scene.hotspots.map((h) => {
        const color = "scene" in h.target ? STATUS_STYLE.scene.color : STATUS_STYLE.available.color;
        const isSelected = h.id === selectedId;
        return (
          <polygon
            key={h.id}
            data-hotspot={h.id}
            aria-selected={isSelected}
            points={toPoints(withDrag(h.points, h.id))}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={hotspotStyle(color, isSelected, isSelected ? undefined : "match")}
            className={draft ? undefined : "cursor-pointer"}
            onClick={(e) => {
              if (draft) return; // drawing over an existing hotspot adds a point
              e.stopPropagation();
              onSelect(h.id);
            }}
          />
        );
      })}
      {selected && handles(withDrag(selected.points, selected.id), selected.id)}
      {draftPoints && (
        <>
          <polyline data-draft points={toPoints(draftPoints)} fill="none" stroke="#facc15" strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          {handles(draftPoints, undefined)}
        </>
      )}
    </svg>
  );
}
