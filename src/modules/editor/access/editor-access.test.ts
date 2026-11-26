import { describe, expect, it } from "vitest";
import { isEditorEnabled } from "../index";

describe("isEditorEnabled", () => {
  it("is on only for EDITOR_ENABLED=true", () => {
    expect(isEditorEnabled({ EDITOR_ENABLED: "true" })).toBe(true);
  });

  it.each([undefined, "", "false", "1", "TRUE", "yes"])("is off for %j", (value) => {
    expect(isEditorEnabled({ EDITOR_ENABLED: value })).toBe(false);
  });
});
