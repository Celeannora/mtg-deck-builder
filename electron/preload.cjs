/* eslint-disable @typescript-eslint/no-require-imports */
// Preload runs in a sandboxed context — only expose what the renderer needs.
// Right now the app is fully client-side (IndexedDB via Dexie), so no IPC
// bridges are needed. This file exists as the correct hook point for future
// native integrations (e.g. file system exports, OS notifications).
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  // Example future bridge:
  // exportDeck: (content) => ipcRenderer.invoke('export-deck', content),
});
