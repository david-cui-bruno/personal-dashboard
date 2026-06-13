> **living** — design + build plan for the iOS home-screen **widget** and daily
> **notifications** (the native payoff anticipated by #082/#090). Decision: #119. The
> "why" is in `docs/decisions.md`; this is the *what* and *how*.

# widget & notifications

## goal

Make **notes** useful without opening it, while staying calm (#002, #003). Two surfaces:

1. A **home-screen widget** that shows what's left today and, crucially, the habit David
   has been **slipping on** — so accountability is glanceable.
2. **Two gentle daily notifications** (morning/night) that nudge journaling and finishing
   the routine. No nagging — exactly two, configurable, skippable.

Both run only in the **native iOS shell** (Capacitor, #113); the web app is unchanged.

---

## the widget (small, v1)

```
┌──────────────────────────┐
│  ◔   3/6                  │   ring = % of today's routine done
│      left today           │
│                           │
│  FOCUS                    │   the weakest habit (see below)
│  meditate                 │
└──────────────────────────┘
```

- **Ring** = today's completion (done ÷ active items). **"X/N left today"** = remaining ÷
  active items for the local day (#011/#083).
- **Focus** = today's weakest habit (below). Tapping the widget **opens the app to Today**
  (`notes://today` deep link) — v1 is display + tap-to-open.
- **All-done state:** when nothing's left, the widget shows a calm "all done ✓" + the
  **quote of the day** (a small reward, ties to #002).
- **Empty state** (no routine items yet): "add your routine in notes."

**Deferred:** interactive check-off from the widget (tap a ring → mark done, iOS 17+
App Intents); medium/large sizes; Android.

### "focus" = weakest habit

The active routine item with the **lowest completion rate over the last 30 local days**
(ties broken by most-recent miss, then sort order). Reuses the active-window + completion
rules already in `src/lib/data/consistency.ts` / `routine.ts` (#016/#020/#022). Computed
server-side so the widget makes **one** call (next section).

### live data (how the widget gets it)

The widget is a native **WidgetKit** extension — a separate process from the Capacitor
WebView, so it can't read the web app's state. Instead:

1. **Session sharing:** the app writes its Supabase session (access + refresh token) to a
   shared **App Group** (`group.health.framewise.notes`) keychain entry on sign-in /
   refresh. The widget reads it to authenticate as David (RLS still applies, #108).
2. **One round-trip:** a Postgres function **`widget_summary()`** returns
   `{ done, total, focus_label, focus_item_id }` for today in a single PostgREST/RPC call,
   so the widget doesn't reimplement the consistency math in Swift.
3. **Freshness:** the app calls `WidgetCenter.reloadAllTimelines()` whenever routine state
   changes (instant while the app is used). When the app is closed, WidgetKit refreshes the
   widget on its own timeline (iOS budget → ~every 15–30 min). That's what "live" means
   here: current-when-you-use-the-app, near-current otherwise.

---

## notifications (two/day, local)

On-device **local notifications** via `@capacitor/local-notifications` — no server, works
offline, $0.

| when (default) | message |
|---|---|
| **8:00 am** | "good morning — journal & start your day" |
| **9:00 pm** | "wind down — journal, and you've still got *N* left (*focus*)" — or, if done: "all done today. journal?" |

- **Times are configurable** in Settings (morning + evening), and each can be turned off.
- **Accuracy without a server:** local notifs carry fixed text set at schedule time, so the
  app **reschedules both** whenever it's opened or backgrounded, recomputing the evening
  count/focus from current state. If David checks something off after his last app use, the
  9pm count may be slightly stale; it self-corrects next open. (A tiny push server could
  make it exact-at-9pm later — explicitly out of scope for now.)
- **Prefs storage:** notification settings are **device-local** (they only matter on the
  phone running the native shell), stored in the app's local storage — no schema change.

---

## quotes

A built-in curated set (`src/lib/quotes.ts`, ~30 calm, lowercase-friendly lines) with a
**deterministic daily pick** (`quoteForDay(day)` hashes the date → stable all day). Offline,
no API. Used by the widget's all-done state (and available to the app if we ever want it).

---

## architecture summary

| piece | where | needs Xcode? |
|---|---|---|
| `quotes.ts` + `quoteForDay` | web (`src/lib/`) | no |
| `widget_summary()` Postgres function | Supabase migration | no |
| notification scheduling + Settings UI | web/Capacitor (`@capacitor/local-notifications`) | runs natively; UI is web |
| WidgetKit small widget (Swift) | `mobile/ios` extension | **yes** |
| App Group + session sharing | native iOS + a small app hook | **yes** |
| deep link `notes://today` | Capacitor config + app routing | partial |

---

## build plan (phased)

**Phase 1 — web/data foundations (no Xcode, verifiable here).** ✅ done
- [x] `src/lib/quotes.ts` + `quoteForDay()`.
- [x] `widget_summary(p_day)` Postgres function (migration `0004`) + `getWidgetSummary()`
      in the data layer; DB types regenerated. Verified: authenticated call returns
      `{done,total,focus}`; anon execute revoked (#108). **Still to do before the widget
      ships: `supabase db push` this migration to the cloud (Phase 2 deploy step).**
- [x] `src/lib/notif-prefs.ts` — device-local notification prefs (enabled + morning/evening
      times) with safe defaults/validation. *The Settings **UI** for these moves to Phase 3*
      (it's native-only — times are device-local and only act in the iOS shell, so the
      control is gated to the native app where it can be tested with the scheduler).

**Phase 2 — native widget (needs Xcode + the iOS project, #113).** *prep done; Xcode wiring pending*
- [x] WidgetKit small widget written: `mobile/widget/NotesWidget.swift` (ring + X/N + focus,
      all-done/quote, empty, needs-open states; live fetch + cached fallback; `notes://today`).
- [x] Web→widget **session bridge** (#120): `src/lib/native/widget-bridge.ts` +
      `<NativeBridge>` (mounted in the app layout, native-only) write the App Group payload
      via `@capacitor/preferences`.
- [ ] **Xcode wiring** (assistant): generate `mobile/ios`, add the App Group + Widget
      Extension target, drop in the Swift, sign, run — see `docs/widget-phase2-runbook.md`.
- [ ] **Go-live deploys**: `supabase db push` (migration `0004`) + `vercel --prod` (bridge).
- [ ] Later: instant in-app refresh via a tiny `reloadAllTimelines()` plugin (#120).

**Phase 3 — notifications (Capacitor).** *prep done; Xcode wiring pending*
- [x] `@capacitor/local-notifications` added (web + mobile, v8); permission requested on
      first reschedule.
- [x] `src/lib/native/notifications.ts` — cancel + (re)schedule morning/evening from prefs;
      evening body reflects today's `{left, focus}`/all-done. Rescheduled on launch, auth
      change, and **foreground** (via `initNative()` in `src/lib/native/index.ts`).
- [x] `src/components/settings/notifications-section.tsx` — native-only Settings section
      (toggle + morning/evening time pickers) on `notif-prefs.ts`; reschedules on change.
- [ ] **Xcode wiring** (assistant): `@capacitor/local-notifications` pod via `npm run sync`
      after the iOS project exists — see `docs/notifications-phase3-runbook.md`.

Phases 2–3 are real **native** work and will be packaged as an assistant/Xcode runbook
(like `docs/ship-desktop-and-ios.md`) when we reach them. Phase 1 lands in the repo now.

## done since v1

- **Lock-screen widget (#138)** — `accessoryCircular`/`Rectangular`/`Inline` families added to
  `mobile/widget/NotesWidget.swift` (iOS 16+), reusing the same payload/RPC/states.
- **Richer end-of-day notification (#137)** — the 9pm notif is now a recap (routine progress +
  journaled? + the day's song) via `composeEveningBody()`, title "your day".

## deferred

Interactive check-off from the widget · medium/large widgets · Android widget · a push server
for exact-time notification counts.
