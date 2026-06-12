> **living** — operational runbook for shipping the **notes** desktop app (signed +
> auto-updating) and running the **iOS** app. Written for an assistant doing this on
> David's behalf. The app code is done; this is packaging/signing/setup only.

# directive: ship the desktop app (signed) + run the iOS app

## who/what this is for

You're setting up two things for David's **notes** app:

- **Part A — Desktop (macOS):** turn the existing Electron app into a **signed,
  notarized `.dmg`** people can open with a normal double-click, and make it
  **auto-update**.
- **Part B — iOS:** generate and run the native iOS app (a thin wrapper around the
  same web app) on the simulator and/or David's iPhone.

You do **not** need to write any code — it's all wired. You're running commands,
clicking in a couple of Apple UIs, and pasting a few values.

### before you start — accounts & machine

- A **Mac** with **Xcode** installed (from the App Store) and **Node 18+**
  (`node -v`). Install Node from <https://nodejs.org> if missing.
- David's **Apple Developer Program** account (paid). You'll either:
  - work **on David's Mac** (his Apple ID already signed into Xcode), **or**
  - be **invited to his team** (he does: App Store Connect → Users and Access → invite
    you as *Admin* or *Developer*), then sign into Xcode with your own Apple ID.
- The repo is public: <https://github.com/david-cui-bruno/personal-dashboard>

### ⚠️ do this first (one-time) — accept the Xcode license

Installing Xcode can leave the command line unable to run git/build tools until you
accept the license. Run:

```bash
sudo xcodebuild -license accept
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

(It'll ask for the Mac's password.) If you skip this, you'll see *"You have not agreed
to the Xcode license agreements"* on lots of commands.

### get the code

```bash
git clone https://github.com/david-cui-bruno/personal-dashboard.git
cd personal-dashboard
```

Everything below is run from inside that `personal-dashboard` folder.

---

# Part A — Desktop: sign, notarize & auto-update

**Goal:** produce a `notes-<version>-arm64.dmg` that (1) opens without the
right-click-→-Open dance, and (2) updates itself. The build config is already wired
(`desktop/package.json`, `desktop/build/entitlements.mac.plist`); you supply Apple
credentials.

## A1. Create a "Developer ID Application" certificate (one-time)

This is the certificate that signs apps distributed **outside** the App Store.

1. Open **Xcode** → menu **Xcode → Settings… → Accounts**.
2. Make sure David's Apple ID (the one on the Developer Program) is listed; if not,
   click **+** and sign in.
3. Select the account → click **Manage Certificates…** (bottom right).
4. Click the **+** → choose **Developer ID Application**. It appears in the list and is
   installed into the login Keychain.
5. Verify in Terminal:
   ```bash
   security find-identity -p codesigning -v
   ```
   You should see a line like `… "Developer ID Application: <Name> (XXXXXXXXXX)"`. The
   10 characters in parentheses are the **Team ID** — note it.

> If "Developer ID Application" is greyed out, the Apple ID isn't an *Account Holder/Admin*
> on the Developer Program, or the membership isn't active. Tell David.

## A2. App-specific password (for notarization) + Team ID

Apple requires notarization — Apple scans the app so macOS trusts it.

1. Go to <https://appleid.apple.com> → sign in as David → **Sign-In and Security** →
   **App-Specific Passwords** → **+** → name it `notes-notarize` → copy the password
   (looks like `abcd-efgh-ijkl-mnop`).
2. **Team ID**: from A1, or <https://developer.apple.com/account> → **Membership** →
   *Team ID* (10 chars).

Keep these two values handy. **Do not paste the app-specific password into chat,
commits, or anywhere public.** If you end up generating more than one app-specific
password, revoke the unused ones at appleid.apple.com afterward (hygiene only — extras
are harmless).

## A3. Build the signed + notarized `.dmg` (local)

From the repo root:

```bash
cd desktop
npm install                         # first time only
APPLE_ID="david@example.com" \
APPLE_APP_SPECIFIC_PASSWORD="abcd-efgh-ijkl-mnop" \
APPLE_TEAM_ID="XXXXXXXXXX" \
npm run dist:signed
```

(Replace the three values. Use David's real Apple ID email.)

This signs with the Developer ID cert (auto-found in the Keychain) and notarizes.
It takes a few minutes (notarization is a round-trip to Apple). When it finishes you'll
have:

```
desktop/dist/notes-<version>-arm64.dmg
```

## A4. Verify it's properly signed + notarized

```bash
# from desktop/
APP=dist/mac-arm64/notes.app
codesign --verify --deep --strict --verbose=2 "$APP"   # "valid on disk"
spctl -a -vvv -t install "$APP"                         # "accepted / source=Notarized Developer ID"
xcrun stapler validate "$APP"                           # "The validate action worked" (the .app is stapled)
```

> **Note:** validate the **`.app`**, not the `.dmg`. With this electron-builder path the
> `.app` inside is notarized **and stapled**, but the `.dmg` container itself is *not*
> stapled — that's expected and fine (Gatekeeper approves because the app within is). So
> `stapler validate` on the `.dmg` will fail; that's not a problem. (Confirmed shipping
> v0.1.0 this way.)

If the three checks above pass, double-clicking the `.dmg` and dragging **notes** to
Applications gives a clean install with no Gatekeeper warning. Hand the `.dmg` to David.

## A5. Turn on silent auto-update

Right now the app *notifies* about updates (because an unsigned app can't self-install).
Now that it's signed, enable true background updates:

1. Open `desktop/updater.js`, change:
   ```js
   const SILENT_INSTALL = false;
   ```
   to
   ```js
   const SILENT_INSTALL = true;
   ```
2. Commit it on a branch and open a PR (don't push straight to `main`):
   ```bash
   git checkout -b desktop/enable-silent-update
   git commit -am "desktop: enable silent auto-update now that builds are signed (#112)"
   git push -u origin desktop/enable-silent-update
   gh pr create --base main --fill   # or open the PR on github.com
   ```

After this, each published release (next step) downloads in the background and the app
offers "Restart to update."

## A6. Publish releases so auto-update has something to fetch

Two ways — **pick one.**

**Option 1 — automated (recommended): the GitHub Action.** A workflow already exists at
`.github/workflows/desktop-release.yml`. One-time setup:

1. Export the Developer ID cert as a `.p12`:
   - Open **Keychain Access** → **login** keychain → **My Certificates** → find
     *Developer ID Application: …* → right-click → **Export…** → save as
     `cert.p12` → set a password (remember it).
   - Base64-encode it:
     ```bash
     base64 -i cert.p12 | pbcopy   # now in your clipboard
     ```
2. On GitHub: repo → **Settings → Secrets and variables → Actions → New repository
   secret**, add these five:
   | secret | value |
   |---|---|
   | `MAC_CSC_LINK` | paste the base64 from your clipboard |
   | `MAC_CSC_KEY_PASSWORD` | the password you set on the `.p12` |
   | `APPLE_ID` | David's Apple ID email |
   | `APPLE_APP_SPECIFIC_PASSWORD` | the app-specific password from A2 |
   | `APPLE_TEAM_ID` | the 10-char Team ID |
3. Cut a release by pushing a tag (bump the version in `desktop/package.json` first if
   you like):
   ```bash
   git tag desktop-v0.1.0
   git push origin desktop-v0.1.0
   ```
   The Action builds, signs, notarizes, and publishes the `.dmg` + update feed to GitHub
   Releases automatically. Watch it under the repo's **Actions** tab.
4. Delete the local `cert.p12` when done.

**Option 2 — manual:** from `desktop/`, with the same `APPLE_*` env vars as A3 plus a
GitHub token:
```bash
GH_TOKEN="<a GitHub personal access token with repo scope>" \
APPLE_ID=… APPLE_APP_SPECIFIC_PASSWORD=… APPLE_TEAM_ID=… \
npm run release
```

Either way, because the repo is **public**, the app can read the release feed with no
token — auto-update just works for David.

## A7. Desktop troubleshooting

- **"skipped macOS notarization … unable to be generated"** → the `APPLE_*` env vars
  weren't set. Re-run A3 with all three.
- **"No identity found" / signs as ad-hoc** → the Developer ID cert isn't in the
  Keychain of the machine doing the build. Redo A1 there.
- **Notarization fails with an auth error** → the app-specific password is wrong/expired,
  or `APPLE_TEAM_ID` is wrong. Regenerate the password (A2).
- **Action fails decoding the cert** → `MAC_CSC_LINK` must be the **base64** of the
  `.p12` (use the exact `base64 -i` command), and `MAC_CSC_KEY_PASSWORD` must match.

---

# Part B — iOS app

**Goal:** run the native iOS app (a WebView wrapping the live web app) on the simulator,
then on David's iPhone. The Capacitor project is scaffolded in `mobile/`; you'll
generate the native iOS project and run it.

## B1. One-time setup

You already accepted the Xcode license (top of this doc). Also open **Xcode** once and
let it **install additional components** if it prompts.

## B2. Generate the iOS project

From the repo root:

```bash
cd mobile
npm install            # first time only
npm run add:ios        # creates mobile/ios/  (needs Xcode)
npm run sync           # copies config + runs CocoaPods (pod install)
```

If `add:ios`/`sync` complain that CocoaPods is missing:
```bash
sudo gem install cocoapods    # or: brew install cocoapods
```
then re-run `npm run sync`.

## B3. Open in Xcode, sign, and run

```bash
npm run open:ios       # opens mobile/ios/App/App.xcworkspace in Xcode
```

In Xcode:

1. In the left sidebar click the **App** project → select the **App** target.
2. Open the **Signing & Capabilities** tab.
3. Check **Automatically manage signing**.
4. Set **Team** to David's Apple Developer team (the dropdown).
5. If it complains the **bundle identifier** is taken, change it to something unique like
   `health.framewise.notes` (it should already be that) or append your initials.
6. **Run on the simulator:** at the top, pick a simulator (e.g. *iPhone 15*) from the
   device dropdown → press the **▶︎ Run** button. The app launches and loads notes.
7. **Run on David's iPhone:** plug it in (or pair over Wi-Fi), select it in the device
   dropdown, press ▶︎. The first time:
   - On the iPhone: **Settings → General → VPN & Device Management** → tap the developer
     profile → **Trust**.
   - Re-run from Xcode.

That's the whole loop. No App Store submission needed — David's paid account lets the app
run on his devices (the install lasts as long as the provisioning profile; with the paid
account that's a year, vs 7 days on a free one).

## B4. iOS troubleshooting

- **"Command Line Tools" vs Xcode** → `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
- **`pod: command not found`** → install CocoaPods (B2).
- **Signing error "no profiles found"** → make sure the **Team** is selected and
  *Automatically manage signing* is checked; let Xcode create the profile.
- **White screen / can't load** → the app loads the live site
  (`https://notes-framewise-health.vercel.app`); confirm the phone/simulator has internet.

---

# what to report back

When you're done (or stuck), tell David / send back:

- ✅ Part A: the signed `.dmg` (or confirmation the GitHub Action published a release),
  and the output of the three verify commands in A4.
- ✅ Part B: confirmation the app ran on the simulator and/or his iPhone (a screenshot is
  great).
- The **Team ID** (safe to share). **Never** share the app-specific password, the `.p12`,
  or its password in plain text — those go only into the Keychain / GitHub Secrets.
- Anything that failed, with the exact error text.

> Reference: the "why" behind all of this is in `docs/decisions.md` (#110 desktop,
> #112 auto-update, #113 iOS) and `docs/architecture.md`. The app itself needs no changes.
