import type { ReactNode } from "react";

// Lowercase section heading with an optional right-aligned action (e.g. the
// routine "+" button). No card chrome (#065).
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <h2 className="text-xl font-black lowercase tracking-tight">{title}</h2>
      {action}
    </div>
  );
}
