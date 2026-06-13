"use client";

// Drag-reorder for the inspo masonry (#144). The list reorder hook (#134/#135) is a
// 1-D vertical model — it doesn't map onto a CSS-`columns` grid where visual position
// ≠ a single Y sequence. So this is a drop-on-target gesture instead: grab a tile by
// its handle → a ghost follows the pointer → the tile under the pointer (found via
// elementFromPoint + `data-inspo-item`) highlights → on release the dragged tile is
// inserted before that target and the new order is persisted. Pointer events, so mouse
// + touch both work. Reorder commits once, on drop (no re-renders mid-drag besides the
// ghost position).
import { useEffect, useRef, useState } from "react";

export function useTileReorder<T>(opts: {
  items: T[];
  keyOf: (item: T) => string;
  onReorder: (orderedKeys: string[]) => void;
}) {
  const itemsRef = useRef(opts.items);
  const keyOfRef = useRef(opts.keyOf);
  const onReorderRef = useRef(opts.onReorder);
  useEffect(() => {
    itemsRef.current = opts.items;
    keyOfRef.current = opts.keyOf;
    onReorderRef.current = opts.onReorder;
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const targetRef = useRef<string | null>(null);

  function startDrag(e: React.PointerEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(id);
    setGhost({ x: e.clientX, y: e.clientY });
    setDropTargetId(null);
    targetRef.current = null;

    function move(ev: PointerEvent) {
      setGhost({ x: ev.clientX, y: ev.clientY });
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const tile = el?.closest<HTMLElement>("[data-inspo-item]");
      const tid = tile?.dataset.inspoItem ?? null;
      const next = tid && tid !== id ? tid : null;
      targetRef.current = next;
      setDropTargetId(next);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const target = targetRef.current;
      if (target) {
        const ids = itemsRef.current.map(keyOfRef.current).filter((k) => k !== id);
        const ti = ids.indexOf(target);
        if (ti >= 0) {
          ids.splice(ti, 0, id); // drop = "put me where this tile is"
          onReorderRef.current(ids);
        }
      }
      setDraggingId(null);
      setDropTargetId(null);
      setGhost(null);
      targetRef.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return {
    draggingId,
    dropTargetId,
    ghost,
    handleProps: (id: string) => ({ onPointerDown: (e: React.PointerEvent) => startDrag(e, id) }),
  };
}
