import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompareTable, type CompareUnit } from "../index";

const unit = (code: string, extra: Partial<CompareUnit> = {}): CompareUnit => ({
  code,
  type: "Apartment",
  floor: 1,
  bedrooms: 2,
  bathrooms: 1,
  areaM2: 110,
  price: 1800000,
  status: "available",
  href: `/p/demo/first?unit=${code}`,
  sceneTitle: "First floor",
  ...extra,
});

describe("CompareTable", () => {
  it("shows one column per unit with its facts, link, plan and enquiry", () => {
    render(
      <CompareTable
        units={[unit("F-01", { planImageUrl: "/files/demo/images/a.svg", enquiryHref: "https://wa.me/1?text=F-01" }), unit("F-02", { status: "sold", bedrooms: 3 })]}
        currency="EGP"
        locale="en"
      />,
    );
    const table = screen.getByRole("table", { name: "Compare units" });
    const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Unit F-01", "Unit F-02"]);
    expect(within(table).getByRole("link", { name: "Unit F-01" }).getAttribute("href")).toBe("/p/demo/first?unit=F-01");
    const row = (label: string) => within(table).getByRole("rowheader", { name: label }).parentElement!.querySelectorAll("td");
    expect([...row("Bedrooms")].map((td) => td.textContent)).toEqual(["2", "3"]);
    expect([...row("Status")].map((td) => td.textContent)).toEqual(["Available", "Sold"]);
    expect([...row("Location")].map((td) => td.textContent)).toEqual(["First floor", "First floor"]);
    expect(within(table).getAllByTestId("whatsapp-link")).toHaveLength(1);
    expect(within(table).getByRole("img", { name: "Plan of unit F-01" })).toBeTruthy();
  });

  it("labels the facts in Arabic with Arabic digits", () => {
    render(<CompareTable units={[unit("F-01")]} currency="EGP" locale="ar" />);
    const table = screen.getByRole("table", { name: "مقارنة الوحدات" });
    const bedrooms = within(table).getByRole("rowheader", { name: "غرف النوم" }).parentElement!.querySelector("td");
    expect(bedrooms?.textContent).toBe("٢");
  });
});
