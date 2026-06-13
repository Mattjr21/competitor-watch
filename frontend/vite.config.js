import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@benchmark-catalog": path.resolve(repoRoot, "benchmark_profiles.json"),
    },
  },
  server: {
    proxy: {
      // Local dev pulls live data straight from the deployed Render backend,
      // so no local Python server is required. In production the same /api
      // paths are served by server.py on the same origin.
      "/api": {
        target: "https://competitor-watch-1.onrender.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
