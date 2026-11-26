import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("splits rows and cells", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("accepts CRLF and a last line without a newline", () => {
    expect(parseCsv("a,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty cells and empty rows", () => {
    expect(parseCsv("a,,c\n\n,,\n")).toEqual([["a", "", "c"], [""], ["", "", ""]]);
  });

  it("reads quoted cells with commas, escaped quotes and line breaks", () => {
    expect(parseCsv('code,notes\nG-01,"corner, sea view"\nG-02,"say ""hi""\nsecond line"\n')).toEqual([
      ["code", "notes"],
      ["G-01", "corner, sea view"],
      ["G-02", 'say "hi"\nsecond line'],
    ]);
  });

  it("strips a UTF-8 byte order mark and keeps Arabic text", () => {
    expect(parseCsv("﻿code,status\nG-01,محجوز\n")).toEqual([
      ["code", "status"],
      ["G-01", "محجوز"],
    ]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});
