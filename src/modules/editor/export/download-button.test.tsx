import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseProjectConfig, type ProjectConfig } from "@/modules/schema";
import { DownloadButton, EditorSession } from "../index";

const title = (en: string) => ({ ar: `عربي ${en}`, en });

function config(): ProjectConfig {
  const parsed = parseProjectConfig({
    schemaVersion: 1,
    project: {
      slug: "demo",
      name: title("Demo"),
      defaultLocale: "en",
      currency: "EGP",
      contact: { whatsapp: "+201001234567" },
      branding: { logo: "images/logo.svg", primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
    },
    root: { id: "facade", kind: "facade", title: title("Facade"), image: { path: "images/facade.svg", width: 100, height: 100 } },
  });
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors));
  return parsed.value;
}

afterEach(() => vi.restoreAllMocks());

describe("DownloadButton", () => {
  it("is blocked while there are errors", () => {
    render(<DownloadButton config={config()} errorCount={2} />);
    expect(screen.getByRole("button", { name: "Download project.json" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Fix the errors above to download.")).toBeTruthy();
  });

  it("downloads the serialized config as project.json", async () => {
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => {
      blobs.push(b);
      return "blob:project";
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("project.json");
      expect(this.href).toBe("blob:project");
    });
    render(<DownloadButton config={config()} errorCount={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Download project.json" }));
    expect(click).toHaveBeenCalledOnce();
    const text = await blobs[0].text();
    expect(JSON.parse(text).root.id).toBe("facade");
    expect(text.endsWith("}\n")).toBe(true);
  });

  it("is blocked in the editor once an edit adds an error", () => {
    const view = render(<EditorSession config={config()} editorPath="/editor/demo" fileBaseUrl="/files/demo/" units={[]} existingFiles={["images/facade.svg", "images/logo.svg"]} />);
    const button = screen.getByRole("button", { name: "Download project.json" });
    expect(button.hasAttribute("disabled")).toBe(false);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 200, height: 200, x: 0, y: 0, right: 200, bottom: 200, toJSON: () => ({}) } as DOMRect);
    const canvas = view.container.querySelector("svg[role='application']")!;
    for (const [x, y] of [[60, 60], [90, 60], [90, 90], [60, 60]]) fireEvent.click(canvas, { clientX: x * 2, clientY: y * 2 });
    expect(button.hasAttribute("disabled")).toBe(true);
  });
});
