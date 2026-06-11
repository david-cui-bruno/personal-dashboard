// Local-day helpers. A "day" is a YYYY-MM-DD string in the device's local
// timezone (#011, #083) — never UTC-converted, to keep the day boundary at
// local midnight.

export function toDayString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return toDayString(new Date());
}

// Inclusive list of day strings from `from` to `to`.
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cur <= end) {
    out.push(toDayString(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// `days` calendar days before `day` (e.g. for a ~3-month chart window).
export function daysBefore(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() - days);
  return toDayString(d);
}
