// Consistency heatmap data (#020, #022): for each day in [from, to],
// pct = completed / active-items-that-day. active==0 ⇒ pct 0 (blank cell).
import { eachDay } from "@/lib/date";
import type { DB, DayConsistency } from "./types";

// Pure: derive the per-day heatmap from the routine template + completions in
// range. Shared by getConsistency and the Today payload (today_summary, #122).
export function computeConsistency(
  items: { created_on: string; archived_on: string | null }[],
  comps: { day: string }[],
  from: string,
  to: string,
): DayConsistency[] {
  const doneByDay = new Map<string, number>();
  for (const c of comps) doneByDay.set(c.day, (doneByDay.get(c.day) ?? 0) + 1);

  return eachDay(from, to).map((day) => {
    const active = items.filter(
      (it) => it.created_on <= day && (it.archived_on === null || it.archived_on > day),
    ).length;
    const done = doneByDay.get(day) ?? 0;
    return { day, active, done, pct: active === 0 ? 0 : done / active };
  });
}

export async function getConsistency(
  sb: DB,
  from: string,
  to: string,
): Promise<DayConsistency[]> {
  const [{ data: items, error: e1 }, { data: comps, error: e2 }] = await Promise.all([
    sb.from("routine_item").select("created_on, archived_on"),
    sb.from("completion").select("day").gte("day", from).lte("day", to),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return computeConsistency(items ?? [], comps ?? [], from, to);
}
