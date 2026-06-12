"use client";

// Mounts the web → iOS widget bridge (#119/#120), but ONLY inside the native Capacitor
// shell. On web/desktop the `Capacitor` global is absent, so we return immediately and
// never even import the bridge (so @capacitor/* is never loaded in the browser). Renders
// nothing.
import { useEffect } from "react";

type CapacitorGlobal = { isNativePlatform?: () => boolean };

export function NativeBridge() {
  useEffect(() => {
    const cap = (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (!cap?.isNativePlatform?.()) return; // web / desktop: do nothing
    void import("@/lib/native")
      .then((m) => m.initNative())
      .catch(() => {});
  }, []);

  return null;
}
