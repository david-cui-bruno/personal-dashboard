"use client";

// Today's journal (spec §2, §5 · #030). The shared <Editor> bound inline to the
// one journal object for `day` — the *same* object the Notes stream opens for
// today ("one object, two doors", #030). Typing autosaves (debounced); no
// "saved" indicator, no word count. Empty days show the placeholder.
import { useEffect, useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { useOnline } from "@/lib/use-online";
import {
  getJournal,
  saveJournal,
  uploadImage,
  getTodaySummaryCached,
  invalidateTodaySummary,
  readTodaySnapshot,
  todayWindow,
} from "@/lib/data";
import dynamic from "next/dynamic";
import type { EditorValue } from "@/components/editor";
import type { DailySong } from "@/lib/data";
import { SectionHeader } from "@/components/ui/section-header";
import { SongOfDay } from "@/components/song-of-day";

// Lazy-load TipTap so it's not in the initial Today bundle (#122).
const Editor = dynamic(() => import("@/components/editor").then((m) => m.Editor), {
  ssr: false,
});

const SAVE_DEBOUNCE_MS = 700;
const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function JournalSection({ day }: { day: string }) {
  const sb = useMemo(() => createClient(), []);
  // The journal loaded for a specific day; `content === null` is an empty day.
  // Tracking the day it belongs to lets us re-init the Editor when the day
  // rolls over, and gates rendering until the fetch resolves (no stale flash).
  const [loaded, setLoaded] = useState<{
    day: string;
    content: JSONContent | null;
    // Offline reading (#149): the persisted saved copy, shown read-only until the
    // fetch confirms it (typing into a copy that can't save would lose the words).
    stale?: boolean;
    // Bumped when fresher content replaces a mounted stale seed, to remount the
    // editor (TipTap reads its content once, at creation) — part of the key.
    seq?: number;
  } | null>(null);
  const online = useOnline();
  // Today's song from the same payload (#131), passed to <SongOfDay> so it doesn't
  // make its own round-trip. undefined = the RPC didn't include it → the bar fetches.
  const [songSeed, setSongSeed] = useState<DailySong | null | undefined>(undefined);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<EditorValue | null>(null);
  // The journal row id once materialized, so pasted/dropped images have an
  // owner_id (#050). Reset per day; read only inside the upload callback.
  const journalId = useRef<string | null>(null);

  // The day the fetch last confirmed — a connectivity blip (the `online` dep)
  // must not reseed the editor out from under an edit, but a midnight rollover
  // (new `day`) must.
  const settledDay = useRef<string | null>(null);
  useEffect(() => {
    if (settledDay.current === day) return;
    let active = true;
    journalId.current = null;
    // Instant paint + offline reading (#149): seed today's journal from the
    // persisted snapshot, read-only until the fetch confirms it. Only a snapshot
    // *of this day* seeds content — yesterday's journal must not leak into today.
    const snap = readTodaySnapshot();
    const seed =
      snap && snap.to === day
        ? ((snap.summary.journal?.content as JSONContent | null) ?? null)
        : null;
    if (snap && snap.to === day) {
      journalId.current = snap.summary.journal?.id ?? null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous seed from localStorage
      setSongSeed(snap.summary.song);
      setLoaded({ day, content: seed, stale: true });
    }
    // Today's journal comes from the shared Today payload (#122) — one round-trip
    // for routine + journal + chart, de-duped + cached.
    const { from, to } = todayWindow();
    getTodaySummaryCached(sb, from, to)
      .then((s) => {
        if (!active) return;
        settledDay.current = day;
        journalId.current = s.journal?.id ?? null;
        const fresh = (s.journal?.content as JSONContent | null) ?? null;
        setSongSeed(s.song);
        // If the editor is mounted on a stale seed whose content the server
        // contradicts, bump `seq` so it remounts with the fresh copy; otherwise
        // keep the mount and just unlock it (Editor applies `editable` flips).
        setLoaded((prev) => {
          const remount =
            prev?.day === day &&
            prev.stale &&
            JSON.stringify(fresh) !== JSON.stringify(prev.content ?? null);
          return { day, content: fresh, seq: (prev?.seq ?? 0) + (remount ? 1 : 0) };
        });
      })
      .catch(() => {
        // Offline: keep the read-only seed; with no seed, settle on a read-only
        // empty day so the screen isn't stuck loading. Reconnect retries.
        if (active) {
          setLoaded((prev) =>
            prev?.day === day ? prev : { day, content: null, stale: true, seq: prev?.seq ?? 0 },
          );
        }
      });
    return () => {
      active = false;
    };
  }, [sb, day, online]);

  // Flush any debounced edit on unmount / day change so nothing is lost.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (pending.current) {
        const { json, text } = pending.current;
        pending.current = null;
        void saveJournal(sb, day, json as unknown as Json, text);
        invalidateTodaySummary();
      }
    };
  }, [sb, day]);

  function handleChange(value: EditorValue) {
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      pending.current = null;
      void saveJournal(sb, day, value.json as unknown as Json, value.text);
      invalidateTodaySummary();
    }, SAVE_DEBOUNCE_MS);
  }

  // Resolve the storage owner, materializing an empty journal row for `day` if
  // it doesn't exist yet so the attachment has an owner_id (#050). Mirrors the
  // notes Entry — Today's journal is "the same object, a different door" (#030).
  async function handleUpload(file: File): Promise<string> {
    if (!journalId.current) {
      await saveJournal(
        sb,
        day,
        (pending.current?.json ?? EMPTY_DOC) as unknown as Json,
        pending.current?.text ?? "",
      );
      const j = await getJournal(sb, day);
      journalId.current = j?.id ?? null;
      invalidateTodaySummary();
    }
    if (!journalId.current) throw new Error("could not prepare the journal");
    return uploadImage(sb, file, { type: "journal", id: journalId.current });
  }

  const ready = loaded?.day === day;

  return (
    <section className="mt-[46px]">
      <SectionHeader title="today's journal" />
      {/* Mount once the payload resolves so the seeded song skips a second fetch (#131);
          keyed by day so a midnight rollover re-seeds it. */}
      {ready && <SongOfDay key={day} day={day} initialSong={songSeed} />}
      <div className="mt-1.5">
        {ready && (
          <Editor
            key={`${day}:${loaded.seq ?? 0}`}
            content={loaded.content}
            editable={!loaded.stale}
            placeholder="do your journal today"
            onChange={handleChange}
            onUploadImage={handleUpload}
          />
        )}
      </div>
    </section>
  );
}
