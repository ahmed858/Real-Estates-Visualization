import { describe, expect, it } from "vitest";
import { parseLeadWebhooks } from "./index";

const URL_A = "https://hooks.zapier.com/hooks/catch/123/abc/";
const URL_B = "https://hook.eu1.make.com/xyz?token=a=b";

describe("parseLeadWebhooks", () => {
  it("is empty when unset or blank", () => {
    expect(parseLeadWebhooks(undefined).size).toBe(0);
    expect(parseLeadWebhooks("  ").size).toBe(0);
  });

  it("maps each slug to its webhook, splitting at the first =", () => {
    const map = parseLeadWebhooks(` demo-villa=${URL_A} , client-towers=${URL_B},`);
    expect([...map]).toEqual([
      ["demo-villa", URL_A],
      ["client-towers", URL_B],
    ]);
  });

  it("skips bad entries without printing the URL", () => {
    const warnings: string[] = [];
    const map = parseLeadWebhooks(
      ["no-equals", `Bad_Slug=${URL_A}`, "plain=http://hooks.example.com/x", "creds=https://u:p@hooks.example.com/x", "junk=not a url", `ok=${URL_A}`, `ok=${URL_B}`].join(","),
      (m) => warnings.push(m),
    );
    expect([...map]).toEqual([["ok", URL_A]]);
    expect(warnings).toHaveLength(6);
    expect(warnings[0]).toContain("entry 1");
    expect(warnings[2]).toContain('"plain"');
    expect(warnings[5]).toContain("second");
    for (const w of warnings) {
      expect(w).not.toContain("hooks.");
      expect(w).not.toContain("u:p");
    }
  });
});
