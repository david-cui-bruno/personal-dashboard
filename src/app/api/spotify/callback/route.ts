// GET /api/spotify/callback → Spotify redirects here with ?code (#126). Verifies the
// CSRF state, exchanges the code for tokens, and stores them in spotify_auth (one row).
// The browser is authenticated (notes session cookie present) → RLS allows the write.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stored = req.cookies.get("spotify_oauth_state")?.value;
  const home = new URL("/", req.url);

  if (!code || !state || state !== stored) {
    home.searchParams.set("spotify", "error");
    return NextResponse.redirect(home);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !secret || !redirectUri) {
    home.searchParams.set("spotify", "config");
    return NextResponse.redirect(home);
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: "Basic " + Buffer.from(`${clientId}:${secret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });
  if (!tokenRes.ok) {
    home.searchParams.set("spotify", "error");
    return NextResponse.redirect(home);
  }
  const tok = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
  };

  const sb = await createClient();
  await sb.from("spotify_auth").upsert(
    {
      id: 1,
      access_token: tok.access_token,
      refresh_token: tok.refresh_token,
      expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  home.searchParams.set("spotify", "connected");
  const res = NextResponse.redirect(home);
  res.cookies.delete("spotify_oauth_state");
  return res;
}
