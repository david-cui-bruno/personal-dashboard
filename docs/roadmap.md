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
- [x] **Inline photos** — verified end-to-end; Today journal also accepts images (#050).
- [x] **Manual data export** — Settings → data → "export my data" (#109).
- [x] **Desktop app** — Electron hosted-URL shell in `desktop/` (#110).
- [ ] **Backups** — enable Supabase automatic backups in the dashboard (#085, manual step).

## explicitly deferred (post-V1)

- Native **mobile** shell via **Capacitor** (#113): **scaffolded** in `mobile/`
  (hosted-URL). Remaining: generate the native iOS/Android projects (Xcode/Android Studio)
  and build the home-screen **widget** + rich "big-banner" notifications (#082, #090).
  *(Desktop is covered by Electron, #110.)*
- Code signing + notarization for the desktop `.dmg` (needs an Apple account, #086, #110);
  unblocks true silent desktop auto-update (#112).
- Move the Supabase project out of the paid Framewise Health **work** org to a personal
  free project (#086) — data-governance + cost cleanup for a personal journal.
- **Browse-by-date** — *maybe* (jump to any past day). The one live feature candidate (#115).
- **End-of-day summary** — only as a **notification**, so it rides on the Capacitor
  rich-notifications work above (#082/#090/#115).

### declined (#115)

Pruned to keep the app simple: **mood**, **"on this day"**, **weekly/non-daily routine
items**, **fixed home-timezone** (device-local stays — #011/#083), **offline mode**
(#084), **custom domain**.

`#NNN` references are entries in `docs/decisions.md`.
