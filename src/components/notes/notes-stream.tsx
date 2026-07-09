"use client";

// The Notes stream (spec §6, #100/#031/#032/#034): one reverse-chronological
// list combining every day's journal (back to first use) with freeform notes.
// `+` creates a note; freeform notes soft-delete to trash with undo.
// A header `all / pinned` segment (#135) switches to a drag-reorderable view of
// pinned journals + notes; pinning happens in the entry, so the main stream stays
// clean and unmarked.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GripVertical, Pin, Plus, Trash2, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useOnline } from "@/lib/use-online";
import {
  createNote,
  getNotesStreamCached,
  invalidateNotesCache,
  readNotesSnapshot,
  reorderPins,
  restoreNote,
  trashNote,
  unpinJournal,
  unpinNote,
  type Journal,
  type Note,
  type DailySong,
  type PinnedEntry,
} from "@/lib/data";
import { eachDay, toDayString, today } from "@/lib/date";
import { parseDate } from "@/components/search/parse-date";
import { DayTile } from "@/components/ui/day-tile";
import { useDragReorder } from "@/components/ui/use-drag-reorder";
import { Entry } from "@/components/notes/entry";

// Offline entry-open (#149): a route change needs the server (the App Router
// fetches the new route's payload even on client-side nav), so with no
// connection a tapped entry opens *inline* instead — a shallow pushState to
// `/notes?open=<id>`, zero network, plain history back. Online keeps the real
// `/notes/[id]` route.
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function openOfflineInline(e: React.MouseEvent, id: string) {
  if (navigator.onLine) return; // normal navigation
  e.preventDefault();
  window.history.pushState(null, "", `/notes?open=${id}`);
}

type StreamEntry =
  | { kind: "journal"; day: string; journal: Journal | null }
  | { kind: "note"; note: Note };

function snippet(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
}

function buildStream(
  journals: Journal[],
  notes: Note[],
  songs: DailySong[],
): StreamEntry[] {
  const t = today();
  const journalByDay = new Map(journals.map((j) => [j.day, j]));
  const notesByDay = new Map<string, Note[]>();
  for (const n of notes) {
    const day = toDayString(new Date(n.created_at));
    const arr = notesByDay.get(day);
    if (arr) arr.push(n);
    else notesByDay.set(day, [n]);
  }
  const songsEarliest = songs.length
    ? songs.reduce((m, s) => (s.day < m ? s.day : m), songs[0].day)
    : undefined;
  const earliest = [
    journals.at(-1)?.day,
    notes.length ? toDayString(new Date(notes.at(-1)!.created_at)) : undefined,
    songsEarliest,
  ].filter((d): d is string => Boolean(d));
  const firstUse = earliest.length ? earliest.reduce((a, b) => (a < b ? a : b)) : t;

  const out: StreamEntry[] = [];
  for (const day of eachDay(firstUse, t).reverse()) {
    out.push({ kind: "journal", day, journal: journalByDay.get(day) ?? null });
    for (const note of notesByDay.get(day) ?? []) out.push({ kind: "note", note });
  }
  return out;
}

export function NotesStream() {
  const router = useRouter();
  const openId = useSearchParams().get("open"); // inline/offline entry (#149)
  const [sb] = useState(createClient);
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [songsByDay, setSongsByDay] = useState<Map<string, DailySong>>(new Map());
  const [pinned, setPinned] = useState<PinnedEntry[]>([]);
  const [view, setView] = useState<"all" | "pinned">("all");
  const [loading, setLoading] = useState(true);
  const [unreachable, setUnreachable] = useState(false); // last fetch failed (offline)
  const online = useOnline();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [trashed, setTrashed] = useState<{ id: string; title: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const songsRef = useRef<DailySong[]>([]);

  // One cached fetch (#136): instant on back-navigation; writes invalidate it.
  const apply = useCallback(
    (d: Awaited<ReturnType<typeof getNotesStreamCached>>) => {
      songsRef.current = d.songs;
      setSongsByDay(new Map(d.songs.map((s) => [s.day, s])));
      setPinned(d.pinned);
      setEntries(buildStream(d.journals, d.notes, d.songs));
      setLoading(false);
    },
    [],
  );
  const refresh = useCallback(async () => {
    invalidateNotesCache();
    apply(await getNotesStreamCached(sb));
  }, [apply, sb]);

  useEffect(() => {
    let cancelled = false;
    // Instant paint + offline reading (#149): show the last synced copy while the
    // real fetch runs; when the fetch fails (no connection) the copy stays up. The
    // `online` dep re-runs this the moment the connection returns.
    const snap = readNotesSnapshot();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous seed from localStorage
    if (snap) apply(snap);
    getNotesStreamCached(sb)
      .then((d) => {
        if (cancelled) return;
        apply(d);
        setUnreachable(false);
      })
      .catch(() => {
        if (cancelled) return;
        setUnreachable(true);
        setLoading(false); // no snapshot → show the offline empty state, not a skeleton
      });
    void import("@/components/editor"); // warm the TipTap chunk before a note is opened
    return () => {
      cancelled = true;
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [apply, sb, online]);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const note = await createNote(sb);
      invalidateNotesCache(); // new note must show on back-nav
      router.push(`/notes/${note.id}`);
    } catch {
      setCreating(false);
    }
  }

  async function handleTrash(note: Note) {
    setEntries((prev) =>
      prev.filter((e) => !(e.kind === "note" && e.note.id === note.id)),
    );
    setTrashed({ id: note.id, title: note.title || "untitled" });
    invalidateNotesCache(); // don't let the cache resurrect it on back-nav
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setTrashed(null), 6000);
    try {
      await trashNote(sb, note.id);
    } catch {
      await refresh();
      setTrashed(null);
    }
  }

  async function handleUndo() {
    if (!trashed) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const { id } = trashed;
    setTrashed(null);
    await restoreNote(sb, id);
    await refresh();
  }

  // --- pinned view actions (#135) ---
  function unpin(entry: PinnedEntry) {
    setPinned((prev) => prev.filter((p) => p.key !== entry.key));
    invalidateNotesCache();
    if (entry.kind === "note") void unpinNote(sb, entry.note.id);
    else void unpinJournal(sb, entry.journal.day);
  }

  function reorderPinned(orderedKeys: string[]) {
    const byKey = new Map(pinned.map((p) => [p.key, p]));
    const next = orderedKeys.map((k) => byKey.get(k)!).filter(Boolean);
    setPinned(next);
    invalidateNotesCache();
    void reorderPins(
      sb,
      next.map((p) => ({
        kind: p.kind,
        id: p.kind === "note" ? p.note.id : p.journal.day,
      })),
    );
  }

  const q = query.trim().toLowerCase();
  const textShown = q
    ? entries.filter((e) =>
        e.kind === "journal"
          ? snippet(e.journal?.content_text).toLowerCase().includes(q)
          : `${e.note.title} ${e.note.content_text}`.toLowerCase().includes(q),
      )
    : entries;
  // Inline/offline entry (#149): render the same <Entry> in place of the list —
  // the stream stays mounted underneath, so back is instant and networkless.
  if (openId) {
    const back = () => window.history.pushState(null, "", "/notes");
    return DAY_RE.test(openId) ? (
      <Entry key={openId} kind="journal" day={openId} onBack={back} />
    ) : (
      <Entry key={openId} kind="note" id={openId} onBack={back} />
    );
  }

  const datedDay = query.trim() ? parseDate(query.trim()) : null;
  const shown: StreamEntry[] = datedDay
    ? [
        entries.find((e) => e.kind === "journal" && e.day === datedDay) ?? {
          kind: "journal",
          day: datedDay,
          journal: null,
        },
        ...textShown.filter((e) => !(e.kind === "journal" && e.day === datedDay)),
      ]
    : textShown;

  return (
    <div className="mx-auto max-w-[700px] px-6 py-10 md:px-10 md:py-14">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[33px] font-black lowercase tracking-tight">notes</h1>
        <button
          onClick={handleCreate}
          aria-label="new note"
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-field hover:text-ink disabled:opacity-50"
          disabled={creating}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* all / pinned segment (#135) */}
      <div className="mb-3 inline-flex rounded-lg bg-field p-0.5 text-[13px] font-bold lowercase">
        {(["all", "pinned"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`rounded-md px-3 py-1 transition-colors ${
              view === v ? "bg-bg text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "all" && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search notes…"
          className="mb-3 w-full rounded-xl border border-line bg-field px-4 py-2.5 text-[14.5px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
      )}

      {loading ? (
        <StreamSkeleton />
      ) : view === "pinned" ? (
        <PinnedList
          pinned={pinned}
          songsByDay={songsByDay}
          onUnpin={unpin}
          onReorder={reorderPinned}
        />
      ) : shown.length === 0 ? (
        <p className="mt-8 text-[15px] font-bold lowercase text-ink-3">
          {q
            ? "nothing matches that."
            : unreachable
              ? "you're offline — notes will appear once you're connected."
              : "nothing here yet."}
        </p>
      ) : (
        <ul className="-mx-2">
          {shown.map((e) =>
            e.kind === "journal" ? (
              <li key={`j-${e.day}`}>
                <Link
                  href={`/notes/${e.day}`}
                  onClick={(ev) => openOfflineInline(ev, e.day)}
                  className="flex items-start gap-3.5 rounded-xl px-2 py-3.5 hover:bg-field"
                >
                  <JournalInner day={e.day} journal={e.journal} song={songsByDay.get(e.day)} />
                </Link>
              </li>
            ) : (
              <NoteRow key={`n-${e.note.id}`} note={e.note} onTrash={handleTrash} />
            ),
          )}
        </ul>
      )}

      {trashed && (
        <div className="fixed inset-x-0 bottom-24 z-20 mx-auto flex w-fit items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-[14px] font-bold lowercase text-bg shadow-lg md:bottom-8">
          <span>moved to trash</span>
          <button onClick={handleUndo} className="flex items-center gap-1.5 text-accent">
            <Undo2 size={15} /> undo
          </button>
        </div>
      )}
    </div>
  );
}

// First-ever load only (a snapshot paints instantly from then on, #149): pulse
// rows shaped like the stream, so the screen is never blank while fetching.
// Exported for the page's Suspense fallback — useSearchParams (the ?open entry)
// punts the stream itself out of the static HTML, so the fallback must carry
// the header + skeleton or a cold load would paint blank.
export function StreamSkeleton() {
  return (
    <div aria-hidden className="mt-1 animate-pulse">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3.5 px-2 py-3.5">
          <div className="h-[54px] w-[54px] shrink-0 rounded-xl bg-field" />
          <div className="min-w-0 flex-1 pt-1">
            <div className="h-4 w-24 rounded bg-field" />
            <div
              className="mt-2 h-3.5 rounded bg-field"
              style={{ width: `${88 - i * 9}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- shared row content (used by both the stream and the pinned view) ---------

function JournalInner({
  day,
  journal,
  song,
}: {
  day: string;
  journal: Journal | null;
  song?: DailySong;
}) {
  const text = snippet(journal?.content_text);
  return (
    <>
      <DayTile day={day} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[15.5px] font-extrabold">journal</div>
        {text ? (
          <p className="line-clamp-2 text-[14px] leading-snug text-ink">{text}</p>
        ) : (
          <p className="text-[14px] text-ink-3">empty · tap to write</p>
        )}
        {song && (
          <p className="mt-1 truncate text-[12.5px] font-bold lowercase text-ink-3">
            ♪ {song.title || "song"}
            {song.artist ? ` — ${song.artist}` : ""}
          </p>
        )}
      </div>
    </>
  );
}

function NoteInner({ note }: { note: Note }) {
  const text = snippet(note.content_text);
  return (
    <>
      <div className="h-[54px] w-[54px] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[15.5px] font-extrabold">{note.title || "untitled"}</div>
        {text ? (
          <p className="line-clamp-2 text-[14px] leading-snug text-ink">{text}</p>
        ) : (
          <p className="text-[14px] text-ink-3">empty note</p>
        )}
      </div>
    </>
  );
}

function NoteRow({ note, onTrash }: { note: Note; onTrash: (n: Note) => void }) {
  return (
    <li className="group relative">
      <Link
        href={`/notes/${note.id}`}
        onClick={(ev) => openOfflineInline(ev, note.id)}
        className="flex items-start gap-3.5 rounded-xl px-2 py-3.5 pr-12 hover:bg-field"
      >
        <NoteInner note={note} />
      </Link>
      <button
        onClick={() => onTrash(note)}
        aria-label="move note to trash"
        className="absolute right-2 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-bg hover:text-ink md:hidden md:group-hover:grid"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

// --- the pinned view: a drag-reorderable list of pinned journals + notes ------

function PinnedList({
  pinned,
  songsByDay,
  onUnpin,
  onReorder,
}: {
  pinned: PinnedEntry[];
  songsByDay: Map<string, DailySong>;
  onUnpin: (e: PinnedEntry) => void;
  onReorder: (orderedKeys: string[]) => void;
}) {
  const { registerRow, handleProps, draggingKey } = useDragReorder({
    items: pinned,
    keyOf: (e) => e.key,
    onDrop: onReorder,
  });

  if (pinned.length === 0) {
    return (
      <p className="mt-8 text-[15px] font-bold lowercase text-ink-3">
        nothing pinned yet — open a note or journal and tap the pin.
      </p>
    );
  }

  return (
    <ul className="-mx-2">
      {pinned.map((e, i) => {
        const target = e.kind === "note" ? e.note.id : e.journal.day;
        const href = `/notes/${target}`;
        return (
          <li
            key={e.key}
            ref={registerRow(e.key)}
            className={`relative flex items-center rounded-xl ${
              draggingKey === e.key ? "z-10 bg-bg shadow-[0_6px_20px_rgba(0,0,0,0.12)]" : ""
            }`}
          >
            <span
              {...handleProps(i)}
              role="button"
              aria-label="reorder"
              className="grid h-9 w-8 shrink-0 cursor-grab touch-none select-none place-items-center text-ink-3 hover:text-ink"
            >
              <GripVertical size={17} />
            </span>
            <Link
              href={href}
              onClick={(ev) => openOfflineInline(ev, target)}
              className="flex min-w-0 flex-1 items-start gap-3.5 rounded-xl py-3.5 pr-10 hover:bg-field"
            >
              {e.kind === "journal" ? (
                <JournalInner
                  day={e.journal.day}
                  journal={e.journal}
                  song={songsByDay.get(e.journal.day)}
                />
              ) : (
                <NoteInner note={e.note} />
              )}
            </Link>
            <button
              onClick={() => onUnpin(e)}
              aria-label="unpin"
              className="absolute right-1 top-3 grid h-9 w-9 place-items-center rounded-lg text-accent hover:bg-field"
            >
              <Pin size={16} fill="currentColor" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
