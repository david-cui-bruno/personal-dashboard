// POST /api/spotify/disconnect → removes the stored Spotify tokens (#139). The
// authenticated session + RLS (#108) authorize the delete. After this, the song
// picker's "from your spotify" and Settings show "not connected" again.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const sb = await createClient();
    const { error } = await sb.from("spotify_auth").delete().eq("id", 1);
    if (error) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
