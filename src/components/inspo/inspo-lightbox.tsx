"use client";

// The opened item (#140, Phase 1b) — the focused surface where stickies live. The
// image sits in a `position: relative` box sized exactly to the rendered image, so a
// sticky's x/y fractions map straight onto it. The holder is docked beside the image
// (a side rail on web, a bottom strip on touch); dropping a color on the image places
// a sticky there (or at center for a tap / out-of-bounds drop), then focuses it to
// type. Sticky CRUD persists immediately (text debounced inside <Sticky>); the final
// set is handed back to the board on close so the tile peeks stay current.
import { useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import {
  addSticky,
  updateSticky,
  deleteSticky,
  inspoUrl,
  type DB,
  type InspoItemWithStickies,
  type InspoSticky,
  type StickyColor,
} from "@/lib/data";
import { Sticky } from "./sticky";
import { StickyHolder } from "./sticky-holder";

const CENTER = { x: 0.5, y: 0.42 }; // where a tap / out-of-bounds drop lands

export function InspoLightbox({
  sb,
  item,
  pendingColor,
  onClose,
  onDelete,
  onStickiesChange,
}: {
  sb: DB;
  item: InspoItemWithStickies;
  pendingColor: StickyColor | null;
  onClose: () => void;
  onDelete: () => void;
  onStickiesChange: (itemId: string, stickies: InspoSticky[]) => void;
}) {
  const [stickies, setStickies] = useState<InspoSticky[]>(item.stickies ?? []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  // A color dropped on this tile from the board holder → drop one sticky on open.
  const pending = useRef(pendingColor);

  function close() {
    onStickiesChange(item.id, stickies);
    onClose();
  }

  async function createSticky(color: StickyColor, x: number, y: number) {
    const rotation = Math.round((Math.random() * 6 - 3) * 10) / 10; // ±3° paper tilt
    try {
      const created = await addSticky(sb, item.id, { color, x, y, rotation });
      setStickies((prev) => [...prev, created]);
      setActiveId(created.id);
      setNewId(created.id);
    } catch (e) {
      console.error("inspo: add sticky failed", e);
    }
  }

  // Drain the pending color once the image box exists (ref callback fires on mount).
  function attachMedia(el: HTMLDivElement | null) {
    mediaRef.current = el;
    if (el && pending.current) {
      const color = pending.current;
      pending.current = null;
      void createSticky(color, CENTER.x, CENTER.y);
    }
  }

  function patchSticky(id: string, patch: { text?: string; x?: number; y?: number }) {
    setStickies((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    void updateSticky(sb, id, patch).catch((e) => console.error("inspo: sticky save failed", e));
  }

  function removeSticky(id: string) {
    setStickies((prev) => {
      if (!prev.some((s) => s.id === id)) return prev; // idempotent (blur + ✕ can both fire)
      void deleteSticky(sb, id).catch(() => {});
      return prev.filter((s) => s.id !== id);
    });
  }

  // Holder drop in the lightbox → place on the image at the drop point, else center.
  function onHolderPick(color: StickyColor, point: { x: number; y: number } | null) {
    const box = mediaRef.current?.getBoundingClientRect();
    let { x, y } = CENTER;
    if (point && box) {
      const within = point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
      if (within) {
        x = (point.x - box.left) / box.width;
        y = (point.y - box.top) / box.height;
      }
    }
    void createSticky(color, x, y);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 md:p-8"
      onPointerDown={close}
    >
      <div
        className="relative flex max-h-[92vh] flex-col items-center gap-3 md:flex-row md:items-stretch md:gap-5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* media box — sized to the image/video, so sticky fractions map onto it */}
        <div ref={attachMedia} className="relative inline-block">
          {item.kind === "video" ? (
            <video
              src={inspoUrl(sb, item.storage_path)}
              controls
              playsInline
              className="block max-h-[80vh] max-w-[82vw] rounded-xl md:max-w-[58vw]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={inspoUrl(sb, item.storage_path)}
              alt=""
              draggable={false}
              className="block max-h-[80vh] max-w-[82vw] rounded-xl md:max-w-[58vw]"
            />
          )}
          {stickies.map((s) => (
            <Sticky
              key={s.id}
              sticky={s}
              boundsRef={mediaRef}
              autoFocus={s.id === newId}
              active={activeId === s.id}
              onActivate={() => setActiveId(s.id)}
              onChange={(patch) => patchSticky(s.id, patch)}
              onDelete={() => removeSticky(s.id)}
            />
          ))}

          <button
            type="button"
            onClick={close}
            aria-label="close"
            className="absolute -right-3 -top-3 z-30 grid h-9 w-9 place-items-center rounded-full bg-bg text-ink shadow-lg"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="delete image"
            className="absolute bottom-3 right-3 z-30 grid h-10 w-10 place-items-center rounded-full bg-bg/90 text-ink-3 shadow-lg hover:text-red-500"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* holder — side rail on web, bottom strip on touch */}
        <StickyHolder onPick={onHolderPick} orientation="vertical" className="hidden self-center md:flex" />
        <StickyHolder onPick={onHolderPick} orientation="horizontal" className="flex md:hidden" />
      </div>
    </div>
  );
}
