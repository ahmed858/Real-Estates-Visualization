import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectInfo } from "@/modules/schema";
import { ProjectDirectory } from "./project-directory";

const info = (slug: string, defaultLocale: "ar" | "en", en: string, ar: string): ProjectInfo => ({
  slug,
  name: { ar, en },
  defaultLocale,
  currency: "EGP",
  contact: { whatsapp: "+201001234567" },
  branding: { logo: "images/logo.svg", primaryColor: "#1a6b4f", accentColor: "#c89b3c" },
});
const fileUrl = (slug: string, path: string) => `/files/${slug}/${path}`;

describe("ProjectDirectory", () => {
  it("shows a card per project: logo, name in its default language, link to the viewer", () => {
    render(<ProjectDirectory projects={[info("villa", "ar", "Villa", "فيلا"), info("tower", "en", "Tower", "برج")]} fileUrl={fileUrl} />);
    const cards = within(screen.getByRole("list", { name: "Projects" })).getAllByRole("link");
    expect(cards.map((c) => [c.textContent, c.getAttribute("href"), c.getAttribute("lang"), c.getAttribute("dir")])).toEqual([
      ["فيلا", "/p/villa", "ar", "rtl"],
      ["Tower", "/p/tower", "en", "ltr"],
    ]);
    expect(cards[0].querySelector("img")?.getAttribute("src")).toBe("/files/villa/images/logo.svg");
  });

  it("opens a project with a location on its globe intro", () => {
    const located = { ...info("residence", "ar", "Residence", "ريزيدنس"), location: { lat: 30, lng: 31, address: { ar: "القاهرة", en: "Cairo" } } };
    render(<ProjectDirectory projects={[located]} fileUrl={fileUrl} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/p/residence/explore");
  });

  it("says so when no project is published", () => {
    render(<ProjectDirectory projects={[]} fileUrl={fileUrl} />);
    expect(screen.getByText("No projects are published yet.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});
