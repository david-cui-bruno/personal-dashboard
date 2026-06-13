"use client";

// Settings → Spotify (#139). Connect/disconnect from one place instead of only via
// the song-picker's "from your spotify". Shows status (a light /status check),
// kicks off OAuth returning to /settings, and can disconnect. Tokens stay
// server-side; this component only ever sees a boolean.
import { useEffect, useState } from "react";

type Status = "loading" | "connected" | "disconnected";

export function SpotifySection() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // Surface the OAuth round-trip result (callback redirects back with ?spotify=…),
    // then strip it from the URL so a refresh doesn't repeat the message.
    const params = new URLSearchParams(window.location.search);
    const r = params.get("spotify");
    const m =
      r === "connected"
        ? "connected to spotify ✓"
        : r === "error"
          ? "couldn't connect — try again"
          : r === "config"
            ? "spotify isn't configured"
            : null;
    // Deliberate post-mount read of the OAuth return (window-only; see handoff §13).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (m) setMsg(m);
    if (r) {
      params.delete("spotify");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      );
    }

    fetch("/api/spotify/status")
      .then((res) => res.json())
      .then((j: { connected: boolean }) =>
        setStatus(j.connected ? "connected" : "disconnected"),
      )
      .catch(() => setStatus("disconnected"));
  }, []);

  function connect() {
    window.location.href = "/api/spotify/login?return=/settings";
  }

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/spotify/disconnect", { method: "POST" });
      setStatus("disconnected");
      setMsg("disconnected");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-9">
      <h2 className="mb-1.5 text-[13px] font-extrabold lowercase text-ink-3">spotify</h2>

      <div className="flex items-center justify-between gap-4 border-b border-line py-3.5">
        <div className="text-[15.5px] font-bold lowercase">
          {status === "loading"
            ? "…"
            : status === "connected"
              ? "connected"
              : "not connected"}
        </div>
        {status === "connected" ? (
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="border-0 bg-transparent text-[14px] font-extrabold lowercase text-accent disabled:opacity-60"
          >
            {busy ? "…" : "disconnect"}
          </button>
        ) : status === "disconnected" ? (
          <button
            type="button"
            onClick={connect}
            className="rounded-lg bg-[#1db954] px-4 py-2 text-[14px] font-extrabold lowercase text-white"
          >
            connect spotify
          </button>
        ) : null}
      </div>

      {msg && (
        <p className="mt-2.5 text-[13px] font-bold lowercase text-accent">{msg}</p>
      )}
      <p className="mt-3.5 text-[13px] font-bold lowercase text-ink-2">
        lets &ldquo;song of the day&rdquo; pull from what you&apos;ve actually been
        listening to.
      </p>
    </section>
  );
}
