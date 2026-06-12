// Song of the day (#123): one logged song per day. `url` is the pasted Spotify/
// Apple Music link; title/artist/art_url are best-effort OpenGraph metadata fetched
// server-side via /api/song. Shown atop the journal entry + on the Notes stream.
import type { DB, DailySong } from "./types";

export async function getSong(sb: DB, day: string): Promise<DailySong | null> {
  const { data, error } = await sb
    .from("daily_song")
    .select("*")
    .eq("day", day)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Every logged song (bounded by days written), for mapping onto the Notes stream.
export async function listSongs(sb: DB): Promise<DailySong[]> {
  const { data, error } = await sb.from("daily_song").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function saveSong(
  sb: DB,
  day: string,
  song: { url: string; title?: string | null; artist?: string | null; artUrl?: string | null },
): Promise<void> {
  const { error } = await sb.from("daily_song").upsert(
    {
      day,
      url: song.url,
      title: song.title ?? null,
      artist: song.artist ?? null,
      art_url: song.artUrl ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "day" },
  );
  if (error) throw error;
}

export async function removeSong(sb: DB, day: string): Promise<void> {
  const { error } = await sb.from("daily_song").delete().eq("day", day);
  if (error) throw error;
}
