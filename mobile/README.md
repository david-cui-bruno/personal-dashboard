# notes — mobile shell (Capacitor)

A [Capacitor](https://capacitorjs.com/) wrapper around the **notes** web app
(decision **#113**, realizing the long-planned **#082**). Like the desktop Electron
shell (#110), it's a **hosted-URL** wrapper: the native iOS/Android WebView loads the
running web app (`server.url` in `capacitor.config.json`), so there's no second
codebase — everything in the repo's `src/` stays the single source of truth.

Self-contained, outside the Next/pnpm project: its own `package.json` + `node_modules`
(use **`npm`**, not `pnpm`).

## why Capacitor at all

A pure PWA can't give iOS a **home-screen widget** or **rich ("big banner")
notifications** — those are the whole reason for going native (#082, #090). Capacitor
reuses the exact web app and lets us add those as native plugins/extensions later.

## status

✅ **Scaffolded**: config (hosted-URL → production), deps, fallback `www/`.
⛔ **Not yet generated**: the native `ios/` and `android/` projects — that needs the
toolchains below, which aren't installed in the build environment yet.

## prerequisites

- **iOS:** full **Xcode** (not just Command Line Tools) + CocoaPods (`pod` — already
  present) + an **Apple Developer account** ($99/yr, #086) to run on a device / submit.
- **Android:** **Android Studio** + SDK (`ANDROID_HOME`).

## generate + run (once toolchains are installed)

```bash
cd mobile
npm install
npm run add:ios       # generates mobile/ios   (needs Xcode)
npm run add:android   # generates mobile/android (needs Android Studio)
npm run sync          # copy config + run pod install
npm run open:ios      # open in Xcode → run on simulator/device
npm run open:android  # open in Android Studio
```

The generated `ios/` and `android/` folders are git-ignored for now (they're large and
toolchain-specific). Once you're building them, drop them from `.gitignore` and commit —
Capacitor native projects are normally version-controlled.

### dev vs production URL

`capacitor.config.json` points `server.url` at the production Vercel URL. To test
against your local dev server, temporarily set it to your machine's LAN IP, e.g.
`http://192.168.1.x:3000` (and set `"cleartext": true`), then `npm run sync`.

## the native extras (the actual #082/#090 work — not done yet)

These are separate native features layered on this shell, each a real chunk of work:

- **Home-screen widget** — a native iOS WidgetKit extension (Swift) + an App Group to
  share today's routine/streak. Android: a `RemoteViews` app widget.
- **Rich notifications** — `@capacitor/push-notifications` (or local notifications) +
  APNs (Apple) / FCM (Google) setup. V1 deliberately has **no** daily reminder (#090),
  so this is opt-in and post-V1.
