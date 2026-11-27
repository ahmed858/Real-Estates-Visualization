import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
import { SidePanel, type UnitSummary } from "../index";

const g01: UnitSummary = {
  code: "G-01", type: "Villa", floor: 0, bedrooms: 3, bathrooms: 2, areaM2: 150, price: 4000000, status: "available",
  galleryUrls: ["/files/demo/images/a.jpg", "/files/demo/images/b.jpg", "/files/demo/images/c.jpg"],
};

const open = (locale: "en" | "ar", n: number) => {
  render(<SidePanel sceneTitle="Ground" units={{ "G-01": g01 }} currency="EGP" locale={locale} />);
  const thumbs = within(screen.getByRole("list", { name: locale === "en" ? "Photos" : "الصور" })).getAllByRole("link");
  thumbs[n].focus();
  act(() => fireEvent.click(thumbs[n]));
  return thumbs;
};
const shown = () => screen.getByRole("dialog").querySelector("img")?.getAttribute("src");
const key = (k: string, init: KeyboardEventInit = {}) => act(() => fireEvent.keyDown(document.activeElement ?? document.body, { key: k, ...init }));

beforeEach(() => {
  window.history.replaceState(null, "", "/p/demo/ground?unit=G-01");
});

describe("PhotoLightbox", () => {
  it("opens the clicked photo with focus inside", () => {
    open("en", 1);
    const dialog = screen.getByRole("dialog", { name: "Photo 2 of 3 of unit G-01" });
    expect(shown()).toBe("/files/demo/images/b.jpg");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("moves with the arrow keys and the buttons, wrapping around", () => {
    open("en", 0);
    key("ArrowRight");
    expect(shown()).toBe("/files/demo/images/b.jpg");
    key("ArrowLeft");
    key("ArrowLeft");
    expect(shown()).toBe("/files/demo/images/c.jpg");
    act(() => fireEvent.click(screen.getByRole("button", { name: "Next" })));
    expect(shown()).toBe("/files/demo/images/a.jpg");
  });

  it("flips the arrows on Arabic pages", () => {
    open("ar", 0);
    key("ArrowLeft");
    expect(shown()).toBe("/files/demo/images/b.jpg");
    expect(screen.getByRole("dialog").getAttribute("dir")).toBe("rtl");
  });

  it("keeps Tab inside the dialog", () => {
    open("en", 0);
    const buttons = within(screen.getByRole("dialog")).getAllByRole("button");
    buttons[buttons.length - 1].focus();
    key("Tab");
    expect(document.activeElement).toBe(buttons[0]);
    key("Tab", { shiftKey: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it("Escape closes only the lightbox and gives focus back to the thumbnail", () => {
    const thumbs = open("en", 2);
    key("Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Unit G-01" })).toBeTruthy();
    expect(window.location.search).toBe("?unit=G-01");
    expect(document.activeElement).toBe(thumbs[2]);
  });
});
