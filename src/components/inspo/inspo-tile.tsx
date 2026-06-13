"use client";

// One masonry tile (#140). The image reserves its aspect ratio from the stored
// width/height so the column doesn't jump as it loads. Any stickies on the item show
// as small, non-interactive "peeks" (decoration — they're placed/edited in the
// lightbox, not here). `data-inspo-item` makes the tile a drop target for a color
// dragged from the board holder (see inspo-board). The ▶ badge is for Phase 2 video.
import { Play } from "lucide-react";
import { inspoUrl, type DB, type InspoItemWithStickies, type StickyColor } from "@/lib/data";
import { STICKY_STYLE } from "./sticky-colors";

const MAX_PEEKS = 2;

export function InspoTile({
  sb,
  item,
  onOpen,
}: {
  sb: DB;
  item: InspoItemWithStickies;
  onOpen: () => void;
}) {
  const peeks = (item.stickies ?? []).slice(0, MAX_PEEKS);
  const ratio = item.width && item.height ? `${item.width} / ${item.height}` : undefined;

  return (
    <button
      type="button"
      data-inspo-item={item.id}
      onClick={onOpen}
      className="relative mb-3.5 block w-full break-inside-avoid overflow-hidden rounded-xl bg-field text-left shadow-sm"
    >
      {item.kind === "video" ? (
        // First-frame preview (#t=0.1) — poster thumbnails are a later refinement.
        <video
          src={`${inspoUrl(sb, item.storage_path)}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          className="block w-full"
          style={ratio ? { aspectRatio: ratio } : undefined}
        />
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
  );
}
