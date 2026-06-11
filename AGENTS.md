<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# notes — a personal dashboard

A private, single-user notes + daily-routine app for David. The feel of Day One
(Lato, calm, lowercase) with a simpler model: a **Today** screen (a daily routine
checklist + today's journal) and a **Notes** stream (every day's journal + freeform
notes). Accountability shows up as a consistency heatmap, but the real goal is an app
that's a pleasure to open every single day.

This repo is built primarily by coding agents, often many in parallel via Conductor.
**The docs are the contract.** Read them before writing code, keep them in sync as you go.

## the five rules (how we avoid docs/code drift)

1. **One source of truth per concern.** A fact (the schema, a color token, a rule) lives
   in exactly one doc. Never duplicate — duplication is how drift starts.
2. **Document contracts and intent, not implementation.** Docs say *what* and *why*. They
   never mirror code line-by-line. Volatile internals stay in the code.
3. **Same-PR rule.** Any change that alters behavior updates the relevant doc in the same PR.
4. **Spec is the boss for V1.** If code and `docs/spec.md` disagree, that's a bug — fix the
   code, or change the spec *and* add a `docs/decisions.md` entry.
5. **Decisions are append-only.** Every settled question gets one entry in
   `docs/decisions.md`. Never edit/delete past entries; supersede with a new one.

A doc marked **`FROZEN`** changes only via a new `docs/decisions.md` entry + David's sign-off.

## the docs

| Doc | Status | What's in it |
|---|---|---|
| [docs/handoff.md](docs/handoff.md) | living | **Start here** — orientation, infra, local + deploy runbooks, known issues. |
| [docs/product.md](docs/product.md) | **FROZEN** | Goal, principles, non-goals. |
| [docs/spec.md](docs/spec.md) | **FROZEN** | Every feature in detail. The behavioral contract. |
| [docs/data-model.md](docs/data-model.md) | **FROZEN** | Postgres schema + the data-access layer surface. |
| [docs/architecture.md](docs/architecture.md) | living | Stack, structure, auth, PWA, Capacitor, deploy. |
| [docs/design.md](docs/design.md) | living | UI/UX, design tokens, theming. Anchors to `mockups/`. |
| [docs/decisions.md](docs/decisions.md) | append-only | Every decision + its "why" (`#NNN`). |
| [docs/roadmap.md](docs/roadmap.md) | living | V1 scope + build phases + deferred. |
| [docs/phase-1.md](docs/phase-1.md) | living | Parallel-slice plan + per-slice briefs. |
| [mockups/index.html](mockups/index.html) | reference | Interactive UI mockups (open in a browser). |

## stack & commands

Next.js 16 (App Router) + React 19 · Tailwind 4 (`@theme` in `src/app/globals.css`) ·
Supabase (Postgres + Auth + Storage) · TipTap editor · Lucide · Lato · PWA, Capacitor-ready.

- `pnpm dev` — dev server. `pnpm build` — production build. `pnpm lint` — lint.
- **Local data:** `supabase start` (Docker) runs Postgres locally; apply schema with
  `supabase db reset` (runs `supabase/migrations/`). Put the printed URL + anon key in
  `.env.local`. All Conductor workspaces share one Supabase instance — **never run
  conflicting migrations from parallel workspaces** (see `docs/data-model.md`).

## build phases (see docs/roadmap.md)

**Phase 0 (sequential foundation, this branch → main):** scaffold, schema/migrations,
data-access layer, design system, app shell, auth. Everything else forks from it.
**Phase 1 (parallel slices):** Today/routine, journal+photos, notes stream, consistency
chart, search ⌘K, settings, PWA — anything shared by 2+ slices belongs in Phase 0.
