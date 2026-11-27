// The editor's frames-folder check, run on what the server lists for the
// demo, gives back the rotation block the demo project already uses.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listRotationFolders } from "@/modules/data-sources";
import { createSceneTree } from "@/modules/domain";
import { rotationFromFolder } from "@/modules/editor";
import { allProjects } from "../p/project-view";

describe("premium scene sources", () => {
  it("rebuilds the demo turntable's rotation from its frames folder", async () => {
    const [folder] = await listRotationFolders(join(process.cwd(), "projects"), "demo-villa");
    const loaded = await allProjects.load("demo-villa");
    const saved = createSceneTree(loaded.config).scenes.find((s) => s.type === "rotation-360");
    const { start: _start, ...rotation } = saved!.rotation!;
    expect(rotationFromFolder(folder)).toEqual({ ok: true, rotation });
  });
});
