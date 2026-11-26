import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { towerFloors, towerUnits, typicalFloor } from "../__fixtures__/typical-tower";
import { FloorPicker, SceneStage, SidePanel, hotspotUnitCode } from "../index";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

const Tower = () => (
  <>
    <FloorPicker floors={towerFloors.map((f) => f.floor)} locale="en" />
    <SceneStage
      scene={typicalFloor}
      imageUrl="/t.svg"
      units={towerUnits}
      sceneTitles={{ typical: "Typical floor" }}
      sceneCounts={{}}
      sceneHrefs={{}}
      floors={towerFloors}
      currency="EGP"
      locale="en"
    />
    <SidePanel sceneTitle="Typical floor" units={towerUnits} currency="EGP" locale="en" />
  </>
);

const hotspotNames = () => screen.getAllByRole("button").filter((b) => b.tagName === "polygon").map((b) => b.getAttribute("aria-label"));
const statuses = () => screen.getAllByRole("button").filter((b) => b.tagName === "polygon").map((b) => b.getAttribute("data-status"));

beforeEach(() => {
  window.history.replaceState(null, "", "/p/tower/typical");
});

describe("hotspotUnitCode", () => {
  it("resolves a typical floor hotspot to the code on the given floor", () => {
    const [a] = typicalFloor.hotspots;
    expect(hotspotUnitCode(a, towerFloors[1])).toBe("2A");
    expect(hotspotUnitCode(a)).toBeUndefined();
    expect(hotspotUnitCode({ id: "x", points: [], target: { unit: "G-01" } })).toBe("G-01");
    expect(hotspotUnitCode({ id: "x", points: [], target: { scene: "s" } })).toBeUndefined();
  });
});

describe("FloorPicker on a typical floor", () => {
  it("offers every concrete floor and starts on the first", () => {
    render(<Tower />);
    const picker = screen.getByRole("combobox", { name: "Floor" }) as HTMLSelectElement;
    expect(within(picker).getAllByRole("option").map((o) => o.textContent)).toEqual(["1", "2", "3"]);
    expect(picker.value).toBe("1");
    expect(hotspotNames()).toEqual(["Unit 1A, Sold", "Unit 1B, Available"]);
    expect(statuses()).toEqual(["sold", "available"]);
  });

  it("switches unit codes and statuses with the selected floor and puts it in the URL", () => {
    render(<Tower />);
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), { target: { value: "3" } });
    expect(window.location.search).toBe("?floor=3");
    expect(hotspotNames()).toEqual(["Unit 3A, Reserved", "Unit 3B, Sold"]);
    expect(statuses()).toEqual(["reserved", "sold"]);
  });

  it("reads the floor from a shared link and selects that floor's unit", () => {
    window.history.replaceState(null, "", "/p/tower/typical?floor=2");
    render(<Tower />);
    expect((screen.getByRole("combobox", { name: "Floor" }) as HTMLSelectElement).value).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: "Unit 2B, Reserved" }));
    expect(window.location.search).toBe("?floor=2&unit=2B");
    expect(screen.getByRole("region", { name: "Unit 2B" })).toBeTruthy();
  });

  it("clears the unit selection when the floor changes", () => {
    window.history.replaceState(null, "", "/p/tower/typical?floor=2&unit=2B");
    render(<Tower />);
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), { target: { value: "1" } });
    expect(window.location.search).toBe("?floor=1");
    expect(screen.getByRole("region", { name: "Details" })).toBeTruthy();
  });

  it("falls back to the first floor for a floor outside the range", () => {
    window.history.replaceState(null, "", "/p/tower/typical?floor=9");
    render(<Tower />);
    expect(hotspotNames()).toEqual(["Unit 1A, Sold", "Unit 1B, Available"]);
  });

  it("renders nothing without floors", () => {
    const { container } = render(<FloorPicker floors={[]} locale="ar" />);
    expect(container.innerHTML).toBe("");
  });
});
