"use client";

// Smooth drag-reorder for the inspo masonry (#146/#147). The board is JS-positioned:
// each tile is packed into the shortest column from its stored aspect ratio and placed
// absolutely via `transform: translate(...)` with a transition, so reordering is a glide.
//
// You grab a tile by pressing **anywhere on it** — no handle (#147). On a mouse, a small
// move starts the drag (a plain click without moving = a tap → onTap, e.g. open). On
// touch, a **long-press** arms the drag so a normal swipe still scrolls the board. Once
// armed, the dragged tile tracks the pointer 1:1 (imperative, re-pinned in a layout
// effect so it never snaps); as its pointer crosses another tile's mid-line the working
// order updates and the other tiles ease to their new slots. Commit + persist on drop.
import { useLayoutEffect, useMemo, useRef, useState } from "react";

type Pos = { x: number; y: number; w: number; h: number };

const MOUSE_SLOP = 6; // px before a mouse press counts as a drag
const TOUCH_SLOP = 10; // px of movement that cancels a pending long-press (= a scroll)
const LONG_PRESS_MS = 220;

const sameOrder = (a: string[], b: string[] | null) =>
  !!b && a.length === b.length && a.every((v, i) => v === b[i]);

export function useMasonryReorder<T>(opts: {
  items: T[];
  keyOf: (item: T) => string;
  ratioOf: (item: T) => number; // height / width
  width: number;
  containerRef: React.RefObject<HTMLElement | null>;
  onReorder: (orderedKeys: string[]) => void;
  onTap?: (id: string) => void;
  gap?: number;
}) {
  const { items, keyOf, ratioOf, width, containerRef, onReorder, onTap } = opts;
  const gap = opts.gap ?? 14;

  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const tiles = useRef<Map<string, HTMLElement>>(new Map());
  const dragOrderRef = useRef<string[] | null>(null);
  const fingerTransform = useRef("");

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

  // Re-pin the dragged tile to the pointer after any re-render (a target change), so
  // React setting the *other* tiles' transforms never makes it snap to its slot.
  useLayoutEffect(() => {
    if (!draggingId) return;
    const el = tiles.current.get(draggingId);
    if (el && fingerTransform.current) el.style.transform = fingerTransform.current;
  });

  function startPress(e: React.PointerEvent, id: string) {
    const isTouch = e.pointerType === "touch";
    if (!isTouch) e.preventDefault(); // mouse/pen: avoid text selection; touch: keep scroll
    const startX = e.clientX;
    const startY = e.clientY;
    const last = { x: startX, y: startY };
    const grab = { dx: 0, dy: 0 };
    let armed = false;
    let longPress: ReturnType<typeof setTimeout> | null = null;

    function arm() {
      const container = containerRef.current;
      const p = pos.get(id);
      if (!container || !p) return;
      const cr = container.getBoundingClientRect();
      grab.dx = last.x - cr.left - p.x;
      grab.dy = last.y - cr.top - p.y;
      armed = true;
      dragOrderRef.current = ids.slice();
      setDragOrder(ids.slice());
      setDraggingId(id);
    }

    function reorderTo(ev: PointerEvent) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      fingerTransform.current = `translate(${ev.clientX - rect.left - grab.dx}px, ${
        ev.clientY - rect.top - grab.dy
      }px) scale(1.03)`;
      const el = tiles.current.get(id);
      if (el) el.style.transform = fingerTransform.current;

      const overEl = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest<HTMLElement>("[data-inspo-item]");
      const overId = overEl?.dataset.inspoItem;
      if (!overEl || !overId || overId === id) return;
      const r = overEl.getBoundingClientRect();
      const after = ev.clientY > r.top + r.height / 2; // cross the mid-line to flip
      const next = (dragOrderRef.current ?? ids).slice();
      const from = next.indexOf(id);
      if (from !== -1) next.splice(from, 1);
      let to = next.indexOf(overId);
      if (to === -1) return;
      if (after) to += 1;
      next.splice(to, 0, id);
      if (!sameOrder(next, dragOrderRef.current)) {
        dragOrderRef.current = next;
        setDragOrder(next);
      }
    }

    function move(ev: PointerEvent) {
      last.x = ev.clientX;
      last.y = ev.clientY;
      const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
      if (!armed) {
        if (isTouch) {
          if (dist > TOUCH_SLOP && longPress) {
            clearTimeout(longPress); // a swipe → let the board scroll, abort the press
            longPress = null;
            cleanup();
          }
          return;
        }
        if (dist > MOUSE_SLOP) arm();
        if (!armed) return;
      }
      reorderTo(ev);
    }

    function up() {
      if (longPress) clearTimeout(longPress);
      cleanup();
      if (!armed) {
        onTap?.(id);
        return;
      }
      const final = dragOrderRef.current;
      setDraggingId(null); // → tile re-renders at its slot WITH transition (glides home)
      setDragOrder(null);
      fingerTransform.current = "";
      dragOrderRef.current = null;
      if (final) onReorder(final);
    }

    function cleanup() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    if (isTouch) longPress = setTimeout(arm, LONG_PRESS_MS);
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
    handleProps: (id: string) => ({ onPointerDown: (e: React.PointerEvent) => startPress(e, id) }),
  };
}
