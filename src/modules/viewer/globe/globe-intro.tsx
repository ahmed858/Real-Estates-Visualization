"use client";
// The globe intro: the level above a project's root scene. The visitor sees
// the earth with the project's country marked, and either presses through
// the stages (country → city → project) or presses "Explore" for one
// continuous flight from orbit down to the project, which then opens into
// the project's facade and the guided tour down to a unit.
//
// The flight runs here, on one requestAnimationFrame loop, and hands each
// camera pose to a renderer (Strategy): the WebGL globe, or the flat SVG map
// on devices without WebGL or with little power. The stage is kept in the
// URL (?stage=city) so every stage can be linked to, and "Back" always goes
// up one stage. With reduced motion the camera jumps instead of flying and
// the globe does not spin; "Go straight to the project" skips it all.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import {
  childStage,
  flightDuration,
  flightPose,
  GLOBE_STAGES,
  latLngToVector,
  parentStage,
  stageAtAltitude,
  stagePose,
  vectorToLatLng,
  type CameraPose,
  type GlobeStage,
} from "@/modules/domain";
import { brandStyle, type BrandColors } from "../layout/brand-style";
import type { ViewerLocale } from "../layout/viewer-text";
import { viewerText } from "../layout/viewer-text";
import { LocaleSwitch } from "../navigation/locale-switch";
import { setUrlParams } from "../selection/use-selected-unit";
import { supportsWebGL } from "../scene/model-3d-mapping";
import { globeMode, type DeviceHints, type GlobeMode } from "./globe-capability";
import { GLOBE_STAGE_PARAM } from "./globe-param";
import type { GlobeRendererHandle } from "./globe-renderer";
import { globeText } from "./globe-text";

const GlobeCanvas = lazy(() => import("./globe-canvas"));
const StaticMap = lazy(() => import("./static-map"));

export interface GlobeIntroLocation {
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  nearby: readonly { name: string; minutes: number }[];
}

export interface GlobeIntroProps {
  locale: ViewerLocale;
  defaultLocale: ViewerLocale;
  projectName: string;
  logoUrl: string;
  location: GlobeIntroLocation;
  /** The project's root scene image, which the site marker opens into. */
  posterUrl: string;
  /** Stage from the URL. */
  initialStage: GlobeStage;
  /** The project's root scene, without the tour. */
  enterHref: string;
  /** The project's root scene with the guided tour on. */
  tourHref: string;
  /** URL of the country shapes (TopoJSON). */
  shapesUrl: string;
  brand: BrandColors;
}

const noSubscribe = () => () => {};
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** Turns per second while the earth idles. */
const SPIN_RADIANS_PER_SECOND = 0.035;
/** The explore flight is a little slower than stepping, so the whole dive reads. */
const EXPLORE_STRETCH = 1.3;
/** Pause before the idle spin resumes after the visitor drags. */
const SPIN_RESUME_MS = 4000;

interface Flight {
  from: CameraPose;
  to: CameraPose;
  start: number;
  duration: number;
  done: () => void;
}

function rotateY([x, y, z]: readonly number[], angle: number): CameraPose["dir"] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
}

export function GlobeIntro(props: GlobeIntroProps) {
  const { locale, defaultLocale, projectName, logoUrl, location, posterUrl, initialStage, enterHref, tourHref, shapesUrl, brand } = props;
  const text = globeText(locale);
  const dir = viewerText(locale).dir;
  const router = useRouter();
  const target = useMemo(() => ({ lat: location.lat, lng: location.lng }), [location.lat, location.lng]);

  // Null on the server and during hydration (the poster shows), then the device's answer.
  const detected = useSyncExternalStore<GlobeMode | null>(noSubscribe, () => globeMode(supportsWebGL(), navigator as DeviceHints), () => null);
  const [webglFailed, setWebglFailed] = useState(false);
  const mode: GlobeMode | null = detected === "webgl" && webglFailed ? "static" : detected;
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);

  const [stage, setStage] = useState<GlobeStage>(initialStage);
  /** The stage the camera has reached, kept in step during a flight. */
  const [shown, setShown] = useState<GlobeStage>(initialStage);
  const [flying, setFlying] = useState(false);
  const [ready, setReady] = useState(false);
  const [entering, setEntering] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const handleRef = useRef<GlobeRendererHandle | null>(null);
  const markerRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const pose = useRef<CameraPose>(stagePose(initialStage, target));
  const flight = useRef<Flight | null>(null);
  const needsDraw = useRef(true);
  const shownRef = useRef(initialStage);
  const spinPausedUntil = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const settings = useRef({ reduced, stage, mode });
  useEffect(() => {
    settings.current = { reduced, stage, mode };
  });

  const placeName = useCallback(
    (s: GlobeStage) => (s === "earth" ? text.stage.earth : s === "country" ? (location.country ?? text.stage.country) : s === "city" ? (location.city ?? text.stage.city) : projectName),
    [text, location.country, location.city, projectName],
  );

  // One animation loop: advances the flight or the idle spin, draws only when the pose changed.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const f = flight.current;
      let changed = needsDraw.current;
      if (f) {
        const t = f.duration > 0 ? (now - f.start) / f.duration : 1;
        pose.current = flightPose(f.from, f.to, t);
        changed = true;
        const reached = stageAtAltitude(pose.current.altitude);
        if (reached !== shownRef.current) {
          shownRef.current = reached;
          setShown(reached);
        }
        if (t >= 1) {
          flight.current = null;
          f.done();
        }
      } else {
        const { reduced: still, stage: at, mode: m } = settings.current;
        if (!still && at === "earth" && m === "webgl" && !drag.current && now > spinPausedUntil.current) {
          pose.current = { ...pose.current, dir: rotateY(pose.current.dir, SPIN_RADIANS_PER_SECOND * dt) };
          changed = true;
        }
      }
      if (changed && handleRef.current) {
        handleRef.current.setPose(pose.current);
        needsDraw.current = false;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // The URL follows the stage the camera is at.
  useEffect(() => {
    setUrlParams({ [GLOBE_STAGE_PARAM]: shown === "earth" ? null : shown });
  }, [shown]);

  const flyTo = useCallback(
    (to: GlobeStage, opts: { stretch?: number; then?: () => void } = {}) => {
      const from = pose.current;
      const fromStage = stageAtAltitude(from.altitude);
      const duration = settings.current.reduced ? 0 : Math.max(700, flightDuration(fromStage, to)) * (opts.stretch ?? 1);
      setFlying(true);
      flight.current = {
        from,
        to: stagePose(to, target),
        start: performance.now(),
        duration,
        done: () => {
          setStage(to);
          setFlying(false);
          setAnnouncement(text.arrived(placeName(to)));
          opts.then?.();
        },
      };
    },
    [target, text, placeName],
  );

  const enter = useCallback(() => {
    setEntering(true);
    const go = () => router.push(tourHref);
    const portal = portalRef.current;
    const marker = markerRef.current?.getBoundingClientRect();
    if (settings.current.reduced || !portal || !marker || typeof portal.animate !== "function") return go();
    const x = marker.left + marker.width / 2;
    const y = marker.top + marker.height / 2;
    portal
      .animate(
        [
          { clipPath: `circle(32px at ${x}px ${y}px)`, opacity: 0.4 },
          { clipPath: `circle(150vmax at ${x}px ${y}px)`, opacity: 1 },
        ],
        { duration: 900, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" },
      )
      .finished.then(go, go);
  }, [router, tourHref]);

  useEffect(() => {
    router.prefetch(tourHref);
    router.prefetch(enterHref);
  }, [router, tourHref, enterHref]);

  const busy = flying || entering;
  const explore = () => {
    if (busy) return;
    if (stage === "site") return enter();
    flyTo("site", { stretch: EXPLORE_STRETCH, then: enter });
  };
  const pressMarker = () => {
    if (busy) return;
    const next = childStage(stage);
    if (next) flyTo(next);
    else enter();
  };
  const up = parentStage(stage);

  const turn = (dxPx: number, dyPx: number) => {
    const p = pose.current;
    const at = vectorToLatLng(p.dir);
    // Degrees per pixel shrink with the height, so a drag moves the ground about as far as the finger.
    const k = 0.3 * Math.min(1, p.altitude / 2.4);
    const lat = Math.max(-80, Math.min(80, at.lat + dyPx * k));
    pose.current = { ...p, dir: latLngToVector({ lat, lng: at.lng - dxPx * k }) };
    needsDraw.current = true;
    spinPausedUntil.current = performance.now() + SPIN_RESUME_MS;
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (busy || !e.isPrimary) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    turn(e.clientX - d.x, e.clientY - d.y);
    drag.current = { ...d, x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (busy) return;
    const step = 24;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    turn(move[0], move[1]);
  };

  const hint = shown === "earth" ? text.pick(placeName("country")) : shown === "country" ? text.pick(placeName("city")) : shown === "city" ? text.pickProject : text.enterProject;
  const markerLabel = shown === "earth" ? placeName("country") : shown === "country" ? placeName("city") : projectName;
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  const exploreClass = "flex h-11 items-center gap-2 rounded-xl bg-[var(--brand-accent,#c9a46a)] px-4 text-sm font-semibold text-zinc-950 shadow-lg disabled:opacity-60";
  const chip = "flex h-11 items-center gap-2 rounded-xl bg-zinc-900/70 px-3 text-sm font-medium text-white ring-1 ring-white/15 backdrop-blur-md";

  return (
    <div
      lang={locale}
      dir={dir}
      style={brandStyle(brand)}
      className="relative h-[100dvh] w-full overflow-hidden bg-[#03060c] text-white [background-image:radial-gradient(circle_at_80%_15%,rgba(255,190,110,0.22),transparent_22%),radial-gradient(circle_at_50%_50%,#0b1424,#03060c_70%)]"
      data-testid="globe-intro"
      data-stage={shown}
      data-mode={mode ?? "poster"}
    >
      {/* Poster until a renderer is ready: a lit sphere, so first paint never waits for WebGL or data. */}
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700 motion-reduce:transition-none ${ready ? "opacity-0" : "opacity-100"}`}>
        {shown === "earth" && <div className="aspect-square w-[min(68vh,82vw)] rounded-full bg-[radial-gradient(circle_at_35%_30%,#3d7fb3,#123a5e_55%,#06182b_75%)] shadow-[0_0_80px_rgba(80,150,255,0.35)]" />}
      </div>

      <div
        className={`absolute inset-0 touch-none outline-none transition-opacity duration-700 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 ${ready ? "opacity-100" : "opacity-0"} ${busy ? "" : "cursor-grab active:cursor-grabbing"}`}
        tabIndex={0}
        role="application"
        aria-label={text.dragHint}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {mode && (
          <Suspense fallback={null}>
            {mode === "webgl" ? (
              <GlobeCanvas target={target} shapesUrl={shapesUrl} accent={brand.accent} markerRef={markerRef} handleRef={handleRef} onReady={() => { needsDraw.current = true; setReady(true); }} onFail={() => setWebglFailed(true)} />
            ) : (
              <StaticMap target={target} shapesUrl={shapesUrl} accent={brand.accent} markerRef={markerRef} handleRef={handleRef} onReady={() => { needsDraw.current = true; setReady(true); }} onFail={() => setReady(true)} />
            )}
          </Suspense>
        )}
      </div>

      {/* The project marker: the renderer moves it onto the project; before that it sits in the middle. */}
      <div ref={markerRef} onPointerEnter={() => (spinPausedUntil.current = performance.now() + SPIN_RESUME_MS)} className="pointer-events-auto absolute top-0 z-10 transition-opacity duration-300" style={{ left: 0, transform: "translate3d(50vw, 50dvh, 0)" }} data-testid="globe-marker">
        <button
          type="button"
          onClick={pressMarker}
          disabled={busy}
          style={{ left: 0 }}
          className={`group absolute top-0 -translate-x-1/2 -translate-y-full ${shown === "city" || shown === "site" ? "" : "pb-1"}`}
          aria-label={shown === "site" ? `${text.enterProject}: ${projectName}` : text.pick(markerLabel)}
        >
          {shown === "city" || shown === "site" ? (
            <span className="flex flex-col items-center">
              <span className="mb-1 rounded-md bg-zinc-950/80 px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-white/15">{projectName}</span>
              <span className={`flex items-center justify-center overflow-hidden rounded-full bg-zinc-900/90 ring-2 ring-[var(--brand-accent,#c9a46a)] shadow-[0_0_24px_rgba(0,0,0,0.6)] transition-transform group-hover:scale-105 motion-reduce:transition-none ${shown === "site" ? "size-24" : "size-16"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="" className="size-2/3 object-contain" />
              </span>
              <span className="h-8 w-px bg-white/70" />
              <span className="size-2.5 rounded-full bg-white ring-4 ring-white/25" />
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-full bg-zinc-950/80 px-3 py-1.5 text-sm font-semibold whitespace-nowrap ring-1 ring-white/20 backdrop-blur group-hover:bg-zinc-900">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--brand-accent,#c9a46a)] opacity-70 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2.5 rounded-full bg-[var(--brand-accent,#c9a46a)]" />
              </span>
              {markerLabel}
              <span aria-hidden="true">{dir === "rtl" ? "←" : "→"}</span>
            </span>
          )}
        </button>
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3 md:p-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <span className={`${chip} px-2`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={projectName} className="h-8 w-auto max-w-24 object-contain" />
          </span>
          <button type="button" className={`${chip} disabled:opacity-40`} disabled={!up || busy} onClick={() => up && flyTo(up)} data-testid="globe-back">
            <span aria-hidden="true">{dir === "rtl" ? "→" : "←"}</span>
            {text.back}
          </button>
          <label className={chip}>
            <span className="sr-only">{text.stagePicker}</span>
            <select
              value={shown}
              disabled={busy}
              onChange={(e) => flyTo(e.target.value as GlobeStage)}
              className="bg-transparent text-white outline-none [&>option]:bg-zinc-900"
              data-testid="globe-stage-picker"
            >
              {GLOBE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {placeName(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <LocaleSwitch locale={locale} defaultLocale={defaultLocale} />
          <Link href={enterHref} className={`${chip} underline-offset-2 hover:underline`} data-testid="globe-skip">
            {text.skip}
          </Link>
          <button type="button" onClick={explore} disabled={busy} className={`hidden md:flex ${exploreClass}`} data-testid="globe-explore">
            {text.explore}
            <span aria-hidden="true">{dir === "rtl" ? "←" : "→"}</span>
          </button>
        </div>
      </header>

      {/* On phones the hint, the nearby places and the explore button stack at the bottom, within thumb reach. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-3 md:p-5">
      {!busy && (
        <p className="w-fit rounded-full bg-zinc-950/70 px-4 py-1.5 text-sm text-zinc-200 ring-1 ring-white/10 backdrop-blur md:fixed md:top-6 md:left-1/2 md:-translate-x-1/2" data-testid="globe-hint">
          {hint}
        </p>
      )}

      {stage === "site" && !busy && location.nearby.length > 0 && (
        <section className="pointer-events-auto w-full" aria-label={text.nearby}>
          <ul className="mx-auto flex max-w-4xl flex-wrap justify-center gap-2">
            {location.nearby.map((n) => (
              <li key={n.name} className="flex items-center gap-2 rounded-full bg-zinc-950/75 px-3 py-1.5 text-xs ring-1 ring-white/15 backdrop-blur">
                <span className="rounded-full bg-[var(--brand-accent,#c9a46a)] px-1.5 font-semibold text-zinc-950">{text.minutes(num.format(n.minutes))}</span>
                {n.name}
              </li>
            ))}
          </ul>
        </section>
      )}
      {stage === "earth" && !busy && ready && <p className="hidden text-center text-xs text-zinc-400 md:block">{text.dragHint}</p>}
      <button type="button" onClick={explore} disabled={busy} className={`pointer-events-auto w-full max-w-sm justify-center md:hidden ${exploreClass}`} data-testid="globe-explore-mobile">
        {text.explore}
        <span aria-hidden="true">{dir === "rtl" ? "←" : "→"}</span>
      </button>
      </div>

      {/* Grows from the marker into the project's facade, then the project opens. */}
      <div ref={portalRef} aria-hidden="true" className={`pointer-events-none fixed inset-0 z-50 bg-zinc-950 ${entering ? "" : "hidden"}`} style={{ clipPath: "circle(0px at 50% 50%)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={posterUrl} alt="" className="h-full w-full object-contain" />
      </div>

      <p className="sr-only" aria-live="polite" data-testid="globe-announcement">
        {announcement}
      </p>
    </div>
  );
}
