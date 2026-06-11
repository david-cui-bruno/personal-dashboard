# decisions

Append-only log of every settled decision and its rationale. **Never edit or delete a
past entry.** To reverse one, add a new entry that references and supersedes it.

Format: `#NNN — <title>` · the decision · **why** · (links to related entries).

---

## 2026-06-11 — initial design session

These were all settled in the opening design conversation with David and the UI
mockups (`mockups/index.html`).

### product

**#001 — App name is "notes."**
The app is simply called "notes," lowercased in the UI.

**#002 — Goal: one app David enjoys opening daily.**
Replace Day One + a scattered checklist with one private app that's a pleasure to use
every day. Success = daily use without friction; streaks are nice-to-have, not the
point. **Why:** the whole product lives or dies on whether he actually opens it. See
`docs/product.md`.

**#003 — Non-goals fixed.** No sharing/social, no collaboration, no
folders/projects/tags/task-management, no analytics beyond the heatmap, no
reminders/notifications in V1, no non-daily routine items. **Why:** protect a simple
product from scope creep.

### routine / accountability

**#010 — Daily routine is a flat checklist of daily-only items.**
No grouping, no time-of-day buckets, no weekly items. **Why:** David's real routine is
all daily; flat is the least friction.

**#011 — Day boundary is local midnight.** **Why:** simplest mental model.

**#012 — "Reset" is date-keyed, not a cron job.**
The checklist is "the completions for date D." A new day shows a new date with no
completions, so it *looks* reset automatically; every past day's state is frozen as
history. **Why:** no nightly job to silently fail; the reset and the accountability
history are the same mechanism.

**#013 — Routine is edited inline on Today (no separate edit mode).**
Tap an item's text to rename, hold-drag a row to reorder, "+" at the top-right of the
"daily routine" section adds a new row at the bottom. **Why:** David wants to edit in
place, not enter a mode.

**#014 — Sleep is a normal text checklist row.**
No special icon, no bedtime/wake-time fields. Just an item like "sleep by midnight."
**Why:** David decided the special sleep widget was unnecessary; a plain row is enough.

**#015 — Past days are fully editable** (checkboxes and journal). **Why:** this is a
checklist-and-notes app with accountability *flavor*, not a strict accountability app.

**#016 — Routine is a template; per-day completions are a snapshot.**
Renaming, deleting, or reordering routine items must **never** rewrite past days. A
deleted item still shows as done/missed on the days it existed. **Why:** history must
stay truthful. (Mechanism is a data-model detail — see `docs/data-model.md`.)

**#017 — Mid-day edits apply forward only.** Adding an item appears unchecked on today
but does **not** appear retroactively on past days.

### consistency chart

**#020 — GitHub-style heatmap shaded by % of checklist completed that day.**
Partial days are lighter; a fully-completed day is the darkest accent. **Why:** partial
credit is more honest and motivating than all-or-nothing.

**#021 — Vertical chart (option A: minimal).**
Weekday columns across the top, months down the left, newest week at the bottom. Lives
in the web sidebar; on mobile it's a section on Today. **Why:** vertical fits the narrow
sidebar; option A (minimal, even spacing) was chosen from a 3-way comparison.

**#022 — Missed/unopened day = 0% (blank cell); days before David started don't count.**

**#023 — No streak counter text and no legend key** on the chart. **Why:** keep it calm
and uncluttered; the chart speaks for itself.

### notes / journal

**#030 — One reverse-chron stream: every day has a journal (even empty) + freeform
notes created anytime.** Supersedes an earlier call to show "only days with content."
**Why:** David wants a journal to exist for every day; the date pill then reads as a
per-day heading.

**#031 — Journal entries: title is the literal word "journal," with the date shown.**
In the list, the date is a **neutral, boxy, filled day-number tile** (note option C). In
the editor, the date is a subtitle under the "journal" title.

**#032 — Freeform notes keep their own titles and have no date pill.** **Why:** the pill
is the journal's identity; notes are identified by their title.

**#033 — Editor is WYSIWYG rich text (Apple Notes / Day One style), via TipTap.**
No formatting toolbar; formatting uses native shortcuts (⌘B/⌘I). **Why:** David is happy
with the rich-text model Apple Notes/Day One use and isn't worried about lock-in.

**#034 — Notes support soft-delete (trash, recoverable ~30 days).** **Why:** accidental
deletion of a journal would hurt; cheap insurance.

### search

**#040 — Search is a ⌘K command palette: search + jump.**
Instant/as-you-type full-text over titles + bodies of journals and notes (and routine
item names). Ranked results with highlighted snippets; filters for all/journals/notes
and date range; can also jump to a date or create a note. Built on Postgres full-text
search + fuzzy matching — no paid search service. **Why:** David wanted search to feel
better than a plain box.

### photos

**#050 — V1 supports inline images in journal/notes.**
Paste or drag an image into the editor; multiple per entry; rendered inline; stored in
Supabase Storage. Reasonable per-image size cap. **Why:** photos are the thing most
likely to be missed coming from Day One.

### design / UI

**#060 — Font is Lato everywhere.** **Why:** David identified Lato as the Day One feel.

**#061 — Lowercase aesthetic by default** for headers and body text. **Why:** David's
stylistic preference (Day One-like).

**#062 — Lucide icon set.**

**#063 — Accent is blue (#3b6ef0) by default; fully themeable.**
Settings lets David change accent color + light/dark theme. Built on CSS variables from
day one. **Why:** themeability is cheap if designed in now, painful to retrofit.

**#064 — Web layout:** pinned **Today** tab + left sidebar (logo, today, notes, the
consistency chart, settings, user). ~700px reading column. **Mobile:** bottom nav with
**Today** and **Notes** only.

**#065 — No card/box chrome around the routine or the journal, and no dividing lines
between checklist items.** **Why:** David wants it clean and unboxed.

### auth

**#070 — Single user; username + password; persistent sessions.**
Sign in once per device and effectively never again (long-lived session). No public
sign-up. **Why:** it's just David; he never wants to re-authenticate.

**#071 — Auth via Supabase Auth.**

### tech stack

**#080 — Next.js (App Router) on Vercel.**
Considered and rejected a Vite SPA: Next.js's other strengths (DX, routing, API routes,
image optimization, first-class Vercel support) justify it, and the Capacitor concern is
resolved by #082. **Why:** it's a well-trodden, agent-friendly, Vercel-native choice.

**#081 — Supabase = Postgres + Auth + Storage.** One service covers the database,
persistent username/password auth, and photo storage. **Why:** least code for the two
otherwise-annoying pieces (durable auth + image storage).

**#082 — Capacitor-friendly, native later.**
Ship V1 as an installable PWA. To add native home-screen widgets + rich ("big banner")
notifications later, wrap the app in Capacitor with the native shell pointed at the live
Vercel URL. **Why:** pure PWAs cannot provide iOS home-screen widgets or rich
notifications; Capacitor reuses the exact same web app. Requiring a connection (#084)
makes the hosted-URL approach clean.

**#083 — Timezone is the device's local time.** A fixed "home timezone" setting is a
later nicety.

**#084 — Connection required; no offline mode in V1.**

**#085 — Backups: enable Supabase automatic backups; manual export is a later nicety.**
**Why:** data *loss* is a real risk even though David isn't worried about lock-in.

**#086 — Cost target ~$0/month** on free tiers. Optional later costs: a domain
(~$12/yr) and the Apple Developer Program ($99/yr), only if/when shipping the native
iOS widget.

### notifications

**#090 — No daily reminder in V1.**
David doesn't want a nagging daily reminder. His preference is a home-screen **widget**
and/or rich **big-banner** notifications, both deferred to the post-V1 Capacitor phase
(#082).

---

## 2026-06-11 — spec & data-model freeze

Resolved the open `⚠️ DECIDE` items; `docs/spec.md` and `docs/data-model.md` are now
**FROZEN** as the V1 contract.

**#100 — Notes stream shows every day (option a).**
The stream lists every day from today backward to first use; days with no journal show
`empty · tap to write`, newest first. **Why:** David wants every day represented, not
only days with content (refines #030).

**#101 — Editor has no formatting toolbar on any platform.**
Formatting is via keyboard shortcuts (desktop) and markdown-style input rules — which
also work on mobile (e.g. `# `, `- `, `**…**`) — so no toolbar is needed anywhere. V1
feature set: paragraphs, H1/H2, bold, italic, underline, strikethrough, bullet +
numbered lists, checklist, blockquote, link, inline image. Out: tables, code blocks,
text colors/fonts.

**#102 — Consistency chart shows a fixed ~3-month window.**
No scroll-back through full history; there is no full-history surface in V1 (#023).

---

## 2026-06-11 — notes slice (phase 1)

Settled while building the Notes stream + entry editor + photos (docs/phase-1.md
slice 2). These refine *implementation* of the FROZEN contract; they do not change
spec.md or data-model.md.

**#103 — Attachments bucket is a single public Storage bucket `attachments`.**
Migration `0002_storage.sql` creates one public bucket; objects are keyed
`{owner_type}/{owner_id}/{uuid}.{ext}`. Reads use the stable public URL embedded in
the TipTap doc; writes/updates/deletes are restricted to authenticated sessions via
RLS on `storage.objects`. **Why:** a public URL never expires, so stored content keeps
resolving (signed URLs would rot); it's a single-user app behind auth (#070) with
opaque randomized paths, so public read is an acceptable tradeoff and avoids a
URL-refresh layer. `uploadImage(sb, file, owner)` downscales >2000px images and caps
at ~10 MB client-side (#050).

**#104 — A `/notes/[id]` segment is a journal day iff it matches `YYYY-MM-DD`,
else a note id.** One dynamic route serves both entry kinds; the date format vs. a
uuid disambiguates with no collision. **Why:** journals are addressed by day (no row
need exist yet) and notes by id; encoding the day in the path keeps both shareable and
avoids a second route.

**#105 — The stream's "first use" (#100) is anchored on the earliest journal day or
note, defaulting to today.** Every calendar day from today back to that anchor renders
as a journal row (empty days show `empty · tap to write`), interleaved with notes by
`created_at`; within a day the journal leads, then that day's notes newest-first.
**Why:** journals + notes are the slice's data scope; routine-start is not consulted.
A `listJournals(sb)` read was added to the data-access layer (the journal surface only
had per-day `getJournal`) to fetch written days in one query.
