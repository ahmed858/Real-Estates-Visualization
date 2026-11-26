import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewerMessage } from "../index";

describe("ViewerMessage", () => {
  it("shows the title as a heading inside a status region", () => {
    render(<ViewerMessage title="Project not found" />);
    const heading = screen.getByRole("heading", { name: "Project not found" });
    expect(screen.getByRole("status").contains(heading)).toBe(true);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("lists the details", () => {
    render(<ViewerMessage title="Invalid project" details={["row 3, price: must be a number", "row 4, status: is required"]} />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "row 3, price: must be a number",
      "row 4, status: is required",
    ]);
  });
});
