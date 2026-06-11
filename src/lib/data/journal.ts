// Journals (#030, #031, #100): one per day, materialized only when written.
// `content` is a TipTap JSON doc; `content_text` is the plaintext projection
// for search + list snippets.
import type { Json } from "@/lib/database.types";
import type { DB, Journal } from "./types";

// Returns null for an unwritten (empty) day — the UI still shows the day.
export async function getJournal(sb: DB, day: string): Promise<Journal | null> {
  const { data, error } = await sb
    .from("journal")
    .select("*")
    .eq("day", day)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Every written journal, newest first. Days without a row are rendered as empty
// in the stream (#100) — this is bounded by the number of days actually written.
export async function listJournals(sb: DB): Promise<Journal[]> {
  const { data, error } = await sb
    .from("journal")
    .select("*")
    .order("day", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveJournal(
  sb: DB,
  day: string,
  content: Json,
  contentText: string,
) {
  const { error } = await sb.from("journal").upsert(
    {
      day,
      content,
      content_text: contentText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "day" },
  );
  if (error) throw error;
}
