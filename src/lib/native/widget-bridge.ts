// Web → iOS widget bridge (#119/#120). Runs ONLY inside the native Capacitor shell
// (the caller guards on the native platform). It writes the Supabase session + today's
// quote + a cached summary into the shared **App Group** via a tiny native plugin, so the
// WidgetKit extension can:
//   • fetch `widget_summary` LIVE using the access token (while it's valid), and
//   • still render from the cached values when the token is expired / offline.
//
// The widget reads the single key `_capacitor_widget.payload` from the App Group's
// UserDefaults suite.
import { registerPlugin } from "@capacitor/core";
import { createClient } from "@/lib/supabase/client";
import { getWidgetSummary } from "@/lib/data";
import { quoteForDay } from "@/lib/quotes";
import { today } from "@/lib/date";

type NotesWidgetBridgePlugin = {
  setPayload(options: { value: string }): Promise<void>;
  removePayload(): Promise<void>;
};

const NotesWidgetBridge = registerPlugin<NotesWidgetBridgePlugin>("NotesWidgetBridge");

export type WidgetPayload = {
  accessToken: string;
  expiresAt: number; // unix seconds
  supabaseUrl: string;
  supabaseAnonKey: string;
  day: string; // the app's local day when written (YYYY-MM-DD)
  done: number;
  total: number;
  focus: string | null;
  quoteText: string;
  quoteAuthor: string;
};

export async function initWidgetBridge(): Promise<void> {
  const sb = createClient();

  async function write(): Promise<void> {
    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) {
      await NotesWidgetBridge.removePayload();
      return;
    }

    const day = today();
    let done = 0;
    let total = 0;
    let focus: string | null = null;
    try {
      const s = await getWidgetSummary(sb, day);
      done = s.done;
      total = s.total;
      focus = s.focusLabel;
    } catch {
      // keep zeros; the widget will fall back to its last cached values
    }

    const q = quoteForDay(day);
    const payload: WidgetPayload = {
      accessToken: session.access_token,
      expiresAt: session.expires_at ?? 0,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      day,
      done,
      total,
      focus,
      quoteText: q.text,
      quoteAuthor: q.author,
    };
    await NotesWidgetBridge.setPayload({ value: JSON.stringify(payload) });
  }

  await write();
  // Refresh the shared payload whenever auth changes or the SDK refreshes the token
  // (SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT). The app being open keeps it current.
  sb.auth.onAuthStateChange(() => {
    void write();
  });
}
