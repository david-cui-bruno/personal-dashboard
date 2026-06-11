"use client";

// Data / backup (#109, spec §8 neighbourhood). A one-tap export of everything
// to a JSON file kept off Supabase — the manual safety net alongside Supabase's
// own automatic backups (#085). Single-user app, so no server round-trip: read
// via the data layer and download a Blob.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { exportAll } from "@/lib/data";

function todayStamp(): string {
  // Local-day stamp for the filename (matches the app's local-midnight model, #011).
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DataSection() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleExport() {
    setBusy(true);
    setMsg(null);
    try {
      const bundle = await exportAll(createClient());
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notes-export-${todayStamp()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const count =
        bundle.journals.length + bundle.notes.length + bundle.routine_items.length;
      setMsg({ kind: "ok", text: `exported ${count} entries` });
    } catch {
      setMsg({ kind: "err", text: "export failed — try again" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-9">
      <h2 className="mb-1.5 text-[13px] font-extrabold lowercase text-ink-3">data</h2>

      <div className="flex items-center justify-between gap-4 border-b border-line py-3.5">
        <div>
          <div className="text-[15.5px] font-bold lowercase">export my data</div>
          <p className="mt-0.5 text-[13px] font-bold lowercase text-ink-3">
            download every journal, note &amp; routine record as a json file
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-[14px] font-extrabold lowercase text-white disabled:opacity-60"
        >
          {busy ? "exporting…" : "export"}
        </button>
      </div>

      {msg && (
        <p
          className={`mt-2.5 text-[13px] font-bold lowercase ${
            msg.kind === "ok" ? "text-accent" : "text-red-500"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
