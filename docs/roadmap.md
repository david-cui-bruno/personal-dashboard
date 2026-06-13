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
- [x] **Desktop app** — Electron hosted-URL shell (#110), **signed + notarized + released
      v0.1.0** with silent auto-update (#112/#118).
- [x] **Backups** — confirmed: Supabase Pro takes **automatic daily DB backups** (verified
      in the dashboard, #085). Note: Storage objects (photos) aren't in DB backups — the
      manual export (#114) covers those.

## explicitly deferred (post-V1)

- ~~**inspo board (#140)**~~ — **fully built**: a new `inspo` tab with moodboard + people
  boards, **drag-reorderable masonry** (#145), paste/drag/upload of **images & video** (#141/#143),
  and colored sticky notes placed on opened media via a fixed holder (#142). Video tiles show a
  generated **poster** + ▶ badge and play in the lightbox (#144). Nothing outstanding. Full brief:
  `docs/inspo.md`; mockup in `mockups/index.html`.

- Native **mobile** shell via **Capacitor** (#113): **shipped on iOS** — the home-screen
  **widget** + daily **notifications** (#119, `docs/widget-and-notifications.md`) are
  running on David's device (Phases 1–3 all done). *(Desktop is covered by Electron, #110.)*
- **Active candidates** (David's interest, #121): a **lock-screen widget**, **TestFlight/
  App Store** distribution, a **push server** for exact-time notification counts (vs today's
  best-effort), and a **richer end-of-day summary**.
- **Performance:** collapse the per-screen data fetches into a single `today_summary` RPC +
  add a client cache (instant nav) + lazy-load TipTap (latency work, agreed).
- ~~Song of the day~~ — **built** (#123): per-day logged song (paste a Spotify/Apple Music
  link → cover art + title atop the journal + on the stream). Ships with the migration push.
- ~~Code signing + notarization for the desktop `.dmg`~~ — **done** (#118): signed Developer
  ID build, notarized, released v0.1.0; silent auto-update enabled.
- Move the Supabase project out of the paid Framewise Health **work** org to a personal
  free project (#086) — data-governance + cost cleanup for a personal journal.
- ~~Browse-by-date~~ — **done** as date-aware Notes search (#116), not a calendar: type a
  date in the search box to jump to that day's journal.
- **End-of-day summary** — only as a **notification**, so it rides on the Capacitor
  rich-notifications work above (#082/#090/#115).

### declined (#115, #121)

Also declined (#121): interactive widget check-off, medium/large home-screen widgets, Android.
Pruned to keep the app simple: **mood**, **"on this day"**, **weekly/non-daily routine
items**, **fixed home-timezone** (device-local stays — #011/#083), **offline mode**
(#084), **custom domain**.

`#NNN` references are entries in `docs/decisions.md`.
