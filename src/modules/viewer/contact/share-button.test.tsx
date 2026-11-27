import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton, viewerText } from "../index";

beforeEach(() => {
  window.history.replaceState(null, "", "/p/demo-villa/ground?lang=en");
});

const click = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

describe("ShareButton", () => {
  it("uses the system share sheet with the unit's link when there is one", async () => {
    const share = vi.fn(async () => {});
    const copy = vi.fn(async () => {});
    render(<ShareButton code="G-01" title="Unit G-01" text={viewerText("en")} target={{ share, copy }} />);
    await click("Share");
    expect(share).toHaveBeenCalledWith({ title: "Unit G-01", url: `${window.location.origin}/p/demo-villa/ground?lang=en&unit=G-01` });
    expect(copy).not.toHaveBeenCalled();
  });

  it("copies the link and says so without a share sheet, in Arabic too", async () => {
    const copy = vi.fn(async () => {});
    render(<ShareButton code="G-01" title="وحدة G-01" text={viewerText("ar")} target={{ copy }} />);
    await click("مشاركة");
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("unit=G-01"));
    expect(screen.getByRole("status").textContent).toBe("تم نسخ رابط الوحدة");
  });

  it("does nothing more when the visitor closes the share sheet", async () => {
    const share = vi.fn(async () => Promise.reject(Object.assign(new Error("closed"), { name: "AbortError" })));
    const copy = vi.fn(async () => {});
    render(<ShareButton code="G-01" title="Unit G-01" text={viewerText("en")} target={{ share, copy }} />);
    await click("Share");
    expect(copy).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("falls back to copying when sharing fails, and shows the link when copying fails", async () => {
    const share = vi.fn(async () => Promise.reject(new Error("not allowed")));
    const copy = vi.fn(async () => Promise.reject(new Error("denied")));
    render(<ShareButton code="G-01" title="Unit G-01" text={viewerText("en")} target={{ share, copy }} />);
    await click("Share");
    expect(copy).toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("/p/demo-villa/ground?lang=en&unit=G-01");
  });
});
