"use client";

// Reactive connectivity (#149): true while the browser thinks it's online.
// `navigator.onLine` is a hint (a captive portal can fool it) but it catches the
// case that matters here — wifi off — and flips the moment it comes back, which
// re-runs the loads that depend on it. Server snapshot is `true` so SSR and the
// first client paint agree (no hydration mismatch).
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
