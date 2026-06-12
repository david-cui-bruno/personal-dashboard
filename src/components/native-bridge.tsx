"use client";

// Mounts the web → iOS widget bridge (#119/#120), but ONLY inside the native Capacitor
// shell. On web/desktop the `Capacitor` global is absent, so we return immediately and
// never even import the bridge (so @capacitor/* is never loaded in the browser). Renders
// nothing.
import { useEffect } from "react";

export function NativeBridge() {
  useEffect(() => {
    let cancelled = false;
    void import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (cancelled || !Capacitor.isNativePlatform()) return; // web / desktop: do nothing
        return import("@/lib/native/widget-bridge").then((m) => m.initWidgetBridge());
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
