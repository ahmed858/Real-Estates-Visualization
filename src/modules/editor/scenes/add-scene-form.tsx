"use client";
// Form that adds a child scene under the current scene from an image already
// in projects/<slug>/images/. The image size comes with the image list, so the
// owner only picks the image, kind, titles and (for a typical floor) the floors.
import { useState } from "react";
import { SCENE_KINDS, type ProjectConfig, type Scene, type SceneImage, type SceneKind } from "@/modules/schema";
import { toId } from "../targets/target-options";
import { buildScene } from "./build-scene";

export interface AddSceneFormProps {
  config: ProjectConfig;
  /** Images of the project folder with their sizes. */
  images: readonly SceneImage[];
  onAdd: (scene: Scene) => void;
}

export function AddSceneForm({ config, images, onAdd }: AddSceneFormProps) {
  const [imagePath, setImagePath] = useState(images[0]?.path ?? "");
  const [kind, setKind] = useState<SceneKind>("floor");
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [typedId, setTypedId] = useState<string>();
  const [typical, setTypical] = useState(false);
  const [from, setFrom] = useState("2");
  const [to, setTo] = useState("10");
  const [unitCode, setUnitCode] = useState("{floor}{suffix}");
  const [errors, setErrors] = useState<string[]>([]);

  const image = images.find((i) => i.path === imagePath);
  const id = typedId ?? toId(titleEn);
  const isTypical = typical && kind === "floor";

  const reset = () => {
    setTitleEn("");
    setTitleAr("");
    setTypedId(undefined);
    setTypical(false);
    setErrors([]);
  };

  const submit = () => {
    if (!image) return setErrors(["image: pick an image from the project's images folder"]);
    const result = buildScene(config, { id, kind, titleAr, titleEn, floors: isTypical ? { from: Number(from), to: Number(to), unitCode } : undefined }, image);
    if (!result.ok) return setErrors(result.errors);
    onAdd(result.scene);
    reset();
  };

  const field = "rounded border border-white/20 bg-zinc-900 px-2 py-1 text-sm";
  const label = "flex flex-col gap-1 text-xs text-zinc-400";
  if (images.length === 0) return <p className="text-sm text-zinc-400">Put the scene image in the project&apos;s images folder to add a scene.</p>;
  return (
    <form
      aria-label="Add a scene"
      className="flex flex-wrap items-end gap-3 rounded border border-white/10 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className={label}>
        Image
        <select className={field} value={imagePath} onChange={(e) => setImagePath(e.target.value)}>
          {images.map((i) => (
            <option key={i.path} value={i.path}>
              {i.path} ({i.width}×{i.height})
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Kind
        <select className={field} value={kind} onChange={(e) => setKind(e.target.value as SceneKind)}>
          {SCENE_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        English title
        <input className={field} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
      </label>
      <label className={label}>
        Arabic title
        <input className={field} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} dir="rtl" lang="ar" />
      </label>
      <label className={label}>
        Scene id
        <input className={field} value={id} onChange={(e) => setTypedId(e.target.value)} />
      </label>
      {kind === "floor" && (
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={typical} onChange={(e) => setTypical(e.target.checked)} />
          Typical floor (one plan for many floors)
        </label>
      )}
      {isTypical && (
        <>
          <label className={label}>
            From floor
            <input className={`${field} w-20`} type="number" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className={label}>
            To floor
            <input className={`${field} w-20`} type="number" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className={label}>
            Unit code
            <input className={field} value={unitCode} onChange={(e) => setUnitCode(e.target.value)} />
          </label>
        </>
      )}
      <button type="submit" className="rounded border border-white/20 px-3 py-1 text-sm hover:bg-white/10">
        Add scene
      </button>
      {errors.length > 0 && (
        <ul role="alert" className="w-full list-disc ps-5 text-xs text-amber-400">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
