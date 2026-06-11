"use client";

// Vertical consistency heatmap (chart option A, #021): weekday columns across
// the top, months down the left, newest week at the bottom; cells shaded by
// % of that day's routine completed (#020). Fixed ~3-month window (#102).
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getConsistency, type DayConsistency } from "@/lib/data";
import { today, daysBefore } from "@/lib/date";

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

type Row = { month?: string; cells: (DayConsistency | null)[] };

function buildRows(days: DayConsistency[]): Row[] {
  const rows: Row[] = [];
  let cur: (DayConsistency | null)[] = [];
  if (days.length) {
    for (let i = 0; i < weekdayIndex(days[0].day); i++) cur.push(null);
  }
  for (const dc of days) {
    cur.push(dc);
    if (cur.length === 7) {
      rows.push({ cells: cur });
      cur = [];
    }
  }
  if (cur.length) {
    while (cur.length < 7) cur.push(null);
    rows.push({ cells: cur });
  }
  let last = "";
  for (const row of rows) {
    const first = row.cells.find((c): c is DayConsistency => c !== null);
    if (first) {
      const m = new Date(`${first.day}T00:00:00`)
        .toLocaleString("en", { month: "short" })
        .toLowerCase();
      if (m !== last) {
        row.month = m;
        last = m;
      }
    }
  }
  return rows;
}

export function ConsistencyChart() {
  const [days, setDays] = useState<DayConsistency[] | null>(null);

  useEffect(() => {
    const sb = createClient();
    const to = today();
    const from = daysBefore(to, 7 * 12 - 1); // ~12 weeks
    getConsistency(sb, from, to)
      .then(setDays)
      .catch(() => setDays([]));
  }, []);

  if (!days) return <div className="h-44" />;
  const rows = buildRows(days);

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
        {rows.map((row, ri) => (
          <div key={ri} className="flex items-center gap-1">
            <span className="w-7 text-right text-[10px] font-bold text-ink-3">
              {row.month ?? ""}
            </span>
            {row.cells.map((c, ci) => (
              <span
                key={ci}
                title={c ? `${c.day} · ${Math.round(c.pct * 100)}%` : ""}
                className={`h-[17px] w-[17px] rounded ${c ? CELL[level(c.pct)] : "opacity-0"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
