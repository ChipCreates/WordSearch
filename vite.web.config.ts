import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";

const pkg = JSON.parse(fs.readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

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
        // Keep the install payload focused on the app shell and core data.
        // Optional art, music, and feature chunks are cached on demand below.
        globPatterns: ["**/*.{js,css,html,ico,svg,webmanifest}", "dictionary.json"],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/backgrounds\/.*\.(?:png|jpg|jpeg|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "word-sprout-backgrounds",
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/(?:plants|achievements|powerups|avatars|navigation)\/.*\.(?:png|jpg|jpeg|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "word-sprout-optional-art",
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/sounds\/.*\.mp3$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "word-sprout-audio",
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  base: "/WordSprout/",
  build: {
    outDir: "dist-web",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "mui-vendor": ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
        },
      },
    },
  },
});
