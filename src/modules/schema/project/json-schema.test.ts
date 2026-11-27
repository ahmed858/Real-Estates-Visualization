import { describe, expect, it } from "vitest";
import { SCENE_KINDS } from "./project-schema";
import { CROSS_FIELD_RULES, projectConfigJsonSchema } from "./json-schema";

describe("projectConfigJsonSchema", () => {
  const schema = projectConfigJsonSchema() as { $defs: { Scene: { properties: { kind: { enum: string[] }; children: { items: { $ref: string } } } } }; description: string; additionalProperties: boolean };

  it("describes the recursive scene tree under a readable name", () => {
    expect(schema.$defs.Scene.properties.children.items.$ref).toBe("#/$defs/Scene");
    expect(schema.$defs.Scene.properties.kind.enum).toEqual([...SCENE_KINDS]);
  });

  it("rejects unknown fields like the parser does", () => {
    expect(schema.additionalProperties).toBe(false);
  });

  it("lists the rules a JSON Schema cannot express", () => {
    for (const rule of CROSS_FIELD_RULES) expect(schema.description).toContain(rule);
  });
});
