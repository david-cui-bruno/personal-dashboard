"use client";

// One masonry tile (#140, #147). The media reserves its aspect ratio from the stored
// width/height so the column doesn't jump as it loads. Video tiles show a generated
// **poster** still (#144) — or, if none, the live first frame (`#t=0.1`) — plus a ▶ badge.
//
// Stickies live **directly on the tile** now (#147): they render in a non-clipped overlay
// over the image and are placed/typed/moved/deleted in place (drop a color from the holder
// onto the tile). The overlay is pointer-transparent except for the notes, so pressing the
// image itself grabs the tile to reorder (handled in inspo-board via use-masonry-reorder).
import { useRef } from "react";
import { Play } from "lucide-react";
import { inspoUrl, type DB, type InspoItemWithStickies } from "@/lib/data";
import { Sticky } from "./sticky";

export function InspoTile({
  sb,
  item,
  dragging,
  handleProps,
  activeStickyId,
  newStickyId,
  onActivateSticky,
  onPatchSticky,
  onRemoveSticky,
}: {
  sb: DB;
  item: InspoItemWithStickies;
  dragging?: boolean;
  handleProps?: { onPointerDown: (e: React.PointerEvent) => void };
  activeStickyId: string | null;
  newStickyId: string | null;
  onActivateSticky: (id: string) => void;
  onPatchSticky: (stickyId: string, patch: { text?: string; x?: number; y?: number }) => void;
  onRemoveSticky: (stickyId: string) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const ratio = item.width && item.height ? `${item.width} / ${item.height}` : undefined;
  const posterUrl =
    item.kind === "video" && item.poster_path ? inspoUrl(sb, item.poster_path) : null;
  const stickies = item.stickies ?? [];

  return (
    <div
      data-inspo-item={item.id}
      {...handleProps}
      className="group relative w-full select-none"
      style={{ touchAction: dragging ? "none" : undefined, cursor: dragging ? "grabbing" : "grab" }}
    >
      <div
        className={`relative overflow-hidden rounded-xl bg-field transition-shadow ${
          dragging ? "shadow-[0_22px_48px_rgba(0,0,0,0.32)]" : "shadow-sm"
        }`}
      >
        {item.kind === "video" ? (
          posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt=""
              loading="lazy"
              draggable={false}
              className="block w-full"
              style={ratio ? { aspectRatio: ratio } : undefined}
            />
          ) : (
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
            draggable={false}
            className="block w-full"
            style={ratio ? { aspectRatio: ratio } : undefined}
          />
        )}

        {item.kind === "video" && (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white">
            <Play size={13} />
          </span>
        )}
      </div>

      {/* sticky overlay — not clipped (notes can sit anywhere); only the notes catch pointers */}
      <div ref={overlayRef} className="pointer-events-none absolute inset-0">
        {stickies.map((s) => (
          <Sticky
            key={s.id}
            sticky={s}
            boundsRef={overlayRef}
            autoFocus={s.id === newStickyId}
            active={activeStickyId === s.id}
            onActivate={() => onActivateSticky(s.id)}
            onChange={(patch) => onPatchSticky(s.id, patch)}
            onDelete={() => onRemoveSticky(s.id)}
          />
        ))}
      </div>
    </div>
  );
}
