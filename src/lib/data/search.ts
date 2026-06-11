// Unified search (#040): full-text over journals + notes, fuzzy over routine
// labels. Backs the ⌘K palette. Highlighting/snippets are a UI concern.
import type { DB, Journal, Note, RoutineItem } from "./types";

export type SearchScope = "all" | "journals" | "notes";
export type SearchOptions = { scope?: SearchScope; from?: string; to?: string };
export type SearchResults = {
  journals: Journal[];
  notes: Note[];
  routineItems: RoutineItem[];
};

export async function search(
  sb: DB,
  query: string,
  opts: SearchOptions = {},
): Promise<SearchResults> {
  const q = query.trim();
  const scope = opts.scope ?? "all";
  const results: SearchResults = { journals: [], notes: [], routineItems: [] };
  if (!q) return results;

  if (scope === "all" || scope === "journals") {
    let jq = sb.from("journal").select("*").textSearch("fts", q, { type: "websearch" });
    if (opts.from) jq = jq.gte("day", opts.from);
    if (opts.to) jq = jq.lte("day", opts.to);
    const { data, error } = await jq.order("day", { ascending: false }).limit(50);
    if (error) throw error;
    results.journals = data ?? [];
  }

  if (scope === "all" || scope === "notes") {
    let nq = sb
      .from("note")
      .select("*")
      .is("deleted_at", null)
      .textSearch("fts", q, { type: "websearch" });
    if (opts.from) nq = nq.gte("created_at", opts.from);
    if (opts.to) nq = nq.lte("created_at", `${opts.to}T23:59:59`);
    const { data, error } = await nq.order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    results.notes = data ?? [];
  }

  if (scope === "all") {
    const { data, error } = await sb
      .from("routine_item")
      .select("*")
      .ilike("label", `%${q}%`)
      .limit(20);
    if (error) throw error;
    results.routineItems = data ?? [];
  }

  return results;
}
