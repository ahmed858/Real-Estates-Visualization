import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, prefetch: () => {} }) }));

import { GlobeIntro, type GlobeIntroProps } from "../index";

const props = (locale: "ar" | "en", initialStage: GlobeIntroProps["initialStage"] = "earth"): GlobeIntroProps => ({
  locale,
  defaultLocale: "ar",
  projectName: locale === "ar" ? "جاردن ريزيدنس" : "Garden Residence",
  logoUrl: "/files/demo/images/logo.svg",
  location: {
    lat: 30.01,
    lng: 31.49,
    country: locale === "ar" ? "مصر" : "Egypt",
    city: locale === "ar" ? "القاهرة الجديدة" : "New Cairo",
    nearby: [{ name: locale === "ar" ? "شارع التسعين" : "90th Street", minutes: 5 }],
  },
  posterUrl: "/files/demo/images/facade.jpg",
  initialStage,
  enterHref: "/p/demo",
  tourHref: "/p/demo?tour=1",
  shapesUrl: "/globe/countries-110m.json",
  brand: { primary: "#5b4636", accent: "#c9a46a" },
});

describe("GlobeIntro", () => {
  it("renders right to left in Arabic, asks for the country first and offers a way straight in", () => {
    render(<GlobeIntro {...props("ar")} />);
    const intro = screen.getByTestId("globe-intro");
    expect(intro.getAttribute("dir")).toBe("rtl");
    expect(intro.getAttribute("data-stage")).toBe("earth");
    expect(screen.getByTestId("globe-hint").textContent).toBe("اختر مصر للبدء");
    expect(screen.getByTestId("globe-explore").textContent).toContain("استكشف المشروع");
    expect(screen.getByTestId("globe-skip").getAttribute("href")).toBe("/p/demo");
    expect(screen.getByRole("button", { name: "اختر مصر للبدء" })).toBeTruthy();
  });

  it("names every stage after the project's places in the stage picker", () => {
    render(<GlobeIntro {...props("en")} />);
    const options = within(screen.getByTestId("globe-stage-picker")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Earth", "Egypt", "New Cairo", "Garden Residence"]);
  });

  it("disables Back at the earth and enables it below", () => {
    const { unmount } = render(<GlobeIntro {...props("en")} />);
    expect((screen.getByTestId("globe-back") as HTMLButtonElement).disabled).toBe(true);
    unmount();
    render(<GlobeIntro {...props("en", "city")} />);
    expect((screen.getByTestId("globe-back") as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId("globe-hint").textContent).toBe("Pick the project");
  });

  it("opens on a linked stage and lists nearby places at the site", () => {
    render(<GlobeIntro {...props("en", "site")} />);
    expect(screen.getByTestId("globe-intro").getAttribute("data-stage")).toBe("site");
    const nearby = screen.getByRole("region", { name: "Near the project" });
    expect(nearby.textContent).toContain("5 min");
    expect(nearby.textContent).toContain("90th Street");
    expect(screen.getByRole("button", { name: "Press the project to go in: Garden Residence" })).toBeTruthy();
  });
});
