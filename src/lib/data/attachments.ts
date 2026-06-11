// Inline image uploads for journals & notes (#050). Bytes go to the Supabase
// Storage "attachments" bucket (migration 0002_storage.sql); a row in the
// `attachment` table tracks each upload for lifecycle/cleanup (docs/data-model.md).
//
// Browser-only: `downscale` uses canvas. Called from the shared <Editor> via the
// `onUploadImage` prop. The Today slice reuses this helper (docs/phase-1.md).
import type { DB } from "./types";

const BUCKET = "attachments";
const MAX_BYTES = 10 * 1024 * 1024; // ~10 MB per image (#050)
const MAX_DIM = 2000; // longest-edge cap; larger images are downscaled (#050)

export type AttachmentOwner = { type: "journal" | "note"; id: string };

// Uploads an image and returns its public URL (ready to embed in the editor).
export async function uploadImage(
  sb: DB,
  file: File,
  owner: AttachmentOwner,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("only images can be added to an entry");
  }
  const blob = await downscale(file);
  if (blob.size > MAX_BYTES) {
    throw new Error("image is too large (max ~10 mb)");
  }

  const ext = extFor(blob.type) ?? extFor(file.type) ?? "png";
  const path = `${owner.type}/${owner.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (upErr) throw upErr;

  // Track for cleanup. Best-effort: the bytes are already uploaded and will be
  // referenced by the entry, so a failed insert shouldn't block the embed.
  const { error: trackErr } = await sb.from("attachment").insert({
    owner_type: owner.type,
    owner_id: owner.id,
    storage_path: path,
  });
  if (trackErr) console.error("attachment tracking failed", trackErr);

  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function extFor(mime: string): string | null {
  const m = /^image\/(png|jpeg|jpg|webp|gif|avif)$/.exec(mime);
  if (!m) return null;
  return m[1] === "jpeg" ? "jpg" : m[1];
}

// Downscale to MAX_DIM on the longest edge if larger; otherwise return as-is.
// Falls back to the original file if the browser can't decode/encode it.
async function downscale(file: File): Promise<Blob> {
  if (typeof document === "undefined") return file; // SSR guard (not expected)
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, 0.85),
    );
    return out ?? file;
  } catch {
    return file;
  }
}
