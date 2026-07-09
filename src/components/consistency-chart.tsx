"use client";

// Consistency heatmap (#020, #021): cells shaded by % of that day's routine
// completed, fixed ~3-month window (#102).
// - vertical (default): weekday columns on top, months down the left — for the
//   narrow web sidebar.
// - horizontal: weeks left→right, days stacked, months on top — for mobile.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { daysBefore } from "@/lib/date";
import { useOnline } from "@/lib/use-online";
import { useToday } from "@/lib/use-today";
import {
  getTodaySummaryCached,
  computeConsistency,
  readTodaySnapshot,
  subscribeToday,
  type DayConsistency,
} from "@/lib/data";

const WD = ["m", "t", "w", "t", "f", "s", "s"];
const CELL = ["bg-heat-0", "bg-[#cfe0fb]", "bg-[#9dc0f6]", "bg-[#5e93f1]", "bg-accent"];

function level(pct: number): number {
  if (pct <= 0) return 0;
  if (pct < 0.4) return 1;
  if (pct < 0.7) return 2;
  if (pct < 1) return 3;
  return 4;
}

// Monday = 0 … Sunday = 6.
function weekdayIndex(day: string): number {
  return (new Date(`${day}T00:00:00`).getDay() + 6) % 7;
}

type Week = { month?: string; cells: (DayConsistency | null)[] };

// Group days into weeks of 7 (Mon→Sun), padding the first week, and tag the
// first week of each month with its short name.
function buildWeeks(days: DayConsistency[]): Week[] {
  const weeks: Week[] = [];
  let cur: (DayConsistency | null)[] = [];
  if (days.length) {
    for (let i = 0; i < weekdayIndex(days[0].day); i++) cur.push(null);
  }
  for (const dc of days) {
    cur.push(dc);
    if (cur.length === 7) {
      weeks.push({ cells: cur });
      cur = [];
    }
  }
  if (cur.length) {
    while (cur.length < 7) cur.push(null);
    weeks.push({ cells: cur });
  }
  let last = "";
  for (const w of weeks) {
    const first = w.cells.find((c): c is DayConsistency => c !== null);
    if (first) {
      const m = new Date(`${first.day}T00:00:00`)
        .toLocaleString("en", { month: "short" })
        .toLowerCase();
      if (m !== last) {
        w.month = m;
        last = m;
      }
    }
  }
  return weeks;
}

function tip(c: DayConsistency | null): string {
  return c ? `${c.day} · ${Math.round(c.pct * 100)}%` : "";
}

export function ConsistencyChart({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) {
  const [days, setDays] = useState<DayConsistency[] | null>(null);
  const day = useToday(); // re-keys the window at local midnight (#102)
  const online = useOnline(); // refetch the moment a connection returns (#149)

  useEffect(() => {
    if (!day) return;
    const sb = createClient();
    const to = day;
    const from = daysBefore(day, 7 * 12 - 1); // ~12 weeks, shared cache key (#122)
    let alive = true;
    // Instant paint + offline reading (#149): seed from the persisted snapshot —
    // computed over *today's* window, so an older snapshot still lines up (its
    // missing newest days just render blank until the fetch fills them).
    const snap = readTodaySnapshot();
    if (snap) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous seed from localStorage
      setDays(computeConsistency(snap.summary.items, snap.summary.completions, from, to));
    }
    // Reload on mount, when the day rolls over, AND when a completion/routine write
    // lands (subscribeToday) — otherwise the chart keeps its mount-time data and the
    // "today" cell never updates as you check items.
    const load = () =>
      getTodaySummaryCached(sb, from, to)
        .then((s) => {
          if (alive) setDays(computeConsistency(s.items, s.completions, from, to));
        })
        .catch(() => {
          // Offline: keep the seeded snapshot; settle empty only if nothing showed.
          if (alive) setDays((prev) => prev ?? []);
        });
    void load();
    const unsubscribe = subscribeToday(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [day, online]);

  if (!days) return <div className={orientation === "horizontal" ? "h-32" : "h-44"} />;
  const weeks = buildWeeks(days);

  // ---- horizontal (mobile): weeks across, days stacked, months on top ----
  if (orientation === "horizontal") {
    return (
      <div className="w-full">
        <div className="mb-1.5 flex gap-[3px] text-[10px] font-bold text-ink-3">
          {weeks.map((w, i) => (
            <span key={i} className="flex-1 overflow-visible whitespace-nowrap">
              {w.month ?? ""}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {weeks.map((w, wi) => (
            <div key={wi} className="flex flex-1 flex-col gap-[3px]">
              {w.cells.map((c, ci) => (
                <span
                  key={ci}
                  title={tip(c)}
                  className={`aspect-square rounded-[3px] ${
                    c
                      ? CELL[level(c.pct)] + " transition-transform duration-150 hover:scale-150"
                      : "opacity-0"
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- vertical (web sidebar): weekday columns on top, months down the left ----
  return (
    <div>
      <div className="mb-1.5 flex gap-1 pl-8 text-[10px] font-bold text-ink-3">
        {WD.map((d, i) => (
          <span key={i} className="w-[17px] text-center">
            {d}
          </span>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex items-center gap-1">
            <span className="w-7 text-right text-[10px] font-bold text-ink-3">
              {w.month ?? ""}
            </span>
            {w.cells.map((c, ci) => (
              <span
                key={ci}
                title={tip(c)}
                className={`h-[17px] w-[17px] rounded ${
                  c
                    ? CELL[level(c.pct)] + " transition-transform duration-150 hover:scale-150"
                    : "opacity-0"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
