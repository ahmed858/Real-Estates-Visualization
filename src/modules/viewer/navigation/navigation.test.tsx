import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Scene } from "@/modules/schema";
import { Breadcrumbs, SceneStage } from "../index";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => push.mockClear());

describe("Breadcrumbs", () => {
  const items = [
    { id: "facade", title: "الواجهة", href: "/p/demo-villa" },
    { id: "ground", title: "الدور الأرضي", href: "/p/demo-villa/ground" },
  ];

  it("links every step back up and marks the last one as the current page", () => {
    render(<Breadcrumbs items={items} label="مسار التصفح" />);
    const nav = screen.getByRole("navigation", { name: "مسار التصفح" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([["الواجهة", "/p/demo-villa"]]);
    const current = within(nav).getByText("الدور الأرضي");
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(within(nav).getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows only the current page on the root scene", () => {
    render(<Breadcrumbs items={items.slice(0, 1)} label="Breadcrumbs" />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumbs" });
    expect(within(nav).queryByRole("link")).toBeNull();
    expect(within(nav).getByText("الواجهة").getAttribute("aria-current")).toBe("page");
  });
});

describe("SceneStage navigation", () => {
  const facade: Scene = {
    id: "facade",
    kind: "facade",
    type: "image-2d",
    title: { ar: "الواجهة", en: "Facade" },
    image: { path: "images/facade.svg", width: 800, height: 600 },
    hotspots: [
      { id: "ground", points: [[0, 300], [800, 300], [800, 600]], target: { scene: "ground" } },
      { id: "lost", points: [[0, 0], [10, 0], [10, 10]], target: { scene: "missing" } },
    ],
    children: [],
  };
  const stage = (
    <SceneStage
      scene={facade}
      imageUrl="/f.svg"
      units={{}}
      sceneTitles={{ facade: "Facade", ground: "Ground floor" }}
      sceneCounts={{}}
      sceneHrefs={{ facade: "/p/demo-villa", ground: "/p/demo-villa/ground" }}
      currency="EGP"
      locale="en"
    />
  );

  it("opens the scene a hotspot points to, by click and by keyboard", () => {
    render(stage);
    fireEvent.click(screen.getByRole("button", { name: "Ground floor" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Ground floor" }), { key: "Enter" });
    expect(push.mock.calls).toEqual([["/p/demo-villa/ground"], ["/p/demo-villa/ground"]]);
  });

  it("does nothing for a scene without a URL", () => {
    render(stage);
    fireEvent.click(screen.getByRole("button", { name: "missing" }));
    expect(push).not.toHaveBeenCalled();
  });
});
