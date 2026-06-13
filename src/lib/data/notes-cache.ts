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
  return { journals, notes, songs, pinned };
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
