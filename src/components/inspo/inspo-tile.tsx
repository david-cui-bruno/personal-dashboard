"use client";

// One masonry tile (#140). The media reserves its aspect ratio from the stored
// width/height so the column doesn't jump as it loads. Video tiles show a generated
// **poster** still (#144) — or, if none, the live first frame (`#t=0.1`) — plus a ▶
// badge. Stickies on the item show as small, non-interactive "peeks" (decoration —
// they're placed/edited in the lightbox). `data-inspo-item` makes the tile both a drop
// target for a color dragged from the board holder and a reorder target (see
// inspo-board + use-masonry-reorder). The grip handle (top-left) starts a reorder drag.
import { GripVertical, Play } from "lucide-react";
import { inspoUrl, type DB, type InspoItemWithStickies, type StickyColor } from "@/lib/data";
import { STICKY_STYLE } from "./sticky-colors";

const MAX_PEEKS = 2;

export function InspoTile({
  sb,
  item,
  onOpen,
  dragging,
  handleProps,
}: {
  sb: DB;
  item: InspoItemWithStickies;
  onOpen: () => void;
  dragging?: boolean;
  handleProps?: { onPointerDown: (e: React.PointerEvent) => void };
}) {
  const peeks = (item.stickies ?? []).slice(0, MAX_PEEKS);
  const ratio = item.width && item.height ? `${item.width} / ${item.height}` : undefined;
  const posterUrl =
    item.kind === "video" && item.poster_path ? inspoUrl(sb, item.poster_path) : null;

  return (
    <div data-inspo-item={item.id} className="group relative w-full">
      <button
        type="button"
        onClick={onOpen}
        className={`relative block w-full overflow-hidden rounded-xl bg-field text-left transition-shadow ${
          dragging ? "shadow-[0_20px_45px_rgba(0,0,0,0.3)]" : "shadow-sm"
        }`}
      >
        {item.kind === "video" ? (
          posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt=""
              loading="lazy"
              className="block w-full"
              style={ratio ? { aspectRatio: ratio } : undefined}
            />
          ) : (
            // fallback when no poster was generated — show the live first frame
            <video
              src={`${inspoUrl(sb, item.storage_path)}#t=0.1`}
              muted
              playsInline
              preload="metadata"
              className="block w-full"
              style={ratio ? { aspectRatio: ratio } : undefined}
            />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={inspoUrl(sb, item.storage_path)}
            alt=""
            loading="lazy"
            className="block w-full"
            style={ratio ? { aspectRatio: ratio } : undefined}
          />
        )}

        {item.kind === "video" && (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white">
            <Play size={13} />
          </span>
        )}

        {peeks.map((s, i) => {
          const c = STICKY_STYLE[s.color as StickyColor];
          return (
            <span
              key={s.id}
              className="pointer-events-none absolute left-2 max-w-[62%] truncate rounded-[3px] px-2 py-1 text-[10px] font-bold shadow"
              style={{
                bottom: 9 + i * 22,
                transform: `rotate(${-3 + i * 2}deg)`,
                background: c.bg,
                color: c.fg,
              }}
            >
              {s.text.trim() || "·"}
            </span>
          );
        })}
      </button>

      {handleProps && (
        <button
          type="button"
          aria-label="drag to reorder"
          {...handleProps}
          className="absolute left-2 top-2 z-10 grid h-7 w-7 cursor-grab touch-none place-items-center rounded-md bg-black/45 text-white opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </button>
      )}
    </div>
  );
}
