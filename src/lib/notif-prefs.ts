// Notification preferences (#119). Notifications fire only in the native shell, so
// these are DEVICE-LOCAL (localStorage), not in the synced settings table — the times
// only matter on the phone that runs the native app. The native scheduler (Phase 3)
// reads these and (re)schedules the morning/evening local notifications.

export type NotifPrefs = {
  enabled: boolean;
  morning: string; // "HH:MM" 24h, local
  evening: string; // "HH:MM" 24h, local
};

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  enabled: true,
  morning: "08:00",
  evening: "21:00",
};

const KEY = "notes.notif-prefs.v1";
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function getNotifPrefs(): NotifPrefs {
  if (typeof localStorage === "undefined") return DEFAULT_NOTIF_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_NOTIF_PREFS;
    const p = { ...DEFAULT_NOTIF_PREFS, ...JSON.parse(raw) } as NotifPrefs;
    // Be defensive about stored values (#119): fall back on anything malformed.
    return {
      enabled: typeof p.enabled === "boolean" ? p.enabled : DEFAULT_NOTIF_PREFS.enabled,
      morning: TIME_RE.test(p.morning) ? p.morning : DEFAULT_NOTIF_PREFS.morning,
      evening: TIME_RE.test(p.evening) ? p.evening : DEFAULT_NOTIF_PREFS.evening,
    };
  } catch {
    return DEFAULT_NOTIF_PREFS;
  }
}

export function setNotifPrefs(prefs: NotifPrefs): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / disabled storage
  }
}
