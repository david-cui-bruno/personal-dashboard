// Inspo board (#140): two boards (moodboard | people) of media items, each with
// colored stickies placed on the image. Media bytes go to the public `attachments`
// bucket (#103) under an inspo/ prefix; these tables hold metadata + annotations.
// Reads tolerate the tables being absent (deploy-before-migration → []). Build
// brief: docs/inspo.md. Phase 1 = images + stickies; phase 2 = video.
import type { DB, InspoItem, InspoSticky } from "./types";

export type InspoBoard = "moodboard" | "people";
export type StickyColor = "yellow" | "blue" | "orange" | "pink" | "green";
export type InspoItemWithStickies = InspoItem & { stickies: InspoSticky[] };

const BUCKET = "attachments";
const MAX_BYTES = 10 * 1024 * 1024; // ~10 MB per image
const MAX_DIM = 2400; // longest-edge cap; larger images are downscaled

// Public URL for a stored item (the bucket is public, #103).
export function inspoUrl(sb: DB, storagePath: string): string {
  return sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// Items on a board, newest first, with their stickies embedded via the FK.
export async function listInspo(
  sb: DB,
  board: InspoBoard,
): Promise<InspoItemWithStickies[]> {
  try {
    const { data, error } = await sb
      .from("inspo_item")
      .select("*, stickies:inspo_sticky(*)")
      .eq("board", board)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as InspoItemWithStickies[];
  } catch {
    return [];
  }
}

// Upload an image to Storage; returns its path + public url + intrinsic dims.
export async function uploadInspoMedia(
  sb: DB,
  file: File,
): Promise<{ storagePath: string; url: string; width: number | null; height: number | null }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("only images for now (video coming soon)");
  }
  const { blob, width, height } = await downscale(file);
  if (blob.size > MAX_BYTES) throw new Error("image is too large (max ~10 mb)");
  const ext = extFor(blob.type) ?? extFor(file.type) ?? "png";
  const path = `inspo/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return { storagePath: path, url: inspoUrl(sb, path), width, height };
}

export async function addInspoItem(
  sb: DB,
  board: InspoBoard,
  media: { storagePath: string; width: number | null; height: number | null },
): Promise<InspoItemWithStickies> {
  const { data, error } = await sb
    .from("inspo_item")
    .insert({
      board,
      kind: "image",
      storage_path: media.storagePath,
      width: media.width,
      height: media.height,
    })
    .select("*, stickies:inspo_sticky(*)")
    .single();
  if (error) throw error;
  return data as InspoItemWithStickies;
}

// Remove the item + its media (stickies cascade). Storage delete via the API
// (a trigger blocks raw psql deletes — see handoff §12).
export async function deleteInspoItem(
  sb: DB,
  id: string,
  storagePath: string,
): Promise<void> {
  await sb.storage.from(BUCKET).remove([storagePath]).catch(() => {});
  const { error } = await sb.from("inspo_item").delete().eq("id", id);
  if (error) throw error;
}

// --- stickies (placed on the opened image, #140) ---
export async function addSticky(
  sb: DB,
  itemId: string,
  s: { color: StickyColor; x: number; y: number; rotation?: number },
): Promise<InspoSticky> {
  const { data, error } = await sb
    .from("inspo_sticky")
    .insert({ item_id: itemId, color: s.color, x: s.x, y: s.y, rotation: s.rotation ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSticky(
  sb: DB,
  id: string,
  patch: { text?: string; x?: number; y?: number; rotation?: number },
): Promise<void> {
  const { error } = await sb.from("inspo_sticky").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSticky(sb: DB, id: string): Promise<void> {
  const { error } = await sb.from("inspo_sticky").delete().eq("id", id);
  if (error) throw error;
}

// --- helpers ---
function extFor(mime: string): string | null {
  const m = /^image\/(png|jpeg|jpg|webp|gif|avif)$/.exec(mime);
  if (!m) return null;
  return m[1] === "jpeg" ? "jpg" : m[1];
}

async function downscale(
  file: File,
): Promise<{ blob: Blob; width: number | null; height: number | null }> {
  if (typeof document === "undefined") return { blob: file, width: null, height: null };
  try {
    const bitmap = await createImageBitmap(file);
    const w = bitmap.width;
    const h = bitmap.height;
    const scale = Math.min(1, MAX_DIM / Math.max(w, h));
    if (scale === 1) {
      bitmap.close();
      return { blob: file, width: w, height: h };
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return { blob: file, width: w, height: h };
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const out = await new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.85));
    return { blob: out ?? file, width: canvas.width, height: canvas.height };
  } catch {
    return { blob: file, width: null, height: null };
  }
}
