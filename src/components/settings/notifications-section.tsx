"use client";

// Notifications settings (#119, Phase 3). Times are DEVICE-LOCAL (they only act in the
// iOS shell), so this section renders **only in the native app** — on web/desktop it's
// nothing. Changing a value rewrites the prefs and reschedules the local notifications.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getNotifPrefs,
  setNotifPrefs,
  DEFAULT_NOTIF_PREFS,
  type NotifPrefs,
} from "@/lib/notif-prefs";

function isNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform?.()
  );
}

export function NotificationsSection() {
  const [native, setNative] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    // Read client-only state (Capacitor presence + localStorage) AFTER mount, so the first
    // render matches the prerendered HTML (no hydration mismatch). Deliberate post-mount
    // sync — the rule's "cascading renders" concern doesn't apply to a one-shot mount read.
    /* eslint-disable react-hooks/set-state-in-effect */
    setNative(isNative());
    setPrefs(getNotifPrefs());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!native) return null;

  function update(patch: Partial<NotifPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setNotifPrefs(next);
    // reschedule with the new prefs (native only — this section never renders elsewhere)
    void import("@/lib/native/notifications")
      .then((m) => m.rescheduleNotifications(createClient()))
      .catch(() => {});
  }

  async function sendTest() {
    setTesting(true);
    setTestMsg(null);
    try {
      await import("@/lib/native/notifications").then((m) => m.scheduleTestNotification());
      setTestMsg({ kind: "ok", text: "test sent" });
    } catch {
      setTestMsg({ kind: "err", text: "test failed" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="mb-9">
      <h2 className="mb-1.5 text-[13px] font-extrabold lowercase text-ink-3">notifications</h2>

      <div className="flex items-center justify-between gap-4 border-b border-line py-3.5">
        <div className="text-[15.5px] font-bold lowercase">daily reminders</div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.enabled}
          onClick={() => update({ enabled: !prefs.enabled })}
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
            prefs.enabled ? "bg-accent" : "bg-field"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              prefs.enabled ? "left-[18px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div
        className={`${prefs.enabled ? "" : "pointer-events-none opacity-40"}`}
        aria-disabled={!prefs.enabled}
      >
        <TimeRow
          label="morning — journal & start your day"
          value={prefs.morning}
          onChange={(t) => update({ morning: t })}
        />
        <TimeRow
          label="night — journal & what's left"
          value={prefs.evening}
          onChange={(t) => update({ evening: t })}
        />
      </div>

      <p className="mt-2.5 text-[13px] font-bold lowercase text-ink-3">
        two gentle reminders a day on this device.
      </p>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={sendTest}
          disabled={testing}
          className="rounded-lg bg-accent px-4 py-2 text-[14px] font-extrabold lowercase text-white disabled:opacity-60"
        >
          {testing ? "sending…" : "send test"}
        </button>
        {testMsg && (
          <p
            className={`text-[13px] font-bold lowercase ${
              testMsg.kind === "ok" ? "text-accent" : "text-red-500"
            }`}
          >
            {testMsg.text}
          </p>
        )}
      </div>
    </section>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3.5">
      <div className="text-[15.5px] font-bold lowercase">{label}</div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-field px-3 py-1.5 text-[14px] font-bold text-ink outline-none focus:border-accent"
      />
    </div>
  );
}
