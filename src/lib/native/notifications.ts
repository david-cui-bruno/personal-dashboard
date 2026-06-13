// Local notifications (#119, Phase 3). Two/day, on-device, no server. Runs only in the
// native Capacitor shell. Because local notifications carry fixed text set at schedule
// time, we **reschedule on launch/foreground** so the evening "N left" stays current
// (best-effort — #119). Morning is a steady journal nudge; evening reflects today's state.
import { LocalNotifications } from "@capacitor/local-notifications";
import { getWidgetSummary, getJournal, getSong, type DB } from "@/lib/data";
import { today } from "@/lib/date";
import { getNotifPrefs } from "@/lib/notif-prefs";

const MORNING_ID = 1;
const EVENING_ID = 2;
const TEST_ID = 99;

function parseHM(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(":");
  return { hour: Number(h), minute: Number(m) };
}

// Richer end-of-day recap (#137): routine progress + whether you journaled + the
// day's song, in one line. Pure so it's unit-testable; the evening notification
// carries fixed text set at schedule time, refreshed on launch/foreground (#119).
export type EodSummary = {
  done: number;
  total: number;
  journaled: boolean;
  songTitle: string | null;
};

export function composeEveningBody(s: EodSummary): string {
  const bits: string[] = [];
  if (s.total > 0) {
    bits.push(s.done >= s.total ? `✓ all ${s.total} done` : `${s.done}/${s.total} done`);
  }
  bits.push(s.journaled ? "journaled ✓" : "journal your day?");
  if (s.songTitle) bits.push(`♪ ${s.songTitle}`);
  return bits.join(" · ");
}

async function eveningBody(sb: DB): Promise<string> {
  try {
    const day = today();
    const [summary, journal, song] = await Promise.all([
      getWidgetSummary(sb, day),
      getJournal(sb, day).catch(() => null),
      getSong(sb, day).catch(() => null),
    ]);
    return composeEveningBody({
      done: summary.done,
      total: summary.total,
      journaled: Boolean(journal?.content_text?.trim()),
      songTitle: song?.title ?? null,
    });
  } catch {
    return "wind down — journal your day";
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
        title: "your day",
        body: await eveningBody(sb),
        schedule: { on: { hour: e.hour, minute: e.minute }, allowWhileIdle: true },
      },
    ],
  });
}

export async function scheduleTestNotification(): Promise<void> {
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") throw new Error("notification permission denied");

  try {
    await LocalNotifications.cancel({ notifications: [{ id: TEST_ID }] });
  } catch {
    // nothing scheduled yet — fine
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: TEST_ID,
        title: "notes",
        body: "test notification",
        schedule: { at: new Date(Date.now() + 10_000), allowWhileIdle: true },
      },
    ],
  });
}
