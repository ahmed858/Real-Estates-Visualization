import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSwitch, ProjectHeader, ViewerLayout, viewerText } from "../index";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockClear();
  window.history.replaceState(null, "", "/p/demo-villa/ground?unit=G-01");
});

describe("LocaleSwitch", () => {
  it("offers English on an Arabic page and keeps scene and unit when switching", () => {
    render(<LocaleSwitch locale="ar" defaultLocale="ar" />);
    const button = screen.getByRole("button", { name: "English" });
    expect(button.getAttribute("lang")).toBe("en");
    fireEvent.click(button);
    expect(push).toHaveBeenCalledWith("/p/demo-villa/ground?unit=G-01&lang=en");
  });

  it("goes back to the default language without a lang parameter", () => {
    window.history.replaceState(null, "", "/p/tower/typical?floor=2&lang=en");
    render(<LocaleSwitch locale="en" defaultLocale="ar" />);
    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    expect(push).toHaveBeenCalledWith("/p/tower/typical?floor=2");
  });

  it("adds lang=ar for an English-default project switched to Arabic", () => {
    window.history.replaceState(null, "", "/p/tower");
    render(<LocaleSwitch locale="en" defaultLocale="en" />);
    fireEvent.click(screen.getByRole("button", { name: "العربية" }));
    expect(push).toHaveBeenCalledWith("/p/tower?lang=ar");
  });
});

describe("header with the switch, in both directions", () => {
  it.each([
    ["ar", "rtl", "English"],
    ["en", "ltr", "العربية"],
  ] as const)("%s page is %s and offers %s", (locale, dir, other) => {
    const { container } = render(
      <ViewerLayout
        locale={locale}
        brand={{ primary: "#1a6b4f", accent: "#c89b3c" }}
        header={<ProjectHeader name="Villa" logoUrl="/logo.svg" text={viewerText(locale)} actions={<LocaleSwitch locale={locale} defaultLocale="ar" />} />}
        scene={null}
        legend={null}
        panel={null}
      />,
    );
    expect((container.firstElementChild as HTMLElement).getAttribute("dir")).toBe(dir);
    expect(screen.getByRole("banner").contains(screen.getByRole("button", { name: other }))).toBe(true);
  });
});
