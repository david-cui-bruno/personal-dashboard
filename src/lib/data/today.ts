// One round-trip for the whole Today screen + the consistency chart (#122).
// `today_summary` (migration 0005) returns the routine template, completions across
// the chart window, and today's journal in a single RPC. A short-lived in-memory
// cache de-dupes the concurrent mounts (routine + journal + sidebar chart all share
// one request) and makes navigating back to a screen instant. Writes invalidate it.
import { today, daysBefore } from "@/lib/date";
import type { DB, RoutineItem, Journal, DailySong } from "./types";

export type TodayCompletion = { routine_item_id: string; day: string };
export type TodaySummary = {
  items: RoutineItem[]; // the full routine template (all rows)
  completions: TodayCompletion[]; // completions within the chart window
  journal: Journal | null; // today's journal row, if written
  // today's song (#131). undefined = the RPC didn't include it (old RPC pre-0008)
  // → the song bar fetches it itself; DailySong | null = authoritative, skip the fetch.
  song?: DailySong | null;
};

// The shared window: today back ~12 weeks (the fixed chart range, #102). Used as the
// cache key so every Today consumer hits the same cached request.
export function todayWindow(): { from: string; to: string } {
  const to = today();
  return { from: daysBefore(to, 7 * 12 - 1), to };
}

export async function getTodaySummary(
  sb: DB,
  from: string,
  to: string,
): Promise<TodaySummary> {
  const { data, error } = await sb.rpc("today_summary", { p_from: from, p_to: to });
  if (!error && data) {
    const d = data as {
      routine_items?: RoutineItem[];
      completions?: TodayCompletion[];
      journal?: Journal | null;
      song?: DailySong | null;
    };
    return {
      items: d.routine_items ?? [],
      completions: d.completions ?? [],
      journal: d.journal ?? null,
      // Present only on the 0008+ RPC; absent → undefined so the song bar self-fetches.
      song: "song" in d ? (d.song ?? null) : undefined,
    };
  }
  // Fallback: the RPC isn't reachable (e.g. migration 0005 not yet pushed to this
  // Supabase). Assemble the same shape from plain selects so the app never breaks
  // on a deploy that lands before the migration. Slower (3 round-trips) but correct.
  const [it, cm, jr, sg] = await Promise.all([
    sb.from("routine_item").select("*"),
    sb.from("completion").select("routine_item_id, day").gte("day", from).lte("day", to),
    sb.from("journal").select("*").eq("day", to).maybeSingle(),
    // Tolerant of a missing daily_song table (#123): on error fall back to null.
    sb
      .from("daily_song")
      .select("*")
      .eq("day", to)
      .maybeSingle()
      .then((r) => (r.error ? null : (r.data as DailySong | null))),
  ]);
  if (it.error) throw it.error;
  if (cm.error) throw cm.error;
  if (jr.error) throw jr.error;
  return {
    items: (it.data ?? []) as RoutineItem[],
    completions: (cm.data ?? []) as TodayCompletion[],
    journal: (jr.data ?? null) as Journal | null,
    song: sg,
  };
}

// --- derive helpers (the client splits the one payload into each view) ---------
export function activeItemsOn(items: RoutineItem[], day: string): RoutineItem[] {
  return items
    .filter((it) => it.created_on <= day && (it.archived_on === null || it.archived_on > day))
    .sort((a, b) => a.sort_order - b.sort_order);
}
export function completedOn(comps: TodayCompletion[], day: string): Set<string> {
  return new Set(comps.filter((c) => c.day === day).map((c) => c.routine_item_id));
}

// --- tiny TTL cache (de-dupe + instant nav) ------------------------------------
const TTL_MS = 30_000;
let entry: { key: string; at: number; promise: Promise<TodaySummary> } | null = null;

export function getTodaySummaryCached(
  sb: DB,
  from: string,
  to: string,
): Promise<TodaySummary> {
  const key = `${from}|${to}`;
  const now = Date.now();
  if (entry && entry.key === key && now - entry.at < TTL_MS) return entry.promise;
  const promise = getTodaySummary(sb, from, to);
  const mine = { key, at: now, promise };
  entry = mine;
  // On failure, drop the cache so the next mount retries instead of caching the error.
  promise.catch(() => {
    if (entry === mine) entry = null;
  });
  return promise;
}

// Call after any routine/journal write so the next read refreshes. (Cache-clear only —
// does not nudge already-mounted consumers; use refreshToday for consistency changes.)
export function invalidateTodaySummary(): void {
  entry = null;
}

// Consumers that must react to a *consistency* change while mounted — chiefly the
// heatmap, which otherwise keeps the data it fetched on mount and never updates the
// "today" cell when you check items (#020).
const subscribers = new Set<() => void>();
export function subscribeToday(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

// Clear the cache AND nudge subscribers to re-read. Call *after* a completion / routine
// write lands (not before — a refetch before the write would read the stale row).
export function refreshToday(): void {
  entry = null;
  subscribers.forEach((fn) => fn());
}
