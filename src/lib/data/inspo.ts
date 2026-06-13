// Inspo board (#140): two boards (moodboard | people) of media items, each with
// colored stickies placed on the image. Media bytes go to the public `attachments`
// bucket (#103) under an inspo/ prefix; these tables hold metadata + annotations.
// Reads tolerate the tables being absent (deploy-before-migration → []). Build
// brief: docs/inspo.md. Phase 1 = images + stickies; Phase 2 = video (#142).
import type { DB, InspoItem, InspoSticky } from "./types";

export type InspoBoard = "moodboard" | "people";
export type StickyColor = "yellow" | "blue" | "orange" | "pink" | "green";
export type InspoItemWithStickies = InspoItem & { stickies: InspoSticky[] };

const BUCKET = "attachments";
const MAX_BYTES = 10 * 1024 * 1024; // ~10 MB per image
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // ~50 MB per video (matches Supabase's 50 MiB cap)
const MAX_DIM = 2400; // longest-edge cap; larger images are downscaled

// Public URL for a stored item (the bucket is public, #103).
export function inspoUrl(sb: DB, storagePath: string): string {
  return sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// Items on a board, in manual order, with their stickies embedded via the FK.
// `sort_order` asc is the order (lower = first); un-reordered items all share the
// default 0 and tie-break by `created_at` desc, so fresh boards stay newest-first.
export async function listInspo(
  sb: DB,
  board: InspoBoard,
): Promise<InspoItemWithStickies[]> {
  try {
    const { data, error } = await sb
      .from("inspo_item")
      .select("*, stickies:inspo_sticky(*)")
      .eq("board", board)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as InspoItemWithStickies[];
  } catch {
    return [];
  }
}

// Persist a manual order within a board — renumber sort_order 0..n (lower = first).
// Mirrors reorderPins / routine.reorderItems.
export async function reorderInspoItems(sb: DB, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) => sb.from("inspo_item").update({ sort_order: i }).eq("id", id)),
  );
}

// Upload media (image or video) to Storage; returns its path + public url +
// intrinsic dims + kind. Images are downscaled (≤10 MB); videos go up as-is (≤50 MB)
// and the tile shows their first frame (#142 P2 — poster thumbnails are a refinement).
export async function uploadInspoMedia(
  sb: DB,
  file: File,
): Promise<{
  storagePath: string;
  url: string;
  width: number | null;
  height: number | null;
  kind: "image" | "video";
  posterPath?: string | null;
}> {
  const isVideo = file.type.startsWith("video/");
  if (!file.type.startsWith("image/") && !isVideo) {
    throw new Error("unsupported file — images or videos only");
  }

  if (isVideo) {
    if (file.size > MAX_VIDEO_BYTES) throw new Error("video is too large (max ~50 mb)");
    const { width, height, poster } = await videoMeta(file);
    const id = crypto.randomUUID();
    const ext = videoExtFor(file.type) ?? file.name.split(".").pop()?.toLowerCase() ?? "mp4";
    const path = `inspo/${id}.${ext}`;
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    // Best-effort first-frame poster (#144) — the tile shows this still; if it
    // couldn't be made (codec/canvas), posterPath stays null and the tile falls
    // back to the live first frame.
    let posterPath: string | null = null;
    if (poster) {
      posterPath = `inspo/${id}.poster.jpg`;
      const { error: pErr } = await sb.storage
        .from(BUCKET)
        .upload(posterPath, poster, { contentType: "image/jpeg", upsert: false });
      if (pErr) posterPath = null;
    }
    return { storagePath: path, url: inspoUrl(sb, path), width, height, kind: "video", posterPath };
  }

  const { blob, width, height } = await downscale(file);
  if (blob.size > MAX_BYTES) throw new Error("image is too large (max ~10 mb)");
  const ext = extFor(blob.type) ?? extFor(file.type) ?? "png";
  const path = `inspo/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  return { storagePath: path, url: inspoUrl(sb, path), width, height, kind: "image" };
}

export async function addInspoItem(
  sb: DB,
  board: InspoBoard,
  media: {
    storagePath: string;
    width: number | null;
    height: number | null;
    kind?: "image" | "video";
    posterPath?: string | null;
  },
): Promise<InspoItemWithStickies> {
  const { data, error } = await sb
    .from("inspo_item")
    .insert({
      board,
      kind: media.kind ?? "image",
      storage_path: media.storagePath,
      width: media.width,
      height: media.height,
      poster_path: media.posterPath ?? null,
    })
    .select("*, stickies:inspo_sticky(*)")
    .single();
  if (error) throw error;
  return data as InspoItemWithStickies;
}

// Remove the item + its media incl. any poster (stickies cascade). Storage delete
// via the API (a trigger blocks raw psql deletes — see handoff §12).
export async function deleteInspoItem(
  sb: DB,
  id: string,
  storagePath: string,
  posterPath?: string | null,
): Promise<void> {
  const paths = posterPath ? [storagePath, posterPath] : [storagePath];
  await sb.storage.from(BUCKET).remove(paths).catch(() => {});
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

function videoExtFor(mime: string): string | null {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/ogg": "ogv",
  };
  return map[mime] ?? null;
}

// Read a video's intrinsic dimensions AND grab a first-frame poster off-DOM (#144):
// load metadata (→ dims so masonry reserves the aspect ratio), seek to ~0.1s, draw
// the frame to a canvas (downscaled to MAX_DIM), and encode a JPEG. All best-effort —
// any step that fails yields nulls, and the caller falls back to a live <video> tile.
async function videoMeta(
  file: File,
): Promise<{ width: number | null; height: number | null; poster: Blob | null }> {
  if (typeof document === "undefined") return { width: null, height: null, poster: null };
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    let done = false;
    const finish = (r: { width: number | null; height: number | null; poster: Blob | null }) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(r);
    };
    v.onerror = () => finish({ width: null, height: null, poster: null });
    v.onloadedmetadata = () => {
      const width = v.videoWidth || null;
      const height = v.videoHeight || null;
      v.onseeked = () => {
        if (!width || !height) return finish({ width, height, poster: null });
        try {
          const scale = Math.min(1, MAX_DIM / Math.max(width, height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) return finish({ width, height, poster: null });
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((b) => finish({ width, height, poster: b }), "image/jpeg", 0.8);
        } catch {
          finish({ width, height, poster: null });
        }
      };
      const dur = isFinite(v.duration) ? v.duration : 0;
      try {
        v.currentTime = dur ? Math.min(0.1, dur / 2) : 0.1;
      } catch {
        finish({ width, height, poster: null });
      }
    };
    v.src = url;
  });
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
