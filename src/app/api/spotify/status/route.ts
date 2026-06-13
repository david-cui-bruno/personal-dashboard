// GET /api/spotify/status → { connected } (#139). A light check for the Settings
// "connect spotify" section — just whether a token row exists (no Spotify API call,
// unlike /recent). Tokens stay server-side; only the boolean is returned.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const sb = await createClient();
    const { data } = await sb
      .from("spotify_auth")
      .select("refresh_token")
      .eq("id", 1)
      .maybeSingle();
    return NextResponse.json({ connected: Boolean(data?.refresh_token) });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
