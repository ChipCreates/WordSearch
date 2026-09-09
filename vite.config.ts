import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// Dev-only write-back for the in-app trail editor (?trailEditor=true, see
// src/debug/debugMode.ts). `apply: 'serve'` keeps it out of `build`/
// `build:web` entirely -- it never ships. The editor POSTs the full
// TrailLayout JSON here; this writes it straight to src/data/trailLayout.json
// so Vite's own watcher HMRs the change right back into the page.
function trailEditorSavePlugin(): Plugin {
  const target = path.resolve(__dirname, "src/data/trailLayout.json");
  return {
    name: "ws-trail-editor-save",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__ws-trail-editor/save", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (!data || typeof data !== "object" || !data.stones || !data.pathPoints || !Array.isArray(data.transitions)) {
              throw new Error("Payload is missing stones/pathPoints/transitions");
            }
            fs.writeFileSync(target, JSON.stringify(data, null, 4) + "\n", "utf-8");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), trailEditorSavePlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "mui-vendor": ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
        },
      },
    },
  },
}));
