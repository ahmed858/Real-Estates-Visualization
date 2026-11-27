import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadForm, viewerText, type LeadSend } from "../index";

beforeEach(() => {
  window.history.replaceState(null, "", "/p/demo-villa/ground?lang=en");
});

const WHATSAPP = "https://wa.me/201001234567?text=hi";

function setup(send: LeadSend, locale: "ar" | "en" = "en") {
  render(<LeadForm slug="demo-villa" unitCode="G-01" locale={locale} text={viewerText(locale)} whatsappHref={WHATSAPP} send={send} />);
  const t = viewerText(locale).lead;
  fireEvent.click(screen.getByRole("button", { name: t.button }));
  return t;
}

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: false }), { target: { value } });

const submit = async (label: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  });
};

describe("LeadForm", () => {
  it("opens on the button and moves focus to the name field", () => {
    const t = setup(vi.fn());
    expect(screen.getByRole("form", { name: t.title("G-01") })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(t.name));
  });

  it("posts the lead to the project's route and says it was sent", async () => {
    const send = vi.fn<LeadSend>(async () => ({ status: 200, body: { ok: true } }));
    const t = setup(send);
    type(t.name, "Mona");
    type(t.phone, "+20 100 123 4567");
    type(t.message, "Call after 5");
    await submit(t.submit);
    expect(send).toHaveBeenCalledWith("/p/demo-villa/lead", {
      unitCode: "G-01",
      locale: "en",
      name: "Mona",
      phone: "+20 100 123 4567",
      message: "Call after 5",
      website: "",
    });
    const status = screen.getByRole("status");
    expect(status.textContent).toBe(t.sent);
    expect(document.activeElement).toBe(status);
  });

  it("checks the fields before sending", async () => {
    const send = vi.fn<LeadSend>();
    const t = setup(send);
    type(t.phone, "12");
    await submit(t.submit);
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByLabelText(t.name).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText(t.phone).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(t.invalid.phone)).toBeTruthy();
    expect(screen.getByLabelText(t.message, { exact: false }).getAttribute("aria-invalid")).toBe("false");
  });

  it("marks the fields the server names", async () => {
    const t = setup(async () => ({ status: 400, body: { ok: false, error: "invalid", fields: ["phone"] } }));
    type(t.name, "Mona");
    type(t.phone, "01001234567");
    await submit(t.submit);
    expect(screen.getByLabelText(t.phone).getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText(t.name).getAttribute("aria-invalid")).toBe("false");
  });

  it("offers WhatsApp when there were too many requests or sending failed, in Arabic", async () => {
    const answers = [{ status: 429, body: null }, { status: 502, body: null }];
    const t = setup(async () => answers.shift()!, "ar");
    type(t.name, "منى");
    type(t.phone, "٠١٠٠١٢٣٤٥٦٧");
    await submit(t.submit);
    expect(screen.getByRole("alert").textContent).toContain(t.tooMany);
    expect(screen.getByRole("link", { name: viewerText("ar").contact.unitButton }).getAttribute("href")).toBe(WHATSAPP);
    await submit(t.submit);
    expect(screen.getByRole("alert").textContent).toContain(t.failed);
  });

  it("says sending failed when the network is down, and keeps what was typed", async () => {
    const t = setup(async () => {
      throw new TypeError("offline");
    });
    type(t.name, "Mona");
    type(t.phone, "01001234567");
    await submit(t.submit);
    expect(screen.getByRole("alert").textContent).toContain(t.failed);
    expect((screen.getByLabelText(t.name) as HTMLInputElement).value).toBe("Mona");
  });

  it("posts to /lead on a client's own domain", async () => {
    window.history.replaceState(null, "", "/tower-a");
    const send = vi.fn<LeadSend>(async () => ({ status: 200, body: { ok: true } }));
    const t = setup(send);
    type(t.name, "Mona");
    type(t.phone, "01001234567");
    await submit(t.submit);
    expect(send.mock.calls[0][0]).toBe("/lead");
  });

  it("closes on Cancel", () => {
    const t = setup(vi.fn());
    fireEvent.click(screen.getByRole("button", { name: t.cancel }));
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.getByRole("button", { name: t.button })).toBeTruthy();
  });
});
