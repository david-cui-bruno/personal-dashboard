"use client";

// The /settings screen (spec §8, slice 3). Loads the durable settings from the
// DB + the username from auth, then applies appearance changes live and persists
// them to both localStorage (for ThemeScript) and the DB (data/settings).
import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { AppearanceSection } from "./appearance-section";
import { AccountSection } from "./account-section";
import {
  applyAppearance,
  DEFAULT_APPEARANCE,
  fromSettings,
  type Appearance,
} from "./appearance";

export function SettingsScreen() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [username, setUsername] = useState("");

  // Load durable state once: DB settings (source of truth) + the account name.
  // The Supabase browser client is created here (in the effect / in handlers),
  // never during render, so prerender doesn't touch it.
  useEffect(() => {
    let alive = true;
    const sb = createClient();

    getSettings(sb)
      .then((s) => {
        if (!alive) return;
        const a = fromSettings(s);
        setAppearance(a);
        applyAppearance(a); // reconcile the live document + localStorage with the DB
      })
      .catch(() => {});

    sb.auth.getUser().then(({ data }) => {
      if (!alive) return;
      const email = data.user?.email ?? "";
      setUsername(email.split("@")[0]);
    });

    return () => {
      alive = false;
    };
  }, []);

  function update(patch: Partial<Appearance>) {
    const next = { ...appearance, ...patch };
    setAppearance(next);
    applyAppearance(next); // live + localStorage, instantly
    saveSettings(createClient(), next).catch(() => {}); // durable, best-effort
  }

  return (
    <div className="mx-auto max-w-[600px] px-10 pb-32 pt-14">
      <h1 className="mb-9 text-[31px] font-black lowercase tracking-tight">settings</h1>
      <AppearanceSection value={appearance} onChange={update} />
      <AccountSection username={username} />
    </div>
  );
}
