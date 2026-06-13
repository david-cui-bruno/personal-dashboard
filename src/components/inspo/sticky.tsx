"use client";

// One colored sticky placed on the opened image (#140, Phase 1b). Position is stored
// as x/y fractions of the image box, so it stays anchored at any render size; here we
// render it at `left: x*100% / top: y*100%` inside the image-sized container.
//
// Gestures (pointer events, so mouse + touch both work — #134):
//  · press + drag the paper        → reposition (re-clamped to the image, saved on drop)
//  · tap the paper (no drag)        → edit: the textarea focuses and grows with the text
//  · ✕ (hover / while active)       → delete
// While editing, the textarea owns the pointer (caret/selection); otherwise it's inert
// so the press lands on the paper for dragging. Text saves debounce; an emptied sticky
// is deleted on blur so stray drops don't litter the board.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { InspoSticky, StickyColor } from "@/lib/data";
import { STICKY_STYLE } from "./sticky-colors";

export const STICKY_WIDTH = 150; // px — fixed width; the sticky grows DOWNWARD as text wraps
const NOMINAL_H = 56; // px — assumed height for clamping a freshly-placed (short) note
const SAVE_DEBOUNCE = 450;
const MOVE_THRESHOLD = 5;

// Clamp a placement fraction so the whole note stays inside a bounds-sized box. Used at
// creation (board / enlarged view) with a nominal height; dragging clamps by real size.
export function clampStickyPlacement(x: number, y: number, boundsW: number, boundsH: number) {
  const maxX = boundsW > STICKY_WIDTH ? (boundsW - STICKY_WIDTH) / boundsW : 0;
  const maxY = boundsH > NOMINAL_H ? (boundsH - NOMINAL_H) / boundsH : 0;
  return { x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) };
}

export function Sticky({
  sticky,
  boundsRef,
  autoFocus = false,
  active,
  onActivate,
  onChange,
  onDelete,
}: {
  sticky: InspoSticky;
  boundsRef: React.RefObject<HTMLElement | null>;
  autoFocus?: boolean;
  active: boolean;
  onActivate: () => void;
  onChange: (patch: { text?: string; x?: number; y?: number }) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(sticky.text);
  const [pos, setPos] = useState({ x: sticky.x, y: sticky.y });
  const [editing, setEditing] = useState(autoFocus);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const c = STICKY_STYLE[sticky.color as StickyColor];

  // Grow the textarea to fit its content (on every edit + on mount for saved text).
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [text]);

  // Focus + place the caret at the end when entering edit mode.
  useEffect(() => {
    if (!editing) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
  }, [editing]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function scheduleSave(next: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onChange({ text: next }), SAVE_DEBOUNCE);
  }

  function onBlur() {
    setEditing(false);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (text.trim().length === 0) onDelete();
    else onChange({ text });
  }

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation(); // a sticky owns this press — never start a tile reorder
    onActivate();
    if (editing) return; // editing → let the textarea handle caret/selection
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { ox: e.clientX - r.left, oy: e.clientY - r.top, sx: e.clientX, sy: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  // Drop point → fraction, clamped so the *whole* note (its real size) stays in bounds.
  function placeFrom(e: React.PointerEvent, d: { ox: number; oy: number }) {
    const box = boundsRef.current?.getBoundingClientRect();
    if (!box) return null;
    const el = e.currentTarget as HTMLElement;
    const left = Math.min(Math.max(0, e.clientX - d.ox - box.left), Math.max(0, box.width - el.offsetWidth));
    const top = Math.min(Math.max(0, e.clientY - d.oy - box.top), Math.max(0, box.height - el.offsetHeight));
    return { x: box.width ? left / box.width : 0, y: box.height ? top / box.height : 0 };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < MOVE_THRESHOLD) return;
    d.moved = true;
    const next = placeFrom(e, d);
    if (next) setPos(next);
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (!d) return;
    if (!d.moved) {
      setEditing(true); // a tap → edit
      return;
    }
    const next = placeFrom(e, d);
    if (!next) return;
    setPos(next);
    onChange(next);
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="group pointer-events-auto absolute touch-none select-none"
      style={{
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
        width: STICKY_WIDTH,
        transform: `rotate(${sticky.rotation}deg)`,
        zIndex: active ? 20 : 10,
        cursor: editing ? "text" : "grab",
      }}
    >
      <div
        className="relative rounded-[3px] px-3 py-2.5 shadow-[0_3px_10px_rgba(0,0,0,0.18)]"
        style={{ background: c.bg, color: c.fg }}
      >
        <textarea
          ref={taRef}
          value={text}
          readOnly={!editing}
          rows={1}
          placeholder="note…"
          onChange={(e) => {
            setText(e.target.value);
            scheduleSave(e.target.value);
          }}
          onBlur={onBlur}
          onPointerDown={(e) => {
            if (editing) e.stopPropagation();
          }}
          className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[12.5px] font-bold leading-snug outline-none placeholder:opacity-50"
          style={{ color: c.fg, cursor: editing ? "text" : "grab", pointerEvents: editing ? "auto" : "none" }}
        />
        <button
          type="button"
          aria-label="delete sticky"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className={`absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-bg text-ink-3 shadow transition-opacity hover:text-red-500 group-hover:opacity-100 ${
            active || editing ? "opacity-100" : "opacity-0"
          }`}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
