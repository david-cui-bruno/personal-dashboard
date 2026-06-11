// Auto-update for the desktop shell (#110).
//
// Uses electron-updater against GitHub Releases. IMPORTANT macOS reality: Squirrel.Mac
// will only *silently install* an update for a **code-signed** app. This build is
// currently unsigned (signing needs an Apple account — #086), so we run in
// "notify + open" mode: on launch we check the release feed and, if a newer version
// exists, offer to open the download page. The bytes themselves are not auto-applied.
//
// Once the app is signed + notarized, flip ONE switch (see SILENT_INSTALL below) to get
// true background download + restart-to-apply. The publish config + `npm run release`
// already produce the feed (latest-mac.yml) that this reads.
const { app, dialog, shell } = require("electron");

const RELEASES_PAGE = "https://github.com/david-cui-bruno/personal-dashboard/releases";

// Set to true only after the app is code-signed + notarized (#086). Until then,
// silent install fails on macOS, so we keep it false and notify instead.
const SILENT_INSTALL = false;

function initAutoUpdate() {
  // The updater is a no-op in dev (there's no packaged app to replace).
  if (!app.isPackaged) return;

  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch {
    // electron-updater not installed in this build — skip silently.
    return;
  }

  autoUpdater.autoDownload = SILENT_INSTALL;
  autoUpdater.autoInstallOnAppQuit = SILENT_INSTALL;

  autoUpdater.on("update-available", async (info) => {
    if (SILENT_INSTALL) return; // it'll download + prompt to restart below
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Get update", "Later"],
      defaultId: 0,
      cancelId: 1,
      message: `notes ${info.version} is available`,
      detail: "You're on an older version. Open the download page to update?",
    });
    if (response === 0) void shell.openExternal(RELEASES_PAGE);
  });

  // Only used when SILENT_INSTALL is on (signed builds).
  autoUpdater.on("update-downloaded", async (info) => {
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      message: `notes ${info.version} is ready`,
      detail: "Restart to apply the update.",
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  // Network hiccups / a private-repo feed that isn't reachable shouldn't ever surface
  // an error dialog on launch — fail quiet.
  autoUpdater.on("error", () => {});

  autoUpdater.checkForUpdates().catch(() => {});
}

module.exports = { initAutoUpdate };
