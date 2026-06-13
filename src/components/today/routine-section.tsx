"use client";

// Daily routine checklist (spec §2, §3 · #010, #013, #016, #017). A flat list of
// the day's active items in sort_order: tap the box to check, tap the label to
// rename inline, hold-drag the grip to reorder, "+" in the header adds a row,
// hover delete = archive. No box around the section, no row dividers (#065).
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addItem,
  renameItem,
  reorderItems,
  archiveItem,
  setCompletion,
  getTodaySummaryCached,
  invalidateTodaySummary,
  activeItemsOn,
  completedOn,
  todayWindow,
  type RoutineItem,
} from "@/lib/data";
import { SectionHeader } from "@/components/ui/section-header";

// Unchecked box border — a soft gray with a dark-theme override (matches the mockup).
const BOX_BASE =
  "grid h-[23px] w-[23px] shrink-0 place-items-center rounded-[7px] border-2 transition duration-150";
const BOX_EMPTY =
  "border-[#d0d0d4] [[data-theme=dark]_&]:border-[#45454c]";
const LABEL_BASE = "min-w-0 flex-1 text-[16.5px] font-bold leading-snug";

export function RoutineSection({ day }: { day: string }) {
  const sb = useMemo(() => createClient(), []);

  // null = loading; the active items for `day`, in sort_order.
  const [items, setItems] = useState<RoutineItem[] | null>(null);
  // Mirror of `items` for the drag handlers: pointer events can fire faster than React
  // commits re-renders, so reading the state closure mid-drag goes stale (#132). The
  // ref is synced after every render and also written synchronously during a drag.
  const itemsRef = useRef<RoutineItem[] | null>(null);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  // ids of items checked on `day`.
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  // inline rename / add drafts
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const renameCancel = useRef(false);
  const addCancel = useRef(false);
  const renameInput = useRef<HTMLInputElement>(null);
  const addInput = useRef<HTMLInputElement>(null);

  // drag-reorder bookkeeping (pointer-based so it works on touch too, #132)
  const dragIndex = useRef<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // id → row element (for hit-testing the pointer + FLIP measurement).
  const rowEls = useRef<Map<string, HTMLElement>>(new Map());
  // id → row top before a reorder, so the rows can glide to their new slots (FLIP).
  const prevTops = useRef<Map<string, number>>(new Map());
  const shouldFlip = useRef(false);
  // Entrance/exit fades for add & delete (#133).
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Re-sync from the server after a write fails (event-handler context only).
  const reload = useCallback(() => {
    invalidateTodaySummary();
    const { from, to } = todayWindow();
    getTodaySummaryCached(sb, from, to)
      .then((s) => {
        setItems(activeItemsOn(s.items, day));
        setCompleted(completedOn(s.completions, day));
      })
      .catch(() => {});
  }, [sb, day]);

  useEffect(() => {
    let active = true;
    // Routine + completions come from the shared Today payload (#122) — one
    // round-trip for the whole screen, de-duped + cached across components.
    const { from, to } = todayWindow();
    getTodaySummaryCached(sb, from, to)
      .then((s) => {
        if (!active) return;
        setItems(activeItemsOn(s.items, day));
        setCompleted(completedOn(s.completions, day));
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setCompleted(new Set());
      });
    return () => {
      active = false;
    };
  }, [sb, day]);

  useEffect(() => {
    if (editingId) {
      renameInput.current?.focus();
      renameInput.current?.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (adding) addInput.current?.focus();
  }, [adding]);

  // --- checking (#012) ---------------------------------------------------
  function toggle(item: RoutineItem) {
    const done = !completed.has(item.id);
    setCompleted((prev) => {
      const next = new Set(prev);
      if (done) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
    invalidateTodaySummary(); // today's % changed → refresh the chart on next read
    setCompletion(sb, item.id, day, done).catch(() => {
      // revert on failure
      setCompleted((prev) => {
        const next = new Set(prev);
        if (done) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    });
  }

  // --- inline rename (#013) ---------------------------------------------
  function startRename(item: RoutineItem) {
    setEditingId(item.id);
    setDraftLabel(item.label);
  }
  function commitRename(item: RoutineItem) {
    const cancelled = renameCancel.current;
    renameCancel.current = false;
    const label = draftLabel.trim();
    setEditingId(null);
    if (cancelled || !label || label === item.label) return;
    setItems((prev) =>
      (prev ?? []).map((i) => (i.id === item.id ? { ...i, label } : i)),
    );
    invalidateTodaySummary();
    renameItem(sb, item.id, label).catch(() => reload());
  }

  // --- add (#017): forward-only from today ------------------------------
  function startAdd() {
    setAdding(true);
    setNewLabel("");
  }
  function addOne(label: string) {
    const list = items ?? [];
    const sortOrder = list.length
      ? Math.max(...list.map((i) => i.sort_order)) + 1
      : 0;
    // Optimistic: show the committed row instantly (no async flicker), then swap
    // in the real server row once it returns.
    const tempId = `tmp-${sortOrder}`;
    const optimistic = {
      id: tempId,
      label,
      sort_order: sortOrder,
      created_on: day,
      archived_on: null,
      created_at: new Date().toISOString(),
    } as RoutineItem;
    setItems((prev) => [...(prev ?? []), optimistic]);
    setEnteringId(tempId); // fade the new row in (#133)
    window.setTimeout(() => setEnteringId((id) => (id === tempId ? null : id)), 300);
    invalidateTodaySummary();
    return addItem(sb, label, sortOrder, day)
      .then((item) =>
        setItems((prev) => (prev ?? []).map((i) => (i.id === tempId ? item : i))),
      )
      .catch(() => setItems((prev) => (prev ?? []).filter((i) => i.id !== tempId)));
  }
  function commitAdd() {
    const cancelled = addCancel.current;
    addCancel.current = false;
    const label = newLabel.trim();
    setAdding(false);
    setNewLabel("");
    if (cancelled || !label) return;
    void addOne(label);
  }

  // --- delete = archive (#016) ------------------------------------------
  // Fade the row out, then drop it and let the rows below glide up (FLIP, #133).
  function remove(item: RoutineItem) {
    if (removingId) return; // ignore re-taps mid-exit
    setRemovingId(item.id);
    window.setTimeout(() => {
      captureTops();
      shouldFlip.current = true;
      setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
      setCompleted((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setRemovingId(null);
      invalidateTodaySummary();
      archiveItem(sb, item.id, day).catch(() => reload());
    }, 180);
  }

  // --- hold-drag reorder (#013), pointer-based for touch + smooth (#132) ---
  // Snapshot every row's current top so the next render can animate rows from
  // their old positions to their new ones (the "Invert"+"Play" of FLIP).
  function captureTops() {
    const m = new Map<string, number>();
    rowEls.current.forEach((el, id) => m.set(id, el.getBoundingClientRect().top));
    prevTops.current = m;
  }

  // After a reorder, glide each row from where it was to where it now is.
  useLayoutEffect(() => {
    if (!shouldFlip.current) return;
    shouldFlip.current = false;
    rowEls.current.forEach((el, id) => {
      const prev = prevTops.current.get(id);
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

  // Which slot the pointer is currently over (first row whose midpoint is below it).
  function pointerTargetIndex(clientY: number): number {
    const list = itemsRef.current ?? [];
    for (let i = 0; i < list.length; i++) {
      const el = rowEls.current.get(list[i].id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return list.length - 1;
  }

  function startDrag(e: React.PointerEvent, index: number) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragIndex.current = index;
    setDraggingId((itemsRef.current ?? [])[index]?.id ?? null);
  }
  function moveDrag(e: React.PointerEvent) {
    if (dragIndex.current === null) return;
    const target = pointerTargetIndex(e.clientY);
    const from = dragIndex.current;
    const cur = itemsRef.current;
    if (target === from || !cur) return;
    captureTops();
    shouldFlip.current = true;
    const next = [...cur];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    itemsRef.current = next; // keep the ref ahead of the async re-render
    setItems(next);
    dragIndex.current = target;
  }
  function endDrag(e: React.PointerEvent) {
    if (dragIndex.current === null) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    dragIndex.current = null;
    setDraggingId(null);
    const cur = itemsRef.current;
    if (!cur) return;
    const renumbered = cur.map((it, i) => ({ ...it, sort_order: i }));
    itemsRef.current = renumbered;
    setItems(renumbered);
    invalidateTodaySummary();
    reorderItems(
      sb,
      renumbered.map((it) => ({ id: it.id, sortOrder: it.sort_order })),
    ).catch(() => reload());
  }

  const plus = (
    <button
      type="button"
      onClick={startAdd}
      aria-label="add routine item"
      className="grid h-8 w-8 place-items-center rounded-[9px] text-ink-3 transition-colors hover:bg-field hover:text-ink"
    >
      <Plus size={18} />
    </button>
  );

  return (
    <section className="mt-7">
      <SectionHeader title="daily routine" action={plus} />

      {items !== null && items.length === 0 && !adding && (
        <button
          type="button"
          onClick={startAdd}
          className="px-0.5 py-1.5 text-[16.5px] font-bold text-ink-3 transition-colors hover:text-ink-2"
        >
          add your first item
        </button>
      )}

      {(items ?? []).map((item, index) => {
        const done = completed.has(item.id);
        return (
          <div
            key={item.id}
            data-row
            ref={(el) => {
              if (el) rowEls.current.set(item.id, el);
              else rowEls.current.delete(item.id);
            }}
            className={`group flex items-center gap-[14px] rounded-lg px-0.5 py-1.5 ${
              draggingId === item.id
                ? "relative z-10 bg-bg shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
                : ""
            } ${enteringId === item.id ? "anim-row-in" : ""} ${
              removingId === item.id
                ? "pointer-events-none opacity-0 transition-opacity duration-200 ease-out"
                : ""
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(item)}
              aria-label={done ? "uncheck" : "check"}
              className={`${BOX_BASE} cursor-pointer text-white active:scale-90 ${
                done ? "border-accent bg-accent" : BOX_EMPTY
              }`}
            >
              {done && <Check size={14} strokeWidth={3.5} />}
            </button>

            {editingId === item.id ? (
              <input
                ref={renameInput}
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                onBlur={() => commitRename(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur(); // commit this rename (via onBlur)
                    startAdd(); // then open a fresh line — Enter on any row = new line
                  } else if (e.key === "Escape") {
                    renameCancel.current = true;
                    e.currentTarget.blur();
                  }
                }}
                className={`${LABEL_BASE} bg-transparent outline-none`}
              />
            ) : (
              <span
                onClick={() => startRename(item)}
                className={`${LABEL_BASE} cursor-text ${
                  done ? "text-ink-3 line-through decoration-ink-3" : ""
                }`}
              >
                {item.label}
              </span>
            )}

            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => remove(item)}
                aria-label="delete item"
                // Visible on touch (no hover); hover-reveal only on desktop (#128).
                className="grid h-8 w-8 place-items-center rounded-md text-ink-3 opacity-60 transition hover:bg-field hover:text-ink md:opacity-0 md:group-hover:opacity-60"
              >
                <Trash2 size={15} />
              </button>
              <span
                role="button"
                aria-label="reorder item"
                onPointerDown={(e) => startDrag(e, index)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                // Visible + draggable on touch; hover-reveal only on desktop (#132).
                // touch-none stops the page scrolling while you drag a row on mobile.
                className="grid h-8 w-8 shrink-0 cursor-grab touch-none select-none place-items-center text-ink-3 opacity-40 transition hover:text-ink md:opacity-0 md:group-hover:opacity-40"
              >
                <GripVertical size={17} />
              </span>
            </div>
          </div>
        );
      })}

      {adding && (
        <div className="flex items-center gap-[14px] px-0.5 py-1.5">
          <span className={`${BOX_BASE} ${BOX_EMPTY}`} />
          <input
            ref={addInput}
            value={newLabel}
            placeholder="new item"
            onChange={(e) => setNewLabel(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const label = newLabel.trim();
                if (!label) return; // empty Enter: do nothing (don't remove the row)
                setNewLabel(""); // commit this one and keep the row open for the next
                void addOne(label);
              } else if (e.key === "Escape") {
                addCancel.current = true;
                e.currentTarget.blur();
              }
            }}
            className={`${LABEL_BASE} bg-transparent outline-none placeholder:text-ink-3`}
          />
        </div>
      )}
    </section>
  );
}
