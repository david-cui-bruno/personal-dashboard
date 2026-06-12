// GET /api/song/search?q=<query> → Spotify track results (#125). Uses the app-level
// Client Credentials token (no user login) fetched + cached server-side, so the
// Client Secret never reaches the browser. Returns { results: [{title, artist, artUrl, url}] }.
import { NextResponse } from "next/server";

let cached: { token: string; exp: number } | null = null;

async function appToken(): Promise<string | null> {
  if (cached && Date.now() < cached.exp - 60_000) return cached.token;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return cached.token;
}

type SpotifyTrack = {
  name: string;
  artists?: { name: string }[];
  album?: { images?: { url: string }[] };
  external_urls?: { spotify?: string };
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ results: [] });
  const token = await appToken();
  if (!token) return NextResponse.json({ results: [] });
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=8&q=${encodeURIComponent(q)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return NextResponse.json({ results: [] });
    const j = (await res.json()) as { tracks?: { items?: SpotifyTrack[] } };
    const results = (j.tracks?.items ?? [])
      .map((t) => {
        const imgs = t.album?.images ?? [];
        return {
          title: t.name,
          artist: (t.artists ?? []).map((a) => a.name).join(", "),
          artUrl: imgs[imgs.length - 1]?.url ?? imgs[0]?.url ?? null, // smallest cover
          url: t.external_urls?.spotify ?? null,
        };
      })
      .filter((r) => r.url);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
