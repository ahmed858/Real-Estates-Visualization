import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceneViews, viewerText } from "../index";

const views = [
  { id: "building-3d", title: "3D building", href: "/p/x/building-3d", type: "model-3d" as const },
  { id: "roof", title: "Rooftop", href: "/p/x/roof", type: "panorama-360" as const },
];

describe("SceneViews", () => {
  it("links every view with its badge and marks the current one", () => {
    render(<SceneViews views={views} currentId="roof" text={viewerText("en")} />);
    const nav = screen.getByRole("navigation", { name: "3D and 360° views" });
    expect(nav.querySelector('a[href="/p/x/building-3d"]')?.textContent).toBe("3D3D building");
    expect(screen.getByText("Rooftop").closest("[aria-current]")?.getAttribute("aria-current")).toBe("page");
    expect(nav.querySelectorAll("a")).toHaveLength(1);
  });

  it("renders nothing without views", () => {
    const { container } = render(<SceneViews views={[]} currentId="x" text={viewerText("ar")} />);
    expect(container.innerHTML).toBe("");
  });
});
