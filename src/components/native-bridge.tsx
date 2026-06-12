"use client";

// Mounts native-only integrations (#119/#120), but ONLY inside the Capacitor shell. On
// web/desktop the native module bundle is never imported. Renders nothing.
import { useEffect } from "react";

export function NativeBridge() {
  useEffect(() => {
    let cancelled = false;
    void import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (cancelled || !Capacitor.isNativePlatform()) return; // web / desktop: do nothing
        return import("@/lib/native").then((m) => m.initNative());
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
