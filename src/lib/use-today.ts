"use client";

// Reactive local day (YYYY-MM-DD). `null` until mounted — the day is device-local
// (#011/#083), so resolving it client-side avoids an SSR/timezone hydration mismatch.
// Then it **flips at local midnight** (a timer to the next 00:00) and whenever the tab
// regains focus/visibility (covers a device that slept through midnight, or a drifted
// timer), so the Today screen + heatmap roll over to the new day without a reload.
import { useEffect, useState } from "react";
import { today } from "@/lib/date";

export function useToday(): string | null {
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only initial read
    setDay(today());

    const sync = () => setDay((d) => (d === today() ? d : today()));
    let timer: ReturnType<typeof setTimeout>;
    function scheduleMidnight() {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => {
        sync();
        scheduleMidnight();
      }, next.getTime() - now.getTime());
    }
    scheduleMidnight();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return day;
}
