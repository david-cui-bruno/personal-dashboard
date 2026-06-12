// Native-shell integration (#119/#120). Called ONLY inside the Capacitor app (the caller
// guards on the native platform). Keeps the App Group payload (for the widget) and the
// local notifications current: on launch, on auth change, and whenever the app returns to
// the foreground.
import { createClient } from "@/lib/supabase/client";
import { configureWidgetGroup, writeWidgetPayload } from "./widget-bridge";
import { rescheduleNotifications } from "./notifications";

export async function initNative(): Promise<void> {
  await configureWidgetGroup();
  const sb = createClient();

  const sync = async () => {
    await writeWidgetPayload(sb);
    await rescheduleNotifications(sb);
  };

  await sync();
  sb.auth.onAuthStateChange(() => {
    void sync();
  });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void sync();
    });
  }
}
