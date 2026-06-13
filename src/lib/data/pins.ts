// Pinning (#135): note + journal rows carry a `pin_order` int (NULL = unpinned).
// The "pinned" view lists pinned notes + journals merged by pin_order (asc = top).
// Pinning never touches the main reverse-chron stream. Reads tolerate the column
// being absent (deploy before migration 0009) by returning an empty list.
import type { DB, Note, Journal } from "./types";

export type PinnedEntry =
  | { kind: "note"; key: string; pinOrder: number; note: Note }
  | { kind: "journal"; key: string; pinOrder: number; journal: Journal };

// All pinned notes + journals, merged and ordered by pin_order.
export async function listPinned(sb: DB): Promise<PinnedEntry[]> {
  try {
    const [n, j] = await Promise.all([
      sb.from("note").select("*").not("pin_order", "is", null).is("deleted_at", null),
      sb.from("journal").select("*").not("pin_order", "is", null),
    ]);
    if (n.error || j.error) return [];
    const entries: PinnedEntry[] = [
      ...(n.data ?? []).map((note) => ({
        kind: "note" as const,
        key: `n-${note.id}`,
        pinOrder: note.pin_order ?? 0,
        note,
      })),
      ...(j.data ?? []).map((journal) => ({
        kind: "journal" as const,
        key: `j-${journal.day}`,
        pinOrder: journal.pin_order ?? 0,
        journal,
      })),
    ];
    return entries.sort((a, b) => a.pinOrder - b.pinOrder);
  } catch {
    return [];
  }
}

// Append position = (max pin_order across both tables) + 1.
async function nextPinOrder(sb: DB): Promise<number> {
  const [n, j] = await Promise.all([
    sb.from("note").select("pin_order").not("pin_order", "is", null)
      .order("pin_order", { ascending: false }).limit(1).maybeSingle(),
    sb.from("journal").select("pin_order").not("pin_order", "is", null)
      .order("pin_order", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return Math.max(n.data?.pin_order ?? -1, j.data?.pin_order ?? -1) + 1;
}

export async function pinNote(sb: DB, id: string): Promise<void> {
  const order = await nextPinOrder(sb);
  const { error } = await sb.from("note").update({ pin_order: order }).eq("id", id);
  if (error) throw error;
}

export async function unpinNote(sb: DB, id: string): Promise<void> {
  const { error } = await sb.from("note").update({ pin_order: null }).eq("id", id);
  if (error) throw error;
}

// Pin a journal day — materialize an empty row if the day was never written
// (upsert sets only day + pin_order; any existing content is left untouched).
export async function pinJournal(sb: DB, day: string): Promise<void> {
  const order = await nextPinOrder(sb);
  const { error } = await sb
    .from("journal")
    .upsert({ day, pin_order: order }, { onConflict: "day" });
  if (error) throw error;
}

export async function unpinJournal(sb: DB, day: string): Promise<void> {
  const { error } = await sb.from("journal").update({ pin_order: null }).eq("day", day);
  if (error) throw error;
}

// Persist a manual order — renumber 0..n across the merged list. `id` is the
// note id for notes, the day for journals.
export async function reorderPins(
  sb: DB,
  order: { kind: "note" | "journal"; id: string }[],
): Promise<void> {
  await Promise.all(
    order.map((o, i) =>
      o.kind === "note"
        ? sb.from("note").update({ pin_order: i }).eq("id", o.id)
        : sb.from("journal").update({ pin_order: i }).eq("day", o.id),
    ),
  );
}
