"use client";
// The flat fallback of the globe intro, for browsers without WebGL and weak
// or data-saving devices: the same country shapes as an SVG world map. A
// camera pose becomes a CSS zoom and pan of the map, so the stages, the
// marker and the controls behave as on the globe at a fraction of the cost.
import { useEffect, useRef, useState } from "react";
import { countryAt, STAGE_ALTITUDE, vectorToLatLng, type CameraPose, type CountryShape } from "@/modules/domain";
import { placeMarker, type GlobeRendererProps } from "./globe-renderer";
import { countryPath, toMap } from "./world-map";
import { loadCountries } from "./world-shapes";

const MAP_W = 360;
const MAP_H = 180;
const MAX_SCALE = 80;

/** How far the map is zoomed for a camera height: 1 for the whole earth, more the lower the camera. */
export function mapScale(altitude: number): number {
  return Math.min(MAX_SCALE, Math.max(1, (STAGE_ALTITUDE.earth / altitude) ** 0.9));
}

/**
 * Where the map is centred: the whole world at the earth stage, moving to the
 * camera's point as it zooms in (the flat map cannot turn like a globe).
 */
export function mapCentre(pose: CameraPose): { lat: number; lng: number } {
  const at = vectorToLatLng(pose.dir);
  // Fully on the camera's point from three times zoom on (country level and closer).
  const pull = Math.min(1, (mapScale(pose.altitude) - 1) / 3);
  return { lat: 15 + (at.lat - 15) * pull, lng: at.lng * pull };
}

export default function StaticMap({ target, shapesUrl, accent, markerRef, handleRef, onReady, onFail }: GlobeRendererProps) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const [shapes, setShapes] = useState<{ countries: CountryShape[]; highlight?: CountryShape } | null>(null);
  const callbacks = useRef({ onReady, onFail });
  useEffect(() => {
    callbacks.current = { onReady, onFail };
  });

  useEffect(() => {
    let cancelled = false;
    loadCountries(shapesUrl)
      .then((countries) => {
        if (!cancelled) setShapes({ countries, highlight: countryAt(countries, [target.lng, target.lat]) });
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onFail();
      });
    return () => {
      cancelled = true;
    };
  }, [shapesUrl, target]);

  useEffect(() => {
    const el = host.current;
    const inner = map.current;
    if (!shapes || !el || !inner) return;
    let pose: CameraPose | undefined;
    const draw = () => {
      if (!pose) return;
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      // The map covers the screen at scale 1 (as wide as needed to be as tall as the screen).
      const mapW = Math.max(w, h * 2);
      const mapH = mapW / 2;
      inner.style.width = `${mapW}px`;
      inner.style.height = `${mapH}px`;
      const s = mapScale(pose.altitude);
      const [cx, cy] = toMap(mapCentre(pose), mapW, mapH);
      inner.style.transform = `translate(${w / 2}px, ${h / 2}px) scale(${s}) translate(${-cx}px, ${-cy}px)`;
      const [tx, ty] = toMap(target, mapW, mapH);
      placeMarker(markerRef.current, { x: w / 2 + (tx - cx) * s, y: h / 2 + (ty - cy) * s });
    };
    handleRef.current = {
      setPose(next) {
        pose = next;
        draw();
      },
    };
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    callbacks.current.onReady();
    return () => {
      observer.disconnect();
      handleRef.current = null;
    };
  }, [shapes, target, markerRef, handleRef]);

  return (
    <div ref={host} className="absolute inset-0 overflow-hidden bg-[#0b2a45]" data-testid="globe-static-map">
      <div ref={map} className="absolute top-0 origin-top-left" style={{ left: 0 }}>
        {shapes && (
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="block h-full w-full" aria-hidden="true">
            <rect width={MAP_W} height={MAP_H} fill="#0e3d63" />
            <g fill="#6d7a4c" stroke="#ffffff" strokeOpacity={0.3} strokeWidth={0.15} vectorEffect="non-scaling-stroke" fillRule="evenodd">
              {shapes.countries.map((c, i) => (
                <path key={`${c.id}-${i}`} d={countryPath(c, MAP_W, MAP_H)} />
              ))}
            </g>
            {shapes.highlight && <path d={countryPath(shapes.highlight, MAP_W, MAP_H)} fill={accent} fillOpacity={0.3} stroke={accent} strokeWidth={0.4} fillRule="evenodd" />}
          </svg>
        )}
      </div>
    </div>
  );
}
