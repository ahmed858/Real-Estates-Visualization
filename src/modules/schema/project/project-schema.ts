// Shape of a client project config (project info + scene tree).
// The scene tree is a Composite: every scene is an image with hotspots and may contain child scenes.
import { z } from "zod";
import {
  hexColorSchema,
  idSchema,
  localeSchema,
  localizedTextSchema,
  pointSchema,
  projectFilePathSchema,
} from "./primitives";
import { unitsSourceSchema } from "./units-source";

export const PROJECT_SCHEMA_VERSION = 1;

/**
 * What a scene shows. The kind labels the level for people and agents; the
 * tree itself has no fixed depth, so a tower (building → floor), a compound
 * (masterplan → phase → block → cluster → villa units) or a mix all use the
 * same scene shape. Only `floor` has extra rules (typical floors).
 */
export const SCENE_KINDS = ["facade", "masterplan", "phase", "block", "cluster", "building", "floor", "unit-plan", "other"] as const;

/**
 * Scene renderer types (Strategy hook). `image-2d` is the core; the premium
 * types (`rotation-360`, a turntable of frames, `model-3d`, a .glb model, and
 * `panorama-360`, an equirectangular photo the visitor looks around in) add
 * their own optional blocks and keep `image` as the poster and fallback.
 */
export const SCENE_RENDERER_TYPES = ["image-2d", "rotation-360", "model-3d", "panorama-360"] as const;
/** The renderer a scene uses when project.json does not name one. */
export const DEFAULT_SCENE_RENDERER_TYPE = "image-2d" satisfies (typeof SCENE_RENDERER_TYPES)[number];

/** The project's place on the map (WGS 84 degrees) and its address in both languages. */
export const projectLocationSchema = z
  .object({
    lat: z.number().min(-90, "must be between -90 and 90").max(90, "must be between -90 and 90"),
    lng: z.number().min(-180, "must be between -180 and 180").max(180, "must be between -180 and 180"),
    address: localizedTextSchema,
  })
  .strict();

export const projectInfoSchema = z
  .object({
    slug: idSchema,
    name: localizedTextSchema,
    defaultLocale: localeSchema,
    currency: z.string().regex(/^[A-Z]{3}$/, "must be a 3-letter ISO 4217 code such as EGP"),
    contact: z
      .object({
        whatsapp: z
          .string()
          .regex(/^\+[1-9]\d{7,14}$/, "must be an international number with + and digits only, e.g. +201001234567"),
      })
      .strict(),
    branding: z
      .object({
        logo: projectFilePathSchema,
        primaryColor: hexColorSchema,
        accentColor: hexColorSchema,
      })
      .strict(),
    /** Where the project is; the root scene's panel shows the address and an "Open in maps" link. */
    location: projectLocationSchema.optional(),
    /** false hides the project from visitors (404) unless preview is on. Missing means published. */
    published: z.boolean().optional(),
  })
  .strict();

/** Whether visitors may open the project. A project is published unless it says `published: false`. */
export const isProjectPublished = (project: { published?: boolean }): boolean => project.published !== false;

export const sceneImageSchema = z
  .object({
    path: projectFilePathSchema,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

/**
 * Where a hotspot leads: a child scene, a unit by full code, or (only on a
 * typical floor) a unit by suffix, expanded per floor with the floor's unit code template.
 */
export const hotspotTargetSchema = z.union([
  z.object({ scene: idSchema }).strict(),
  z.object({ unit: z.string().trim().min(1, "unit code is required") }).strict(),
  z.object({ unitSuffix: z.string().trim().min(1, "unit suffix is required") }).strict(),
]);

/** Placeholder in `rotation.frames` replaced by the 1-based frame number, zero-padded to the digits of `count`. */
export const ROTATION_FRAME_PLACEHOLDER = "{index}";
export const ROTATION_MAX_FRAMES = 360;

/** A turntable: `count` frames of the same size taken around the building, in order. */
export const sceneRotationSchema = z
  .object({
    frames: projectFilePathSchema
      .refine((p) => p.includes(ROTATION_FRAME_PLACEHOLDER), `must contain ${ROTATION_FRAME_PLACEHOLDER}, e.g. rotations/tower/frame-${ROTATION_FRAME_PLACEHOLDER}.jpg`)
      .refine((p) => p.startsWith("rotations/"), "must be in the rotations/ folder, e.g. rotations/tower/frame-{index}.jpg"),
    count: z.number().int().min(2, "a rotation needs at least 2 frames").max(ROTATION_MAX_FRAMES, `at most ${ROTATION_MAX_FRAMES} frames`),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    /** Frame shown first (1-based). Missing means 1. */
    start: z.number().int().min(1).optional(),
  })
  .strict();

/** A 3D model in glTF binary format. */
export const sceneModelSchema = z
  .object({
    path: projectFilePathSchema
      .refine((p) => p.toLowerCase().endsWith(".glb"), "must be a .glb file (glTF binary)")
      .refine((p) => p.startsWith("models/"), "must be in the models/ folder, e.g. models/tower.glb"),
  })
  .strict();

/** Image types a panorama may use (no SVG: a panorama is a photo or a render). */
export const PANORAMA_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

/** A 360° x 180° equirectangular picture: twice as wide as it is tall. */
export const scenePanoramaSchema = z
  .object({
    path: projectFilePathSchema
      .refine((p) => PANORAMA_EXTENSIONS.some((e) => p.toLowerCase().endsWith(e)), `must be a ${PANORAMA_EXTENSIONS.join(", ")} image`)
      .refine((p) => p.startsWith("panoramas/"), "must be in the panoramas/ folder, e.g. panoramas/living-room.jpg"),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict()
  .refine((p) => p.width === p.height * 2, { message: "an equirectangular panorama is exactly twice as wide as it is tall (e.g. 4096x2048)", path: ["width"] });

const polygonSchema = z.array(pointSchema).min(3, "a polygon needs at least 3 points");

export const hotspotSchema = z
  .object({
    id: idSchema,
    /** Polygon on the scene image (on a premium scene: the poster). */
    points: polygonSchema,
    /** rotation-360 only: the polygon on each frame (by 1-based frame number) where the hotspot is visible. */
    frames: z.record(z.string().regex(/^[1-9]\d*$/, "frame numbers start at 1"), polygonSchema).optional(),
    /** model-3d only: the name of the mesh in the model that this hotspot is. */
    mesh: z.string().trim().min(1, "mesh name is required").optional(),
    target: hotspotTargetSchema,
  })
  .strict();

/** One plan serving a range of floors, e.g. floors 2 to 10 of a tower. */
export const typicalFloorsSchema = z
  .object({
    from: z.number().int(),
    to: z.number().int(),
    unitCode: z
      .string()
      .refine((t) => t.includes("{floor}") && t.includes("{suffix}"), "must contain {floor} and {suffix}, e.g. {floor}{suffix}"),
  })
  .strict();

const sceneBaseSchema = z.object({
  id: idSchema,
  kind: z.enum(SCENE_KINDS),
  type: z.enum(SCENE_RENDERER_TYPES).default(DEFAULT_SCENE_RENDERER_TYPE),
  title: localizedTextSchema,
  image: sceneImageSchema,
  /** Required on, and only allowed on, a rotation-360 scene. */
  rotation: sceneRotationSchema.optional(),
  /** Required on, and only allowed on, a model-3d scene. */
  model: sceneModelSchema.optional(),
  /** Required on, and only allowed on, a panorama-360 scene. */
  panorama: scenePanoramaSchema.optional(),
  floors: typicalFloorsSchema.optional(),
  hotspots: z.array(hotspotSchema).default([]),
});

export type Scene = z.infer<typeof sceneBaseSchema> & { children: Scene[] };
export type SceneInput = z.input<typeof sceneBaseSchema> & { children?: SceneInput[] };

export const sceneSchema: z.ZodType<Scene, SceneInput> = sceneBaseSchema
  .extend({
    get children(): z.ZodDefault<z.ZodArray<z.ZodType<Scene, SceneInput>>> {
      return z.array(sceneSchema).default([]);
    },
  })
  .strict();

export const projectConfigShapeSchema = z
  .object({
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    project: projectInfoSchema,
    /** Where unit rows come from. Missing means the local units.xlsx. */
    units: unitsSourceSchema.optional(),
    root: sceneSchema,
  })
  .strict();

export type ProjectConfig = z.infer<typeof projectConfigShapeSchema>;
export type ProjectConfigInput = z.input<typeof projectConfigShapeSchema>;
export type ProjectInfo = z.infer<typeof projectInfoSchema>;
export type SceneRotation = z.infer<typeof sceneRotationSchema>;
export type SceneModel = z.infer<typeof sceneModelSchema>;
export type ScenePanorama = z.infer<typeof scenePanoramaSchema>;
export type SceneKind = (typeof SCENE_KINDS)[number];
export type SceneRendererType = (typeof SCENE_RENDERER_TYPES)[number];
export type SceneImage = z.infer<typeof sceneImageSchema>;
export type Hotspot = z.infer<typeof hotspotSchema>;
export type HotspotTarget = z.infer<typeof hotspotTargetSchema>;
export type TypicalFloors = z.infer<typeof typicalFloorsSchema>;
export type Point = z.infer<typeof pointSchema>;
