// Today — placeholder. The routine checklist + today's journal are the Phase 1
// "Today" slice (see docs/roadmap.md). The shell, theme, and consistency chart
// (in the sidebar) are live.
function todayTitle(): string {
  return new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    .toLowerCase();
}

export default function Today() {
  return (
    <div className="mx-auto max-w-[700px] px-10 py-14">
      <h1 className="text-[33px] font-black lowercase tracking-tight">{todayTitle()}</h1>
      <p className="mt-10 text-[15px] font-bold lowercase text-ink-2">
        daily routine + today&apos;s journal land in phase 1.
      </p>
    </div>
  );
}
