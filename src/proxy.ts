import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 renamed the `middleware` convention to `proxy`. Runs before routes:
// refreshes the Supabase session and gates auth (#070).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // everything except Next internals, static assets, and PWA files
    // (manifest + service worker must be publicly reachable, not auth-gated,
    // or iOS can't read them and the home-screen app opens in Safari).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
