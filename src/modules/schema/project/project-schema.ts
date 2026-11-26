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

export const PROJECT_SCHEMA_VERSION = 1;

export const SCENE_KINDS = ["facade", "masterplan", "building", "floor", "unit-plan", "other"] as const;

/**
 * Scene renderer types (Strategy hook). Only the 2D image renderer exists in v1;
 * 360° and 3D renderers are added here later without changing the tree.
 */
export const SCENE_RENDERER_TYPES = ["image-2d"] as const;

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
  })
  .strict();

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

export const hotspotSchema = z
  .object({
    id: idSchema,
    points: z.array(pointSchema).min(3, "a polygon needs at least 3 points"),
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
  type: z.enum(SCENE_RENDERER_TYPES).default("image-2d"),
  title: localizedTextSchema,
  image: sceneImageSchema,
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
    root: sceneSchema,
  })
  .strict();

export type ProjectConfig = z.infer<typeof projectConfigShapeSchema>;
export type ProjectConfigInput = z.input<typeof projectConfigShapeSchema>;
export type ProjectInfo = z.infer<typeof projectInfoSchema>;
export type SceneKind = (typeof SCENE_KINDS)[number];
export type SceneRendererType = (typeof SCENE_RENDERER_TYPES)[number];
export type SceneImage = z.infer<typeof sceneImageSchema>;
export type Hotspot = z.infer<typeof hotspotSchema>;
export type HotspotTarget = z.infer<typeof hotspotTargetSchema>;
export type TypicalFloors = z.infer<typeof typicalFloorsSchema>;
export type Point = z.infer<typeof pointSchema>;
