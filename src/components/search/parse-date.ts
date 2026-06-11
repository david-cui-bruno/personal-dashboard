// Date parsing + display for the ⌘K palette's "jump to a date / today" (#040).
// Local-day only (#011, #083) — builds on the shared day-string helpers.
import { today, toDayString, daysBefore } from "@/lib/date";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// Parse free text into a local day string (YYYY-MM-DD), or null if it isn't a
// date. Accepts: today/yesterday/tomorrow, ISO (2026-06-11), M/D[/Y], and
// "june 11" / "11 june" (with an optional year).
export function parseDate(input: string): string | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;

  if (q === "today" || q === "now") return today();
  if (q === "yesterday") return daysBefore(today(), 1);
  if (q === "tomorrow") return daysBefore(today(), -1);

  const iso = q.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return buildDay(+iso[1], +iso[2], +iso[3]);

  const slash = q.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) return buildDay(slash[3] ? normYear(+slash[3]) : curYear(), +slash[1], +slash[2]);

  const md = q.match(/^([a-z]{3,9})\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (md) {
    const m = monthIndex(md[1]);
    if (m >= 0) return buildDay(md[3] ? +md[3] : curYear(), m + 1, +md[2]);
  }

  const dm = q.match(/^(\d{1,2})\s+([a-z]{3,9})(?:,?\s+(\d{4}))?$/);
  if (dm) {
    const m = monthIndex(dm[2]);
    if (m >= 0) return buildDay(dm[3] ? +dm[3] : curYear(), m + 1, +dm[1]);
  }

  return null;
}

// Lowercase, Day One-style: "thursday, june 11" (#061).
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00`)
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toLowerCase();
}

function buildDay(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  // Reject roll-overs like "february 30".
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return toDayString(dt);
}

function monthIndex(name: string): number {
  return MONTHS.findIndex((m) => m.startsWith(name));
}

function normYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function curYear(): number {
  return new Date().getFullYear();
}
