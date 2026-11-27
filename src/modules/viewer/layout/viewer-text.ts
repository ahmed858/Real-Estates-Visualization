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
  breadcrumbs: string;
  /** Shown when the unit statuses come from the last good copy of the sheet. */
  staleNote: string;
  /** Page description for link previews (WhatsApp, search results). */
  metaDescription: (projectName: string) => string;
  card: {
    type: string;
    bedrooms: string;
    area: string;
    squareMetres: string;
    price: string;
    status: string;
    /** "6 units"; `n` is the count, `formatted` the same count in the locale's digits. */
    unitCount: (n: number, formatted: string) => string;
    /** "2 bedrooms", or "Studio" for none. */
    bedroomCount: (n: number, formatted: string) => string;
    bedroomMix: string;
    openHint: string;
  };
  contact: {
    /** Header button label. */
    button: string;
    /** Unit panel button label. */
    unitButton: string;
    general: (project: string) => string;
    unit: (project: string, code: string) => string;
    unitOnFloor: (project: string, code: string, floor: string) => string;
  };
  zoom: { in: string; out: string; reset: string };
  /** Share button of the unit panel; `copied` shows when the link went to the clipboard. */
  share: { button: string; copied: string };
  /** The compare page. */
  compare: {
    title: string;
    empty: string;
    scene: string;
    /** Checkbox label in the units table. */
    pick: (code: string) => string;
    /** Link to the compare page with the picked units. */
    open: (count: string) => string;
    /** Shown while fewer than two units are picked. */
    hint: string;
    /** Unit panel link to the units list with this unit picked. */
    withOthers: string;
  };
  table: {
    title: string;
    /** Header link to the table. */
    link: string;
    /** Link from the table back to the scenes. */
    back: string;
    columns: Record<"code" | "floor" | "type" | "bedrooms" | "areaM2" | "price" | "status", string>;
    filters: { label: string; toggle: string; toggleActive: string; min: string; max: string; clear: string; empty: string; count: (shown: string, total: string) => string };
  };
  panel: { floor: string; bathrooms: string; notes: string; plan: (code: string) => string; close: string; units: string; priceRange: string; areaRange: string; photos: string; photo: (code: string, n: string, total: string) => string };
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
    breadcrumbs: "مسار التصفح",
    staleNote: "قد لا تكون حالة الوحدات محدّثة الآن.",
    metaDescription: (name) => `مخططات تفاعلية لمشروع ${name}: تصفّح الأدوار واعرف الوحدات المتاحة.`,
    card: {
      type: "النوع",
      bedrooms: "غرف النوم",
      area: "المساحة",
      squareMetres: "م²",
      price: "السعر",
      status: "الحالة",
      unitCount: (n, f) => `${f} ${n >= 3 && n <= 10 ? "وحدات" : "وحدة"}`,
      bedroomCount: (n, f) => (n === 0 ? "استوديو" : `${f} ${n >= 3 && n <= 10 ? "غرف نوم" : "غرفة نوم"}`),
      bedroomMix: "توزيع الغرف",
      openHint: "اضغط لعرض الوحدات",
    },
    contact: {
      button: "تواصل معنا",
      unitButton: "استفسر على واتساب",
      general: (p) => `مرحبًا، أريد الاستفسار عن مشروع ${p}.`,
      unit: (p, c) => `مرحبًا، أريد الاستفسار عن الوحدة ${c} في مشروع ${p}.`,
      unitOnFloor: (p, c, f) => `مرحبًا، أريد الاستفسار عن الوحدة ${c} في الدور ${f} في مشروع ${p}.`,
    },
    zoom: { in: "تكبير", out: "تصغير", reset: "١×" },
    share: { button: "مشاركة", copied: "تم نسخ رابط الوحدة" },
    compare: { title: "مقارنة الوحدات", empty: "لا توجد وحدات للمقارنة. اختر حتى ٣ وحدات من قائمة كل الوحدات.", scene: "المكان", pick: (c) => `قارن الوحدة ${c}`, open: (n) => `قارن (${n})`, hint: "اختر وحدتين أو ثلاثًا للمقارنة.", withOthers: "قارن بوحدات أخرى" },
    table: {
      title: "كل الوحدات",
      link: "كل الوحدات",
      back: "العودة للمشروع",
      columns: { code: "الوحدة", floor: "الدور", type: "النوع", bedrooms: "غرف النوم", areaM2: "المساحة", price: "السعر", status: "الحالة" },
      filters: { label: "تصفية الوحدات", toggle: "تصفية", toggleActive: "تصفية (مفعّلة)", min: "من", max: "إلى", clear: "مسح التصفية", empty: "لا توجد وحدات تطابق هذه التصفية.", count: (s, t) => `${s} من ${t} وحدة` },
    },
    panel: {
      floor: "الدور",
      bathrooms: "الحمامات",
      notes: "ملاحظات",
      plan: (code) => `مخطط الوحدة ${code}`,
      close: "إغلاق",
      units: "عدد الوحدات",
      priceRange: "الأسعار",
      areaRange: "المساحات",
      photos: "الصور",
      photo: (c, n, t) => `صورة ${n} من ${t} للوحدة ${c}`,
    },
  },
  en: {
    dir: "ltr",
    unit: "Unit",
    statusLegend: "Unit status",
    status: { available: "Available", reserved: "Reserved", sold: "Sold" },
    details: "Details",
    selectHint: "Pick a floor or a unit on the image to see its details.",
    logoAlt: (name) => `${name} logo`,
    breadcrumbs: "Breadcrumbs",
    staleNote: "Unit status may be out of date.",
    metaDescription: (name) => `Interactive floor plans of ${name}: browse the floors and see which units are available.`,
    card: {
      type: "Type",
      bedrooms: "Bedrooms",
      area: "Area",
      squareMetres: "m²",
      price: "Price",
      status: "Status",
      unitCount: (n, f) => `${f} ${n === 1 ? "unit" : "units"}`,
      bedroomCount: (n, f) => (n === 0 ? "Studio" : `${f} ${n === 1 ? "bedroom" : "bedrooms"}`),
      bedroomMix: "Bedroom mix",
      openHint: "Click to view units",
    },
    contact: {
      button: "Contact us",
      unitButton: "Ask on WhatsApp",
      general: (p) => `Hello, I would like to ask about ${p}.`,
      unit: (p, c) => `Hello, I would like to ask about unit ${c} in ${p}.`,
      unitOnFloor: (p, c, f) => `Hello, I would like to ask about unit ${c} on floor ${f} in ${p}.`,
    },
    zoom: { in: "Zoom in", out: "Zoom out", reset: "1×" },
    share: { button: "Share", copied: "Unit link copied" },
    compare: { title: "Compare units", empty: "No units to compare. Pick up to 3 units from the list of all units.", scene: "Location", pick: (c) => `Compare unit ${c}`, open: (n) => `Compare (${n})`, hint: "Pick two or three units to compare.", withOthers: "Compare with other units" },
    table: {
      title: "All units",
      link: "All units",
      back: "Back to the project",
      columns: { code: "Unit", floor: "Floor", type: "Type", bedrooms: "Bedrooms", areaM2: "Area", price: "Price", status: "Status" },
      filters: { label: "Filter units", toggle: "Filter", toggleActive: "Filter (on)", min: "Min", max: "Max", clear: "Clear filters", empty: "No units match these filters.", count: (s, t) => `${s} of ${t} units` },
    },
    panel: {
      floor: "Floor",
      bathrooms: "Bathrooms",
      notes: "Notes",
      plan: (code) => `Plan of unit ${code}`,
      close: "Close",
      units: "Units",
      priceRange: "Prices",
      areaRange: "Areas",
      photos: "Photos",
      photo: (c, n, t) => `Photo ${n} of ${t} of unit ${c}`,
    },
  },
};

export const viewerText = (locale: ViewerLocale): ViewerText => TEXT[locale];
