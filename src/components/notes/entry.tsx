"use client";

// The entry view (spec §6): opens a journal day or a freeform note in the shared
// <Editor>. Journal title is the word "journal" + the date as a subtitle; a
// note's title is editable. Autosaves continuously (debounced, no indicator —
// spec §5). Images are uploaded via the storage-owning helper (#050).
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pin, Trash2 } from "lucide-react";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import {
  getJournal,
  getNote,
  pinJournal,
  pinNote,
  saveJournal,
  saveNote,
  trashNote,
  unpinJournal,
  unpinNote,
  uploadImage,
} from "@/lib/data";
import dynamic from "next/dynamic";
import type { EditorValue } from "@/components/editor";
import { SongOfDay } from "@/components/song-of-day";

// Lazy-load TipTap so it's not in the initial bundle (#122).
const Editor = dynamic(() => import("@/components/editor").then((m) => m.Editor), {
  ssr: false,
});

type EntryProps = { kind: "journal"; day: string } | { kind: "note"; id: string };

const SAVE_DEBOUNCE_MS = 700;
const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

function prettyDate(day: string): string {
  return new Date(`${day}T00:00:00`)
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toLowerCase();
}

export function Entry(props: EntryProps) {
  const router = useRouter();
  const [sb] = useState(createClient);

  // Identifiers are constant for an instance (Entry is keyed on the id/day).
  const kind = props.kind;
  const day = props.kind === "journal" ? props.day : "";
  const id = props.kind === "note" ? props.id : "";

  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [content, setContent] = useState<JSONContent | null>(null);
  const [title, setTitle] = useState("");
  const [pinned, setPinned] = useState(false); // pin to the Notes "pinned" view (#135)

  // Latest editor value, the note's latest title, and the journal row id once
  // materialized — all read only inside callbacks, never during render.
  const latest = useRef<EditorValue | null>(null);
  const titleRef = useRef("");
  const journalId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the entry once; the editor mounts only after this so its initial
  // content is correct (TipTap reads `content` once, at creation).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (kind === "journal") {
        const j = await getJournal(sb, day);
        if (cancelled) return;
        journalId.current = j?.id ?? null;
        setPinned(j?.pin_order != null);
        setContent((j?.content as JSONContent) ?? null);
      } else {
        const n = await getNote(sb, id);
        if (cancelled) return;
        if (!n) {
          setMissing(true);
          return;
        }
        titleRef.current = n.title;
        setTitle(n.title);
        setPinned(n.pin_order != null);
        setContent((n.content as JSONContent) ?? null);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, day, id, sb]);

  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (kind === "journal") {
      if (!latest.current) return;
      await saveJournal(sb, day, latest.current.json, latest.current.text);
    } else {
      await saveNote(sb, id, {
        title: titleRef.current,
        ...(latest.current
          ? { content: latest.current.json, contentText: latest.current.text }
          : {}),
      });
    }
  }, [kind, day, id, sb]);

  // Flush any pending edit when leaving the entry.
  useEffect(() => () => void flush(), [flush]);

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  }

  function onChange(value: EditorValue) {
    latest.current = value;
    scheduleSave();
  }

  function onTitleChange(value: string) {
    setTitle(value);
    titleRef.current = value;
    scheduleSave();
  }

  // Resolve the storage owner, materializing an empty journal row if needed so
  // the attachment has an owner_id (#050).
  async function handleUpload(file: File): Promise<string> {
    if (kind === "note") {
      return uploadImage(sb, file, { type: "note", id });
    }
    if (!journalId.current) {
      await saveJournal(
        sb,
        day,
        latest.current?.json ?? EMPTY_DOC,
        latest.current?.text ?? "",
      );
      const j = await getJournal(sb, day);
      journalId.current = j?.id ?? null;
    }
    if (!journalId.current) throw new Error("could not prepare the journal");
    return uploadImage(sb, file, { type: "journal", id: journalId.current });
  }

  async function handleDelete() {
    if (kind !== "note") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await trashNote(sb, id);
    router.push("/notes");
  }

  async function togglePin() {
    const next = !pinned;
    setPinned(next);
    try {
      if (kind === "journal") {
        await (next ? pinJournal(sb, day) : unpinJournal(sb, day));
      } else {
        await (next ? pinNote(sb, id) : unpinNote(sb, id));
      }
    } catch {
      setPinned(!next); // revert on failure
    }
  }

  return (
    <div className="mx-auto max-w-[700px] px-6 pt-8 pb-40 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/notes"
          className="flex items-center gap-1 text-[14px] font-bold lowercase text-ink-2 hover:text-ink"
        >
          <ChevronLeft size={18} /> notes
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={togglePin}
            aria-label={pinned ? "unpin" : "pin"}
            aria-pressed={pinned}
            className={`grid h-9 w-9 place-items-center rounded-lg hover:bg-field ${
              pinned ? "text-accent" : "text-ink-3 hover:text-ink"
            }`}
          >
            <Pin size={17} fill={pinned ? "currentColor" : "none"} />
          </button>
          {kind === "note" && (
            <button
              onClick={handleDelete}
              aria-label="move note to trash"
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-field hover:text-ink"
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      </div>

      {kind === "journal" ? (
        <header className="mb-5">
          <h1 className="text-[30px] font-black lowercase tracking-tight">journal</h1>
          <p className="mt-1 text-[14px] font-extrabold text-ink-2">{prettyDate(day)}</p>
        </header>
      ) : (
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="untitled"
          className="mb-5 w-full bg-transparent text-[30px] font-black tracking-tight outline-none placeholder:text-ink-3"
        />
      )}

      {kind === "journal" && <SongOfDay day={day} />}

      {missing ? (
        <p className="text-[15px] font-bold lowercase text-ink-3">
          this note doesn&apos;t exist.
        </p>
      ) : ready ? (
        <Editor
          content={content}
          placeholder={kind === "journal" ? "write about your day" : "start writing…"}
          onChange={onChange}
          onUploadImage={handleUpload}
        />
      ) : (
        <p className="text-[15px] font-bold lowercase text-ink-3">loading…</p>
      )}
    </div>
  );
}
