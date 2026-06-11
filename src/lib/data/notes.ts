// Freeform notes (#032) with soft-delete / trash (#034).
import type { Json } from "@/lib/database.types";
import type { DB, Note } from "./types";

// Active (non-trashed) notes, newest first.
export async function listNotes(sb: DB): Promise<Note[]> {
  const { data, error } = await sb
    .from("note")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getNote(sb: DB, id: string): Promise<Note | null> {
  const { data, error } = await sb.from("note").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createNote(sb: DB, title = ""): Promise<Note> {
  const { data, error } = await sb.from("note").insert({ title }).select().single();
  if (error) throw error;
  return data;
}

export async function saveNote(
  sb: DB,
  id: string,
  patch: { title?: string; content?: Json; contentText?: string },
) {
  const { error } = await sb
    .from("note")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.contentText !== undefined ? { content_text: patch.contentText } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function trashNote(sb: DB, id: string) {
  const { error } = await sb
    .from("note")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreNote(sb: DB, id: string) {
  const { error } = await sb.from("note").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}
