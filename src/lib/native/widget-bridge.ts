// Web → iOS widget bridge (#119/#120). Runs ONLY inside the native Capacitor shell.
// Writes one JSON blob (session + today's quote + cached summary) into the shared App
// Group via the native NotesWidgetBridge plugin. The WidgetKit extension reads
// `_capacitor_widget.payload`, fetches `widget_summary` live while the token is valid, and
// renders these cached values otherwise. Orchestrated by ./index `initNative()`.
import { registerPlugin } from "@capacitor/core";
import { getWidgetSummary, type DB } from "@/lib/data";
import { quoteForDay } from "@/lib/quotes";
import { today } from "@/lib/date";

type NotesWidgetBridgePlugin = {
  setPayload(options: { value: string }): Promise<void>;
  removePayload(): Promise<void>;
};

const NotesWidgetBridge = registerPlugin<NotesWidgetBridgePlugin>("NotesWidgetBridge");

export type WidgetPayload = {
  accessToken: string;
  expiresAt: number;
  supabaseUrl: string;
  supabaseAnonKey: string;
  day: string;
  done: number;
  total: number;
  focus: string | null;
  quoteText: string;
  quoteAuthor: string;
};

export async function configureWidgetGroup(): Promise<void> {
  // App Group access is handled by NotesWidgetBridgePlugin on the native side.
}

// One write of the shared payload (call on launch, auth change, and foreground).
export async function writeWidgetPayload(sb: DB): Promise<void> {
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
    // keep zeros; the widget falls back to its last cached values
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
