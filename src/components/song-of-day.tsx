"use client";

// Song of the day (#123): one logged song per day, shown atop the daily journal
// (Today + the /notes/[date] entry). Paste a Spotify/Apple Music link → we fetch
// title + cover art server-side (/api/song) → a calm, tappable bar that opens the
// track. Empty state invites adding; the X clears it.
import { useEffect, useRef, useState } from "react";
import { Music, Play, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSong, saveSong, removeSong, type DailySong } from "@/lib/data";

const Label = () => (
  <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-accent">
    song of the day
  </div>
);

export function SongOfDay({ day }: { day: string }) {
  const [sb] = useState(createClient);
  const [song, setSong] = useState<DailySong | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
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
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function submit() {
    const link = url.trim();
    if (!link) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setErr(false);
    try {
      let meta: { title: string | null; artist: string | null; artUrl: string | null } = {
        title: null,
        artist: null,
        artUrl: null,
      };
      try {
        const r = await fetch(`/api/song?url=${encodeURIComponent(link)}`);
        if (r.ok) meta = await r.json();
      } catch {
        // metadata is best-effort; still save the link
      }
      await saveSong(sb, day, {
        url: link,
        title: meta.title,
        artist: meta.artist,
        artUrl: meta.artUrl,
      });
      setSong(await getSong(sb, day));
      setEditing(false);
      setUrl("");
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    const prev = song;
    setSong(null);
    try {
      await removeSong(sb, day);
    } catch {
      setSong(prev); // restore on failure
    }
  }

  if (!ready) return null;

  if (editing) {
    return (
      <div className="mt-4">
        <Label />
        <input
          ref={inputRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            } else if (e.key === "Escape") {
              setEditing(false);
              setUrl("");
            }
          }}
          onBlur={() => {
            if (!busy) void submit();
          }}
          placeholder="paste a spotify or apple music link"
          disabled={busy}
          className="w-full rounded-xl border border-line bg-field px-3.5 py-3 text-[14px] font-bold text-ink outline-none placeholder:text-ink-3 focus:border-accent disabled:opacity-60"
        />
        {err && (
          <p className="mt-1.5 text-[12.5px] font-bold lowercase text-red-500">
            couldn&apos;t add that link
          </p>
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
          onClick={() => setEditing(true)}
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
              paste a spotify or apple music link
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
