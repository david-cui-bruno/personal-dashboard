> **living** — evolves as we build (under the same-PR rule).

# architecture

## stack

- **Next.js (App Router)** on **Vercel** (#080). Free hobby tier.
- **Supabase** — Postgres + Auth + Storage (#081).
- **TipTap** — rich-text editor, content stored as JSON (#033).
- **Lucide** icons; **Lato** via web font; **PWA** (installable, web app manifest +
  service worker).
- **Capacitor** later (#082): a thin native iOS/Android shell pointing at the live
  Vercel URL, adding home-screen widgets + rich notifications. Connection is required
  (#084), which makes the hosted-URL approach clean.

## why not a Vite SPA

Considered (it wraps into Capacitor more directly), but Next.js's DX, routing, API
routes, image optimization, and first-class Vercel support won out, and Capacitor via
hosted-URL (#082) removes the static-export concern. See #080.

## structure (built in Phase 0)

- **Routes** (`src/app/`): an `(app)/` route group holds the shell + `/` (Today),
  `/notes`, `/settings`; `/sign-in` sits outside the group (no shell). `/notes/[id]`
  arrives with the Notes slice.
- **Shell**: `src/components/app-frame.tsx` — sidebar (web) + bottom nav (mobile,
  today/notes only, #064). The consistency chart lives in the sidebar.
- **Data access**: `src/lib/data/*` (the seam, see `data-model.md`) over typed Supabase
  clients in `src/lib/supabase/{client,server}.ts`; DB types in
  `src/lib/database.types.ts` (regenerate via `supabase gen types typescript --local`).
- **Theming**: CSS variables in `src/app/globals.css` + a no-FOUC `ThemeScript`; the
  Settings slice wires the picker + DB persistence (#063).

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
- Capacitor native shell (home-screen widget + rich notifications) remains post-V1 (#082).
- Supabase automatic backups: turn on in the dashboard (#085).
- Optional: a custom domain.
