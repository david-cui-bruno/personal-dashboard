> **living** — V1 scope + what's explicitly deferred.

# roadmap

## status: V1 shipped 🎉 (2026-06-11)

Live at **https://notes-framewise-health.vercel.app** (Vercel + Supabase cloud). Built
in two phases by parallel Conductor agents, integrated, RLS-hardened, deployed, and
verified end-to-end (sign-in → Today renders, anon locked out by RLS, no console errors).
See `docs/architecture.md` for deploy details.

- **Phase 0 (foundation):** scaffold (Next 16 / React 19 / Tailwind 4) · Supabase schema +
  data-access layer · design tokens + Lato + theme · app shell · auth (`proxy` gate) ·
  consistency chart · shared TipTap editor · Conductor config.
- **Phase 1 (5 parallel slices, all merged):** today · notes · settings · search ⌘K · pwa.

## V1 scope — all shipped

- [x] **Today** — daily routine: inline add/rename/reorder, check/uncheck, date-keyed
      daily reset, past-day editing.
- [x] **Today's journal** — inline, autosaving, rich text.
- [x] **Consistency chart** — vertical, % shading, sidebar (web) / Today (mobile).
- [x] **Notes stream** — journals (incl. empty days) + freeform notes, day-number tiles.
- [x] **Rich-text editor** — TipTap, no toolbar, markdown input, **inline photos**.
- [x] **Search** — ⌘K palette: instant full-text, jump, create.
- [x] **Settings** — accent + light/dark theming, account.
- [x] **Auth** — single user, username/password, persistent sessions.
- [x] **Soft-delete / trash** for notes.
- [x] **PWA** — installable manifest + icons + shell service worker.
- [x] **RLS** — all tables locked to `authenticated` (#108).
- [ ] **Backups** — enable Supabase automatic backups in the dashboard (#085).

## explicitly deferred (post-V1)

- Native shell via **Capacitor**: home-screen **widget** + rich "big-banner"
  notifications (#082, #090).
- Manual data **export** (#085).
- "On this day" / browse-by-date, mood, weekly/non-daily items, end-of-day summaries.
- Fixed "home timezone" setting (V1 uses device-local — #083).
- Offline mode (V1 requires a connection — #084).
- A custom domain.

`#NNN` references are entries in `docs/decisions.md`.
