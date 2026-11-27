import { describe, expect, it } from "vitest";
import { STATUS_COLORS } from "../colour/palette";
import { checkBranding } from "./brand-checks";

const branding = (primaryColor: string, accentColor: string) => ({ logo: "images/logo.svg", primaryColor, accentColor });

describe("checkBranding", () => {
  it("accepts the demo projects' colours", () => {
    expect(checkBranding(branding("#1a6b4f", "#c89b3c"))).toEqual([]);
    expect(checkBranding(branding("#5b4636", "#c9a46a"))).toEqual([]);
  });

  it("warns when the accent colour is too dark to read on the stage", () => {
    expect(checkBranding(branding("#1a6b4f", "#333366"))).toEqual([
      {
        severity: "warning",
        file: "project.json",
        location: "project.branding.accentColor",
        message: "#333366 has contrast 1.7:1 on the dark stage #09090b (needs 4.5:1), so text in this colour is hard to read",
      },
    ]);
  });

  it("does not check the primary colour against the stage (it is drawn on the scene image)", () => {
    expect(checkBranding(branding("#1a1a40", "#c89b3c"))).toEqual([]);
  });

  it("warns when the primary colour looks like a status colour", () => {
    const findings = checkBranding(branding("#2f8f42", "#c89b3c"));
    expect(findings).toEqual([
      {
        severity: "warning",
        file: "project.json",
        location: "project.branding.primaryColor",
        message: `#2f8f42 looks like the "available" status colour ${STATUS_COLORS.available}, so visitors may misread unit status`,
      },
    ]);
  });

  it("warns for the accent colour too, once per matching status", () => {
    const findings = checkBranding(branding("#1a6b4f", STATUS_COLORS.sold));
    expect(findings.map((f) => [f.location, f.message.split(" status")[0]])).toEqual([
      ["project.branding.accentColor", expect.stringContaining("has contrast")],
      ["project.branding.accentColor", `${STATUS_COLORS.sold} looks like the "sold"`],
    ]);
  });
});
