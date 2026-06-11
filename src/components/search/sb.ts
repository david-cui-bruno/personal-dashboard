"use client";

// Lazily-created singleton browser client for the search slice. Only call from
// client code (effects / event handlers) — never during SSR/render, since the
// underlying client reads NEXT_PUBLIC_* env at creation time.
import { createClient } from "@/lib/supabase/client";
import type { DB } from "@/lib/data";

let client: DB | null = null;

export function browserClient(): DB {
  if (!client) client = createClient();
  return client;
}
