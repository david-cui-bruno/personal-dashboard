"use client";

// Account (#070, spec §8): username display, change password, sign out, plus a
// line noting the session is persistent on this device.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3.5">
      <div className="text-[15.5px] font-bold lowercase">{label}</div>
      {children}
    </div>
  );
}

function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) {
      setMsg({ kind: "err", text: "password must be at least 6 characters" });
      return;
    }
    if (password !== confirm) {
      setMsg({ kind: "err", text: "passwords don't match" });
      return;
    }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMsg({ kind: "err", text: "couldn't change password — try again" });
      return;
    }
    setPassword("");
    setConfirm("");
    setOpen(false);
    setMsg({ kind: "ok", text: "password changed" });
  }

  if (!open) {
    return (
      <div>
        <Row label="password">
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setMsg(null);
            }}
            className="border-0 bg-transparent text-[14px] font-extrabold lowercase text-accent"
          >
            change password
          </button>
        </Row>
        {msg?.kind === "ok" && (
          <p className="mt-2.5 text-[13px] font-bold lowercase text-accent">{msg.text}</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-b border-line py-3.5">
      <div className="mb-2.5 text-[15.5px] font-bold lowercase">change password</div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="new password"
        autoFocus
        className="mb-2.5 w-full rounded-lg border border-line bg-field px-3 py-2.5 text-[14px] font-bold text-ink outline-none focus:border-accent"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="confirm new password"
        className="mb-2.5 w-full rounded-lg border border-line bg-field px-3 py-2.5 text-[14px] font-bold text-ink outline-none focus:border-accent"
      />
      {msg?.kind === "err" && (
        <p className="mb-2.5 text-[13px] font-bold lowercase text-red-500">{msg.text}</p>
      )}
      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-[14px] font-extrabold lowercase text-white disabled:opacity-60"
        >
          {busy ? "saving…" : "save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPassword("");
            setConfirm("");
            setMsg(null);
          }}
          className="rounded-lg px-4 py-2 text-[14px] font-extrabold lowercase text-ink-2 hover:bg-field"
        >
          cancel
        </button>
      </div>
    </form>
  );
}

export function AccountSection({ username }: { username: string }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <section className="mb-9">
      <h2 className="mb-1.5 text-[13px] font-extrabold lowercase text-ink-3">account</h2>

      <Row label="username">
        <span className="text-[14px] font-bold lowercase text-ink-2">{username || "—"}</span>
      </Row>

      <ChangePassword />

      <p className="mt-3.5 text-[13px] font-bold lowercase text-ink-2">
        you&apos;re signed in on this device and will stay signed in.{" "}
        <button
          type="button"
          onClick={signOut}
          className="border-0 bg-transparent p-0 font-extrabold lowercase text-accent"
        >
          sign out
        </button>
      </p>
    </section>
  );
}
