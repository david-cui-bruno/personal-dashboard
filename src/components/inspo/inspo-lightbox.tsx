"use client";

// The enlarged view of an item (#140, #147). Stickies now live on the board tile too,
// so this is no longer required to place them — but it's a bigger canvas (and the only
// place to add stickies on mobile, where the board has no holder rail). It's a thin,
// *controlled* view: it reads the item's stickies from board state and calls the board's
// sticky callbacks, so edits here and on the tile are the same data. The media sits in a
// `position: relative` box sized to it, so a sticky's x/y fractions map straight on.
import { useRef } from "react";
import { Trash2, X } from "lucide-react";
import {
  inspoUrl,
  type DB,
  type InspoItemWithStickies,
  type StickyColor,
} from "@/lib/data";
import { Sticky, clampStickyPlacement } from "./sticky";
import { StickyHolder } from "./sticky-holder";

const CENTER = { x: 0.5, y: 0.42 }; // where a tap / out-of-bounds drop lands

export function InspoLightbox({
  sb,
  item,
  activeStickyId,
  newStickyId,
  onActivateSticky,
  onAddSticky,
  onPatchSticky,
  onRemoveSticky,
  onClose,
  onDelete,
}: {
  sb: DB;
  item: InspoItemWithStickies;
  activeStickyId: string | null;
  newStickyId: string | null;
  onActivateSticky: (id: string) => void;
  onAddSticky: (color: StickyColor, x: number, y: number) => void;
  onPatchSticky: (stickyId: string, patch: { text?: string; x?: number; y?: number }) => void;
  onRemoveSticky: (stickyId: string) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const stickies = item.stickies ?? [];

  // Holder drop → place on the media at the drop point, else center.
  function onHolderPick(color: StickyColor, point: { x: number; y: number } | null) {
    const box = mediaRef.current?.getBoundingClientRect();
    let { x, y } = CENTER;
    if (point && box) {
      const within =
        point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
      if (within) {
        ({ x, y } = clampStickyPlacement(
          (point.x - box.left) / box.width,
          (point.y - box.top) / box.height,
          box.width,
          box.height,
        ));
      }
    }
    onAddSticky(color, x, y);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 md:p-8"
      onPointerDown={onClose}
    >
      <div
        className="relative flex max-h-[92vh] flex-col items-center gap-3 md:flex-row md:items-stretch md:gap-5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* media box — sized to the image/video, so sticky fractions map onto it */}
        <div ref={mediaRef} className="relative inline-block">
          {item.kind === "video" ? (
            <video
              src={inspoUrl(sb, item.storage_path)}
              poster={item.poster_path ? inspoUrl(sb, item.poster_path) : undefined}
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
              autoFocus={s.id === newStickyId}
              active={activeStickyId === s.id}
              onActivate={() => onActivateSticky(s.id)}
              onChange={(patch) => onPatchSticky(s.id, patch)}
              onDelete={() => onRemoveSticky(s.id)}
            />
          ))}

          <button
            type="button"
            onClick={onClose}
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
