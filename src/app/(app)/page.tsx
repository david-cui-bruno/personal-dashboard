"use client";

// Today (spec §2) — the home screen and pinned tab (#064). Top to bottom: the
// lowercase date title, the daily routine checklist, then today's journal. On
// web the consistency chart lives in the sidebar (AppFrame); on mobile it shows
// as a section between routine and journal (#021, #064).
import { useEffect, useState } from "react";
import { today } from "@/lib/date";
import { ConsistencyChart } from "@/components/consistency-chart";
import { RoutineSection } from "@/components/today/routine-section";
import { JournalSection } from "@/components/today/journal-section";

// "thursday, june 11" from a local YYYY-MM-DD day string (#061).
function formatDayTitle(day: string): string {
  return new Date(`${day}T00:00:00`)
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toLowerCase();
}

export default function Today() {
  // Resolve the local day client-side so the boundary is device-local midnight
  // (#011, #083) and there's no SSR/local timezone hydration mismatch.
  const [day, setDay] = useState<string | null>(null);
  // Read the local day once, after mount — the value is client-only, so this is
  // the intended effect use (the false-positive the rule warns about).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setDay(today()), []);

  return (
    <div className="mx-auto max-w-[700px] px-10 pt-14 pb-40">
      {day && (
        <>
          <h1 className="text-[33px] font-black lowercase tracking-tight">
            {formatDayTitle(day)}
          </h1>
          <RoutineSection day={day} />
          {/* mobile only — web shows the chart in the sidebar */}
          <section className="mt-[46px] flex justify-center md:hidden">
            <ConsistencyChart />
          </section>
          <JournalSection day={day} />
        </>
      )}
    </div>
  );
}
