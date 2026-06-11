> **living** — start-here orientation + runbooks for anyone (human or agent) picking
> this up. Points to the contract docs; doesn't duplicate them. If something here
> disagrees with a FROZEN doc, the FROZEN doc wins (and fix this).

# handoff

## 0. TL;DR

**notes** is a private, single-user daily-routine + journal app for David — Day One feel
(Lato, lowercase, calm), simpler model. **V1 is shipped and live.**

- **Live:** https://notes-framewise-health.vercel.app · login `david` / *(password set at
  deploy — rotate in Settings; the value is not stored in the repo).*
- **Latest state:** V1 built by parallel Conductor agents → integrated → RLS-hardened →
  deployed; since then: iOS-PWA standalone fix, UI polish (grays, sticky sidebar,
  horizontal mobile chart, routine spacing + smooth Enter-to-add), and a post-V1 batch:
  **photos verified end-to-end** (+ Today journal now accepts images), **manual data
  export** in Settings (#109), an **Electron desktop app** in `desktop/` (#110) with
  auto-update (#112), the Notes-stream spec amended to the shipped behavior (#111), and a
  **Capacitor mobile shell scaffolded** in `mobile/` (#113).
- **Trunk:** `main` (this is what's deployed). Build is green; auth + RLS verified.
  Photos + export are **live in prod** (deployed 2026-06-11); the desktop shell ships
  separately as a `.dmg` (not part of the web deploy).
- **Read first:** `docs/product.md` (why), then `docs/spec.md` (what), then this file
  (how to run/deploy). The full "why" log is `docs/decisions.md` (#001–#113).

## 1. Infra & accounts

| Thing | Value |
|---|---|
| Live URL | https://notes-framewise-health.vercel.app |
| Vercel project | `framewise-health/notes` (`prj_P6FDDVBwm4Wsc2iiVFxWoED2iP8B`, team `team_8MuYqSwnO080hLkp2Je4plbK`) |
| Supabase cloud | project `notes`, ref `vrwzxkxdxusbfdilxbrl`, region **us-east-1**, org **Framewise Health** |
| Cloud API | `https://vrwzxkxdxusbfdilxbrl.supabase.co` |
| App login (prod) | `david` (→ `david@notes.local`); password set at deploy — reset in Settings |
| Local dev login | `david` / `notesdev` (local only, harmless) |

**Where secrets live (none are committed):** prod keys → Vercel project env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); local keys → `.env.local` (gitignored, well-known local dev keys); cloud DB password → Supabase dashboard. More operational detail + gotchas live in the `deployment` memory.

## 2. Stack

Next.js 16 (App Router) + React 19 · Tailwind 4 (`@theme` in `globals.css`) · TypeScript ·
Supabase (Postgres + Auth + Storage) · TipTap (rich text) · Lucide · Lato · PWA · an
**Electron** desktop shell (`desktop/`, #110) · a **Capacitor** mobile shell scaffolded
(`mobile/`, #113). Details + rationale: `docs/architecture.md` (and decisions #080–#086,
#110, #113).

## 3. Repo map

```
AGENTS.md / CLAUDE.md     the 5 anti-drift rules + doc index (read first)
docs/                     the contract — see the table in AGENTS.md
  product/spec/data-model FROZEN: goal / behavior / schema
  architecture/design     living: stack+deploy / tokens+screens
  decisions.md            append-only "why" log (#001–#110)
  roadmap.md / phase-1.md  status + the parallel-slice briefs
  handoff.md              this file
mockups/index.html        interactive visual reference
supabase/migrations/      0001_init (schema) · 0002_storage (photos bucket) · 0003_rls
desktop/                  Electron desktop shell (#110) — self-contained, npm not pnpm;
                          main.js (hosted-URL window) · updater.js (#112) · build/icon.png
mobile/                   Capacitor mobile shell (#113) — self-contained, npm not pnpm;
                          capacitor.config.json (hosted-URL) · www/ fallback · README.md
src/
  proxy.ts                auth gate (Next 16 renamed middleware→proxy); PWA assets excluded
  middleware? -> NONE      (do not re-add; it's proxy.ts now)
  lib/supabase/            client.ts (browser) · server.ts · middleware.ts (updateSession)
  lib/data/                THE DATA-ACCESS LAYER (the seam) — routine, consistency, journal,
                           notes, settings, search, attachments, export, types. UI calls
                           these; it never hits Supabase tables directly or changes the schema.
  lib/database.types.ts    generated types (regen: supabase gen types typescript --local)
  lib/date.ts              local-day helpers (today/eachDay/daysBefore)
  app/                     (app)/ route group = shell + / (today), /notes, /notes/[id],
                           /settings ; /sign-in is outside the shell
  app/layout.tsx           root: Lato, ThemeScript (no-FOUC), PWA metadata, SW registration
  components/
    app-frame.tsx          the shell: sticky sidebar (web) + bottom nav (mobile)
    consistency-chart.tsx  heatmap; `orientation` prop (vertical sidebar / horizontal mobile)
    editor.tsx             shared TipTap editor (no toolbar; markdown input; image paste)
    theme-script.tsx       applies theme/accent/font before paint
    ui/ today/ notes/ settings/ search/   the per-slice UIs
public/                    manifest.webmanifest, icons, sw.js
```

## 4. Local dev runbook

Prereqs: Docker Desktop running, Supabase CLI, pnpm, Node.

1. `supabase start` — boots local Postgres/Auth/Storage in Docker. **Ports are remapped to
   544xx** (api 54421, db 54422, studio 54423) in `supabase/config.toml` so it coexists
   with other local Supabase projects. First run pulls images (a few min).
2. `.env.local` already points at the local instance and is auto-copied into every
   Conductor workspace (`file_include_globs = ".env*"`). If missing, derive from
   `supabase status -o env`.
3. `pnpm dev` (port floats: 3000, else 3001… — check the log's `Local:` line).
4. Sign in `david` / `notesdev` (pre-seeded). Migrations applied on `supabase start`;
   `supabase db reset` re-applies from scratch (wipes local data).
5. Regenerate DB types after a schema change: `supabase gen types typescript --local >
   src/lib/database.types.ts`.

**Gotchas:** the local Supabase Postgres is **shared across all Conductor workspaces**
(`docs/data-model.md`) — never run conflicting migrations in parallel, and make any
browser test self-restoring (round-trip toggles, delete rows you create). Browser
verification uses **Python** Playwright — see the `browser-verification` memory.

### 4a. Desktop app (Electron, #110)

`desktop/` is a **self-contained** package — use **`npm`, not `pnpm`**, and it's outside
the Next app's lint/build surface. It's a hosted-URL wrapper (same idea as the mobile
Capacitor plan): the window just points at a running copy of the web app.

```bash
# terminal 1 (repo root): the web app
pnpm dev
# terminal 2:
cd desktop && npm install   # first time (downloads Electron)
npm start                   # window → http://localhost:3000
npm run smoke               # boots, prints "[smoke] loaded … ok", quits
npm run dist                # → desktop/dist/notes-<ver>.dmg (loads production)
npm run dist:dir            # → desktop/dist/mac-arm64/notes.app (unpacked, faster)
```

URL precedence: `APP_URL` env → `localhost:3000` (unpackaged) → Vercel prod (packaged).
The build is **unsigned** (right-click → Open on first launch); signing/notarization
needs an Apple account (#086). **Auto-update (#112):** `updater.js` checks GitHub Releases
on launch; unsigned ⇒ it *notifies + opens the download* (silent install is one switch
away once signed). Publish a build with `GH_TOKEN=… npm run release`. Full detail:
`desktop/README.md`.

### 4b. Mobile app (Capacitor, #113)

`mobile/` is **scaffolded** — same hosted-URL idea (WebView → live site). Native build
needs full **Xcode** / **Android Studio** + an **Apple Developer account** (#086), not
installed here. Once they are: `cd mobile && npm install && npm run add:ios` (or
`add:android`) → `npm run sync` → `npm run open:ios`. Generated `ios/`/`android/` are
git-ignored until you're building them. The widget + rich notifications (#082/#090) are
further native work. Full detail: `mobile/README.md`.

## 5. Data model & the load-bearing rules

Six tables (`routine_item`, `completion`, `journal`, `note`, `attachment`, `settings`) —
full schema in `docs/data-model.md`. The rules to not break:

- **History integrity (#016):** the routine is a *template*; a day's checklist = items
  **active that day** (`created_on ≤ day AND (archived_on IS NULL OR archived_on > day)`).
  Editing/deleting items must never rewrite past days. "Delete" = set `archived_on`.
- **Consistency (#020/#022):** per-day % = completions ÷ active-items-that-day; a day with
  items but no completions = 0%; days before any item existed don't count.
- **RLS (#108):** every table is locked to the `authenticated` role; the anon key is inert
  without a login. Don't disable this on a public deploy.

## 6. Deploy runbook

The app talks to Supabase over HTTPS, so deploying is: push migrations to cloud, set
Vercel env, deploy. Redeploy with `vercel --prod`. **Two gotchas that cost time:**

- **`supabase db push` fails over IPv6 on an IPv4-only network.** Use the session pooler,
  and this project is on **`aws-1-us-east-1.pooler.supabase.com`** (NOT aws-0 — Supavisor
  says "tenant not found" on the wrong node). Port 5432, user `postgres.<ref>`.
- **Vercel 401 on every route** = the Framewise Health team's **Deployment Protection**
  (Vercel Authentication). It was disabled for this project via the API
  (`PATCH /v9/projects/<id>` `ssoProtection:null`). If a redeploy 401s site-wide, it got
  re-enabled.

Full first-deploy steps and IDs are in the `deployment` memory.

## 7. How it was built (Conductor)

`docs/roadmap.md` has the status; `docs/phase-1.md` has the per-slice briefs. In short:
**Phase 0** = one sequential foundation PR (scaffold, schema, data-access layer, design
system, shell, auth, shared editor) → merged to `main`. **Phase 1** = 5 parallel
workspaces off `main` (today · notes · settings · search · pwa), each owning its files
with two pre-assigned shared-file edits to avoid conflicts → integrated locally (build
verified) → RLS → deploy. Anything used by 2+ slices lives in Phase 0.

## 8. Known issues / watch-list

- **Notes stream vs #100:** ✅ **resolved** — amended to the shipped behavior (#111): the
  stream runs from today back to the **earliest journal/note** (empty days inside that range
  show `empty · tap to write`); days before any content don't appear. `spec.md` updated.
- **Photos (#050):** ✅ **verified** end-to-end (drop → storage `200` → public-URL `<img>`
  renders, no console errors) and the inline **Today journal now accepts images** too
  (previously only the `/notes/[id]` editor did). Repro: Python Playwright — sign in, open a
  note, dispatch a `drop` event carrying an image `File` onto `.notes-editor`.
- **Backups (#085):** ✅ Supabase **daily DB backups confirmed running** (Pro plan,
  automatic — verified from the dashboard). They **exclude Storage objects**, so the manual
  **export** now bundles the photo files too (`.zip`, #114) — that's the only off-Supabase
  copy of the image bytes. So: DB auto-backed-up; photos covered by export.
- **Cost:** the project lives in a *paid* Supabase org (Framewise Health) → ~$10/mo, and
  it's a work org (data-governance note for a personal journal). See #086.
- **Optimistic routine add** uses temp ids reconciled on server return; acting on a
  just-added row within ~100ms could error (edge, self-heals on reload).
- **Hydration:** `<html suppressHydrationWarning>` is intentional (the theme script mutates
  `<html>` before hydration).

## 9. What's next (deferred — `docs/roadmap.md`)

Capacitor mobile shell **scaffolded** (`mobile/`, #113) — remaining: generate native
projects (Xcode/Android Studio) + the home-screen widget + rich notifications (#082/#090) ·
code-sign + notarize the desktop `.dmg` (needs an Apple account, #086) · **browse-by-date**
(maybe) · **end-of-day summary as a notification** (rides on Capacitor notifications). The
post-V1 backlog was triaged (#115): **declined** — mood, "on this day", weekly/non-daily
items, fixed home-timezone, offline mode, custom domain.

## 10. Verifying a change

`pnpm build` (type-checks everything). For behavior, drive the real app with Python
Playwright (sign in `david`/`notesdev`, exercise the slice, screenshot, watch console
errors) — pattern in the `browser-verification` memory. Keep tests self-restoring against
the shared local DB.
