"use client";

// Today (spec §2) — the home screen and pinned tab (#064). Top to bottom: the
// lowercase date title, the daily routine checklist, then today's journal. On
// web the consistency chart lives in the sidebar (AppFrame); on mobile it shows
// as a section between routine and journal (#021, #064).
import { useToday } from "@/lib/use-today";
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
  // Reactive local day — resolved client-side (device-local midnight, #011/#083; no SSR
  // hydration mismatch) and it rolls over at midnight so Today refreshes without a reload.
  const day = useToday();

  return (
    <div className="mx-auto max-w-[700px] px-10 pt-14 pb-40">
      {day ? (
        <>
          <h1 className="text-[33px] font-black lowercase tracking-tight">
            {formatDayTitle(day)}
          </h1>
          <RoutineSection day={day} />
          {/* mobile only — web shows the chart in the sidebar */}
          <section className="mt-[46px] md:hidden">
            <ConsistencyChart orientation="horizontal" />
          </section>
          <JournalSection day={day} />
        </>
      ) : (
        // Rendered on the server and shown during the JS download/hydrate window (and
        // instantly from the SW shell cache, #129) so a cold start shows the app's
        // structure immediately instead of a blank page. Replaced once `day` resolves.
        <TodaySkeleton />
      )}
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      {/* date title */}
      <div className="h-9 w-3/5 rounded-md bg-field" />
      {/* daily routine */}
      <div className="mt-7">
        <div className="h-5 w-32 rounded bg-field" />
        <div className="mt-4 space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-[14px] px-0.5">
              <div className="h-[22px] w-[22px] shrink-0 rounded-[7px] bg-field" />
              <div
                className="h-4 rounded bg-field"
                style={{ width: `${52 - i * 6}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      {/* today's journal */}
      <div className="mt-[46px]">
        <div className="h-6 w-44 rounded bg-field" />
        <div className="mt-4 space-y-2.5">
          <div className="h-4 w-full rounded bg-field" />
          <div className="h-4 w-11/12 rounded bg-field" />
          <div className="h-4 w-2/3 rounded bg-field" />
        </div>
      </div>
    </div>
  );
}
