// Web → iOS widget bridge (#119/#120). Runs ONLY inside the native Capacitor shell.
// Writes one JSON blob (session + today's quote + cached summary) into the shared App
// Group via @capacitor/preferences (`configure({group})`), which the WidgetKit extension
// reads as `_capacitor_widget.payload`. The widget fetches `widget_summary` live while the
// token is valid, else renders these cached values. Orchestrated by ./index `initNative()`.
import { Preferences } from "@capacitor/preferences";
import { getWidgetSummary, type DB } from "@/lib/data";
import { quoteForDay } from "@/lib/quotes";
import { today } from "@/lib/date";

const GROUP = "group.health.framewise.notes";
const KEY = "widget.payload";

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
  await Preferences.configure({ group: GROUP });
}

// One write of the shared payload (call on launch, auth change, and foreground).
export async function writeWidgetPayload(sb: DB): Promise<void> {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    await Preferences.remove({ key: KEY });
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
  await Preferences.set({ key: KEY, value: JSON.stringify(payload) });
}
