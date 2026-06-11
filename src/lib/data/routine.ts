// Routine items + completions (#010, #013, #016, #017). The routine is a
// template; a day's checklist = items active that day (active-window rule).
import type { DB, RoutineItem } from "./types";

// Items active on `day`: created_on <= day AND (archived_on is null OR > day).
export async function listActiveItems(sb: DB, day: string): Promise<RoutineItem[]> {
  const { data, error } = await sb
    .from("routine_item")
    .select("*")
    .lte("created_on", day)
    .or(`archived_on.is.null,archived_on.gt.${day}`)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Add forward-only from `day` (#017).
export async function addItem(sb: DB, label: string, sortOrder: number, day: string) {
  const { data, error } = await sb
    .from("routine_item")
    .insert({ label, sort_order: sortOrder, created_on: day })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameItem(sb: DB, id: string, label: string) {
  const { error } = await sb.from("routine_item").update({ label }).eq("id", id);
  if (error) throw error;
}

export async function reorderItems(sb: DB, order: { id: string; sortOrder: number }[]) {
  for (const { id, sortOrder } of order) {
    const { error } = await sb
      .from("routine_item")
      .update({ sort_order: sortOrder })
      .eq("id", id);
    if (error) throw error;
  }
}

// "Delete" = archive as of `day`; past days keep the item (#016).
export async function archiveItem(sb: DB, id: string, day: string) {
  const { error } = await sb
    .from("routine_item")
    .update({ archived_on: day })
    .eq("id", id);
  if (error) throw error;
}

// A completion row exists iff the item is checked that day.
export async function setCompletion(
  sb: DB,
  routineItemId: string,
  day: string,
  done: boolean,
) {
  if (done) {
    const { error } = await sb
      .from("completion")
      .upsert(
        { routine_item_id: routineItemId, day },
        { onConflict: "routine_item_id,day" },
      );
    if (error) throw error;
  } else {
    const { error } = await sb
      .from("completion")
      .delete()
      .eq("routine_item_id", routineItemId)
      .eq("day", day);
    if (error) throw error;
  }
}

// IDs of items checked on `day`.
export async function listCompletions(sb: DB, day: string): Promise<string[]> {
  const { data, error } = await sb
    .from("completion")
    .select("routine_item_id")
    .eq("day", day);
  if (error) throw error;
  return (data ?? []).map((r) => r.routine_item_id);
}
