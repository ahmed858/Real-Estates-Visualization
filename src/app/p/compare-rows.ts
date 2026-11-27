// Rows of the compare page: the units named in ?units=, with their scene, plan
// image and WhatsApp enquiry. Pure, so it is tested without rendering.
import type { SceneTree } from "@/modules/domain";
import type { UnitRow } from "@/modules/schema";
import { enquiryMessage, parseCompareCodes, unitTableRows, whatsappLink, type CompareUnit, type UnitHref, type ViewerLocale, viewerText } from "@/modules/viewer";

export interface CompareRowsInput {
  tree: SceneTree;
  units: readonly UnitRow[];
  /** The raw ?units= value. */
  param: string | readonly string[] | undefined;
  locale: ViewerLocale;
  projectName: string;
  whatsapp: string;
  hrefOf: UnitHref;
  fileUrl: (path: string) => string;
}

export function compareRows({ tree, units, param, locale, projectName, whatsapp, hrefOf, fileUrl }: CompareRowsInput): CompareUnit[] {
  const rows = unitTableRows(tree, units, hrefOf);
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const sheet = new Map(units.map((u) => [u.code, u]));
  // The first scene that draws each unit, like the table's links.
  const placedOn = new Map<string, { sceneId: string; floor?: number }>();
  for (const p of tree.placedUnits()) if (!placedOn.has(p.code)) placedOn.set(p.code, p);
  const text = viewerText(locale);
  const num = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");
  return parseCompareCodes(param, new Set(byCode.keys())).map((code) => {
    const row = byCode.get(code)!;
    const placed = placedOn.get(code)!;
    const planImage = sheet.get(code)?.planImage;
    const message = enquiryMessage(text, { projectName, unitCode: code, ...(placed.floor !== undefined && { floor: num.format(placed.floor) }) });
    return {
      ...row,
      sceneTitle: tree.get(placed.sceneId).title[locale],
      ...(planImage && { planImageUrl: fileUrl(planImage) }),
      enquiryHref: whatsappLink(whatsapp, message),
    };
  });
}
