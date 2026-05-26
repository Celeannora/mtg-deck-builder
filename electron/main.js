/**
 * Electron main process — MTG Deck Builder
 *
 * Architecture: Electron wraps the Vite-built React app in a BrowserWindow.
 * - In development (`npm run electron:dev`): loads http://localhost:5173
 * - In production (`npm run electron:preview`): loads the built dist/index.html
 *
 * IndexedDB (Dexie) runs entirely in the renderer's Chromium context —
 * no IPC bridge needed. This keeps the existing data layer untouched.
 */

const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");
const { existsSync } = require("fs");

const isDev = process.env.NODE_ENV === "development" || process.argv.includes("--dev");

const WINDOW_CONFIG = {
  width: 1400,
  height: 900,
  minWidth: 800,
  minHeight: 600,
  title: "MTG Deck Builder",
  show: false, // avoid white flash; shown after 'ready-to-show'
  backgroundColor: "#09090b", // zinc-950 — matches the app's bg
  webPreferences: {
    preload: path.join(__dirname, "preload.js"),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  },
};

function createWindow() {
  const win = new BrowserWindow(WINDOW_CONFIG);

  // Show only after the renderer is ready — prevents white-flash on startup
  win.once("ready-to-show", () => win.show());

  // Open external links in the system browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  if (isDev) {
    // Vite dev server
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // Production build
    const distIndex = path.join(__dirname, "..", "dist", "index.html");
    if (!existsSync(distIndex)) {
      win.loadURL(`data:text/html,<h1>Run <code>npm run build</code> first.</h1>`);
    } else {
      win.loadFile(distIndex);
    }
  }

  return win;
}

// Build a minimal native menu (removes the default Electron boilerplate)
function buildMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { role: "front" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed (Windows/Linux)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
