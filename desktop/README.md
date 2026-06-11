# notes — desktop shell

An [Electron](https://www.electronjs.org/) wrapper around the **notes** web app
(decision **#110**). It is a thin, hosted-URL shell — the exact same strategy as
the planned Capacitor mobile shell (#082): the window points at a running copy of
the web app, so there's no second codebase. Everything under the repo's `src/`
stays the single source of truth.

This package is intentionally **outside** the Next/pnpm project: its own
`package.json`, its own `node_modules` (use `npm`, not `pnpm`), CommonJS `main.js`.

## which URL it loads

`main.js` resolves the URL with this precedence:

1. `APP_URL` env var (explicit override)
2. the local Next dev server `http://localhost:3000` — when run unpackaged (`npm start`)
3. production `https://notes-framewise-health.vercel.app` — in a packaged `.app`

## run it (dev)

```bash
# terminal 1 — in the repo root, the Next app:
pnpm dev

# terminal 2 — here:
cd desktop
npm install        # first time only (downloads Electron)
npm start          # opens the window against http://localhost:3000
```

`npm run smoke` loads the dev server once, prints `[smoke] loaded … ok`, and quits
— a quick "does the shell boot" check (used in CI / by agents).

## build a distributable

```bash
cd desktop
npm install
npm run dist       # → dist/notes-<version>.dmg + .zip  (loads production by default)
npm run dist:dir   # → dist/mac-arm64/notes.app         (unpacked, faster, for testing)
npm run release    # build + publish to GitHub Releases (needs GH_TOKEN) — for auto-update
```

The build is **unsigned** — first launch needs right-click → Open (or
`xattr -dr com.apple.quarantine dist/mac-arm64/notes.app`). Code signing + notarization
(an Apple Developer account, #086) is a later step if this is distributed beyond
David's own machine.

## auto-update (#112)

`updater.js` checks GitHub Releases on launch via `electron-updater` (packaged builds
only; a no-op in dev). To cut a new version: bump `version` in `package.json`, then
`GH_TOKEN=<token> npm run release` — that uploads the `.dmg`, `.zip`, and the
`latest-mac.yml` feed the updater reads.

**Two caveats, both because the app is currently unsigned:**

1. **macOS only silently installs updates for a _signed_ app.** So today the updater runs
   in **notify mode**: if a newer release exists it pops a dialog and opens the releases
   page to download manually. Once the app is signed + notarized (#086), set
   `SILENT_INSTALL = true` in `updater.js` for true background-download + restart-to-apply.
2. **The release feed must be publicly readable.** If `david-cui-bruno/personal-dashboard`
   stays private, the updater can't fetch the feed without a shipped token (don't do that).
   Easiest fix: make the Releases public, or publish to a dedicated public releases repo
   (set `publish.repo` accordingly).

## icon

`build/icon.png` is a copy of the PWA icon (`public/icon-512.png`). electron-builder
generates the mac `.icns` from it at build time. Swap in a 1024×1024 master if you
want crisper Retina output.
