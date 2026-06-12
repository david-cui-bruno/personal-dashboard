// Widget summary (#119): today's routine progress + the "focus" (weakest habit
// over the last 30 days) in one round-trip via the widget_summary() RPC
// (migration 0004). Powers the native home-screen widget; the day is the
// caller's local day (#011/#083).
import type { DB } from "./types";

export type WidgetSummary = {
  done: number; // routine items completed today
  total: number; // routine items active today
  focusLabel: string | null; // the weakest habit's label, or null if no items
  focusItemId: string | null;
};

export async function getWidgetSummary(sb: DB, day: string): Promise<WidgetSummary> {
  const { data, error } = await sb.rpc("widget_summary", { p_day: day });
  if (error) throw error;
  const row = data?.[0];
  return {
    done: row?.done ?? 0,
    total: row?.total ?? 0,
    focusLabel: row?.focus_label ?? null,
    focusItemId: row?.focus_item_id ?? null,
  };
}
