// Persistent last-good-copy snapshots (#149). The data layer writes its freshest
// payloads here (localStorage, best-effort) so the next open paints instantly from
// the previous session and the app stays *readable* with no connection — amends
// #084: a connection is still required to edit, not to look. Content lives on the
// signed-in personal device beside the Supabase session token, so nothing new is
// exposed; snapshots are cleared on sign-out.
//
// Deliberately tiny: string key → JSON value, versioned, and every call swallows
// its errors (SSR, private mode, quota) — a missing snapshot just means the app
// loads from the network exactly as before.

const PREFIX = "notes:snap:";
const VERSION = 1;

type Envelope<T> = { v: number; at: number; data: T };

export function readSnapshot<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const s = JSON.parse(raw) as Envelope<T>;
    return s.v === VERSION ? s.data : null;
  } catch {
    return null;
  }
}

export function writeSnapshot<T>(key: string, data: T): void {
  try {
    const envelope: Envelope<T> = { v: VERSION, at: Date.now(), data };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    // quota / private mode — keep whatever snapshot was already there
  }
}

// Sign-out hygiene: drop every snapshot so no content outlives the session.
export function clearSnapshots(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // nothing to clear
  }
}
