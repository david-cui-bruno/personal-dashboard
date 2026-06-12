> **FROZEN** — the V1 behavioral contract. Changes require a new `docs/decisions.md`
> entry + sign-off. `#NNN` references are entries in `docs/decisions.md` (the "why").
> Companion contracts: `docs/data-model.md` (data), `docs/design.md` + `mockups/` (visual).

# spec

## resolved decisions

All previously-open items are settled (#100–#102): the Notes stream shows **every day
back to the earliest journal/note** (#100 as amended by **#111** — see "stream" below);
the editor has **no toolbar** on any platform — shortcuts + markdown-style input, same on
mobile (#101); the consistency chart is a **fixed ~3-month** window (#102). These are
folded into the sections below.

---

## 1. concepts

- **day** — a calendar date in the device's local timezone (#011, #083). The unit
  everything hangs off. Boundary = local midnight.
- **routine item** — one entry in the daily checklist template (#010). Has a label and a
  sort order. Daily-only.
- **completion** — the fact that a given routine item was checked on a given day.
- **journal** — at most one per day (#030, #031). Title is always the word "journal";
  the date is shown as a tile/subtitle. Conceptually exists for every day; physically
  stored only once written.
- **note** — a freeform entry created any time (#032). Has its own title.
- **attachment** — an image embedded in a journal or note (#050).

## 2. today screen (`/`)

The home screen and the pinned tab (#064). Top to bottom:

- **date title** — lowercase, e.g. `thursday, june 11` (#061). No eyebrow, no
  "x of y done" counter (#065 / removed by David).
- **daily routine section** (see §3).
- **song of the day** — one logged song per day (#123), set via inline Spotify
  search or "from your spotify" (#125/#126). Shown atop the journal as a bar with album
  art + title + artist. The green play button reveals **Spotify's inline embed player**
  in-app (#127) — full track if signed into Spotify Premium in that browser, else a 30s
  preview; the art/title links out to Spotify as a full-track fallback. Also shown on the
  `/notes/[date]` entry; a quiet `♪` line marks it on the stream (§6).
- **today's journal section** — a larger section header `today's journal`, then the
  journal body inline. Empty state shows a gray, non-italic placeholder
  `do your journal today`. Typing autosaves (§5). This edits the *same* journal object
  as `notes` shows for today (#030, "one object, two doors").

Web: routine + journal in the ~700px reading column; consistency chart in the sidebar.
Mobile: routine, then consistency as a section, then today's journal; bottom nav
Today/Notes only (#064).

## 3. daily routine

### display & checking
- A flat list (#010) of the day's active items, in `sort_order`, each a checkbox + label.
  No box around the section, no lines between rows (#065).
- Tap the checkbox to toggle done. Done = strikethrough + muted (visual only).
- The set of items shown for a day = items **active that day** (see §3 snapshot rules).

### inline editing (#013)
- Tap an item's **label** to rename it in place.
- **Hold-drag** a row to reorder (updates `sort_order`).
- **`+`** at the top-right of the section header adds a new empty row at the bottom;
  focus lands in it to type the label.
- **Enter** while editing any row — a rename *or* the add row — commits it and opens a
  fresh empty row at the bottom to type the next item, so several can be added in a row
  without reaching for `+` (#120). Empty Enter is a no-op; Escape cancels.
- Deleting an item: a per-row delete (e.g. swipe on mobile / hover affordance on web).
  Deleting **archives** the item (see snapshot rules) — it does not erase history.

### daily reset (#011, #012)
- No background job. The checklist for date D is "the active items for D + their
  completions for D." When local midnight passes, the app shows the new date, which has
  no completions yet → appears reset. All prior days remain intact.

### snapshot rules (#016, #017) — the history-integrity contract
- An item is **active on day D** iff `created_on ≤ D` and (`archived_on` is null or
  `archived_on > D`).
- **Add** an item today → active from today forward; it does **not** appear on past days
  (#017).
- **Archive** (delete) an item today → it disappears from today/future, but days before
  the archive still show it with whatever completion they had.
- **Rename**/**reorder** are cosmetic and apply to the single item everywhere (past days
  display the current label/order). The *set* of items per day is what's preserved, not
  the label text.

### consistency calculation (feeds §4)
- For day D: `active = count(active items on D)`, `done = count(completions on D)`,
  `pct = done / active`.
- `active = 0` (before any item existed) → the day **doesn't count** (blank). A day with
  items but no completions → `0%` (#022). Past days are fully editable, so these update
  retroactively (#015).

## 4. consistency chart (#020–#023)

- Vertical heatmap, **option A**: weekday columns across the top (`m t w t f s s`),
  months down the left, newest week at the bottom.
- Each cell = one day, shaded across blank → 4 accent-tinted levels by `pct` (#020).
- **No streak counter, no legend** (#023).
- Web: in the sidebar. Mobile: a section on Today.
- Range: a **fixed ~3-month** window, no scroll-back (#102).

## 5. journal (#030, #031, #033)

- Exactly one journal per day; title is the literal word `journal`; date shown as a tile
  (list) / subtitle (editor).
- Rich-text body (§6 editor). **Autosaves** continuously (debounced); no "saved at…"
  indicator, no word count (removed by David).
- Empty journal = no content yet; shows the placeholder. "Deleting" a journal just
  clears its content (the day still exists as empty) — journals are never row-deleted.

## 6. notes (`/notes`, `/notes/[id]`) + editor + photos

### stream
- One reverse-chronological stream combining **every day's journal** (#030) and
  **freeform notes** (#032), newest first. The range is **today back to the earliest day
  with a journal, note, or logged song** (#100 as amended by #111/#124); empty days *inside*
  that range show `empty · tap to write` (plus a `♪` line if that day has a song, #123), but
  days before any content ever existed are not listed.
- **Journal item**: filled day-number tile (note option C, #031) + title `journal` +
  snippet.
- **Freeform note**: its own title + snippet, **no** date tile (#032).
- Freeform notes sort into the stream by `created_at`. New note via `+` at the top-right
  of the Notes header (no FAB on mobile — removed by David).
- A simple in-list filter/search box is present; the ⌘K palette (§7) is the richer path.
  The box also accepts a **date** ("june 3", "6/3", "2026-06-03") and surfaces that day's
  journal at the top, linking to `/notes/[YYYY-MM-DD]` even if the day is empty or older
  than first use — this is "browse by date" without a calendar (#116).

### editor (#033)
- TipTap WYSIWYG, **no formatting toolbar on any platform** (#101) — formatting via
  keyboard shortcuts (⌘B/⌘I, …) and **markdown-style input rules** that also work on
  mobile (`# `, `- `, `**…**`, `> `, `[ ] `). Feature set (#101): paragraphs, H1/H2,
  bold, italic, underline, strikethrough, bullet + numbered lists, checklist, blockquote,
  link, inline image. Out: tables, code blocks, colors/fonts.
- Content stored as TipTap JSON; a plaintext projection is stored for search (§7) and
  list snippets.
- Journal editor header: title `journal` + the date as a subtitle. Note editor: the
  note's own title, editable.

### photos (#050)
- Paste or drag an image into the editor → uploaded to Supabase Storage → rendered
  inline. Multiple per entry. Per-image size cap (default, e.g. ~10 MB; client-side
  downscale of very large images). Attachments tracked for cleanup (`data-model.md`).

### trash (#034)
- Freeform notes soft-delete to a trash, recoverable ~30 days, then purged. (Journals
  are cleared, not deleted — see §5.)

## 7. search — ⌘K command palette (#040)

- Opened with **⌘K** (and a search affordance). Instant, as-you-type.
- Searches **titles + bodies** of journals and notes, plus **routine item labels**.
- Postgres full-text search (ranked) + fuzzy/typo tolerance (no paid service).
- Results show a highlighted snippet; selecting one opens that entry.
- The palette also **jumps** (to a date / today) and **creates** (a new note) from the
  keyboard.
- Filters: all / journals / notes, and a date range.

## 8. settings (`/settings`) + theming (#063)

- **appearance**: accent color (swatches) + light/dark theme + font (lato/system). All
  applied live via CSS variables; persisted in `settings`.
- **account** (#070): username display, change password, sign out. A note that you stay
  signed in on this device.
- No routine management here — routine is edited inline on Today (#013).

## 9. auth (#070, #071)

- Single user. Username + password via Supabase Auth. **Persistent session** — sign in
  once per device, effectively never again (long-lived refresh).
- No public sign-up; the single account is pre-seeded from config.
- All routes except `/sign-in` require an authenticated session.

## 10. cross-cutting

- **lowercase aesthetic** everywhere by default (#061).
- **first-run / empty states**: empty routine → `add your first item` prompt; empty
  journal → `do your journal today`; empty notes → a gentle empty state.
- **timezone**: device-local (#083). A fixed home-timezone setting is deferred.
- **offline**: connection required (#084); show a clear "no connection" state, no offline
  editing in V1.
- **PWA**: installable (manifest, icon, name `notes`, theme-color, service worker for
  install/caching of the shell — not for offline data).
