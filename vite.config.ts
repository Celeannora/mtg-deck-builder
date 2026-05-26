import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
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
          // Split vendor libs so the main bundle stays small
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
