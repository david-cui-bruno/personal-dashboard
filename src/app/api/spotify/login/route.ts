// GET /api/spotify/login → kicks off Spotify OAuth (#126). Redirects to Spotify's
// consent screen with a CSRF `state` cookie. Scopes: read recently-played + currently-
// playing (so "song of the day" can pull from what David actually listened to).
import { NextResponse } from "next/server";

const SCOPE = "user-read-recently-played user-read-currently-playing";

export async function GET(req: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/?spotify=config", req.url));
  }
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
  });
  const res = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`,
  );
  res.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax", // survives the top-level redirect back from Spotify
    secure: process.env.NODE_ENV === "production", // local dev is http://127.0.0.1
    path: "/",
    maxAge: 600,
  });
  return res;
}
