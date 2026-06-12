> **FROZEN** — the V1 data contract. Changes require a new `docs/decisions.md` entry +
> sign-off. `#NNN` → `docs/decisions.md`. SQL migrations in the repo are the
> implementation. The hard constraint is **#016**: editing the routine template must
> never rewrite past days.

# data model

Postgres (Supabase). Single user (#070), so there is no per-user partitioning — auth is
handled by Supabase Auth (`auth.users`); the one account is pre-seeded. Tables below are
app data. All timestamps `timestamptz`; ids `uuid default gen_random_uuid()`.

## tables

### `routine_item` — the checklist template (#010, #016)
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `label` | text not null | the item text; rename is cosmetic & global (§3) |
| `sort_order` | int not null | manual order; reorder updates this |
| `created_on` | date not null | first day the item is active |
| `archived_on` | date null | day it was removed; null = still active |
| `created_at` | timestamptz default now() | |

**Active-window rule** (the snapshot mechanism, #016/#017): item is active on day `D`
iff `created_on <= D AND (archived_on IS NULL OR archived_on > D)`. No per-day snapshot
table is needed — the day's item set is derived from this window. Deleting = set
`archived_on = today`. Adding = `created_on = today`.

### `completion` — a checked item on a day
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `routine_item_id` | uuid fk → routine_item(id) | |
| `day` | date not null | local date |
| `completed_at` | timestamptz default now() | |
| | | **unique (`routine_item_id`, `day`)** |

A row exists **iff** the item was checked that day. Unchecking deletes the row. Index on
`(day)`. Consistency for day `D`: `done = count(completion where day=D)`,
`active = count(active items on D)`, `pct = done/active` (blank if `active=0`; `0%` if
`active>0, done=0` — #022).

### `journal` — at most one per day (#030, #031)
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `day` | date not null **unique** | |
| `content` | jsonb | TipTap doc |
| `content_text` | text | plaintext projection for search/snippets |
| `updated_at` | timestamptz default now() | |

Materialized **only when first written** — the UI treats every day as having a journal
(#030) but rows exist only for written days; the stream renders empty days from the date
range, every day back to first use (#100). "Clearing" a journal empties `content` (keep
or delete the row; both fine) — never a user-facing delete (§5).

### `note` — freeform note (#032, #034)
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `title` | text | |
| `content` | jsonb | TipTap doc |
| `content_text` | text | plaintext projection |
| `created_at` | timestamptz default now() | sorts the note into the stream |
| `updated_at` | timestamptz default now() | |
| `deleted_at` | timestamptz null | soft-delete / trash (~30d, then purge — #034) |

### `attachment` — image in a journal or note (#050)
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `owner_type` | text | `'journal'` \| `'note'` |
| `owner_id` | uuid | journal.id or note.id |
| `storage_path` | text | path in Supabase Storage bucket |
| `created_at` | timestamptz default now() | |

Image bytes live in a Supabase Storage bucket; TipTap content references the public/
signed URL. Table tracks attachments for lifecycle/cleanup (e.g. orphan purge).

### `settings` — singleton app preferences (#063)
| column | type | notes |
|---|---|---|
| `id` | int pk default 1 (check id=1) | single row |
| `accent` | text default `'#3b6ef0'` | hex |
| `theme` | text default `'light'` | `'light'` \| `'dark'` \| `'system'` |
| `font` | text default `'lato'` | `'lato'` \| `'system'` |
| `updated_at` | timestamptz default now() | |

## search (#040)

- Maintain a `tsvector` (generated column or trigger) over `title` + `content_text` on
  `journal` and `note`; **GIN** index each. Routine labels searched too.
- Enable `pg_trgm` for fuzzy/typo tolerance on titles/labels.
- A unified search reads across journal + note (+ routine_item.label), ranked, returning
  highlighted snippets.

## migrations & the shared-DB caveat

- Migrations are SQL files in the repo, applied to the one Supabase project.
- **All Conductor workspaces share this single database** (see `architecture.md`).
  Therefore **schema/migrations are owned by Phase 0 / coordinated — never run
  concurrently by parallel feature agents** (#082 build path). Feature agents read/write
  through the data-access layer; they don't alter schema.

## the data-access layer (Phase 0 contract)

Phase 0 ships typed functions the feature slices import (the seam that keeps parallel
agents consistent). Indicative surface:

- routine: `listActiveItems(day)`, `addItem(label)`, `renameItem(id,label)`,
  `reorderItems(order)`, `archiveItem(id)`, `toggleCompletion(itemId, day)`.
- consistency: `getConsistency(fromDay, toDay)` → `[{day, pct}]`.
- journal: `getJournal(day)`, `saveJournal(day, content)`.
- notes: `listNotes()`, `getNote(id)`, `createNote()`, `saveNote(id, …)`,
  `trashNote(id)`, `restoreNote(id)`.
- attachments: `uploadImage(file, owner)`.
- search: `search(query, {type, fromDay, toDay})`.
- settings: `getSettings()`, `saveSettings(patch)`.

Post-V1 additions (read-only, additive):
- export: `exportAll()` / `buildExportArchive()` — full data dump ± photo bytes (#109/#114).
- widget: `getWidgetSummary(day)` → `{done, total, focusLabel, focusItemId}` via the
  `widget_summary(p_day)` Postgres function (migration `0004`, #119). Locked to the
  `authenticated` role (anon execute revoked), like every table (#108).

Exact signatures finalize with `spec.md` at freeze.
