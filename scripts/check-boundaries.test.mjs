import { describe, expect, it } from "vitest";
import { checkFile, extractImports } from "./check-boundaries.mjs";

const SRC = "/repo/src";
const inModule = (m, f = "x.ts") => `${SRC}/modules/${m}/${f}`;

describe("extractImports", () => {
  it("finds static, re-export, side-effect and dynamic imports", () => {
    const src = `import a from "a";\nexport { b } from "b";\nimport "c";\nconst d = import("d");`;
    expect(extractImports(src)).toEqual(["a", "b", "c", "d"]);
  });

  it("ignores imports mentioned in comments", () => {
    expect(extractImports(`// import x from "@/modules/a"\n/* from "b" */`)).toEqual([]);
  });
});

describe("checkFile", () => {
  it("allows a permitted dependency through the public index", () => {
    expect(checkFile(inModule("domain"), `import { x } from "@/modules/schema";`, SRC)).toEqual([]);
  });

  it("rejects a forbidden dependency", () => {
    const errors = checkFile(inModule("schema"), `import { x } from "@/modules/domain";`, SRC);
    expect(errors.join()).toMatch(/may not depend/);
  });

  it("rejects deep imports into another module", () => {
    const errors = checkFile(inModule("domain"), `import { x } from "@/modules/schema/project";`, SRC);
    expect(errors.join()).toMatch(/deep import/);
  });

  it("rejects relative imports that escape the module", () => {
    const errors = checkFile(inModule("domain"), `import { x } from "../schema";`, SRC);
    expect(errors.join()).toMatch(/escapes module/);
  });

  it("allows relative imports inside the same module", () => {
    expect(checkFile(inModule("domain", "a/b.ts"), `import { x } from "../c";`, SRC)).toEqual([]);
  });

  it("lets app code use a module's public index only", () => {
    const app = `${SRC}/app/page.tsx`;
    expect(checkFile(app, `import { V } from "@/modules/viewer";`, SRC)).toEqual([]);
    expect(checkFile(app, `import { V } from "@/modules/viewer/Scene";`, SRC).join()).toMatch(/deep import/);
  });
});
