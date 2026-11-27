// Warnings for brand colours that the viewer cannot show clearly. Pure, no I/O.
// Shared by `npm run validate` (tools) and the editor's live problem list.
//
// Each check follows how the viewer uses the colour:
// - the accent colour is text and lines on the dark stage, so it needs text
//   contrast against the stage;
// - both colours sit next to the status-coloured hotspots (the primary colour
//   is the glow of scene hotspots), so neither may look like a status colour.
import type { ProjectConfig, UnitStatus } from "@/modules/schema";
import { colorDifference, contrastRatio } from "../colour/contrast";
import { STAGE_COLOR, STATUS_COLORS } from "../colour/palette";
import { CONFIG_FILE, type Finding } from "./report";

/** WCAG AA for normal text; the accent is used for small text such as the hover card hint. */
export const MIN_STAGE_CONTRAST = 4.5;
/** Below this CIE76 difference a brand colour reads as the same colour as a status. */
export const MIN_STATUS_DIFFERENCE = 20;

type Branding = ProjectConfig["project"]["branding"];
type BrandKey = "primaryColor" | "accentColor";

const warning = (key: BrandKey, message: string): Finding => ({
  severity: "warning",
  file: CONFIG_FILE,
  location: `project.branding.${key}`,
  message,
});

function tooCloseToStatus(key: BrandKey, color: string): Finding[] {
  return (Object.entries(STATUS_COLORS) as [UnitStatus, string][])
    .filter(([, status]) => colorDifference(color, status) < MIN_STATUS_DIFFERENCE)
    .map(([name, status]) =>
      warning(key, `${color} looks like the "${name}" status colour ${status}, so visitors may misread unit status`),
    );
}

/** Warnings for brand colours that are hard to read on the stage or look like a status colour. */
export function checkBranding(branding: Branding): Finding[] {
  const findings: Finding[] = [];
  const stage = contrastRatio(branding.accentColor, STAGE_COLOR);
  if (stage < MIN_STAGE_CONTRAST) {
    findings.push(
      warning(
        "accentColor",
        `${branding.accentColor} has contrast ${stage.toFixed(1)}:1 on the dark stage ${STAGE_COLOR} (needs ${MIN_STAGE_CONTRAST}:1), so text in this colour is hard to read`,
      ),
    );
  }
  findings.push(...tooCloseToStatus("primaryColor", branding.primaryColor), ...tooCloseToStatus("accentColor", branding.accentColor));
  return findings;
}
