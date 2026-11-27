// The viewer's fixed colours that brand colours must stay clear of. The viewer
// draws with these values, and the brand checks compare against them.
import type { UnitStatus } from "@/modules/schema";

/** Background of the viewer stage (Tailwind zinc-950). */
export const STAGE_COLOR = "#09090b";

/** Hotspot colour per unit status. */
export const STATUS_COLORS: Readonly<Record<UnitStatus, string>> = {
  available: "#2b8a3e",
  reserved: "#b35c00",
  sold: "#c92a2a",
};
