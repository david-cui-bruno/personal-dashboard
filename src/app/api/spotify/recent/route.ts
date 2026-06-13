// GET /api/spotify/recent → { connected, tracks } (#126). Reads the stored token
// (refreshing if expired), then returns currently-playing + recently-played tracks for
// the song-of-the-day picker. Tokens stay server-side; only track metadata is returned.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Track = { title: string; artist: string; artUrl: string | null; url: string };
type SpotifyTrack = {
  name: string;
  artists?: { name: string }[];
  album?: { images?: { url: string }[] };
  external_urls?: { spotify?: string };
};

function mapTrack(t: SpotifyTrack | null | undefined): Track | null {
  const url = t?.external_urls?.spotify;
  if (!t || !url) return null;
  const imgs = t.album?.images ?? [];
  return {
    title: t.name,
    artist: (t.artists ?? []).map((a) => a.name).join(", "),
    artUrl: imgs[imgs.length - 1]?.url ?? imgs[0]?.url ?? null,
    url,
  };
}

async function refresh(refreshToken: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !secret) return null;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: "Basic " + Buffer.from(`${clientId}:${secret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!r.ok) return null;
  return (await r.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };
}

export async function GET() {
  const sb = await createClient();
  const { data: auth } = await sb
    .from("spotify_auth")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!auth?.refresh_token) return NextResponse.json({ connected: false, tracks: [] });

  let access = auth.access_token;
  const expired =
    !auth.expires_at || new Date(auth.expires_at).getTime() <= Date.now() + 30_000;
  if (expired) {
    const tok = await refresh(auth.refresh_token);
    if (!tok) return NextResponse.json({ connected: false, tracks: [] });
    access = tok.access_token;
    await sb
      .from("spotify_auth")
      .update({
        access_token: access,
        expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
        ...(tok.refresh_token ? { refresh_token: tok.refresh_token } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
  }
  if (!access) return NextResponse.json({ connected: false, tracks: [] });

  const headers = { authorization: `Bearer ${access}` };
  const [recentRes, curRes] = await Promise.all([
    fetch("https://api.spotify.com/v1/me/player/recently-played?limit=20", { headers }),
    fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers }),
  ]);

  const tracks: Track[] = [];
  if (curRes.status === 200) {
    const c = (await curRes.json().catch(() => null)) as { item?: SpotifyTrack } | null;
    const m = mapTrack(c?.item);
    if (m) tracks.push(m);
  }
  if (recentRes.ok) {
    const rj = (await recentRes.json().catch(() => null)) as {
      items?: { track: SpotifyTrack }[];
    } | null;
    for (const it of rj?.items ?? []) {
      const m = mapTrack(it.track);
      if (m) tracks.push(m);
    }
  }

  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    if (!seen.has(t.url)) {
      seen.add(t.url);
      out.push(t);
    }
    if (out.length >= 12) break;
  }
  return NextResponse.json({ connected: true, tracks: out });
}
