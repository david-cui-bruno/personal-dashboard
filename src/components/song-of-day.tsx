"use client";

// Song of the day (#123, #125): one logged song per day, shown atop the daily journal
// (Today + the /notes/[date] entry). Tap "add today's song" → search Spotify inline →
// tap a result. No link pasting, no Spotify login (search runs via an app token,
// /api/song/search). Bar opens the track; the X clears it.
import { useEffect, useRef, useState } from "react";
import { Music, Play, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSong, saveSong, removeSong, type DailySong } from "@/lib/data";

type Result = { title: string; artist: string; artUrl: string | null; url: string };

const Label = () => (
  <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-accent">
    song of the day
  </div>
);

export function SongOfDay({ day }: { day: string }) {
  const [sb] = useState(createClient);
  const [song, setSong] = useState<DailySong | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getSong(sb, day)
      .then((s) => {
        if (!active) return;
        setSong(s);
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [sb, day]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced Spotify search. All state changes happen inside the timer (async), so
  // the effect body has no synchronous setState.
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const id = setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const r = await fetch(`/api/song/search?q=${encodeURIComponent(q)}`);
          const j = (await r.json()) as { results?: Result[] };
          setResults(j.results ?? []);
        } catch {
          setResults([]);
        } finally {
          setSearching(false);
        }
      })();
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  async function pick(r: Result) {
    setSaving(true);
    try {
      await saveSong(sb, day, {
        url: r.url,
        title: r.title,
        artist: r.artist,
        artUrl: r.artUrl,
      });
      setSong(await getSong(sb, day));
      setOpen(false);
      setQuery("");
      setResults([]);
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    const prev = song;
    setSong(null);
    try {
      await removeSong(sb, day);
    } catch {
      setSong(prev);
    }
  }

  if (!ready) return null;

  if (open) {
    return (
      <div className="mt-4">
        <Label />
        <div className="flex items-center gap-2 rounded-xl border border-line bg-field px-3 py-2.5 focus-within:border-accent">
          <Search size={16} className="shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setResults([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
                setResults([]);
              }
            }}
            placeholder="search a song on spotify"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-ink outline-none placeholder:text-ink-3"
          />
          {(searching || saving) && (
            <span className="shrink-0 text-[12px] font-bold lowercase text-ink-3">
              {saving ? "saving…" : "…"}
            </span>
          )}
        </div>
        {results.length > 0 && (
          <ul className="mt-1.5 overflow-hidden rounded-xl border border-line">
            {results.map((r, i) => (
              <li key={`${r.url}-${i}`}>
                <button
                  type="button"
                  onClick={() => void pick(r)}
                  disabled={saving}
                  className="flex w-full items-center gap-3 bg-bg px-3 py-2 text-left hover:bg-field disabled:opacity-60"
                >
                  {r.artUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.artUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-white">
                      <Music size={14} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-extrabold lowercase">
                      {r.title}
                    </span>
                    <span className="block truncate text-[12px] font-bold lowercase text-ink-3">
                      {r.artist}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!song) {
    return (
      <div className="mt-4">
        <Label />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl bg-field px-3 py-2.5 text-left transition-colors hover:bg-line"
        >
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg bg-[#e7e9ee] text-ink-3">
            <Music size={16} />
          </span>
          <span>
            <span className="block text-[14px] font-bold lowercase text-ink-2">
              add today&apos;s song
            </span>
            <span className="block text-[12px] font-bold lowercase text-ink-3">
              search spotify
            </span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="group mt-4">
      <Label />
      <div className="flex items-center gap-3 rounded-xl bg-field px-3 py-2.5">
        <a
          href={song.url}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {song.art_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={song.art_url}
              alt=""
              className="h-[44px] w-[44px] shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-lg bg-accent text-white">
              <Music size={18} />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-[14.5px] font-extrabold lowercase">
              {song.title || "today's song"}
            </span>
            {song.artist && (
              <span className="block truncate text-[12.5px] font-bold lowercase text-ink-3">
                {song.artist}
              </span>
            )}
          </span>
        </a>
        <a
          href={song.url}
          target="_blank"
          rel="noreferrer"
          aria-label="play"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1db954] text-white"
        >
          <Play size={15} fill="currentColor" />
        </a>
        <button
          type="button"
          onClick={clear}
          aria-label="remove song"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-3 opacity-0 transition hover:bg-bg hover:text-ink group-hover:opacity-60"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
