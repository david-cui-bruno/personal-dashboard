> **living** — build brief for the **inspo** feature (mood / inspiration board tab). The
> design is **settled** (this doc + the mockup: `mockups/index.html` → "inspo" and "item
> open"). Decision: **#140**. This is the source of truth for the *plan*; when the slice
> ships, fold the behavioral contract into `docs/spec.md` + `docs/data-model.md` (both FROZEN)
> and add the build's own `docs/decisions.md` entries. If this doc disagrees with a FROZEN
> doc after shipping, the FROZEN doc wins (and fix this).

# inspo — build handoff

## 0. what it is (one paragraph)

A new top-level **inspo** tab: a private visual mood / inspiration board. **Two boards**,
toggled by a header segment exactly like notes' `all / pinned` (#135): **moodboard** (anything
you find that you like) and **people** (people who inspire you) — same item model, just two
categories. You add items by **paste, drag-in, or upload** (images & screenshots first; screen
recordings as a fast-follow). Items lay out in a **masonry** grid. **Open** an image to focus
it; then stick **colored sticky notes** onto the image — pulled from a **fixed holder /
dispenser**, dropped where you want, clicked into and typed (the sticky grows with the text),
dragged to reposition. Same stack, same calm Day-One aesthetic (Lato, lowercase, minimal),
single-user, RLS-locked.

## 1. settled design decisions (the "what" — all locked with David)

- **Tab name:** `inspo`. Route `/inspo` under the `(app)` shell.
- **Two boards via a segment** (reuse the notes `all/pinned` segment pattern): **moodboard** +
  **people**. One item model; `board` distinguishes them. Each board lays out independently.
- **Layout:** responsive **masonry** grid (CSS `columns`), 3 cols web / 2 cols mobile.
- **Media:** **images & screenshots first**; **screen recordings (video) are a fast-follow**
  (Phase 2). **Paste** realistically only carries images — videos are **drag-in / upload**.
- **Sticky placement = "A · on the opened image".** Stickies are placed and edited on the
  **big opened image** (a lightbox), where there's room to read/type. On the **board**, an
  item's stickies show as small **peeks** on the tile (preview, not editable). **Dragging a
  color from the holder onto a board tile opens that item's lightbox with a fresh sticky ready
  to type** (so the holder still "works" from the board).
- **Sticky colors (all 5):** yellow · blue · orange · pink · green. Color is per-sticky.
- **The holder / dispenser** (the signature interaction):
  - A **fixed** dock of the 5 colors (stays put while you scroll — `position: fixed`/sticky).
    On the board it's docked on the right; in the lightbox it's docked alongside the image.
  - **Hover a color → it pops out** (translate + scale + slight tilt) to signal "grab me".
  - **Drag a color onto the image → drops a new sticky** at that point → **click & type** →
    the sticky **grows** with the text. **Drag a placed sticky** to reposition; **delete** via
    a small affordance.
- **Calm aesthetic preserved:** the board is the only "busy" surface; the rest of the app is
  unchanged. No tags/folders (still honoring #003 — boards are the only grouping).

## 2. navigation (amends a FROZEN decision)

- **New `/inspo` route** under `src/app/(app)/`.
- **Web:** a third sidebar nav item (`layout-grid` lucide icon), under "notes".
- **Mobile:** a **third bottom-nav tab** (today / notes / **inspo**). This **amends #064**
  ("mobile bottom nav has Today and Notes **only**"). David signed off — record the amendment
  in the build's decision entry (it supersedes the nav part of #064).
- Deep link target stays `notes://today` for the widget; inspo needs no deep link in v1.

## 3. data model (new — migration `0010_inspo.sql`)

Two new tables. Both **RLS-locked to `authenticated`** like every table (#108); the anon key
stays inert. Reads must **tolerate the tables being absent** (deploy-before-migration → return
`[]`), same pattern as `daily_song`/pins (#123/#135).

### `inspo_item` — one board item (an image; later a video)
| column | type | notes |
|---|---|---|
| `id` | uuid pk default `gen_random_uuid()` | |
| `board` | text not null | `check (board in ('moodboard','people'))` |
| `kind` | text not null default `'image'` | `check (kind in ('image','video'))` — `video` is P2 |
| `storage_path` | text not null | path in the Storage bucket (see §4); public URL derived |
| `width` | int | intrinsic px width — lets masonry reserve aspect ratio before load |
| `height` | int | intrinsic px height |
| `sort_order` | int not null default 0 | manual order within the board (drag-reorder) |
| `created_at` | timestamptz default `now()` | |

### `inspo_sticky` — a colored sticky note placed on an item's image
| column | type | notes |
|---|---|---|
| `id` | uuid pk default `gen_random_uuid()` | |
| `item_id` | uuid not null | `references inspo_item(id) on delete cascade` |
| `color` | text not null | `check (color in ('yellow','blue','orange','pink','green'))` |
| `text` | text not null default `''` | |
| `x` | real not null | **fraction 0..1** of the image width (sticky's top-left) — scales across screens |
| `y` | real not null | fraction 0..1 of the image height |
| `rotation` | real not null default 0 | small tilt in degrees (e.g. ±3) for the paper feel |
| `created_at` | timestamptz default `now()` | |

> **Coordinate model (important):** store `x`/`y` as **fractions of the image's natural box**,
> not pixels — so a sticky stays anchored to the same spot whether the image renders at 300px
> or 900px wide. On render: `left = x * renderedWidth`, `top = y * renderedHeight` inside the
> image container (which must be `position: relative` and sized to the image).

Migration sketch (mirror the existing RLS migrations for the policies):
```sql
create table public.inspo_item ( …columns above… );
create table public.inspo_sticky ( …columns above…, );
create index inspo_item_board_idx on public.inspo_item (board, sort_order);
create index inspo_sticky_item_idx on public.inspo_sticky (item_id);
alter table public.inspo_item enable row level security;
alter table public.inspo_sticky enable row level security;
-- single-user app: authenticated can do everything; anon nothing (#108)
create policy inspo_item_auth on public.inspo_item for all to authenticated using (true) with check (true);
create policy inspo_sticky_auth on public.inspo_sticky for all to authenticated using (true) with check (true);
```

## 4. storage / media

- **Reuse the existing `attachments` bucket** (public, #103) under an **`inspo/<item_id>/`**
  prefix. It's already public-read + authenticated-write, which is exactly what we need; no new
  bucket.
- On add: upload the file, then `getPublicUrl(path)` for rendering. Capture **width/height**
  from the loaded image (or the `File` via `createImageBitmap`) and store on `inspo_item`.
- **Reasonable size cap** (e.g. images ≤ ~10 MB). **Phase 2 video:** higher cap (e.g. ≤
  ~50–100 MB — confirm with David / Supabase plan limits), `<video>` playback in the lightbox,
  and a **poster thumbnail** for the tile (generate client-side from the first frame via a
  `<canvas>`, or accept a plain video tile in v1 of P2).
- **Deleting media:** delete the Storage object via the **Storage API**, *not* psql — a
  `storage.protect_delete()` trigger blocks raw deletes (handoff §12 / `browser-verification`
  memory). Delete the row + the object together on item delete.

## 5. data-access layer (`src/lib/data/inspo.ts`, exported from `src/lib/data/index.ts`)

Mirror the existing data-layer style (typed, throws on error, tolerant reads). Indicative:

- `listInspo(sb, board)` → `InspoItem[]` **with embedded stickies** via the FK relationship:
  `sb.from('inspo_item').select('*, stickies:inspo_sticky(*)').eq('board', board).order('sort_order')`.
  Wrap in try/catch → `[]` if the tables don't exist yet.
- `uploadInspoMedia(sb, file)` → `{ storagePath, url, width, height, kind }` (upload + dims).
- `addInspoItem(sb, board, media)` → `InspoItem` (next `sort_order` = max+1, or 0 = newest-first
  — pick one; recommend **prepend** so new finds show at the top).
- `deleteInspoItem(sb, id, storagePath)` → delete row (cascade kills stickies) + Storage object.
- `reorderInspoItems(sb, order)` → renumber `sort_order` (reuse the routine/pins pattern).
- `addSticky(sb, itemId, { color, x, y, rotation })` → `InspoSticky`.
- `updateSticky(sb, id, patch)` → `{ text?, x?, y?, rotation? }` (debounce text saves like the
  editor; positions save on drop).
- `deleteSticky(sb, id)`.
- Types `InspoItem` / `InspoSticky` in `src/lib/data/types.ts` (`Tables[...]['Row']`).
- Add `pin_order`-style decouple tolerance; regenerate `database.types.ts` (verify non-empty,
  §12 gotcha) or hand-add the two tables.

## 6. UI components

- **Route:** `src/app/(app)/inspo/page.tsx` → `<InspoBoard />`.
- **`src/components/inspo/inspo-board.tsx`** — the board: header (`inspo` + add button) ·
  `moodboard / people` segment · masonry grid of tiles · the fixed **holder** · paste/drag/drop
  + upload handling. Reuse `useDragReorder` (`src/components/ui/use-drag-reorder.ts`, #134/#135)
  for tile reordering.
- **`src/components/inspo/inspo-tile.tsx`** — one masonry tile (image, optional ▶ video badge,
  sticky **peeks**). Click → open lightbox. Drop a holder color here → open lightbox w/ new
  sticky.
- **`src/components/inspo/inspo-lightbox.tsx`** — the opened item: big image (`position:
  relative` container) + placed **stickies** + the holder docked alongside + close/delete.
- **`src/components/inspo/sticky.tsx`** — one positioned sticky: absolute at `x/y` fractions,
  colored, **auto-growing** editable text (a textarea that resizes to content, or
  `contenteditable`), draggable to reposition (pointer events), delete affordance, tilt.
- **`src/components/inspo/sticky-holder.tsx`** — the fixed dock: 5 color tabs, hover-pop,
  drag-source for creating stickies. On mobile, consider docking it as a bottom strip rather
  than a side rail.
- **Nav:** add the `inspo` item to `app-frame` (web sidebar) + the mobile tab bar.

## 7. interactions in detail (the holder + stickies — the hard part)

1. **Holder is fixed** (`position: fixed` on web; a sticky bottom strip is fine on mobile) so
   it's reachable while the board scrolls.
2. **Hover a color** → CSS transform pop-out (already in the mockup: `translateX(-13px)
   scale(1.12) rotate(-4deg)`).
3. **Drag a color → create a sticky:**
   - `pointerdown` on a color tab starts a drag; render a **ghost** sticky following the
     pointer (a fixed-position element).
   - On **drop over the open image** (lightbox): compute the drop point relative to the image
     box → convert to `x/y` **fractions** → `addSticky(itemId, {color, x, y, rotation: small
     random})` → focus it for typing.
   - On **drop over a board tile** (board view): **open that item's lightbox** and create the
     sticky near the drop point (or center), focused. (This is how the board's holder "works".)
4. **Type → grow:** the sticky's text is an auto-resizing field (min ~120px wide; grows in
   height, wraps; cap max width ~200px then grow down). Debounce `updateSticky({text})`.
5. **Move a sticky:** drag it within the image → update `x/y` on drop (pointer events; same
   fraction conversion). Keep it within the image bounds.
6. **Delete a sticky:** small ✕ on hover/long-press → `deleteSticky`.
7. **Board peeks:** render each item's stickies as tiny, non-interactive scaled previews on the
   tile (or cap to the first 1–2). Keep it cheap — it's decoration.
8. **Touch:** all drags use **pointer events** (works mouse + touch) with `touch-action: none`
   on drag handles, mirroring the routine/pins reorder (#132/#134). Test the holder-drag and
   sticky-move on a real phone — this is the riskiest part of the feel.

## 8. mockup reference

`mockups/index.html` (open in a browser, use the bottom switcher):
- **`inspo`** — the web board: sidebar item, `moodboard/people` segment (clickable), masonry,
  sticky **peeks** on tiles, the ▶ video badge (P2 hint), the fixed **holder** on the right.
- **`item open`** — the lightbox mechanic: big image with on-image stickies (incl. a multi-line
  one mid-type to show the "grows" behavior) + the holder docked, "drag → " label, hover-pop.
- **`mobile inspo`** — phone with the 3-tab bar (today/notes/inspo) + 2-col masonry.

## 9. phasing

> **status:** Phase 1 **shipped** — **P1a** = tab + nav + boards + image paste/drag/upload +
> masonry + open-lightbox + delete (#141); **P1b** = tile peeks + the **holder** + on-image
> stickies (drag-to-drop / tap-to-type-and-grow / move / delete) (#142). **Tile reorder was
> deferred** — the board is newest-first and `sort_order` stays reserved (see #142 /
> `docs/data-model.md`). Phase 2 (video) is the open fast-follow.

- **Phase 1 (shipped, #141 + #142):** the `inspo` tab + nav + the two boards (segment) +
  **image** paste/drag/upload + masonry + tile peeks + open-lightbox + the **holder** (place /
  drag / type-to-grow / move / delete stickies) + delete item. Data model + storage + data layer
  + docs. *(Tile **reorder** deferred — see status note above.)*
- **Phase 2 (fast-follow):** **screen recordings / video** — drag/upload (size-capped),
  `<video>` playback in the lightbox, ▶ tile badge, poster thumbnails. Flip `kind='video'`.

## 10. edge cases & gotchas

- **Masonry reflow:** CSS `columns` reflows on resize — stickies are anchored to the *opened*
  image (lightbox), not the tile, so reflow doesn't disturb them. Tile peeks are decorative.
- **Image dimensions:** capture w/h on upload so the grid reserves space (no layout jump). Very
  tall/wide images: cap the rendered size in the lightbox; `x/y` fractions still hold.
- **Large files / cost:** images ≤ ~10 MB; video (P2) is the cost driver — confirm caps vs the
  Supabase plan. The export `.zip` (#114) already bundles Storage files — consider whether inspo
  media should join the export (probably yes; note it).
- **Storage deletes** must go through the Storage API (trigger blocks psql) — §4.
- **Paste** = images only (clipboard rarely carries video); don't promise video paste.
- **Decouple-safety:** all reads tolerate missing tables (deploy before `0010`) → `[]`.
- **RLS:** authenticated-only; never expose to anon.
- **z-order / overlap:** stickies can overlap; last-touched on top is fine for v1 (optional `z`).

## 11. verification plan

Per `docs/handoff.md` §15 + the `browser-verification` memory — **Python Playwright + local
Supabase**, **self-restoring** against the shared DB:
- Apply `0010` locally (psql, like the other migrations).
- Seed an `inspo_item` (upload a tiny test image to Storage, or seed a row pointing at a known
  object) → open the lightbox → drag a color from the holder onto the image → assert a sticky
  was created (DB row with sensible `x/y`) → type → assert `text` persists → move it → assert
  `x/y` changed → delete it → assert gone. Toggle the segment. Reorder two tiles → assert
  `sort_order` persisted. **Clean up** all seeded rows + Storage objects (Storage API) so the
  shared DB is left pristine. Watch for console errors.
- `pnpm lint` + `pnpm build` green.

## 12. docs to update when the slice ships

- **`docs/spec.md`** (FROZEN) — a new "inspo" section (§) describing the behavior; David signs
  off (he already approved the design — note it).
- **`docs/data-model.md`** (FROZEN) — the two tables + the storage prefix + the data-layer
  surface.
- **`docs/decisions.md`** — the build's entries (this brief is recorded as **#140**; add any
  decisions made during the build, e.g. final size caps, prepend-vs-append order).
- **`docs/handoff.md`** — feature map (§3) + repo map (§4) + decision range.
- **`docs/roadmap.md`** — mark inspo built (it's added as "in design" by this PR).
- **`docs/design.md`** — the sticky palette tokens + the holder/masonry patterns, anchored to
  the mockup.
