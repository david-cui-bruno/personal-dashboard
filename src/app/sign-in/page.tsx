"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignIn() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const email = username.includes("@") ? username : `${username}@notes.local`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("wrong username or password");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg-2 p-6 text-ink">
      <form
        onSubmit={onSubmit}
        className="w-[360px] rounded-3xl border border-line bg-bg p-9 text-center shadow-sm"
      >
        <div className="mx-auto mb-4 h-11 w-11 rounded-2xl bg-accent" />
        <h1 className="text-2xl font-black lowercase tracking-tight">notes</h1>
        <p className="mt-1 mb-7 text-sm font-bold lowercase text-ink-2">welcome back</p>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          autoFocus
          className="mb-3 w-full rounded-xl border border-line bg-field px-4 py-3 text-[15px] text-ink outline-none focus:border-accent"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="password"
          className="mb-3 w-full rounded-xl border border-line bg-field px-4 py-3 text-[15px] text-ink outline-none focus:border-accent"
        />
        {error && <p className="mb-3 text-sm font-bold lowercase text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 w-full rounded-xl bg-accent py-3 text-[15px] font-extrabold lowercase text-white disabled:opacity-60"
        >
          {busy ? "signing in…" : "sign in"}
        </button>
        <p className="mt-5 text-xs font-bold lowercase text-ink-2">
          you&apos;ll stay signed in on this device
        </p>
      </form>
    </main>
  );
}
