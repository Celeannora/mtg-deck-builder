/**
 * Electron preload script.
 *
 * Runs in a privileged context before the renderer loads. Because
 * contextIsolation is enabled and nodeIntegration is disabled, this is
 * the safe bridge between renderer and main process.
 *
 * Currently exposes only the platform string so the renderer can adapt
 * (e.g. show Cmd vs Ctrl in keyboard shortcut hints). Extend via
 * contextBridge.exposeInMainWorld as IPC needs grow.
 */

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  /** 'darwin' | 'win32' | 'linux' */
  platform: process.platform,

  /** App version from package.json (injected by electron-builder) */
  appVersion: process.env.npm_package_version ?? "dev",
});
