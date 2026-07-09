// Notes-screen cache (#136), mirroring the Today cache (#122): the /notes stream
// (journals + notes + songs + pinned) is fetched once and held in a short-lived
// in-memory cache so back-navigation is instant instead of re-fetching everything.
// The full rows include `content`, so each entry is also primed by id/day — opening
// a note then renders its body immediately, with no extra round-trip before the
// editor. Any write calls invalidateNotesCache() so the next read is fresh.
import { listJournals } from "./journal";
import { listNotes } from "./notes";
import { listSongs } from "./song";
import { listPinned, type PinnedEntry } from "./pins";
import { readSnapshot, writeSnapshot } from "./local-snapshot";
import type { DB, Journal, Note, DailySong } from "./types";

export type NotesStreamData = {
  journals: Journal[];
  notes: Note[];
  songs: DailySong[];
  pinned: PinnedEntry[];
};

const TTL_MS = 30_000;
let entry: { at: number; promise: Promise<NotesStreamData> } | null = null;

// per-entry content, primed from the stream lists for instant entry open
const noteById = new Map<string, Note>();
const journalByDay = new Map<string, Journal>();

async function load(sb: DB): Promise<NotesStreamData> {
  const [journals, notes, songs, pinned] = await Promise.all([
    listJournals(sb),
    listNotes(sb),
    listSongs(sb).catch(() => [] as DailySong[]),
    listPinned(sb),
  ]);
  noteById.clear();
  journalByDay.clear();
  for (const n of notes) noteById.set(n.id, n);
  for (const j of journals) journalByDay.set(j.day, j);
  const data = { journals, notes, songs, pinned };
  // Persist the freshest stream as the offline / instant-paint snapshot (#149).
  snapParsed = data;
  writeSnapshot(SNAP_KEY, data);
  return data;
}

export function getNotesStreamCached(sb: DB): Promise<NotesStreamData> {
  const now = Date.now();
  if (entry && now - entry.at < TTL_MS) return entry.promise;
  const promise = load(sb);
  const mine = { at: now, promise };
  entry = mine;
  promise.catch(() => {
    if (entry === mine) entry = null;
  });
  return promise;
}

// Drop the cache after any write so the next read (and back-nav) refreshes.
export function invalidateNotesCache(): void {
  entry = null;
  noteById.clear();
  journalByDay.clear();
}

// Instant initial content for an entry, if the stream loaded it recently.
export function cachedNote(id: string): Note | undefined {
  return noteById.get(id);
}
export function cachedJournal(day: string): Journal | undefined {
  return journalByDay.get(day);
}

// --- persistent snapshot (#149): the last good stream, for instant paint +
// offline reading. Unlike the maps above it survives a reload, so entries can
// open (read-only) with no connection; consumers must still revalidate.
const SNAP_KEY = "notes-stream";
let snapParsed: NotesStreamData | null | undefined; // undefined = not read yet

export function readNotesSnapshot(): NotesStreamData | null {
  if (snapParsed === undefined) snapParsed = readSnapshot<NotesStreamData>(SNAP_KEY);
  return snapParsed;
}
export function snapshotNote(id: string): Note | undefined {
  return readNotesSnapshot()?.notes.find((n) => n.id === id);
}
export function snapshotJournal(day: string): Journal | undefined {
  return readNotesSnapshot()?.journals.find((j) => j.day === day);
}
