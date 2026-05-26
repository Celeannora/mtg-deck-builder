import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          dexie: ["dexie", "dexie-react-hooks"],
          zustand: ["zustand"],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
