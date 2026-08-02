import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Separate from vite.config.ts (which is tuned for `tauri dev`/`tauri build`
// -- fixed port, HMR websocket, watch-ignore src-tauri) on purpose: this is
// the plain static web build published to GitHub Pages, a distinct target
// from the Tauri desktop/Android app, not a replacement for it. Outputs to
// dist-web/ (not dist/, which is what tauri.conf.json's frontendDist points
// at) so the two builds never collide. VitePWA (service worker + manifest)
// is only registered here, so the Tauri build is completely unaffected.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "favicon.png"],
      manifest: {
        name: "Word Sprout",
        short_name: "Word Sprout",
        description: "A themed word search game",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#121212",
        theme_color: "#121212",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Default globPatterns is js/css/html/ico/png/svg only -- misses
        // the category background .jpg art, dictionary.json (the bonus-
        // word list), and the background music/SFX .mp3 files, all of
        // which need to be precached for the game to actually work offline
        // once installed.
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,json,webmanifest,mp3}"],
        // The 125k-word dictionary.json (~1.4MB) needs an explicit bump --
        // workbox's default precache limit is 2MB total, and this one file
        // alone is a meaningful chunk of that budget on top of the app
        // bundle and every background image.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  base: "/WordSearch/",
  build: {
    outDir: "dist-web",
  },
});
