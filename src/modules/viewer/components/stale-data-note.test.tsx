import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StaleDataNote, viewerText } from "../index";

describe("StaleDataNote", () => {
  it.each([
    ["en", "Unit status may be out of date."],
    ["ar", "قد لا تكون حالة الوحدات محدّثة الآن."],
  ] as const)("tells visitors in %s that statuses may be out of date", (locale, message) => {
    render(<StaleDataNote text={viewerText(locale)} />);
    expect(screen.getByRole("status").textContent).toContain(message);
  });
});
