"use client";

// Inspo board (#140, Phase 1a) — moodboard | people boards of images in a masonry
// grid. Add via the + button, paste (⌘V an image), or drag-drop files. Open a tile
// to view it; delete from there. The sticky holder + on-image stickies land in
// Phase 1b (this lightbox is where they'll live). Build brief: docs/inspo.md.
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listInspo,
  uploadInspoMedia,
  addInspoItem,
  deleteInspoItem,
  inspoUrl,
  type InspoBoard as Board,
  type InspoItemWithStickies,
} from "@/lib/data";

const BOARDS = ["moodboard", "people"] as const;

export function InspoBoard() {
  const [sb] = useState(createClient);
  const [board, setBoard] = useState<Board>("moodboard");
  const [items, setItems] = useState<InspoItemWithStickies[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<InspoItemWithStickies | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (!images.length) return;
      setBusy(true);
      try {
        for (const file of images) {
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

  async function remove(item: InspoItemWithStickies) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setOpen(null);
    try {
      await deleteInspoItem(sb, item.id, item.storage_path);
    } catch {
      listInspo(sb, board).then(setItems);
    }
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
          accept="image/*"
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

      {busy && (
        <p className="mb-3 text-[13px] font-bold lowercase text-ink-3">uploading…</p>
      )}

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
            <button
              key={item.id}
              onClick={() => setOpen(item)}
              className="mb-3.5 block w-full break-inside-avoid overflow-hidden rounded-xl bg-field shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={inspoUrl(sb, item.storage_path)}
                alt=""
                loading="lazy"
                className="block w-full"
              />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-6"
          onMouseDown={() => setOpen(null)}
        >
          <div
            className="relative max-h-[88vh] max-w-[90vw]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inspoUrl(sb, open.storage_path)}
              alt=""
              className="max-h-[88vh] max-w-[90vw] rounded-xl"
            />
            <button
              onClick={() => setOpen(null)}
              aria-label="close"
              className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-bg text-ink shadow-lg"
            >
              <X size={18} />
            </button>
            <button
              onClick={() => remove(open)}
              aria-label="delete image"
              className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-bg/90 text-ink-3 shadow-lg hover:text-red-500"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
