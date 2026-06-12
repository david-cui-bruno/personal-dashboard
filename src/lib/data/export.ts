// Manual data export (#109, the codeable half of #085). Pulls every row the
// signed-in account owns into one JSON object so David always has an off-Supabase
// copy of his journals, notes, and routine history. Attachment rows carry the
// storage path + a public URL so the actual image bytes can be re-fetched.
//
// This is a safety net against data *loss*, not lock-in (#085); Supabase's own
// automatic backups (dashboard) remain the primary mechanism — and notably do NOT
// include Storage objects, so this archive is the only off-Supabase copy of the
// actual image files (#114). See docs/handoff.md.
import { makeZip, type ZipEntry } from "@/lib/zip";
import type {
  DB,
  RoutineItem,
  Completion,
  Journal,
  Note,
  Attachment,
  Settings,
  DailySong,
} from "./types";

const BUCKET = "attachments"; // #103

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
  daily_songs: DailySong[];
};

// Reads the whole dataset in parallel. Every table is readable by the
// authenticated role (#108); the anon key alone returns nothing.
export async function exportAll(sb: DB): Promise<ExportBundle> {
  const [routine, completions, journals, notes, attachments, settings, songs] =
    await Promise.all([
      sb.from("routine_item").select("*").order("sort_order", { ascending: true }),
      sb.from("completion").select("*").order("day", { ascending: true }),
      sb.from("journal").select("*").order("day", { ascending: true }),
      sb.from("note").select("*").order("created_at", { ascending: true }),
      sb.from("attachment").select("*").order("created_at", { ascending: true }),
      sb.from("settings").select("*").eq("id", 1).maybeSingle(),
      sb.from("daily_song").select("*").order("day", { ascending: true }),
    ]);

  const firstError =
    routine.error ||
    completions.error ||
    journals.error ||
    notes.error ||
    attachments.error ||
    settings.error;
  if (firstError) throw firstError;
  // daily_song is tolerated separately: if its table isn't deployed yet (#123/0006),
  // export the rest rather than failing the whole download.

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
    daily_songs: songs.error ? [] : (songs.data ?? []),
  };
}

export type ExportArchive = {
  blob: Blob;
  ext: "json" | "zip";
  entries: number; // journals + notes + routine items
  photos: number; // image files actually bundled
};

// Builds the downloadable archive. With no photos it's the plain JSON file; with
// photos it's a .zip of the JSON plus every original image under `images/<path>`
// (#114) — the image bytes that Supabase's DB backups don't cover (#085).
export async function buildExportArchive(sb: DB): Promise<ExportArchive> {
  const bundle = await exportAll(sb);
  const json = new TextEncoder().encode(JSON.stringify(bundle, null, 2));
  const entries =
    bundle.journals.length + bundle.notes.length + bundle.routine_items.length;

  if (bundle.attachments.length === 0) {
    return {
      blob: new Blob([json], { type: "application/json" }),
      ext: "json",
      entries,
      photos: 0,
    };
  }

  const files: ZipEntry[] = [{ name: "notes-export.json", data: json }];
  for (const a of bundle.attachments) {
    const { data, error } = await sb.storage.from(BUCKET).download(a.storage_path);
    if (error || !data) continue; // skip a missing object; the metadata is still in the JSON
    files.push({
      name: `images/${a.storage_path}`,
      data: new Uint8Array(await data.arrayBuffer()),
    });
  }

  return { blob: makeZip(files), ext: "zip", entries, photos: files.length - 1 };
}
