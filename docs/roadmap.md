> **living** — V1 scope + what's explicitly deferred.

# roadmap

## phase 0 — foundation (status)

Done & building (green `pnpm build`; auth gate verified at runtime): scaffold (Next 16 /
React 19 / Tailwind 4) · local Supabase + migration (6 tables) · typed data-access layer ·
design tokens + Lato + theme · app shell (sidebar + bottom nav) · consistency chart · auth
(`proxy` gate + sign-in + dev account) · day-tile / section-header primitives · Conductor
config.

**Remaining before fan-out:** the shared **TipTap editor** primitive (used by Today's
journal *and* Notes).

Then **Phase 1 (parallel slices):** Today (routine + journal), Notes (stream + editor),
Settings (theming + account), search ⌘K, photos, PWA.

## V1 scope

The smallest thing that's genuinely a pleasure to use daily.

- [ ] **Today** — daily routine: inline add/rename/reorder, check/uncheck, date-keyed
      daily reset, past-day editing.
- [ ] **Today's journal** — inline, autosaving, rich text.
- [ ] **Consistency chart** — vertical, % shading, in the sidebar (web) / Today (mobile).
- [ ] **Notes stream** — every day's journal (incl. empty) + freeform notes, one
      reverse-chron list; day-number tile for journals.
- [ ] **Rich-text editor** — TipTap, native shortcuts, **inline photos**.
- [ ] **Search** — ⌘K palette: instant full-text, filters, jump, create.
- [ ] **Settings** — accent + light/dark theming, account.
- [ ] **Auth** — single user, username/password, persistent sessions.
- [ ] **Soft-delete / trash** for notes.
- [ ] **PWA** — installable on phone.
- [ ] **Backups** — Supabase automatic backups enabled.

## explicitly deferred (post-V1)

- Native shell via **Capacitor**: home-screen **widget** + rich "big-banner"
  notifications (#082, #090).
- Manual data **export** (#085).
- "On this day" / browse-by-date, mood, weekly/non-daily items, end-of-day summaries.
- Fixed "home timezone" setting (V1 uses device-local — #083).
- Offline mode (V1 requires a connection — #084).

`#NNN` references are entries in `docs/decisions.md`.
