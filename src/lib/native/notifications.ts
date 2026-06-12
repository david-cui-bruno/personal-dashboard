// Local notifications (#119, Phase 3). Two/day, on-device, no server. Runs only in the
// native Capacitor shell. Because local notifications carry fixed text set at schedule
// time, we **reschedule on launch/foreground** so the evening "N left" stays current
// (best-effort — #119). Morning is a steady journal nudge; evening reflects today's state.
import { LocalNotifications } from "@capacitor/local-notifications";
import { getWidgetSummary, type DB } from "@/lib/data";
import { today } from "@/lib/date";
import { getNotifPrefs } from "@/lib/notif-prefs";

const MORNING_ID = 1;
const EVENING_ID = 2;

function parseHM(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(":");
  return { hour: Number(h), minute: Number(m) };
}

async function eveningBody(sb: DB): Promise<string> {
  try {
    const s = await getWidgetSummary(sb, today());
    if (s.total === 0) return "wind down — journal your day";
    if (s.done >= s.total) return "all done today. journal?";
    const left = s.total - s.done;
    const focus = s.focusLabel ? ` (${s.focusLabel})` : "";
    return `wind down — journal, and you've still got ${left} left${focus}`;
  } catch {
    return "wind down — journal & finish your routine";
  }
}

// Cancel + (re)schedule the morning/evening notifications from current prefs + state.
export async function rescheduleNotifications(sb: DB): Promise<void> {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: MORNING_ID }, { id: EVENING_ID }],
    });
  } catch {
    // nothing scheduled yet — fine
  }

  const prefs = getNotifPrefs();
  if (!prefs.enabled) return;

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return;

  const m = parseHM(prefs.morning);
  const e = parseHM(prefs.evening);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: MORNING_ID,
        title: "notes",
        body: "good morning — journal & start your day",
        schedule: { on: { hour: m.hour, minute: m.minute }, allowWhileIdle: true },
      },
      {
        id: EVENING_ID,
        title: "notes",
        body: await eveningBody(sb),
        schedule: { on: { hour: e.hour, minute: e.minute }, allowWhileIdle: true },
      },
    ],
  });
}
