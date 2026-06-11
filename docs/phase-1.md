> **living** — the parallel-slice plan. Each slice is its own Conductor workspace +
> branch off `main` (which must contain Phase 0). `#NNN` → `docs/decisions.md`.

# phase 1 — parallel slices

Phase 0 (foundation) is on `main`: scaffold, schema + data-access layer (`@/lib/data`),
design tokens + Lato + theme, app shell (`AppFrame`), auth (`proxy`), and the shared
primitives `Editor`, `DayTile`, `SectionHeader`, `ConsistencyChart`. These slices build
the actual screens on top.

## rules for every slice (read before coding)

1. **Build to the FROZEN docs** — `spec.md`, `data-model.md`, `design.md`, and
   `mockups/index.html`. If you think the spec is wrong, stop and raise it; don't freelance.
2. **Use the data-access layer** (`@/lib/data`). Never query Supabase tables directly and
   **never change the schema/migrations** (one shared DB across all workspaces).
3. **Reuse Phase 0 shared components** (`Editor`, `DayTile`, `SectionHeader`,
   `ConsistencyChart`, `AppFrame`) — don't fork or restyle them.
4. **Aesthetic:** lowercase by default (#061), Lato, the CSS tokens (`bg-bg`, `text-ink`,
   `text-accent`, …), Lucide icons. Match the mockup.
5. **Stay in your lane:** own only your files. The two shared-file edits (the ⌘K mount in
   `(app)/layout.tsx`, the PWA manifest in `layout.tsx`) are each assigned to exactly one
   slice below — no one else touches them.
6. **Same-PR rule** for any doc that needs updating.

## slices

### 1 · today  →  `src/app/(app)/page.tsx`, `src/components/today/*`
Spec §2, §3, §5.
- **Routine checklist:** `listActiveItems(today)`; inline rename (`renameItem`), hold-drag
  reorder (`reorderItems`), `+` in the section header adds a row (`addItem`), delete =
  archive (`archiveItem`), check toggles (`setCompletion` / `listCompletions`). No box,
  no row dividers, hover grip (#065, #013, #014 sleep is a normal row).
- **Today's journal:** inline below, larger header `today's journal`; `<Editor>` bound to
  `getJournal(today)` / debounced `saveJournal`; placeholder `do your journal today`.
- Uses: `data/routine`, `data/journal`, `Editor`, `SectionHeader`, `date.today`.

### 2 · notes  →  `src/app/(app)/notes/page.tsx`, `notes/[id]/page.tsx`, `src/components/notes/*`
Spec §6; #100, #031, #032, #034, #050.
- **Stream:** every day back to first use (#100) as journal rows (`DayTile` + title
  `journal` + snippet; empty days show `empty · tap to write`), interleaved with freeform
  notes (`listNotes`) by date, newest first. `+` in the header creates a note
  (`createNote`). Trash via `trashNote`/`restoreNote`.
- **Entry view:** open a journal day (`getJournal`/`saveJournal`) or note
  (`getNote`/`saveNote`) in `<Editor>`. Journal title = `journal` + date subtitle; note
  title editable.
- **Photos (#050):** this slice adds a Supabase **Storage bucket migration** + a
  `uploadImage` helper (`src/lib/data/attachments.ts`) and passes `onUploadImage` to
  `<Editor>`. Today reuses `uploadImage`. (One coordinated migration — sequence it.)
- Uses: `data/notes`, `data/journal`, `DayTile`, `Editor`, `date`.

### 3 · settings  →  `src/app/(app)/settings/page.tsx`, `src/components/settings/*`
Spec §8; #063.
- **Appearance:** accent swatches + light/dark + font; apply live (set `--accent` +
  `data-theme`) and persist to **both** `localStorage` (matches `ThemeScript`) and
  `data/settings` (`getSettings`/`saveSettings`).
- **Account:** username display, change password (`supabase.auth.updateUser`), sign out.
- Uses: `data/settings`, `@/lib/supabase/client`.

### 4 · search ⌘K  →  `src/components/search/*`  (+ one line in `(app)/layout.tsx`)
Spec §7; #040.
- ⌘K opens a command palette; instant search via `data/search` (journals + notes + routine
  labels), highlighted snippets; jump to a date/today; create a note.
- **Assigned shared edit:** mount `<CommandPalette/>` in `src/app/(app)/layout.tsx`.
- Uses: `data/search`, `next/navigation`.

### 5 · pwa  →  `public/*`  (+ metadata in `src/app/layout.tsx`)
- Web app manifest (name `notes`, icons, `theme-color`, `display: standalone`),
  apple-touch-icon, a service worker that caches the shell (not data — connection required
  #084). Keep it Capacitor-friendly (#082).
- **Assigned shared edit:** the manifest/metadata in `src/app/layout.tsx`.

## integration (after slices merge)
End-to-end pass + empty/first-run states (spec §10), then deploy (Supabase cloud + Vercel),
then — post-V1 — the Capacitor shell for widgets + rich notifications (#082, #090).
