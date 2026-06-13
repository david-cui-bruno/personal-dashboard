"use client";

// Inspo board (#140) — moodboard | people boards of images in a masonry grid. Add via
// the + button, paste (⌘V an image), or drag-drop files. Open a tile for the lightbox,
// where colored stickies get placed on the image (Phase 1b).
//
// The holder is docked on the right (web only — mobile adds stickies from inside the
// lightbox). Dragging a color onto a tile opens that tile's lightbox with a fresh
// sticky of that color, so the dispenser "works" from the board too. Build brief:
// docs/inspo.md.
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listInspo,
  uploadInspoMedia,
  addInspoItem,
  deleteInspoItem,
  type InspoBoard as Board,
  type InspoItemWithStickies,
  type InspoSticky,
  type StickyColor,
} from "@/lib/data";
import { InspoTile } from "./inspo-tile";
import { InspoLightbox } from "./inspo-lightbox";
import { StickyHolder } from "./sticky-holder";

const BOARDS = ["moodboard", "people"] as const;

export function InspoBoard() {
  const [sb] = useState(createClient);
  const [board, setBoard] = useState<Board>("moodboard");
  const [items, setItems] = useState<InspoItemWithStickies[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingColor, setPendingColor] = useState<StickyColor | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const open = items.find((i) => i.id === openId) ?? null;

  useEffect(() => {
    let active = true;
    listInspo(sb, board).then((d) => {
      if (!active) return;
      setItems(d);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [sb, board]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const media = files.filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
      );
      if (!media.length) return;
      setBusy(true);
      try {
        for (const file of media) {
          try {
            const media = await uploadInspoMedia(sb, file);
            const item = await addInspoItem(sb, board, media);
            setItems((prev) => [item, ...prev]);
          } catch (e) {
            console.error("inspo upload failed", e);
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [sb, board],
  );

  // Paste an image from the clipboard anywhere on the board.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((i) => i.kind === "file")
        .map((i) => i.getAsFile())
        .filter((f): f is File => Boolean(f));
      if (files.some((f) => f.type.startsWith("image/"))) {
        e.preventDefault();
        void addFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  function closeLightbox() {
    setOpenId(null);
    setPendingColor(null);
  }

  function syncStickies(itemId: string, stickies: InspoSticky[]) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, stickies } : i)));
  }

  async function remove(item: InspoItemWithStickies) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    closeLightbox();
    try {
      await deleteInspoItem(sb, item.id, item.storage_path);
    } catch {
      listInspo(sb, board).then(setItems);
    }
  }

  // Drop a color onto a board tile → open that tile with a fresh sticky of that color.
  function onBoardHolderPick(color: StickyColor, point: { x: number; y: number } | null) {
    if (!point) return; // a tap on the board is ambiguous (which tile?) — drag only
    const el = document.elementFromPoint(point.x, point.y);
    const tile = el?.closest<HTMLElement>("[data-inspo-item]");
    const id = tile?.dataset.inspoItem;
    if (!id || !items.some((i) => i.id === id)) return;
    setPendingColor(color);
    setOpenId(id);
  }

  return (
    <div
      className="mx-auto max-w-[1000px] px-6 py-10 md:px-10 md:py-14"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void addFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[33px] font-black lowercase tracking-tight">inspo</h1>
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="add image"
          disabled={busy}
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-field hover:text-ink disabled:opacity-50"
        >
          <Plus size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      <div className="mb-4 inline-flex rounded-lg bg-field p-0.5 text-[13px] font-bold lowercase">
        {BOARDS.map((b) => (
          <button
            key={b}
            onClick={() => {
              if (b !== board) {
                setLoading(true);
                setBoard(b);
              }
            }}
            aria-pressed={board === b}
            className={`rounded-md px-3 py-1 transition-colors ${
              board === b ? "bg-bg text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {busy && <p className="mb-3 text-[13px] font-bold lowercase text-ink-3">uploading…</p>}

      {loading ? (
        <p className="mt-8 text-[15px] font-bold lowercase text-ink-3">loading…</p>
      ) : items.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className={`mt-2 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-16 text-[14px] font-bold lowercase transition-colors ${
            dragOver ? "border-accent text-accent" : "border-line text-ink-3 hover:text-ink-2"
          }`}
        >
          <ImagePlus size={26} /> paste, drop, or tap to add{" "}
          {board === "people" ? "people" : "inspiration"}
        </button>
      ) : (
        <div className="columns-2 [column-gap:14px] md:columns-3">
          {items.map((item) => (
            <InspoTile key={item.id} sb={sb} item={item} onOpen={() => setOpenId(item.id)} />
          ))}
        </div>
      )}

      {/* board-level dispenser — web only; on mobile you add stickies in the lightbox */}
      <StickyHolder
        onPick={onBoardHolderPick}
        orientation="vertical"
        className="fixed right-5 top-1/2 z-20 hidden -translate-y-1/2 md:flex"
      />

      {open && (
        <InspoLightbox
          key={open.id}
          sb={sb}
          item={open}
          pendingColor={pendingColor}
          onClose={closeLightbox}
          onDelete={() => remove(open)}
          onStickiesChange={syncStickies}
        />
      )}
    </div>
  );
}
