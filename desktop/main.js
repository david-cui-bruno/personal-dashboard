// notes — Electron desktop shell (#110).
//
// Hosted-URL wrapper, the same strategy as the planned Capacitor mobile shell
// (#082): the window simply points at the running notes web app. Connection is
// required anyway (#084), so there is no static export or bundled server — dev
// loads the local Next dev server, a packaged build loads production.
//
// CommonJS on purpose: this file runs in Electron's Node main process, separate
// from the Next/React app (which keeps owning everything under src/).
const { app, BrowserWindow, Menu, shell } = require("electron");
const { initAutoUpdate } = require("./updater");

const PROD_URL = "https://notes-framewise-health.vercel.app";
const DEV_URL = "http://localhost:3000";

// Precedence: explicit APP_URL override → dev server (unpackaged) → production.
const APP_URL = process.env.APP_URL || (app.isPackaged ? PROD_URL : DEV_URL);

// SMOKE=1 loads the app, reports the result, and quits — a headless sanity check
// that the shell boots and the page resolves, without leaving a window open.
const SMOKE = process.env.SMOKE === "1";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 360, // the app's mobile layout (bottom nav) holds up when narrow
    minHeight: 480,
    backgroundColor: "#ffffff",
    title: "notes",
    titleBarStyle: "hiddenInset", // native mac inset traffic-lights; calm chrome
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const target = mainWindow.webContents;

  // Same-origin navigations stay in the window; anything else (a link in a note,
  // OAuth, etc.) opens in the user's real browser.
  const isAppOrigin = (url) => {
    try {
      return new URL(url).origin === new URL(APP_URL).origin;
    } catch {
      return false;
    }
  };

  target.setWindowOpenHandler(({ url }) => {
    if (!isAppOrigin(url)) {
      void shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  target.on("will-navigate", (event, url) => {
    if (!isAppOrigin(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  if (SMOKE) {
    target.on("did-finish-load", () => {
      console.log(`[smoke] loaded ${APP_URL} ok`);
      app.exit(0);
    });
    target.on("did-fail-load", (_e, code, desc, url) => {
      console.error(`[smoke] failed to load ${url}: ${code} ${desc}`);
      app.exit(1);
    });
  }

  void mainWindow.loadURL(APP_URL);
}

// A minimal, mostly role-based menu so the native shortcuts work (⌘C/⌘V/⌘Q,
// reload, fullscreen). Dev builds also expose the devtools toggle.
function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac
      ? [{ role: "appMenu" }]
      : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        ...(app.isPackaged ? [] : [{ role: "toggleDevTools" }]),
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  if (!SMOKE) initAutoUpdate(); // check for updates on launch (packaged builds only)

  // macOS: re-create the window when the dock icon is clicked and none are open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Standard mac behaviour: stay running when all windows close (dock icon).
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
