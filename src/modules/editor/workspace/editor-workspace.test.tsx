import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SceneList, ScenePreview } from "../index";

const scenes = [
  { id: "facade", title: "Facade", depth: 0, href: "/editor/demo?scene=facade", hotspotCount: 3 },
  { id: "ground", title: "Ground floor", depth: 1, href: "/editor/demo?scene=ground", hotspotCount: 2 },
];

describe("SceneList", () => {
  it("lists every scene with a link and marks the selected one", () => {
    render(<SceneList scenes={scenes} selectedId="ground" />);
    const links = within(screen.getByRole("navigation", { name: "Scenes" })).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/editor/demo?scene=facade", "/editor/demo?scene=ground"]);
    expect(links[1].getAttribute("aria-current")).toBe("page");
    expect(links[0].getAttribute("aria-current")).toBeNull();
    expect(links[1].textContent).toContain("ground · 2");
  });
});

describe("ScenePreview", () => {
  it("draws the image and one outline per hotspot in image pixels", () => {
    const { container } = render(
      <ScenePreview
        title="Ground floor"
        imageUrl="/files/demo/images/ground.svg"
        scene={{
          id: "ground",
          image: { path: "images/ground.svg", width: 1000, height: 800 },
          hotspots: [{ id: "g-01", points: [[0, 0], [10, 0], [10, 10]], target: { unit: "G-01" } }],
        }}
      />,
    );
    const svg = screen.getByRole("img", { name: "Ground floor" });
    expect(svg.getAttribute("viewBox")).toBe("0 0 1000 800");
    expect(container.querySelector("image")?.getAttribute("href")).toBe("/files/demo/images/ground.svg");
    expect(container.querySelector('[data-hotspot="g-01"]')?.getAttribute("points")).toBe("0,0 10,0 10,10");
  });
});
