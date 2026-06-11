// Filled day-number date tile for journal entries in the Notes stream
// (note option C, #031). Shared by the Notes list (web + mobile).
export function DayTile({ day }: { day: string }) {
  const d = new Date(`${day}T00:00:00`);
  const num = d.getDate();
  const mon = d.toLocaleString("en", { month: "short" }).toLowerCase();
  return (
    <div className="flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center rounded-xl bg-field">
      <span className="text-2xl font-black leading-none text-ink">{num}</span>
      <span className="text-[10px] font-bold text-ink-3">{mon}</span>
    </div>
  );
}
