import { describe, expect, it } from "vitest";
import { isLeadBot, LEAD_HONEYPOT_FIELD, parseLeadRequest, toAsciiDigits } from "../index";

const valid = { unitCode: "A-101", name: "Mona Ali", phone: "+20 100 123 4567", message: "Is it still available?", locale: "ar" };

const errorPaths = (input: unknown) => {
  const result = parseLeadRequest(input);
  return result.ok ? [] : result.errors.map((e) => e.path);
};

describe("parseLeadRequest", () => {
  it("accepts a full request and trims text", () => {
    const result = parseLeadRequest({ ...valid, name: "  Mona Ali ", message: " hi " });
    expect(result).toEqual({ ok: true, value: { ...valid, message: "hi" } });
  });

  it("makes the message and locale optional, and drops an empty message", () => {
    expect(parseLeadRequest({ unitCode: "A-101", name: "Mona", phone: "01001234567", message: "  " })).toEqual({
      ok: true,
      value: { unitCode: "A-101", name: "Mona", phone: "01001234567" },
    });
  });

  it("requires unit code, name and phone", () => {
    expect(errorPaths({})).toEqual(["unitCode", "name", "phone"]);
    expect(errorPaths({ ...valid, name: "   " })).toEqual(["name"]);
  });

  it("checks phone characters and digit count", () => {
    expect(errorPaths({ ...valid, phone: "call me" })).toContain("phone");
    expect(errorPaths({ ...valid, phone: "12345" })).toEqual(["phone"]);
    expect(errorPaths({ ...valid, phone: "1234567890123456" })).toEqual(["phone"]);
    expect(errorPaths({ ...valid, phone: "(010) 012-34.567" })).toEqual([]);
  });

  it("accepts Arabic digits and stores them as ASCII", () => {
    const result = parseLeadRequest({ ...valid, phone: "٠١٠٠١٢٣٤٥٦٧" });
    expect(result.ok && result.value.phone).toBe("01001234567");
  });

  it("limits name and message length and rejects an unknown locale", () => {
    expect(errorPaths({ ...valid, name: "x".repeat(101) })).toEqual(["name"]);
    expect(errorPaths({ ...valid, message: "x".repeat(1001) })).toEqual(["message"]);
    expect(errorPaths({ ...valid, locale: "fr" })).toEqual(["locale"]);
  });

  it("ignores the honeypot and other unknown fields", () => {
    expect(parseLeadRequest({ ...valid, [LEAD_HONEYPOT_FIELD]: "spam", extra: 1 }).ok).toBe(true);
  });

  it("never throws on non-object input", () => {
    expect(parseLeadRequest(null).ok).toBe(false);
    expect(parseLeadRequest("text").ok).toBe(false);
  });
});

describe("isLeadBot", () => {
  it("is true only when the honeypot has text", () => {
    expect(isLeadBot({ ...valid, [LEAD_HONEYPOT_FIELD]: "http://spam.example" })).toBe(true);
    expect(isLeadBot({ ...valid, [LEAD_HONEYPOT_FIELD]: "  " })).toBe(false);
    expect(isLeadBot(valid)).toBe(false);
    expect(isLeadBot(null)).toBe(false);
  });
});

describe("toAsciiDigits", () => {
  it("converts both Arabic digit sets", () => {
    expect(toAsciiDigits("٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789 0123456789");
  });
});
