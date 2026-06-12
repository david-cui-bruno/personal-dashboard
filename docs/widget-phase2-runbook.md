> **living** — runbook for wiring the iOS **home-screen widget** (Phase 2 of #119).
> Written for an assistant in Xcode. The widget UI + the web→widget bridge are already
> written; this is the native plumbing (App Group, widget target, signing) + the two
> "make it live" deploy steps. Design: `docs/widget-and-notifications.md`. Decisions: #119/#120.

# directive: ship the iOS home-screen widget

The Swift widget is in **`mobile/widget/NotesWidget.swift`**. The web app already shares
the data it needs into a shared **App Group** (when running in the native shell). Your job:
generate the iOS project, add the widget target + App Group, drop in the Swift, sign, and
run — plus two deploys so live data flows.

## prerequisites
- Xcode + the Apple Developer account already used for the desktop signing (you have these).
- The repo: `git clone …/personal-dashboard && cd personal-dashboard`.
- One-time (if not done): `sudo xcodebuild -license accept`.

## step 0 — make the data live (two deploys)

The native app loads the **hosted** web app and calls Supabase directly, so both must be live:

1. **Push the DB function to the cloud** (adds `widget_summary`, migration `0004`):
   ```bash
   # uses the session pooler on aws-1-us-east-1 (see the `deployment` memory); DB password
   # is in the Supabase dashboard → Project Settings → Database.
   supabase link --project-ref vrwzxkxdxusbfdilxbrl   # if not already linked
   supabase db push
   ```
   Verify in the dashboard SQL editor: `select * from widget_summary(current_date);`
2. **Deploy the web app** so the hosted site includes the widget bridge:
   ```bash
   vercel --prod
   ```

## step 1 — generate the iOS project
```bash
cd mobile
npm install
npm run add:ios     # creates mobile/ios
npm run sync        # installs pods incl. @capacitor/preferences
npm run open:ios    # opens Xcode
```

## step 2 — create the App Group
- Apple Developer portal → **Identifiers → App Groups → +** → create
  **`group.health.framewise.notes`**. (Also enable App Groups on the App ID
  `health.framewise.notes`.)
- In Xcode → the **App** target → **Signing & Capabilities** → **+ Capability → App
  Groups** → check `group.health.framewise.notes`.

## step 3 — add the Widget Extension target
- Xcode → **File → New → Target… → Widget Extension**. Name it **NotesWidget**. **Uncheck**
  "Include Live Activity" and "Include Configuration App Intent" (we want a static widget).
  Activate the scheme when prompted.
- Select the **NotesWidget** target → **Signing & Capabilities** → set your **Team** →
  **+ Capability → App Groups** → check the **same** `group.health.framewise.notes`.

## step 4 — drop in the widget code
- In the generated `NotesWidget` extension, **replace** the template's main Swift file
  contents with **`mobile/widget/NotesWidget.swift`** from the repo (or add that file to the
  NotesWidget target and delete the template's `@main` widget + its bundle file so there's
  only one `@main`).
- Build the NotesWidget scheme once to confirm it compiles.

## step 5 — run + verify
1. Run the **App** scheme on a simulator or your iPhone; **sign in** once (this makes the
   web app write the shared payload).
2. Long-press the home screen → **+** → search **notes** → add the **small** widget.
3. You should see the **ring + "X/N left today" + focus**. Check items off in the app →
   within ~30 min (or sooner) the widget updates; complete everything → **all done ✓ +
   quote**. Before signing in it shows "open to set up"; with no routine items, "add your
   routine."

## step 6 (optional) — tap-to-open deep link
Tapping the widget already opens the app. To land on Today specifically, add a URL scheme:
App target → **Info → URL Types → +** → URL Schemes `notes`. (Capacitor delivers it via
`appUrlOpen`; the hosted app can route it. Fine to skip for v1.)

## how it works (for debugging)
- The web app (in the native shell) writes one JSON blob to the App Group via
  `@capacitor/preferences` configured with `group.health.framewise.notes`. Preferences
  prefixes keys, so the widget reads **`_capacitor_widget.payload`** from
  `UserDefaults(suiteName: "group.health.framewise.notes")`.
- The blob holds the Supabase access token (+ expiry), URL, anon key, today's quote, and a
  cached summary. The widget fetches `widget_summary` **live** while the token is valid,
  else renders the cached values. The app refreshes the token on open, so it stays current.

## troubleshooting
- **Widget stuck on "open to set up"** → the App Group id must match **exactly** on both
  the App and Widget targets, and you must have signed in once in the app **after** step 0's
  web deploy. Confirm the App Group exists in the portal.
- **Shows cached/older numbers** → token expired (app not opened in >1h); open the app. (The
  widget never refreshes tokens by design, #120.)
- **`permission denied for function widget_summary`** → migration `0004` wasn't pushed to
  the cloud (step 0.1), or you're hitting it unauthenticated.
- **Pods error on `npm run sync`** → `sudo gem install cocoapods` (or `brew install cocoapods`).

## report back
- A screenshot of the widget on the home screen in each state you can reach.
- Confirmation steps 0.1 (db push) and 0.2 (vercel) succeeded.
- Any build/signing errors with exact text.
