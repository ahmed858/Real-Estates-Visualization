// Fixed viewer wording in both supported languages. Phase 4 adds a language
// switch; until then the viewer uses the project's default locale.
import type { ProjectInfo, UnitStatus } from "@/modules/schema";

export type ViewerLocale = ProjectInfo["defaultLocale"];

export interface ViewerText {
  dir: "rtl" | "ltr";
  unit: string;
  statusLegend: string;
  status: Record<UnitStatus, string>;
  details: string;
  selectHint: string;
  logoAlt: (projectName: string) => string;
  card: { type: string; bedrooms: string; area: string; squareMetres: string; price: string; status: string };
}

const TEXT: Record<ViewerLocale, ViewerText> = {
  ar: {
    dir: "rtl",
    unit: "وحدة",
    statusLegend: "حالة الوحدات",
    status: { available: "متاح", reserved: "محجوز", sold: "مباع" },
    details: "التفاصيل",
    selectHint: "اختر دورًا أو وحدة من الصورة لعرض تفاصيلها.",
    logoAlt: (name) => `شعار ${name}`,
    card: { type: "النوع", bedrooms: "غرف النوم", area: "المساحة", squareMetres: "م²", price: "السعر", status: "الحالة" },
  },
  en: {
    dir: "ltr",
    unit: "Unit",
    statusLegend: "Unit status",
    status: { available: "Available", reserved: "Reserved", sold: "Sold" },
    details: "Details",
    selectHint: "Pick a floor or a unit on the image to see its details.",
    logoAlt: (name) => `${name} logo`,
    card: { type: "Type", bedrooms: "Bedrooms", area: "Area", squareMetres: "m²", price: "Price", status: "Status" },
  },
};

export const viewerText = (locale: ViewerLocale): ViewerText => TEXT[locale];
