> **living** — evolves as we build (under the same-PR rule).

# architecture

## stack

- **Next.js (App Router)** on **Vercel** (#080). Free hobby tier.
- **Supabase** — Postgres + Auth + Storage (#081).
- **TipTap** — rich-text editor, content stored as JSON (#033).
- **Lucide** icons; **Lato** via web font; **PWA** (installable, web app manifest +
  service worker).
- **Electron** (#110): a thin **desktop** shell that points at the running web app
  (dev → `localhost:3000`, packaged → the Vercel URL). Lives in `desktop/`. See
  "desktop shell" below.
- **Capacitor** (#082, #113): a thin native iOS/Android shell pointing at the live
  Vercel URL. Lives in `mobile/`. **Scaffolded** (hosted-URL config + deps); native
  projects + home-screen widget + rich notifications remain to build. See "mobile shell"
  below. Connection is required (#084), which makes the hosted-URL approach clean.

## why not a Vite SPA

Considered (it wraps into Capacitor more directly), but Next.js's DX, routing, API
routes, image optimization, and first-class Vercel support won out, and Capacitor via
hosted-URL (#082) removes the static-export concern. See #080.

## structure (built in Phase 0)

- **Routes** (`src/app/`): an `(app)/` route group holds the shell + `/` (Today),
  `/notes`, `/settings`; `/sign-in` sits outside the group (no shell). `/notes/[id]`
  arrives with the Notes slice.
- **Shell**: `src/components/app-frame.tsx` — sidebar (web) + bottom nav (mobile:
  today/notes/settings, #064). The consistency chart lives in the sidebar.
- **Data access**: `src/lib/data/*` (the seam, see `data-model.md`) over typed Supabase
  clients in `src/lib/supabase/{client,server}.ts`; DB types in
  `src/lib/database.types.ts` (regenerate via `supabase gen types typescript --local`).
- **Theming**: CSS variables in `src/app/globals.css` + a no-FOUC `ThemeScript`; the
  Settings slice wires the picker + DB persistence (#063).

## desktop shell (Electron, #110)

A **self-contained** `desktop/` package — its own `package.json` + `node_modules`
(use `npm`, not `pnpm`), plain CommonJS `main.js`, **outside** the Next app's
pnpm/eslint/build surface (eslint ignores `desktop/**`; git ignores its
`node_modules`/`dist`). It is a hosted-URL wrapper, the same approach as the planned
Capacitor mobile shell (#082): an Electron `BrowserWindow` loads the *running web
app*, so there is no static export and no second codebase — everything in `src/`
stays the single source of truth.

- **URL precedence** (`desktop/main.js`): `APP_URL` env → `localhost:3000` when
  unpackaged → production Vercel URL when packaged.
- External links open in the system browser; same-origin nav stays in-window. Native
  mac inset title bar + a role-based menu (copy/paste, reload, fullscreen).
- **Build:** `electron-builder` → `npm run dist:signed` (signed + notarized `.dmg`/`.zip`)
  / `npm run dist:dir` (unsigned `.app`) / `npm run release` (sign + notarize + publish).
  **Signed + notarized with a Developer ID and released as v0.1.0** (#118); the
  `desktop-release` GitHub Action does it on a `desktop-v*` tag. Full runbook:
  `docs/ship-desktop-and-ios.md`.
- **Auto-update (#112/#118):** `updater.js` checks GitHub Releases on launch via
  `electron-updater`; `SILENT_INSTALL = true` (signed) → background download + restart-to-apply.

## mobile shell (Capacitor, #082/#113)

A **self-contained** `mobile/` package (own `package.json` + `node_modules`, `npm` not
pnpm; eslint/git ignore it). Same hosted-URL approach as desktop: a Capacitor iOS/Android
WebView loads the live web app via `server.url` in `capacitor.config.json` — no second
codebase.

- **Scaffolded:** config (→ production URL), `@capacitor/{core,cli,ios,android}` deps, a
  fallback `www/index.html`, runbook in `mobile/README.md`.
- **To do (gated on toolchains):** `npm run add:ios` / `add:android` generate the native
  projects — needs full **Xcode** / **Android Studio** + an **Apple Developer account**
  (#086). Generated `ios/`/`android/` are git-ignored until then.
- **The payoff (further native work, deferred):** home-screen **widget** (WidgetKit/Swift)
  and **rich notifications** (APNs/FCM). V1 has no reminder by design (#090).

## data export (#109, #114)

`src/lib/data/export.ts`: `exportAll(sb)` reads every owned row (all six tables +
attachment public URLs) into one JSON bundle; `buildExportArchive(sb)` wraps that into the
downloadable file — a plain `.json` when there are no photos, else a **`.zip`** (the JSON
plus every original image under `images/<storage_path>`, fetched via
`storage.download`) built by the dependency-free `src/lib/zip.ts`. **Settings → data →
"export my data"** (`components/settings/data-section.tsx`) triggers it client-side. This
is the off-Supabase complement to Supabase's daily DB backups — and the **only** backup of
the image bytes, since those backups exclude Storage objects (#085, #114).

## auth

Single user, username + password via Supabase Auth, **persistent sessions** — sign in
once per device, effectively never again (#070, #071). No public sign-up; the account is
pre-seeded. "Username" maps to an email behind the scenes (`<username>@notes.local`).
Route gating runs in **`src/proxy.ts`** (Next 16 renamed the `middleware` convention to
`proxy`) via `src/lib/supabase/middleware.ts → updateSession`: unauthenticated requests
redirect to `/sign-in`. Verified at runtime (`/` → 307 → `/sign-in`).

## local development

- `supabase start` runs the full stack in Docker. Ports are remapped to **544xx** in
  `supabase/config.toml` (api 54421, db 54422, studio 54423) to coexist with other local
  Supabase projects. `.env.local` holds the local URL + keys; Conductor copies `.env*`
  into every workspace, so all workspaces share this one local instance.
- Migrations live in `supabase/migrations/`; `supabase db reset` reapplies them.
- Dev account: `david@notes.local` / `notesdev` (local only). The loop is `supabase
  start` (once) + `pnpm dev`.

## deployment (live — first deploy 2026-06-11)

- **Prod:** https://notes-framewise-health.vercel.app — Vercel project
  `framewise-health/notes`. Production env vars set: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (cloud values).
- **Supabase cloud:** project `notes`, ref `vrwzxkxdxusbfdilxbrl`, region us-east-1, in the
  Framewise Health org. All three migrations applied (schema + storage + RLS); single
  account seeded. App talks to Supabase over HTTPS (not direct Postgres).
- **Redeploy:** `vercel --prod` (or connect the repo for git-push deploys).
- **Two operational gotchas** (details in the `deployment` memory): `supabase db push` from
  an IPv4-only network must use the **session pooler on `aws-1-us-east-1`** (not aws-0); and
  the team's **Deployment Protection** was disabled for this project so the site (and the
  PWA) is publicly reachable.
- Supabase automatic backups: enable in the dashboard (#085). Cost note: the project lives
  in a paid org, so #086's ~$0 target is superseded by hosting in Framewise Health.

## open items

- RLS: **done** (#108) — all public tables locked to `authenticated`, anon inert.
- TipTap editor + PWA: **shipped** in Phase 1.
- Photos (#050): **verified** end-to-end (drop → upload → render); the inline Today
  journal now also accepts images, matching the notes editor.
- Manual data export (#109): **shipped** (Settings → data).
- Desktop shell (#110): **shipped + signed + notarized**, released v0.1.0 with silent
  launch-time auto-update (#112/#118).
- Notes stream (#100): **amended** to ship behavior (#111) — anchors on earliest content.
- Mobile shell (#113): **shipped on iOS** (`mobile/`, hosted-URL) — home-screen widget +
  daily notifications live on device (#119). Optional: interactive widget, Android, TestFlight.
- Supabase automatic backups: **still a manual dashboard step** (#085) — enable
  Point-in-Time / scheduled backups in the Supabase dashboard (needs David's access).
- Optional: a custom domain.
