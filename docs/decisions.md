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

## 2026-06-11 — integration pass

Reconciling the parallel slices on `main` (functional walkthrough + polish).

**#106 — Canonical journal-day route is `/notes/[YYYY-MM-DD]`.**
The ⌘K palette (#040) and "jump to a date" open today's journal via `/` (it lives inline
on Today) and any other day's journal via `/notes/[YYYY-MM-DD]` — the route the notes
slice actually serves (#104). Freeform notes open at `/notes/[id]`. **Why:** the search
slice had initially routed past journals to `/notes?day=…`, which the notes page does not
read, so jumping to a past journal landed on the stream; search was aligned to the working
`/notes/[date]` route. Supersedes the conflicting routing note a parallel merge had also
labelled `#103` — the canonical `#103` is the attachments-bucket decision above.

**#107 — `<html>` carries `suppressHydrationWarning`.**
The pre-paint `ThemeScript` sets `--accent` / `data-theme` on `<html>` from localStorage
before React hydrates, which React flagged as a hydration mismatch (the lone dev-overlay
"issue"). Suppress it on `<html>` — the standard pattern for theme-before-paint scripts.
**Why:** the mismatch is intended and harmless; suppressing keeps the console clean.

**#108 — All public tables have RLS, locked to the `authenticated` role.**
Migration `0003_rls.sql` enables RLS on routine_item / completion / journal / note /
attachment / settings with a single `for all to authenticated using(true)` policy each;
`anon` gets nothing (storage.objects already had RLS from 0002). **Why:** the anon key
ships in the client bundle, so without RLS anyone could read/write the DB via Supabase's
REST API, bypassing the proxy auth gate — unacceptable for a private journal on a public
deploy. Verified: anon REST returns `[]`; the signed-in app reads + writes normally.

---

## 2026-06-11 — photos verified · manual export · desktop shell

Post-V1 follow-ups David asked for. Photos (#050) and #084 are unchanged; the two
new entries un-defer one nicety and add a platform.

**#109 — Manual data export ships now (un-defers half of #085).**
Settings → **data → "export my data"** downloads one JSON file with every row the
account owns (routine_items, completions, journals, notes, attachment metadata +
public URLs, settings) via `data/export.ts → exportAll`. Supabase's automatic
backups (dashboard) remain the *primary* mechanism for data-loss protection; this is
the off-Supabase, user-triggered complement. **Why:** #085 deferred manual export as
"a later nicety," but it's cheap, it's the part that lives in the repo (vs. a dashboard
toggle only David can flip), and a one-tap local copy is real insurance. Partially
supersedes #085's deferral of export; the "enable automatic backups in the dashboard"
half of #085 still stands as a manual step. Verified end-to-end in a browser (download
parses; bundle shape correct). The trashed-notes question: the export **includes**
soft-deleted notes (`deleted_at` set) so nothing recoverable is lost.

**#110 — Desktop app is an Electron hosted-URL shell (extends #082 to desktop).**
A self-contained `desktop/` package (its own `package.json` + `node_modules`, plain
CommonJS, outside the pnpm/eslint/Next surface) wraps the *running web app* in an
Electron `BrowserWindow` — dev loads `localhost:3000`, a packaged build loads the
Vercel production URL (overridable via `APP_URL`). Same strategy as the planned
Capacitor mobile shell (#082): no static export, no second codebase — `src/` stays the
single source of truth. External links open in the system browser; native mac window
chrome + menu. Built with `electron-builder` (`npm run dist` → `.dmg`, unsigned for
now — signing/notarization needs an Apple account, deferred per #086). **Why:** David
wants notes as a real desktop app; connection is required anyway (#084), so the
hosted-URL wrapper is the least-code, zero-drift option and mirrors the mobile plan.
Verified: the shell boots and loads the app (smoke test), and `electron-builder`
produces `notes.app`.

**#111 — Notes stream anchors on earliest *content*, not absolute first use (amends #100).**
The stream shows every calendar day from **today back to the earliest day that has a
journal or note** — empty days *within* that range still render as `empty · tap to write`
— but days before any content ever existed (e.g. routine-only days) do **not** appear.
This blesses the shipped behavior and the `#105` "first use = earliest journal/note"
interpretation, and supersedes the literal "every day back to first use" reading of
**#100** (option a). **Why:** David signed off on amending the spec to the shipped
behavior — anchoring on content avoids rendering a long tail of blank rows for days he
only ticked the routine and never wrote, while still surfacing every empty day once he's
started journaling. `docs/spec.md` updated to match (FROZEN-change via this entry +
sign-off). #030 (a journal conceptually exists for every day) is unchanged — it's about
the model, not which rows the stream paints.

**#112 — Desktop auto-update runs in "notify" mode until the app is signed (refines #110).**
`desktop/updater.js` checks GitHub Releases on launch via `electron-updater`. Because
macOS only *silently installs* updates for a code-signed app and this build is unsigned
(#086), the updater currently **notifies + opens the download page** rather than
self-applying; `npm run release` publishes the `.dmg`/`.zip`/`latest-mac.yml` feed it
reads. Flipping `SILENT_INSTALL = true` enables true background-download + restart-to-apply
the moment the app is signed + notarized. Also requires the release feed be **publicly
readable** (make Releases public, or publish to a dedicated public repo). **Why:** David
wants auto-update; this delivers the auto-*check* + one-click-to-update experience today
without code-signing, and is one switch away from fully silent once an Apple account
exists. Builds on #110.

**#113 — Mobile app is a Capacitor hosted-URL shell (realizes #082).**
A self-contained `mobile/` package (own `package.json` + `node_modules`, `npm` not pnpm,
outside the Next lint/build surface) wraps the *running web app* in a Capacitor
iOS/Android WebView via `server.url` — same hosted-URL strategy as the desktop Electron
shell (#110) and exactly what #082 always planned. Scaffolded now: config (→ production
URL), deps (`@capacitor/{core,cli,ios,android}`), a fallback `www/`, and the runbook.
**Not** generated yet: the native `ios/`/`android/` projects (git-ignored for now) — that
needs full **Xcode** / **Android Studio** + an **Apple Developer account** ($99/yr, #086),
none installed in the build env. The actual payoff features — a **home-screen widget**
(WidgetKit/Swift) and **rich notifications** (APNs/FCM) — are further native work and stay
deferred (#082/#090; V1 has no reminder by design). **Why:** establishes the mobile
foundation with the same zero-drift approach as desktop, so the remaining work is native
toolchain + extensions, not architecture. Connection is required anyway (#084), which
keeps the hosted-URL approach clean. Builds on #082, mirrors #110.

**#114 — Export bundles the actual photo files (refines #109).**
The export downloads a **`.zip`** (JSON dump + every original image under
`images/<storage_path>`) when any attachment exists, and a plain `.json` otherwise.
Built with a tiny dependency-free store-only zip writer (`src/lib/zip.ts`). **Why:**
Supabase's automatic DB backups explicitly **exclude Storage objects** (confirmed on the
dashboard), so without this the image *bytes* had no off-Supabase copy — the JSON only
held their URLs. Now one tap yields a complete, self-contained backup. Verified
end-to-end (zip opens, integrity check passes, contains the JSON + the image). Builds on
#109; #085's note that DB backups omit photos is the motivation.

**#115 — Post-V1 feature scope calls (David, triage of the deferred backlog).**
David pruned the post-V1 list to protect the app's simplicity (#002, #003):
- **Browse-by-date** — *maybe*, kept as the one live candidate (jump to any past day).
- **"On this day"** — dropped.
- **Mood / mood scale** — **out.** (New non-goal; sits alongside #003.)
- **Weekly / non-daily routine items** — **out** (clutter); reaffirms #010 + #003.
- **End-of-day summary** — only of interest as a **notification**, so it rides on the
  post-Capacitor rich-notifications work (#082/#090), not as an in-app screen.
- **Timezone** — **device-local confirmed** (#011/#083 stand); a fixed home timezone is dropped.
- **Offline mode** — **out** (not important); reaffirms #084.
- **Custom domain** — **out** (don't care); reaffirms #086's "optional."
**Why:** keep scope tight and the daily experience uncluttered. Recorded here per rule #5;
the FROZEN `product.md` non-goals already cover most of these and can absorb mood/weekly
later if desired.

**#116 — Browse-by-date is just date-aware search — no calendar (resolves #115's "maybe").**
There is **no** calendar/date-picker UI. Instead, typing a date into the **Notes search
box** ("june 3", "jun 3", "6/3", "2026-06-03") surfaces that day's journal at the top of
the list, linking to `/notes/[YYYY-MM-DD]` — even for an empty day or one older than first
use (so it isn't otherwise in the stream). Reuses the palette's `parseDate` (#040).
**Why:** David wanted browsing to stay simple and live inside the existing search, not a
new screen — "if you search june 3 you should just find it." Resolves the browse-by-date
candidate from #115 (no calendar) and refines search #040; consistent with no full-history
surface (#102) and the calm/minimal product (#002). Verified end-to-end.

**#117 — App icon is the folded-page mark ("C2").**
A white folded-corner page (squarer paper, a large dog-ear, a soft drop shadow) on the
accent (#3b6ef0) field. One source mark rendered to every surface: a **squircle**
(transparent corners) for the macOS desktop app (`desktop/build/icon.png`) and the
favicon; a **full-bleed** accent square (page within the maskable safe zone) for the PWA
(`public/icon-{192,512}.png`, `icon-maskable-512.png`) and `apple-touch-icon.png`.
**Why:** David chose the folded-page direction over the "n" monogram and picked the
squarer/bigger-fold/shadow combo; one mark across desktop + web keeps the brand
consistent. Regenerable from `.context/generate_icon.py` (swap the geometry + re-run).

**#118 — Desktop app is signed, notarized & released; silent auto-update is live (closes #112's caveat).**
The macOS app now ships **code-signed with a Developer ID + notarized**, published as
**v0.1.0** to GitHub Releases via the wired config/Action (`docs/ship-desktop-and-ios.md`).
`SILENT_INSTALL` is now `true` (#112) — updates download and self-install. **Why:** David's
assistant completed the signing runbook end-to-end; this closes the "unsigned / notify-only"
caveat from #110/#112. Two accepted nuances: (1) the **`.dmg` container is not stapled** —
only the `.app` inside is notarized + stapled; that's the normal electron-builder result and
Gatekeeper still approves (verify with `stapler validate` on the **`.app`**, not the dmg);
(2) iOS (#113) is verified in the **simulator** only — not yet on TestFlight/App Store, which
stays optional/deferred (David is fine either way).

**#119 — Home-screen widget + daily notifications design (the #082/#090 native payoff).**
Full design in `docs/widget-and-notifications.md`. The settled calls:
- **Widget (small first):** a progress **ring** + "**X/N left today**" + today's **focus**
  item; when the day is complete it flips to an "all done ✓ + quote" state. Medium/large
  are deferred.
- **"Focus" = weakest habit:** the active routine item with the **lowest completion rate
  over the last ~30 days** — always surfaces what David's been avoiding (his core ask).
- **Live data (not a snapshot):** the widget is a native **WidgetKit** extension that
  queries Supabase directly. The app shares its signed-in session to the widget via an
  iOS **App Group**; a Postgres function `widget_summary` returns {done, total, focus} in
  one call. The app calls `reloadAllTimelines()` on change (instant in-app), and the
  widget self-refreshes on its iOS timeline when the app is closed (~minutes of lag).
- **Tap-to-open** Today for v1; interactive check-off-from-widget (iOS 17+) is a
  fast-follow.
- **Notifications:** exactly **two/day**, **local** (on-device, no server), **8am + 9pm**,
  times **configurable** in Settings. Morning = "journal + start your day"; evening =
  "journal + you've still got N left (focus)"; all-done evening = "all done today.
  journal?". Scheduled best-effort and **rescheduled on app open/background** so counts
  stay current without a server (accepts minor staleness; a push server is a later option).
- **Quotes:** a small **built-in curated set**, **deterministic daily rotation**, offline;
  headlines the all-done widget state.
**Why:** realizes the widget + rich-notification payoff #082/#090 always pointed to, built
around David's "show me what I've been slipping on" goal while staying calm and $0.
**Supersedes #090's "no daily reminder"** for the post-V1 native phase (V1 had none by
design; #090 explicitly deferred reminders to here) — these two gentle, configurable
reminders are opt-in and minimal, consistent with #002/#003's anti-nag intent.

**#120 — Enter on any routine row opens a new row (refines #013).**
Pressing **Enter** while editing a routine item — whether renaming an existing row or in
the `+` add row — commits it and opens a fresh empty row at the bottom, focused, to type
the next item. Empty Enter is a no-op; Escape cancels. **Why:** "cursor at the end of a
line → Enter → new line" is the intuitive list-editor behavior David expected. Previously
Enter only chain-added in the dedicated `+` flow; renaming an existing row just committed
and exited, so editing-then-Enter did nothing — the reported bug. New rows always append at
the bottom (consistent with `+` and the forward-only add model #017), not inserted mid-list.
Verified end-to-end. `docs/spec.md` §3 updated (FROZEN change via this entry + David's ask).

**#121 — Second triage of the optional backlog (David).**
Of the not-yet-built optional items, David **keeps interest** in: **lock-screen widget**,
**TestFlight/App Store** distribution, a **push server for exact-time notification counts**
(replacing today's best-effort reschedule, #119), and a **richer end-of-day summary**
(beyond the current "N left" evening notif). **Declined:** interactive widget check-off,
**medium/large** home-screen widgets, and **Android**. **Why:** focus future effort on the
few things David actually wants; keep scope tight (#002/#003). Adds to the firm declines in
#115. None are scheduled yet — this just prunes the candidate list. *(Separately,
**song-of-the-day** — a per-day logged song, #119-adjacent — is in design; placement TBD.)*

**#122 — Today screen loads via one `today_summary` RPC + a shared cache (latency).**
The Today screen used to fire ~5 separate browser→Supabase selects (routine, completions,
journal, + the chart's 2), and the consistency chart fetched **twice** (it mounts in both
the sidebar and the CSS-hidden mobile section), all *after* hydrate — plus a full refetch on
every navigation. Now: a `today_summary(p_from, p_to)` Postgres function (migration 0005)
returns the routine template + completions-in-window + today's journal in **one** call; a
short-lived (30s) in-memory promise cache (`data/today.ts`) **de-dupes** the routine/journal/
chart mounts into a single request and makes back-navigation instant; writes call
`invalidateTodaySummary()`. TipTap is now **lazy-loaded** (`next/dynamic`) so it's off the
initial Today bundle. **Why:** the latency David asked to reduce was mostly N serial round-
trips to us-east-1 + refetch-on-nav. Verified: Today dropped from ~26 mixed calls (dev) to
**1 RPC / 0 legacy selects** (prod; 2 in dev StrictMode), routine/journal/chart all render
from the one payload, nav reuses cache. `getTodaySummary` **falls back** to plain selects if
the RPC is unreachable, so a Vercel deploy that lands before `supabase db push` (the cloud
migration, which needs the DB password) degrades gracefully instead of breaking.

**#123 — Song of the day: one logged song per day, atop the journal.**
David logs one song per day. UI: a calm horizontal **bar at the top of the daily journal**
(both Today's journal section and the `/notes/[date]` entry, placement "A" from the
mockups) — empty state invites "add today's song", paste a **Spotify/Apple Music link**,
and it shows the **cover art + title (+ artist)**, tappable to open the track. It also
appears as a `♪ title — artist` line on the Notes-stream day row. Data: a new `daily_song`
table (day PK, url, title, artist, art_url) — migration 0006, RLS like 0003 (#108). Metadata
is fetched **server-side** by `/api/song` (host-allowlisted to Spotify/Apple to avoid SSRF),
scraping OpenGraph `title`/`image` + parsing artist — no music-API auth, no browser CORS.
**Why:** the Day-One-style "soundtrack to your day" David wanted; link-paste keeps it
zero-friction and provider-agnostic; server-side OG scraping gets art reliably.
**Notes:** (1) a song shows on the **stream** only for days already in range (today back to
earliest journal/note, #111) — a song alone doesn't extend the range; revisit if David wants
song-only days to appear. (2) Like the RPC (#122), reads tolerate a missing `daily_song`
table so a deploy before the cloud migration degrades gracefully. `daily_song` added to the
data export (#109/#114) and to the FROZEN `docs/data-model.md` via this entry + David's ask.
Verified end-to-end (add → OG fetch title/artist/art → persist → stream line).

**#124 — A logged song anchors the Notes stream too (refines #111/#123).**
A `daily_song` now counts as day "content" for the stream range: the stream runs from today
back to the earliest of {earliest journal, earliest note, **earliest song**}, so a day with
only a song (no journal/note) still renders as a row (empty journal + the `♪` line). **Why:**
David logs a song every day but doesn't journal every day — without this, song-only days
wouldn't appear in the stream (the open question flagged in #123). Updates #123's note and
extends the #111 anchor. `docs/spec.md` §6 updated.

**#125 — Song input is inline Spotify search, not link-pasting (replaces #123's input).**
Pasting a Spotify/Apple Music link was too much friction (David). The song bar now opens an
inline **search box → tap a Spotify result** (with album art) — `/api/song/search` calls
Spotify's search with an app-level **Client Credentials** token (server-side; the Client
Secret never reaches the browser, and David never logs into Spotify). The picked track's
name/artist/cover fill `daily_song` (same schema). The old OG-scraping `/api/song` paste
route is removed. Creds (`SPOTIFY_CLIENT_ID`/`SECRET`) live in Vercel env + `.env.local`
(never committed). **Why:** search-and-tap is the low-friction flow David wanted; Client
Credentials avoids any OAuth/login for plain search. Verified end-to-end (query → 8 results
w/ art → pick → save → persist). **B (pull from your Spotify listening, OAuth)** is the
next build — needs the redirect URI + a one-time login.

**#126 — Song of the day can pull from your Spotify listening (OAuth).**
Beyond search (#125), the picker has a **"from your spotify"** option: it lists your
**currently-playing + recently-played** tracks to tap. Implemented with Spotify
**Authorization Code OAuth** — `/api/spotify/login` (CSRF `state` cookie) → consent →
`/api/spotify/callback` (exchanges code, stores tokens in `spotify_auth`, one row) →
`/api/spotify/recent` (refreshes the token if expired, returns recently-played +
now-playing). Scopes: `user-read-recently-played`, `user-read-currently-playing`. Tokens
are **server-side only** (never sent to the browser); `spotify_auth` is migration 0007,
RLS `authenticated` (#108). Redirect URIs: the prod Vercel URL + `http://127.0.0.1:3000`
(loopback, per Spotify's http rule) — set in the Spotify app + `SPOTIFY_REDIRECT_URI` env.
**Why:** near-zero daily friction — David sees what he actually listened to and taps it.
Needs a **one-time "connect" consent**; after that it just works. Verified: login redirect
+ not-connected state + UI; the consent round-trip is David's one click. `data-model.md`
updated (spotify_auth).

**#120 — Widget session bridge: App Group via Preferences; app owns tokens, widget fetches live.**
The WidgetKit extension can't read the WebView's session, so the web app (only when running
in the native shell) writes one JSON blob to a shared **App Group**
(`group.health.framewise.notes`) via `@capacitor/preferences` (`configure({group})`):
`{accessToken, expiresAt, supabaseUrl, anonKey, today's quote, cached done/total/focus}`.
The widget reads `_capacitor_widget.payload` from that suite (Capacitor prefixes keys with
`_capacitor_`), fetches `widget_summary` **live** while the access token is valid, and
renders the **cached** values otherwise. **The app is the sole token manager** — it
refreshes on open and rewrites the blob; the widget **never** refreshes (avoids
refresh-token rotation fighting). Updates ride WidgetKit's ~30-min timeline (an instant
in-app `reloadAllTimelines()` would need a tiny custom native plugin — deferred). **Why:**
delivers "live" (#119) with the least native surface — no custom plugin, one key — and
degrades gracefully when the token's expired/offline. The web bridge is fully **inert on
web/desktop** (guarded on the native global; nothing imported there). The Next app gains
`@capacitor/core` + `@capacitor/preferences` deps for this (loaded only in the native shell).
Wiring runbook: `docs/widget-phase2-runbook.md`.

**#127 — Song plays in-app via Spotify's inline embed, not an external tab (refines #123).**
The song bar's green play button used to be an `<a href={song.url} target="_blank">` that
bounced out to `open.spotify.com` (a new Chrome tab). It now toggles **Spotify's sanctioned
inline embed player** (`https://open.spotify.com/embed/track/{id}`) rendered right under the
song bar — playback stays inside the app. The iframe is **lazy-mounted only on the first
play tap** (kept off the initial render so the Today/notes screens stay light) and unmounts
on collapse (which stops audio). The track id is derived from the stored `daily_song.url`
(no schema change); the album-art/title still links out to Spotify as a guaranteed
full-track fallback, and a non-track/non-Spotify url falls back to the old open-in-tab
button. **Why:** David wanted to hear the song without leaving the app. We use the **static
embed** (not the iFrame API + a custom button) because it's the most reliable for real
full-track playback and is honest about the preview fallback — a custom minimalist button
that silently played a 30s clip would read as broken. **Caveat (hard Spotify limit, not ours
to fix):** the embed only plays the **full track** when the viewer has a logged-in Spotify
**Premium** session in that browser; otherwise it plays a **30-second preview**. In practice
that means full playback on David's web browser (if logged into Spotify there) and
**preview-only in the iOS Capacitor WebView and the Electron desktop shell** (no Spotify
session cookie). The compliant full-playback path would be the Web Playback SDK, which itself
requires a Premium OAuth login + active session — deferred as not worth the surface. Only the
**song bar** got the inline player; the Notes-stream `♪` line stays a quiet marker (#124) to
keep the stream calm/scannable. No API key needed (embeds are unauthenticated); no CSP change
needed (the app sets none). `docs/spec.md` §2 + `docs/handoff.md` §9 updated.
