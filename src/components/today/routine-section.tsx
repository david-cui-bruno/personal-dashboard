"use client";

// Daily routine checklist (spec §2, §3 · #010, #013, #016, #017). A flat list of
// the day's active items in sort_order: tap the box to check, tap the label to
// rename inline, hold-drag the grip to reorder, "+" in the header adds a row,
// hover delete = archive. No box around the section, no row dividers (#065).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  "grid h-[23px] w-[23px] shrink-0 place-items-center rounded-[7px] border-2 transition-colors";
const BOX_EMPTY =
  "border-[#d0d0d4] [[data-theme=dark]_&]:border-[#45454c]";
const LABEL_BASE = "min-w-0 flex-1 text-[16.5px] font-bold leading-snug";

export function RoutineSection({ day }: { day: string }) {
  const sb = useMemo(() => createClient(), []);

  // null = loading; the active items for `day`, in sort_order.
  const [items, setItems] = useState<RoutineItem[] | null>(null);
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

  // drag-reorder bookkeeping
  const dragIndex = useRef<number | null>(null);

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
  function remove(item: RoutineItem) {
    setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
    setCompleted((prev) => {
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
    invalidateTodaySummary();
    archiveItem(sb, item.id, day).catch(() => reload());
  }

  // --- hold-drag reorder (#013) -----------------------------------------
  function onDragEnter(index: number) {
    const from = dragIndex.current;
    if (from === null || from === index) return;
    setItems((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    dragIndex.current = index;
  }
  function endDrag() {
    dragIndex.current = null;
    if (!items) return;
    const renumbered = items.map((it, i) => ({ ...it, sort_order: i }));
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
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => onDragEnter(index)}
            className="group flex items-center gap-[14px] px-0.5 py-1.5"
          >
            <button
              type="button"
              onClick={() => toggle(item)}
              aria-label={done ? "uncheck" : "check"}
              className={`${BOX_BASE} cursor-pointer text-white ${
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
                className="grid h-7 w-7 place-items-center rounded-md text-ink-3 opacity-0 transition hover:bg-field hover:text-ink group-hover:opacity-60"
              >
                <Trash2 size={15} />
              </button>
              <span
                draggable
                onDragStart={(e) => {
                  dragIndex.current = index;
                  const row = e.currentTarget.closest(
                    "[data-row]",
                  ) as HTMLElement | null;
                  if (row)
                    e.dataTransfer.setDragImage(row, 24, row.offsetHeight / 2);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={endDrag}
                aria-hidden
                className="grid h-7 w-7 cursor-grab place-items-center text-ink-3 opacity-0 transition group-hover:opacity-40"
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
