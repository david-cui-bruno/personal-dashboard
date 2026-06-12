> **living** — runbook for the daily **notifications** (Phase 3 of #119). For an assistant
> in Xcode. The scheduling + Settings UI are already written (and run inside the native
> shell); this is the small native plumbing. Do this **after** the widget (Phase 2) is
> running — it reuses the same iOS project. Design: `docs/widget-and-notifications.md`.

# directive: ship the daily notifications

Two gentle local notifications a day (morning + night), times configurable in **Settings →
notifications** (that section only appears in the iOS app). The logic lives in the web app
(`src/lib/native/notifications.ts`) and runs inside the Capacitor shell; you just need the
native plugin present.

## steps

1. **Pull latest + (re)sync the iOS project** (the plugin is already in `mobile/package.json`):
   ```bash
   cd mobile
   npm install                 # picks up @capacitor/local-notifications
   npm run sync                # installs the CocoaPod into mobile/ios
   ```
2. **Deploy the web app** if it isn't already on this build (the native shell loads the
   hosted app, which contains the scheduler + Settings UI):
   ```bash
   vercel --prod
   ```
3. **Run** the App scheme (`npm run open:ios` → ▶︎). On first launch the app asks for
   notification permission — **Allow**.
4. **Verify in the app:** Settings → **notifications**. Toggle on, set the morning/evening
   times. (This section is invisible on web/desktop by design.)
5. **Verify delivery:** set a time a minute or two ahead, lock the phone, wait — the
   notification should fire. Tapping it opens the app. Reset the times to 8:00 / 21:00.

## notes / troubleshooting

- **No permission prompt / nothing fires** → Settings (iOS) → Notifications → notes →
  Allow Notifications. Re-toggle the in-app switch to reschedule.
- **Evening count looks stale** → expected (#119): local notifications carry fixed text, so
  the "N left" is recomputed when the app is opened/foregrounded, not live at 9pm. Opening
  the app refreshes it. (A push server would make it exact — deliberately out of scope.)
- **No usage-string needed** — local notifications use the runtime permission prompt; no
  extra Info.plist key is required (unlike some capabilities).
- Times are **device-local** (stored on the phone), so they don't sync from desktop — set
  them on the phone.

## report back

Confirmation the permission prompt appeared, the Settings → notifications section showed,
and a test notification fired (screenshot welcome). Any errors with exact text.
