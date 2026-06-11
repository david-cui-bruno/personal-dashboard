// Manual data export (#109, the codeable half of #085). Pulls every row the
// signed-in account owns into one JSON object so David always has an off-Supabase
// copy of his journals, notes, and routine history. Attachment rows carry the
// storage path + a public URL so the actual image bytes can be re-fetched.
//
// This is a safety net against data *loss*, not lock-in (#085); Supabase's own
// automatic backups (dashboard) remain the primary mechanism — see docs/handoff.md.
import type {
  DB,
  RoutineItem,
  Completion,
  Journal,
  Note,
  Attachment,
  Settings,
} from "./types";

export const EXPORT_VERSION = 1 as const;

export type ExportBundle = {
  app: "notes";
  version: typeof EXPORT_VERSION;
  exported_at: string; // ISO timestamp, stamped by the caller (browser clock)
  routine_items: RoutineItem[];
  completions: Completion[];
  journals: Journal[];
  notes: Note[]; // includes trashed (deleted_at set) so nothing is lost
  attachments: (Attachment & { public_url: string })[];
  settings: Settings | null;
};

// Reads the whole dataset in parallel. Every table is readable by the
// authenticated role (#108); the anon key alone returns nothing.
export async function exportAll(sb: DB): Promise<ExportBundle> {
  const [routine, completions, journals, notes, attachments, settings] =
    await Promise.all([
      sb.from("routine_item").select("*").order("sort_order", { ascending: true }),
      sb.from("completion").select("*").order("day", { ascending: true }),
      sb.from("journal").select("*").order("day", { ascending: true }),
      sb.from("note").select("*").order("created_at", { ascending: true }),
      sb.from("attachment").select("*").order("created_at", { ascending: true }),
      sb.from("settings").select("*").eq("id", 1).maybeSingle(),
    ]);

  const firstError =
    routine.error ||
    completions.error ||
    journals.error ||
    notes.error ||
    attachments.error ||
    settings.error;
  if (firstError) throw firstError;

  const withUrls = (attachments.data ?? []).map((a) => ({
    ...a,
    public_url: sb.storage.from("attachments").getPublicUrl(a.storage_path).data
      .publicUrl,
  }));

  return {
    app: "notes",
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    routine_items: routine.data ?? [],
    completions: completions.data ?? [],
    journals: journals.data ?? [],
    notes: notes.data ?? [],
    attachments: withUrls,
    settings: settings.data ?? null,
  };
}
