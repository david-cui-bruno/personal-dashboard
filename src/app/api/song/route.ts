// GET /api/song?url=<spotify|apple-music link> → best-effort { title, artist, artUrl }
// from the page's OpenGraph tags (#123). Server-side so there's no browser CORS, and
// host-allowlisted so it can't be used to fetch arbitrary URLs (SSRF).
import { NextResponse } from "next/server";

const ALLOWED = new Set([
  "open.spotify.com",
  "spotify.link",
  "music.apple.com",
  "geo.music.apple.com",
  "embed.music.apple.com",
]);

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function og(html: string, prop: string): string | null {
  const a = html.match(
    new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"),
  );
  const b = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"),
  );
  const m = a ?? b;
  return m ? decode(m[1]) : null;
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED.has(target.hostname)) {
    return NextResponse.json({ error: "unsupported source" }, { status: 400 });
  }

  try {
    const res = await fetch(target.toString(), {
      headers: { "user-agent": "Mozilla/5.0 (compatible; notes/1.0)" },
      redirect: "follow",
    });
    const html = await res.text();
    const rawTitle = og(html, "title");
    const artUrl = og(html, "image");
    const desc = og(html, "description");

    let title = rawTitle;
    let artist: string | null = null;
    if (rawTitle) {
      const byMatch = rawTitle.match(/^(.+?)\s+by\s+(.+)$/i); // Apple: "Song by Artist"
      if (byMatch) {
        title = byMatch[1];
        artist = byMatch[2];
      }
    }
    if (!artist && desc && desc.includes("·")) {
      // Spotify: "Artist · Song · 2024"
      const seg = desc.split("·").map((s) => s.trim());
      if (seg[0] && !/listen to/i.test(seg[0])) artist = seg[0];
    }

    return NextResponse.json({ title, artist, artUrl });
  } catch {
    return NextResponse.json({ title: null, artist: null, artUrl: null });
  }
}
