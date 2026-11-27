// Fixed wording of the globe intro and the guided tour, in both languages.
import type { GlobeStage } from "@/modules/domain";
import type { ViewerLocale } from "../layout/viewer-text";

export interface GlobeText {
  /** Name of each stage in the stage picker; country and city fall back to these when the project names none. */
  stage: Record<GlobeStage, string>;
  stagePicker: string;
  back: string;
  explore: string;
  /** Link that skips the animation and opens the project. */
  skip: string;
  /** Hint at the top: what to press next. */
  pick: (place: string) => string;
  pickProject: string;
  enterProject: string;
  dragHint: string;
  nearby: string;
  minutes: (formatted: string) => string;
  /** Breadcrumb on the project pages that leads back to the globe. */
  crumb: string;
  /** Live region text when a stage is reached. */
  arrived: (place: string) => string;
  /** Guided tour on the project pages. */
  tour: { running: string; stop: string };
}

const TEXT: Record<ViewerLocale, GlobeText> = {
  ar: {
    stage: { earth: "الأرض", country: "الدولة", city: "المدينة", site: "المشروع" },
    stagePicker: "المستوى",
    back: "رجوع",
    explore: "استكشف المشروع",
    skip: "ادخل على المشروع مباشرة",
    pick: (place) => `اختر ${place} للبدء`,
    pickProject: "اختر المشروع",
    enterProject: "اضغط على المشروع للدخول",
    dragHint: "اسحب لتدوير الكرة الأرضية",
    nearby: "بالقرب من المشروع",
    minutes: (n) => `${n} دقيقة`,
    crumb: "الموقع",
    arrived: (place) => `وصلت إلى ${place}`,
    tour: { running: "جولة تلقائية", stop: "إيقاف الجولة" },
  },
  en: {
    stage: { earth: "Earth", country: "Country", city: "City", site: "Project" },
    stagePicker: "Level",
    back: "Back",
    explore: "Explore the project",
    skip: "Go straight to the project",
    pick: (place) => `Pick ${place} to start`,
    pickProject: "Pick the project",
    enterProject: "Press the project to go in",
    dragHint: "Drag to turn the globe",
    nearby: "Near the project",
    minutes: (n) => `${n} min`,
    crumb: "Location",
    arrived: (place) => `Arrived at ${place}`,
    tour: { running: "Guided tour", stop: "Stop the tour" },
  },
};

export const globeText = (locale: ViewerLocale): GlobeText => TEXT[locale];
