import { describe, expect, it } from "vitest";
import { enquiryMessage, viewerText, whatsappDigits, whatsappLink } from "../index";

const en = viewerText("en");
const ar = viewerText("ar");

describe("whatsappDigits", () => {
  it("keeps digits only", () => {
    expect(whatsappDigits("+201001234567")).toBe("201001234567");
    expect(whatsappDigits("+20 100-123 4567")).toBe("201001234567");
    expect(whatsappDigits("(+971) 50 123 4567")).toBe("971501234567");
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link with the message URL-encoded", () => {
    expect(whatsappLink("+20 100 123 4567", "Unit G-01 & more?")).toBe("https://wa.me/201001234567?text=Unit%20G-01%20%26%20more%3F");
  });

  it("encodes Arabic text so it decodes back unchanged", () => {
    const message = "مرحبًا، الوحدة ٣أ";
    const url = new URL(whatsappLink("+201001234567", message));
    expect(url.host).toBe("wa.me");
    expect(url.pathname).toBe("/201001234567");
    expect(url.searchParams.get("text")).toBe(message);
    expect(url.search).not.toMatch(/[؀-ۿ]/);
  });
});

describe("enquiryMessage", () => {
  it("names the project for a general enquiry", () => {
    expect(enquiryMessage(en, { projectName: "Garden Residence" })).toBe("Hello, I would like to ask about Garden Residence.");
    expect(enquiryMessage(ar, { projectName: "جاردن ريزيدنس" })).toBe("مرحبًا، أريد الاستفسار عن مشروع جاردن ريزيدنس.");
  });

  it("names the project and the unit code", () => {
    expect(enquiryMessage(en, { projectName: "Courtyard Villa", unitCode: "G-01" })).toBe("Hello, I would like to ask about unit G-01 in Courtyard Villa.");
    expect(enquiryMessage(ar, { projectName: "فيلا الحوش", unitCode: "G-01" })).toContain("الوحدة G-01");
  });

  it("names the floor too when one is given (typical floors)", () => {
    expect(enquiryMessage(en, { projectName: "Tower", unitCode: "1201", floor: "12" })).toBe("Hello, I would like to ask about unit 1201 on floor 12 in Tower.");
    expect(enquiryMessage(ar, { projectName: "البرج", unitCode: "1201", floor: "١٢" })).toBe("مرحبًا، أريد الاستفسار عن الوحدة 1201 في الدور ١٢ في مشروع البرج.");
  });
});
