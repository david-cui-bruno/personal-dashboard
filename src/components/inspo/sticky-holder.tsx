"use client";

// The sticky dispenser (#140, Phase 1b) — a fixed dock of the 5 colors. Hovering a
// color pops it out ("grab me"); pressing and dragging it spawns a ghost that
// follows the pointer, and on release it calls onPick(color, point) — point is the
// drop coords, or null for a plain tap. The parent decides what a drop means: in the
// lightbox it places a sticky on the image; on the board it opens the dropped tile.
// Drags use pointer events so the same gesture works with mouse and touch (#134).
import { useState } from "react";
import type { StickyColor } from "@/lib/data";
import { STICKY_COLORS, STICKY_STYLE } from "./sticky-colors";

const MOVE_THRESHOLD = 5; // px before a press counts as a drag rather than a tap

export function StickyHolder({
  onPick,
  orientation = "vertical",
  className = "",
}: {
  onPick: (color: StickyColor, point: { x: number; y: number } | null) => void;
  orientation?: "vertical" | "horizontal";
  className?: string;
}) {
  const [ghost, setGhost] = useState<{ color: StickyColor; x: number; y: number } | null>(null);
  const vertical = orientation === "vertical";

  function startDrag(e: React.PointerEvent, color: StickyColor) {
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    setGhost({ color, x: sx, y: sy });
    function move(ev: PointerEvent) {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > MOVE_THRESHOLD) moved = true;
      setGhost({ color, x: ev.clientX, y: ev.clientY });
    }
    function up(ev: PointerEvent) {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setGhost(null);
      onPick(color, moved ? { x: ev.clientX, y: ev.clientY } : null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <>
      <div
        className={`flex ${
          vertical ? "flex-col" : "flex-row"
        } items-center gap-2.5 rounded-2xl border border-line bg-bg/70 p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.16)] backdrop-blur ${className}`}
      >
        {vertical && (
          <span className="text-[8.5px] font-black uppercase tracking-wider text-ink-3">drag →</span>
        )}
        {STICKY_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`add ${color} sticky`}
            onPointerDown={(e) => startDrag(e, color)}
            className="h-[30px] w-11 shrink-0 cursor-grab touch-none rounded-[5px] shadow-[0_3px_9px_rgba(0,0,0,0.22)] transition-transform duration-150 ease-out hover:-translate-x-[13px] hover:scale-[1.12] hover:-rotate-[4deg] active:cursor-grabbing"
            style={{ background: STICKY_STYLE[color].bg }}
          />
        ))}
      </div>

      {/* ghost that tracks the pointer mid-drag — never a drop target itself */}
      {ghost && (
        <div
          className="pointer-events-none fixed z-[100] h-[30px] w-11 rounded-[5px] shadow-[0_8px_18px_rgba(0,0,0,0.3)]"
          style={{
            left: ghost.x - 22,
            top: ghost.y - 15,
            background: STICKY_STYLE[ghost.color].bg,
            transform: "rotate(-4deg) scale(1.08)",
          }}
        />
      )}
    </>
  );
}
