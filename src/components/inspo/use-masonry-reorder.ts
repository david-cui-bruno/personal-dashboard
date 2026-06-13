"use client";

// Smooth drag-reorder for the inspo masonry (#146). The board is JS-positioned: each
// tile is placed absolutely by a shortest-column packing using its stored aspect ratio,
// so reordering is a plain `transition: transform` glide — as the dragged tile crosses
// another, the working order updates and every *other* tile eases to its new slot, while
// the dragged tile tracks the pointer 1:1 (driven imperatively, re-pinned across
// re-renders in a layout effect so it never snaps). Pointer events → mouse + touch;
// commit + persist happen once, on drop. The board owns the container ref + measured
// `width` (so the ResizeObserver attaches when the grid actually mounts).
import { useLayoutEffect, useMemo, useRef, useState } from "react";

type Pos = { x: number; y: number; w: number; h: number };

export function useMasonryReorder<T>(opts: {
  items: T[];
  keyOf: (item: T) => string;
  ratioOf: (item: T) => number; // height / width
  width: number;
  containerRef: React.RefObject<HTMLElement | null>;
  onReorder: (orderedKeys: string[]) => void;
  gap?: number;
}) {
  const { items, keyOf, ratioOf, width, containerRef, onReorder } = opts;
  const gap = opts.gap ?? 14;

  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const tiles = useRef<Map<string, HTMLElement>>(new Map());
  const dragOrderRef = useRef<string[] | null>(null);
  const fingerTransform = useRef("");
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  const ids = items.map(keyOf);
  const itemById = useMemo(() => new Map(items.map((it) => [keyOf(it), it])), [items, keyOf]);
  const renderOrder = dragOrder ?? ids;

  const { pos, height } = useMemo(() => {
    const out = new Map<string, Pos>();
    if (!width) return { pos: out, height: 0 };
    const cols = width >= 600 ? 3 : 2;
    const colW = (width - (cols - 1) * gap) / cols;
    const colH = new Array(cols).fill(0);
    for (const id of renderOrder) {
      const item = itemById.get(id);
      if (!item) continue;
      const h = colW * (ratioOf(item) || 1);
      let c = 0;
      for (let i = 1; i < cols; i++) if (colH[i] < colH[c]) c = i;
      out.set(id, { x: c * (colW + gap), y: colH[c], w: colW, h });
      colH[c] += h + gap;
    }
    return { pos: out, height: Math.max(0, ...colH) - gap };
  }, [renderOrder, width, gap, ratioOf, itemById]);

  // Re-pin the dragged tile to the pointer after any re-render (e.g. a target change),
  // so React setting the *other* tiles' transforms never makes it snap to its slot.
  useLayoutEffect(() => {
    if (!draggingId) return;
    const el = tiles.current.get(draggingId);
    if (el && fingerTransform.current) el.style.transform = fingerTransform.current;
  });

  function startDrag(e: React.PointerEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    const container = containerRef.current;
    const p = pos.get(id);
    if (!container || !p) return;
    const cr = container.getBoundingClientRect();
    grab.current = { dx: e.clientX - cr.left - p.x, dy: e.clientY - cr.top - p.y };
    dragOrderRef.current = ids.slice();
    setDragOrder(ids.slice());
    setDraggingId(id);

    function move(ev: PointerEvent) {
      const c = containerRef.current;
      const g = grab.current;
      if (!c || !g) return;
      const rect = c.getBoundingClientRect();
      const fx = ev.clientX - rect.left - g.dx;
      const fy = ev.clientY - rect.top - g.dy;
      fingerTransform.current = `translate(${fx}px, ${fy}px) scale(1.04)`;
      const el = tiles.current.get(id);
      if (el) el.style.transform = fingerTransform.current;

      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      const overId = hit?.closest<HTMLElement>("[data-inspo-item]")?.dataset.inspoItem;
      if (overId && overId !== id) {
        const cur = dragOrderRef.current ?? ids.slice();
        const from = cur.indexOf(id);
        const to = cur.indexOf(overId);
        if (from !== -1 && to !== -1 && from !== to) {
          cur.splice(from, 1);
          cur.splice(cur.indexOf(overId), 0, id);
          dragOrderRef.current = cur.slice();
          setDragOrder(cur.slice());
        }
      }
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const final = dragOrderRef.current;
      setDraggingId(null); // → React re-renders the tile at its slot WITH transition (glides home)
      setDragOrder(null);
      grab.current = null;
      fingerTransform.current = "";
      dragOrderRef.current = null;
      if (final) onReorder(final);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function registerTile(id: string) {
    return (el: HTMLElement | null) => {
      if (el) tiles.current.set(id, el);
      else tiles.current.delete(id);
    };
  }

  return {
    pos,
    height,
    measured: width > 0,
    draggingId,
    registerTile,
    handleProps: (id: string) => ({ onPointerDown: (e: React.PointerEvent) => startDrag(e, id) }),
  };
}
