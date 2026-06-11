// Appearance helpers for the settings slice (#063). Live-applies accent / theme /
// font to the document and mirrors them into localStorage so the early-paint
// ThemeScript restores them on the next load. The DB (data/settings) is the
// durable source of truth; localStorage is the fast cache ThemeScript reads.
import type { Settings } from "@/lib/data";

export type ThemeChoice = "light" | "dark";
export type FontChoice = "lato" | "system";
export type Appearance = { accent: string; theme: ThemeChoice; font: FontChoice };

// Swatches, in mockup order (mockups/index.html → #swatches).
export const ACCENTS = [
  "#3b6ef0",
  "#6257e6",
  "#12a594",
  "#2f9e44",
  "#e8930c",
  "#e5484d",
  "#52525b",
] as const;

export const DEFAULT_APPEARANCE: Appearance = {
  accent: "#3b6ef0",
  theme: "light",
  font: "lato",
};

// Kept in sync with the same stack in ThemeScript.
export const SYSTEM_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

// Soft accent tint used for active nav / selected states. ~13% alpha over the
// background — matches the mockup's `accent + '22'` derivation so the soft tint
// always tracks the chosen accent.
export function accentSoft(hex: string): string {
  return `${hex}22`;
}

// Apply to the live document AND persist to localStorage (for ThemeScript).
export function applyAppearance(a: Appearance): void {
  const root = document.documentElement;

  root.style.setProperty("--accent", a.accent);
  root.style.setProperty("--accent-soft", accentSoft(a.accent));

  if (a.theme === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");

  // Override the Next/font-defined --font-lato to swap fonts app-wide; removing
  // the inline value falls back to the real Lato variable on <html>.
  if (a.font === "system") root.style.setProperty("--font-lato", SYSTEM_FONT);
  else root.style.removeProperty("--font-lato");

  try {
    localStorage.setItem("accent", a.accent);
    localStorage.setItem("theme", a.theme);
    localStorage.setItem("font", a.font);
  } catch {
    // localStorage unavailable (private mode); DB remains the source of truth.
  }
}

// Normalize a DB settings row into the appearance shape the UI controls use.
// `theme: 'system'` is allowed by the schema but not offered in V1 (spec §8 /
// mockup show light + dark); treat anything non-dark as light.
export function fromSettings(s: Settings): Appearance {
  return {
    accent: s.accent,
    theme: s.theme === "dark" ? "dark" : "light",
    font: s.font === "system" ? "system" : "lato",
  };
}
