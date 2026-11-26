// Writes a one-sheet .xlsx workbook from a table of cells. Deterministic: no
// timestamps or random ids, so regenerating a file gives identical bytes.
import { zip } from "./zip";

export type XlsxCell = string | number | null | undefined;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function cellXml(value: XlsxCell, ref: string): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`cell ${ref}: ${value} is not a finite number`);
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escape(value)}</t></is></c>`;
}

function sheetXml(rows: readonly (readonly XlsxCell[])[]): string {
  const body = rows
    .map((cells, r) => `<row r="${r + 1}">${cells.map((v, c) => cellXml(v, `${columnName(c)}${r + 1}`)).join("")}</row>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

export function buildXlsx(rows: readonly (readonly XlsxCell[])[], sheetName = "Sheet1"): Buffer {
  const files: Record<string, string> = {
    "[Content_Types].xml":
      XML +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      "</Types>",
    "_rels/.rels":
      XML +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      "</Relationships>",
    "xl/workbook.xml":
      XML +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<sheets><sheet name="${escape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels":
      XML +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      "</Relationships>",
    "xl/worksheets/sheet1.xml": sheetXml(rows),
  };
  return zip(Object.entries(files).map(([name, text]) => ({ name, data: Buffer.from(text, "utf8") })));
}
