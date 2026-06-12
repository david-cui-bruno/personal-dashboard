> **living** — start-here orientation + runbooks for anyone (human or agent) picking
> this up. Points to the contract docs; doesn't duplicate them. If something here
> disagrees with a FROZEN doc, the FROZEN doc wins (and fix this).

# handoff

## 0. TL;DR

**notes** is a private, single-user daily-routine + journal app for David — the Day One
feel (Lato, lowercase, calm) with a simpler model: a **Today** screen (routine checklist +
today's journal + song of the day) and a **Notes** stream (every day's journal + freeform
notes), with a consistency heatmap for accountability. **It is shipped and live on web,
desktop (macOS), and iOS.**

- **Live (web):** https://notes-framewise-health.vercel.app · login `david` / *(password set
  at deploy; rotate in Settings — not stored in the repo)*.
- **Desktop:** signed + notarized macOS `.dmg` on GitHub Releases (v0.1.0), silent
  auto-update. **iOS:** native app on David's device with a home-screen widget + daily
  notifications.
- **Trunk:** `main` — what's deployed. Build is green; auth + RLS verified. Cloud DB
  migrations `0001–0007` are all pushed (Local == Remote).
- **Read first:** `docs/product.md` (why) → `docs/spec.md` (what, FROZEN) →
  `docs/data-model.md` (schema, FROZEN) → this file (how to run/ship). Full "why" log:
  `docs/decisions.md` (#001–#127).
- **One thing still pending on David:** connect Spotify once (web/iOS) to enable "song of
  the day → from your listening" (§9). Everything else is done.

## 1. Infra & accounts

| Thing | Value |
|---|---|
| Live URL | https://notes-framewise-health.vercel.app |
| Vercel project | `framewise-health/notes` (`prj_P6FDDVBwm4Wsc2iiVFxWoED2iP8B`, team `team_8MuYqSwnO080hLkp2Je4plbK`) |
| Supabase cloud | project `notes`, ref `vrwzxkxdxusbfdilxbrl`, region **us-east-1**, org **Framewise Health** |
| Cloud API | `https://vrwzxkxdxusbfdilxbrl.supabase.co` |
| Spotify app | for song-of-the-day search + OAuth; Client ID `8067c011…`, secret in env (§9) |
| App login (prod) | `david` (→ `david@notes.local`); password set at deploy — reset in Settings |
| Local dev login | `david` / `notesdev` (local only, harmless) |
| Desktop releases | GitHub Releases on `david-cui-bruno/personal-dashboard` (public repo) |

**Env vars (none committed):**
- **Vercel project env (prod):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`,
  `SPOTIFY_REDIRECT_URI` (= `https://notes-framewise-health.vercel.app/api/spotify/callback`).
- **Local `.env.local`** (gitignored, auto-copied into every Conductor workspace): local
  Supabase URL + well-known dev keys + the same `SPOTIFY_*` (redirect uri =
  `http://127.0.0.1:3000/api/spotify/callback`).
- Cloud DB password → Supabase dashboard. More operational detail in the `deployment` memory.

## 2. Stack

Next.js 16 (App Router) + React 19 · Tailwind 4 (`@theme` in `globals.css`) · TypeScript ·
Supabase (Postgres + Auth + Storage + RPCs) · TipTap (rich text, lazy-loaded) · Lucide ·
Lato · PWA. Plus two thin **hosted-URL native shells** that load the same web app:
**Electron** desktop (`desktop/`) and **Capacitor** iOS (`mobile/`). Rationale:
`docs/architecture.md` + decisions #080–#086, #110, #113.

## 3. Feature map (the product surface)

- **Today (`/`)** — date title · **daily routine** (inline add/rename/reorder/check; Enter
  on any row opens a new one, #120) · **song of the day** (§9) · **today's journal** (inline
  TipTap, autosave) · consistency chart (mobile). One `today_summary` RPC loads it all (§11).
- **Notes (`/notes`, `/notes/[id|YYYY-MM-DD]`)** — reverse-chron stream of every day's
  journal + freeform notes back to the earliest journal/note/**song** (#111/#124); per-entry
  editor with inline **photos** (#050); a song day shows a `♪ title — artist` line. In-list
  search also **jumps to a date** (type "june 3", #116).
- **Search (⌘K)** — full-text over journals/notes + jump-to-date / new note (#040).
- **Settings (`/settings`)** — appearance (accent/theme/font, #063) · **data → export**
  (JSON, + a `.zip` with photo files when present, #109/#114) · **notifications**
  (native-only: 8am/9pm toggle + times, #119).
- **Consistency heatmap** — fixed ~3-month window, shaded by % done (#020/#102).
- **Desktop app** — the web app in an Electron window (§7).
- **iOS app** — the web app in a Capacitor WebView + a native **home-screen widget**
  (ring + "X/N left" + weakest-habit focus + quote) and **2 daily notifications** (§8).

## 4. Repo map

```
AGENTS.md / CLAUDE.md      the 5 anti-drift rules + doc index (read first)
docs/
  product / spec / data-model   FROZEN: goal / behavior / schema
  architecture / design         living: stack+deploy / tokens+screens
  decisions.md                  append-only "why" log (#001–#127)
  roadmap.md / phase-1.md       status + parallel-slice briefs
  widget-and-notifications.md   the iOS widget + notifications design (#119)
  ship-desktop-and-ios.md       signing/notarize/release + iOS Xcode runbook
  notifications-phase3-runbook.md   iOS notifications wiring
  handoff.md                    this file
mockups/index.html         interactive visual reference
supabase/migrations/       0001_init · 0002_storage · 0003_rls · 0004_widget_summary
                           · 0005_today_summary · 0006_daily_song · 0007_spotify_auth
desktop/                   Electron shell (#110) — self-contained, npm not pnpm.
                           main.js (hosted-URL window) · updater.js (auto-update, #112)
                           · build/{icon.png, entitlements.mac.plist} · README.md
mobile/                    Capacitor iOS shell (#113) — self-contained, npm not pnpm.
                           capacitor.config.json · www/ fallback · README.md
                           (generated ios/ is git-ignored)
.github/workflows/         desktop-release.yml (tag desktop-v* → build/sign/notarize/publish)
src/
  proxy.ts                 auth gate (Next 16 renamed middleware→proxy); PWA assets excluded
  lib/supabase/            client.ts (browser) · server.ts (route handlers) · middleware.ts
  lib/data/                THE DATA-ACCESS LAYER (the seam, docs/data-model.md). UI calls
                           these only — never hits tables directly:
                           routine · consistency · journal · notes · settings · search
                           · attachments · export · today (today_summary RPC + cache)
                           · song (daily_song) · widget (widget_summary RPC) · types
  lib/native/              native-shell glue (runs only in Capacitor): index.ts (initNative)
                           · widget-bridge.ts (App Group payload) · notifications.ts (local)
  lib/notif-prefs.ts       device-local notification prefs
  lib/quotes.ts            curated daily quote (widget all-done state, #119)
  lib/zip.ts               dependency-free store-zip (export with photos, #114)
  lib/database.types.ts    generated DB types (regen caveat in §12)
  lib/date.ts              local-day helpers (today/eachDay/daysBefore)
  app/(app)/               shell + / (today) · /notes · /notes/[id] · /settings
  app/sign-in/             outside the shell
  app/api/song/search/     Spotify search (Client Credentials, #125)
  app/api/spotify/         login · callback · recent (OAuth "from your listening", #126)
  components/
    app-frame · consistency-chart · editor (TipTap) · theme-script · native-bridge
    song-of-day.tsx        the song bar (search + "from your spotify")
    ui/ today/ notes/ settings/ search/   per-slice UIs
public/                    manifest.webmanifest, icons (folded-page mark #117), sw.js
```

## 5. Data model & the load-bearing rules

**8 tables** + **2 RPCs** + 1 storage bucket — full schema in `docs/data-model.md` (FROZEN):
`routine_item`, `completion`, `journal`, `note`, `attachment`, `settings`, `daily_song`
(#123), `spotify_auth` (#126); RPCs `widget_summary` (#119) + `today_summary` (#122);
Storage bucket `attachments` (public, #103). Rules that must not break:

- **History integrity (#016):** the routine is a *template*; a day's checklist = items
  **active that day** (`created_on ≤ day AND (archived_on IS NULL OR archived_on > day)`).
  Editing/deleting items must never rewrite past days. "Delete" = set `archived_on`.
- **Consistency (#020/#022):** per-day % = completions ÷ active-items-that-day; a day with
  items but no completions = 0%; days before any item existed don't count.
- **RLS (#108):** every table is locked to the `authenticated` role; the anon key is inert
  without a login. Both RPCs are `security invoker` (RLS applies) + granted to authenticated
  only. Don't disable this on a public deploy. Spotify tokens (`spotify_auth`) are
  server-read only — never sent to the browser.

## 6. Local dev runbook

Prereqs: Docker Desktop, Supabase CLI, pnpm, Node.

1. `supabase start` — boots Postgres/Auth/Storage in Docker. **Ports remapped to 544xx**
   (api 54421, db 54422, studio 54423) in `supabase/config.toml`. First run pulls images.
2. `.env.local` already points at local + is auto-copied into every workspace. If missing,
   derive from `supabase status -o env` (and add the `SPOTIFY_*` vars, §9).
3. `pnpm dev` (port floats: 3000, else 3001… — check the log's `Local:` line).
4. Sign in `david` / `notesdev`. Migrations apply on `supabase start`; `supabase db reset`
   re-applies from scratch (wipes local data).
5. After a schema change, regenerate types — but **verify the output** (§12 gotcha):
   `supabase gen types typescript --local > src/lib/database.types.ts`.

**Shared local DB:** the local Postgres is **shared across all Conductor workspaces** — never
run conflicting migrations in parallel, and make browser tests **self-restoring** (round-trip
toggles, delete rows you create). Browser verification uses **Python Playwright** — see the
`browser-verification` memory.

## 7. Desktop app (Electron, #110/#112/#118)

`desktop/` is **self-contained** — use **`npm`, not `pnpm`**; it's outside the Next
lint/build surface. A hosted-URL wrapper (window → the running web app).

```bash
# dev: terminal 1 → pnpm dev ; terminal 2:
cd desktop && npm install
npm start          # window → http://localhost:3000
npm run smoke      # boots, prints "[smoke] loaded … ok", quits
npm run dist       # signed+notarized .dmg (needs APPLE_* env, see runbook)
```

URL precedence: `APP_URL` env → `localhost:3000` (unpackaged) → Vercel prod (packaged).
Builds are **signed + notarized** (Developer ID) and on **GitHub Releases** (v0.1.0).
**Cut a release:** `git tag desktop-v0.x.y && git push origin desktop-v0.x.y` → the
`desktop-release` Action signs/notarizes/publishes (repo secrets `MAC_CSC_*`, `APPLE_*`).
**Auto-update (#112):** `updater.js`, `SILENT_INSTALL = true` → background download +
restart-to-apply. Full runbook: `docs/ship-desktop-and-ios.md`; quick ref `desktop/README.md`.

## 8. iOS app (Capacitor, #113) + widget + notifications (#119)

`mobile/` is **self-contained** (`npm`), hosted-URL WebView → the live site. The native
project is generated locally and **git-ignored**:
`cd mobile && npm install && npm run add:ios && npm run sync && npm run open:ios` (needs
Xcode + an Apple account). Runbook: `docs/ship-desktop-and-ios.md`.

- **Home-screen widget** — native WidgetKit; shows a progress ring, "X/N left today", the
  **weakest-habit** focus (lowest 30-day completion), and an all-done quote. It fetches
  **live** via the `widget_summary` RPC using the session shared from the app through an
  **App Group** (`src/lib/native/widget-bridge.ts`).
- **Notifications** — two/day, local (no server), 8am + 9pm, times configurable in Settings →
  notifications (native-only section). Rescheduled on launch/auth/foreground so the evening
  "N left" stays current (`src/lib/native/notifications.ts`). Design:
  `docs/widget-and-notifications.md`; wiring: `docs/notifications-phase3-runbook.md`.

## 9. Song of the day + Spotify (#123–#127)

One logged song per day, shown atop the daily journal + as a `♪` line on the Notes stream.
Two ways to set it (no link-pasting):

- **Search (#125):** type → tap a Spotify result (album art). `/api/song/search` uses an
  app-level **Client Credentials** token (no user login; secret stays server-side).
- **"from your spotify" (#126):** lists your recently-played / now-playing to tap. Spotify
  **OAuth** (`/api/spotify/{login,callback,recent}`); tokens stored in `spotify_auth`
  (server-only). **Requires a one-time "connect" consent.**

**Playback (#127):** the green play button reveals **Spotify's inline embed player**
(`open.spotify.com/embed/track/{id}`, lazy-mounted only on tap) right under the song bar —
playback stays in-app instead of opening a browser tab. The track id is derived from the
stored `daily_song.url` (no schema change); the art/title still links out as a full-track
fallback. **Hard Spotify limit:** the embed plays the **full track** only with a logged-in
Spotify **Premium** session in that browser — otherwise a **30s preview**. So full on web (if
signed into Spotify there), **preview-only in the iOS WebView + Electron shell** (no Spotify
cookie). No API key / CSP change needed (embeds are unauthenticated; the app sets no CSP).

**Setup that's already done:** a Spotify app exists; `SPOTIFY_CLIENT_ID/SECRET/REDIRECT_URI`
are in Vercel env + `.env.local`; redirect URIs registered for both prod + `127.0.0.1:3000`.

**⚠️ Pending + caveats:**
- David must **connect once** (open the live app → a journal day → add today's song → "from
  your spotify" → approve). This is also the only flow not yet end-to-end verified (it needs
  a real Spotify login). If it returns `?spotify=error`, suspect a redirect-URI mismatch.
- **Do the connect on web or iOS, not the desktop app** — the Electron shell opens off-site
  links (Spotify's consent page) in the system browser, which breaks the round-trip. The
  token is stored server-side, so connecting once anywhere enables it everywhere.
- The Spotify **Client Secret was shared in chat**; it lives only in env now. Rotate in the
  Spotify dashboard + update the env vars if you ever want to be safe.

## 10. Deploy runbook

The app talks to Supabase over HTTPS, so deploy = push migrations to cloud, ensure Vercel
env, deploy.

```bash
supabase db push --linked </dev/null    # applies pending migrations to cloud (see §12)
vercel --prod                            # deploy (Vercel has the env vars)
```

- **Migrations + the app are decoupled by design:** new data code (`today_summary`,
  `daily_song`, `spotify_auth`, the export) **falls back / tolerates a missing table or RPC**,
  so a Vercel deploy that lands before `db push` degrades gracefully instead of breaking. Push
  the migration to flip the feature fully on — **no redeploy needed** (the running app detects
  the new RPC/table).
- **Vercel 401 on every route** = the Framewise Health team's **Deployment Protection**. It
  was disabled for this project via API (`PATCH /v9/projects/<id>` `ssoProtection:null`). If a
  redeploy 401s site-wide, it got re-enabled.

First-deploy steps + IDs are in the `deployment` memory.

## 11. Performance (#122)

The Today screen loads via **one `today_summary(p_from, p_to)` RPC** (routine + completions +
journal + chart data) instead of ~5 separate selects, behind a **30s in-memory promise cache**
(`src/lib/data/today.ts`) that de-dupes the routine/journal/chart mounts and makes
back-navigation instant; writes call `invalidateTodaySummary()`. TipTap is **lazy-loaded** off
the initial bundle. Measured: Today dropped from ~26 mixed calls → 1 RPC / 0 legacy selects.

## 12. Operational gotchas (hit during this work — save yourself the time)

- **Xcode license breaks `git` & CLI tools.** After Xcode was installed, `xcode-select` points
  at it; until the license is accepted, anything routed through `xcrun` (incl. `/usr/bin/git`,
  `gh`, `codesign`) fails with *"You have not agreed to the Xcode license."* Fix: run
  `sudo xcodebuild -license accept` once. Without sudo, prefix commands with
  `DEVELOPER_DIR=/Library/Developer/CommandLineTools` (CLT has an accepted license).
- **`supabase db push --linked </dev/null` JUST WORKS** — non-interactive, **no DB password
  prompt** (project is linked + CLI authed; the `[Y/n]` defaults to yes on EOF). An agent can
  push cloud migrations itself. `supabase migration list --linked` shows Local vs Remote. (The
  old IPv6/`aws-1` pooler note only matters for a raw `--db-url` connection.)
- **`supabase gen types --local` can be flaky** — it sometimes connects to `:5432` instead of
  the remapped `:54422` and writes an **empty** file (which `>` then commits). **Always check
  the output is non-empty before committing.** Reliable fallback: `git checkout HEAD --
  src/lib/database.types.ts` to restore, then hand-add the new table's `Row/Insert/Update`
  (the format is simple, mirror an existing table).
- **Shared local Supabase** across all Conductor workspaces — self-restoring tests only.
- **Deleting a Storage object** can't be done via psql (a `storage.protect_delete()` trigger
  blocks it); use the Storage API. See the `browser-verification` memory.

## 13. Known issues / watch-list

- **Photos (#050):** verified end-to-end; works in both the Today journal and the `/notes/…`
  editor. Image bytes are **not** in Supabase DB backups (those exclude Storage) — the
  **export `.zip`** (#114) is the off-Supabase copy.
- **Backups (#085):** Supabase **daily DB backups confirmed running** (Pro plan, automatic).
- **Song-of-day OAuth not yet exercised live** (needs David's one-time connect, §9).
- **OAuth doesn't complete inside the Electron desktop shell** (external-link handling) —
  connect via web/iOS (§9).
- **Cost (#086):** lives in a *paid* Framewise Health **work** org (~$10/mo) — data-governance
  oddity for a personal journal; the agreed cleanup is to move it to a personal project.
- **Optimistic routine add** uses temp ids reconciled on server return; acting on a
  just-added row within ~100ms could error (edge, self-heals on reload).
- **Hydration:** `<html suppressHydrationWarning>` is intentional (theme script runs pre-paint);
  a couple of components disable `react-hooks/set-state-in-effect` for deliberate post-mount
  client reads.

## 14. What's next (all optional — `docs/roadmap.md`)

The post-V1 roadmap is **essentially complete**. Remaining is opt-in:
- **One action for David:** connect Spotify once (§9).
- **Parked, David is interested (#121):** lock-screen widget · TestFlight/App Store ·
  push server for exact-time notification counts · richer end-of-day summary.
- **Agreed cleanup:** move the Supabase project off the Framewise Health work org (#086).
- **Declined (#115/#121):** mood · "on this day" · weekly/non-daily items · fixed
  home-timezone · offline mode · custom domain · interactive widget check-off · medium/large
  widgets · Android.

## 15. Verifying a change

`pnpm build` + `pnpm lint` (type-checks + lints everything; `desktop/` and `mobile/` are
ignored). For behavior, drive the real app with **Python Playwright** (sign in
`david`/`notesdev`, exercise the slice, watch console errors) — pattern in the
`browser-verification` memory. Keep tests self-restoring against the shared local DB. The
"why" behind any decision is in `docs/decisions.md`; if code and a FROZEN doc disagree, the
FROZEN doc wins (fix the code, or amend via a new decision + David's sign-off).
