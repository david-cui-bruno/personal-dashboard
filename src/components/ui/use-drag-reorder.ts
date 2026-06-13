"use client";

// Pointer-based, touch-capable drag reorder with a finger-following row and a
// FLIP-glide on drop (#134/#135). The dragged row tracks the finger 1:1 and the
// rows between source and target slide to open a gap — all via imperative style
// writes, so there are NO re-renders during the gesture (smooth on touch). State
// changes once, on drop, via onDrop(orderedKeys). Handles variable row heights by
// snapshotting each row's resting center on grab. Reduced-motion is honored by the
// global CSS guard (#133), which neutralizes the transitions.
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function useDragReorder<T>(opts: {
  items: T[];
  keyOf: (item: T) => string;
  onDrop: (orderedKeys: string[]) => void;
}) {
  // Mirror the latest props into refs so the imperative pointer handlers (which
  // fire after render/commit) read current values without re-subscribing.
  const itemsRef = useRef(opts.items);
  const keyOfRef = useRef(opts.keyOf);
  const onDropRef = useRef(opts.onDrop);
  useEffect(() => {
    itemsRef.current = opts.items;
    keyOfRef.current = opts.keyOf;
    onDropRef.current = opts.onDrop;
  });

  const rowEls = useRef<Map<string, HTMLElement>>(new Map());
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const prevTops = useRef<Map<string, number>>(new Map());
  const shouldFlip = useRef(false);

  const from = useRef<number | null>(null);
  const target = useRef<number | null>(null);
  const startY = useRef(0);
  const restCenters = useRef<number[]>([]);
  const dragH = useRef(0);

  // Glide every row from where it visually was (prevTops) to where it now rests.
  useLayoutEffect(() => {
    if (!shouldFlip.current) return;
    shouldFlip.current = false;
    rowEls.current.forEach((el, key) => {
      const prev = prevTops.current.get(key);
      if (prev === undefined) return;
      const dy = prev - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 200ms cubic-bezier(0.2, 0, 0, 1)";
        el.style.transform = "";
      });
    });
  });

  function registerRow(key: string) {
    return (el: HTMLElement | null) => {
      if (el) rowEls.current.set(key, el);
      else rowEls.current.delete(key);
    };
  }

  function end(e: React.PointerEvent) {
    if (from.current === null) return;
    const f = from.current;
    const t = target.current ?? f;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    from.current = null;
    target.current = null;
    setDraggingKey(null);
    // capture current (transformed) tops, clear transforms, then FLIP to rest
    const m = new Map<string, number>();
    rowEls.current.forEach((el, key) => m.set(key, el.getBoundingClientRect().top));
    prevTops.current = m;
    rowEls.current.forEach((el) => {
      el.style.transition = "";
      el.style.transform = "";
      el.style.zIndex = "";
    });
    if (t === f) return;
    shouldFlip.current = true;
    const keys = itemsRef.current.map(keyOfRef.current);
    const [moved] = keys.splice(f, 1);
    keys.splice(t, 0, moved);
    onDropRef.current(keys);
  }

  function handleProps(index: number) {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        const list = itemsRef.current;
        const el = rowEls.current.get(keyOfRef.current(list[index]));
        if (!el) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        from.current = index;
        target.current = index;
        startY.current = e.clientY;
        dragH.current = el.offsetHeight;
        restCenters.current = list.map((it) => {
          const r = rowEls.current.get(keyOfRef.current(it))?.getBoundingClientRect();
          return r ? r.top + r.height / 2 : 0;
        });
        setDraggingKey(keyOfRef.current(list[index]));
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (from.current === null) return;
        const list = itemsRef.current;
        const f = from.current;
        const delta = e.clientY - startY.current;
        const draggedCenter = restCenters.current[f] + delta;
        let t = f;
        for (let i = 0; i < list.length; i++) {
          if (i === f) continue;
          const c = restCenters.current[i];
          if (i < f && draggedCenter < c) t = Math.min(t, i);
          else if (i > f && draggedCenter > c) t = Math.max(t, i);
        }
        target.current = t;
        const h = dragH.current;
        list.forEach((it, i) => {
          const el = rowEls.current.get(keyOfRef.current(it));
          if (!el) return;
          if (i === f) {
            el.style.transition = "none";
            el.style.transform = `translateY(${delta}px)`;
            el.style.zIndex = "10";
          } else {
            const shift =
              f < t && i > f && i <= t ? -h : f > t && i >= t && i < f ? h : 0;
            el.style.transition = "transform 180ms cubic-bezier(0.2, 0, 0, 1)";
            el.style.transform = shift ? `translateY(${shift}px)` : "";
            el.style.zIndex = "";
          }
        });
      },
      onPointerUp: end,
      onPointerCancel: end,
    };
  }

  return { registerRow, handleProps, draggingKey };
}
