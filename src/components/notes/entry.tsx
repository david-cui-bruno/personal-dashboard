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
import { useOnline } from "@/lib/use-online";
import {
  cachedJournal,
  cachedNote,
  getJournal,
  getNote,
  readNotesSnapshot,
  snapshotJournal,
  snapshotNote,
  invalidateNotesCache,
  pinJournal,
  pinNote,
  saveJournal,
  saveNote,
  trashNote,
  unpinJournal,
  unpinNote,
  uploadImage,
  type Journal,
  type Note,
} from "@/lib/data";
import dynamic from "next/dynamic";
import type { EditorValue } from "@/components/editor";
import { SongOfDay } from "@/components/song-of-day";

// Lazy-load TipTap so it's not in the initial bundle (#122).
const Editor = dynamic(() => import("@/components/editor").then((m) => m.Editor), {
  ssr: false,
});

type EntryProps = ({ kind: "journal"; day: string } | { kind: "note"; id: string }) & {
  // Inline/offline mode (#149): the stream opens entries without a route change
  // when there's no connection — back must be a history op, not a navigation.
  onBack?: () => void;
};

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

  // Instant open (#136): if the stream just loaded this entry, seed state from the
  // cache (no round-trip, no editor-gating flicker). Entry is keyed per id/day, so
  // these lazy initializers run once per entry. A cache miss fetches in the effect.
  const [initial] = useState(() =>
    props.kind === "journal" ? cachedJournal(props.day) : cachedNote(props.id),
  );
  const initialNote = kind === "note" ? (initial as Note | undefined) : undefined;
  const initialJournal = kind === "journal" ? (initial as Journal | undefined) : undefined;

  const [ready, setReady] = useState(!!initial);
  const [missing, setMissing] = useState(false);
  const [content, setContent] = useState<JSONContent | null>(
    (initial?.content as JSONContent) ?? null,
  );
  const [title, setTitle] = useState(initialNote?.title ?? "");
  const [pinned, setPinned] = useState(initial?.pin_order != null);
  // Offline reading (#149): true while showing the persisted saved copy — the
  // editor is read-only until the fetch confirms (or replaces) it. `rev` remounts
  // the editor when fresher content arrives (TipTap reads content once).
  const [stale, setStale] = useState(false);
  const [rev, setRev] = useState(0);
  const [unreachable, setUnreachable] = useState(false); // offline + no saved copy
  const online = useOnline();

  // Latest editor value, the note's latest title, and the journal row id once
  // materialized — all read only inside callbacks, never during render.
  const latest = useRef<EditorValue | null>(null);
  const titleRef = useRef(initialNote?.title ?? "");
  const journalId = useRef<string | null>(initialJournal?.id ?? null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false); // a real edit happened → flush should save (#136)

  // Cache miss only: fetch the entry, then mount the editor (TipTap reads its
  // initial content once, at creation). Set once a fetch has confirmed the entry —
  // after that a connectivity blip (the `online` dep) must not reseed the editor
  // out from under an edit.
  const settled = useRef(!!initial);
  useEffect(() => {
    if (settled.current) return;
    let cancelled = false;
    // Paint the persisted saved copy instantly, read-only (#149) — it may be from
    // an old session, so unlike the fresh in-memory cache it always revalidates.
    // A journal day *absent* from a known-good stream snapshot is simply an empty
    // day (journals are stored only once written) — readable, not unreachable.
    const snap = kind === "journal" ? snapshotJournal(day) : snapshotNote(id);
    const emptyDay = !snap && kind === "journal" && readNotesSnapshot() !== null;
    if (emptyDay) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous seed from localStorage
      setStale(true);
      setReady(true);
    }
    if (snap) {
      journalId.current = kind === "journal" ? snap.id : journalId.current;
      titleRef.current = kind === "note" ? (snap as Note).title : titleRef.current;
      if (kind === "note") setTitle((snap as Note).title);
      setPinned(snap.pin_order != null);
      setContent((snap.content as JSONContent) ?? null);
      setStale(true);
      setReady(true);
    }
    (async () => {
      try {
        let fresh: JSONContent | null;
        if (kind === "journal") {
          const j = await getJournal(sb, day);
          if (cancelled) return;
          journalId.current = j?.id ?? null;
          setPinned(j?.pin_order != null);
          fresh = (j?.content as JSONContent) ?? null;
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
          fresh = (n.content as JSONContent) ?? null;
        }
        settled.current = true;
        // Swap the editor only if the server copy actually differs from the seed.
        if ((snap || emptyDay) && JSON.stringify(fresh) !== JSON.stringify(snap?.content ?? null)) {
          setRev((r) => r + 1);
        }
        setContent(fresh);
        setStale(false);
        setUnreachable(false);
        setReady(true);
      } catch {
        // Offline: the saved copy (if any) stays up, read-only; otherwise say so
        // instead of loading forever. The `online` dep retries on reconnect.
        if (!cancelled && !snap && !emptyDay) setUnreachable(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, day, id, sb, online]);

  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    // Only write when something actually changed — viewing an entry (incl. just
    // opening then leaving) must not save, or it would needlessly write and bust
    // the notes cache, making back-nav refetch (#136).
    if (!dirty.current) return;
    dirty.current = false;
    if (kind === "journal") {
      await saveJournal(
        sb,
        day,
        latest.current?.json ?? EMPTY_DOC,
        latest.current?.text ?? "",
      );
    } else {
      await saveNote(sb, id, {
        title: titleRef.current,
        ...(latest.current
          ? { content: latest.current.json, contentText: latest.current.text }
          : {}),
      });
    }
    invalidateNotesCache(); // back-nav should reflect the edit
  }, [kind, day, id, sb]);

  // Flush any pending edit when leaving the entry.
  useEffect(() => () => void flush(), [flush]);

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  }

  function onChange(value: EditorValue) {
    latest.current = value;
    dirty.current = true;
    scheduleSave();
  }

  function onTitleChange(value: string) {
    setTitle(value);
    titleRef.current = value;
    dirty.current = true;
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
    invalidateNotesCache();
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
      invalidateNotesCache(); // pinned view + entry pin-state must refresh
    } catch {
      setPinned(!next); // revert on failure
    }
  }

  return (
    <div className="mx-auto max-w-[700px] px-6 pt-8 pb-40 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        {props.onBack ? (
          <button
            onClick={props.onBack}
            className="flex items-center gap-1 text-[14px] font-bold lowercase text-ink-2 hover:text-ink"
          >
            <ChevronLeft size={18} /> notes
          </button>
        ) : (
          <Link
            href="/notes"
            className="flex items-center gap-1 text-[14px] font-bold lowercase text-ink-2 hover:text-ink"
          >
            <ChevronLeft size={18} /> notes
          </Link>
        )}
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
          readOnly={stale}
          className="mb-5 w-full bg-transparent text-[30px] font-black tracking-tight outline-none placeholder:text-ink-3"
        />
      )}

      {kind === "journal" && <SongOfDay day={day} />}

      {missing ? (
        <p className="text-[15px] font-bold lowercase text-ink-3">
          this note doesn&apos;t exist.
        </p>
      ) : unreachable ? (
        <p className="text-[15px] font-bold lowercase text-ink-3">
          you&apos;re offline — this entry isn&apos;t saved on this device yet.
        </p>
      ) : ready ? (
        <Editor
          key={rev}
          content={content}
          editable={!stale}
          placeholder={kind === "journal" ? "write about your day" : "start writing…"}
          onChange={onChange}
          onUploadImage={handleUpload}
        />
      ) : (
        <EntrySkeleton />
      )}
    </div>
  );
}

// First-ever load only (a snapshot paints instantly from then on, #149).
function EntrySkeleton() {
  return (
    <div aria-hidden className="animate-pulse space-y-2.5 pt-1">
      <div className="h-4 w-full rounded bg-field" />
      <div className="h-4 w-11/12 rounded bg-field" />
      <div className="h-4 w-4/5 rounded bg-field" />
      <div className="h-4 w-2/3 rounded bg-field" />
    </div>
  );
}
