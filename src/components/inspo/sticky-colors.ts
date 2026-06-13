// The 5 sticky paper colors (#140) — paper + ink for each. Same hex in light &
// dark (it's paper, not chrome), so these are plain constants rather than themed
// tokens. Mirrors the `.s-*` classes in mockups/index.html; see docs/design.md.
// Shared by the holder, the placed stickies, and the board tile peeks.
import type { StickyColor } from "@/lib/data";

// Dispenser order, top → bottom (matches the mockup holder).
export const STICKY_COLORS: StickyColor[] = ["yellow", "blue", "orange", "pink", "green"];

export const STICKY_STYLE: Record<StickyColor, { bg: string; fg: string }> = {
  yellow: { bg: "#fdec8b", fg: "#4a4220" },
  blue: { bg: "#bcd8ff", fg: "#233049" },
  orange: { bg: "#ffd29b", fg: "#4a3318" },
  pink: { bg: "#ffc6dd", fg: "#4a2236" },
  green: { bg: "#bdf0c4", fg: "#1f4028" },
};
