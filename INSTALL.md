# Installing & Building Word Sprout

Looking for what the game actually *is*? That's in the [README](README.md). This page is just the nuts and bolts: how to get it running, on whatever you've got.

## Play it

| Platform | How |
|---|---|
| **Web** | Open **[chipcreates.github.io/WordSprout](https://chipcreates.github.io/WordSprout/)** in any modern browser. On iPhone/Mac Safari, use Share → "Add to Home Screen" for a full-screen, offline-capable app. |
| **Desktop** | Download a prebuilt Windows, macOS, or Linux binary from [Releases](../../releases/latest), or build from source (see below). |
| **Android** | Download the APK from [Releases](../../releases/latest), or build from source (see below). |

## How to install and run

Prebuilt Windows, macOS, Linux, and Android binaries for every tagged version are published automatically to the [Releases page](../../releases/latest) by [`.github/workflows/release.yml`](.github/workflows/release.yml). None of these are signed by a certificate registered with Microsoft, Apple, a Linux distro, or Google Play, so you'll see an "unknown publisher"-style warning the first time you install one — that's expected for a self-published indie app, not a sign of tampering.

| Platform | File | Steps |
|---|---|---|
| **Windows** | `.msi` or `-setup.exe` | Run the installer. Windows SmartScreen will warn about an unrecognized publisher — click "More info" → "Run anyway". |
| **macOS** | `.dmg` | Open the disk image and drag the app to Applications. Gatekeeper will refuse to open an unsigned app on first launch — right-click (or Control-click) the app → "Open" → "Open" again to confirm, or run `xattr -cr /Applications/Word\ Sprout.app` in Terminal. Universal binary — runs natively on both Intel and Apple Silicon. |
| **Linux** | `.AppImage` | `chmod +x Word-Sprout_*.AppImage && ./Word-Sprout_*.AppImage` |
| **Linux (Debian/Ubuntu)** | `.deb` | `sudo dpkg -i word-sprout_*.deb` |
| **Android** | `.apk` | Download on-device (or transfer over), tap the file, and allow "install from unknown sources" for your browser/file manager when prompted. |

## Tech stack

- **Frontend**: React 19, TypeScript, Vite, MUI (Material UI)
- **Desktop/Android shell**: [Tauri v2](https://tauri.app/) — Rust backend, native webview
- **Rendering**: the letter grid and celebration animation are hand-drawn on `<canvas>`, not DOM elements
- **Web build**: a separate Vite config/target (`vite.web.config.ts`) with [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for the service worker and manifest — deployed to GitHub Pages via GitHub Actions on every push to `master`

### One codebase, three targets

The Tauri desktop/Android app gets puzzle words and bonus-word validation from Rust (`src-tauri/src/categories.rs`, `dictionary.rs`) over IPC. The web build has no Tauri runtime to call into, so [`src/backend.ts`](src/backend.ts) picks between the real IPC call and a local-JS equivalent at runtime, based on whether the Tauri bridge is actually present. `public/dictionary.json` and `src/webCategories.json` are generated directly from the Rust source, not hand-transcribed, so the web build's word lists stay in exact sync with what the native apps ship.

## Building from source

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform
- For Android: [Android Studio](https://developer.android.com/studio) (SDK + NDK) and a configured `ANDROID_HOME`/`NDK_HOME`

```bash
npm install
```

### Debug panel

Any dev server (`npm run dev`, `npm run tauri dev`, or `npm run preview:web` after a dev build)
answers `?debug=true` with a debug panel that can force any board size (4x4-12x12 with a real,
solvable puzzle), unlock/lock any achievement, own or bloom any plant, jump to any Botanist rank,
and grant or fire any power-up — all without touching your real save (autosave is disabled while
the panel is active). Press **Ctrl+Shift+H** (rebindable from the panel) to hide the panel/banner
for a clean screenshot.

It's gated on `import.meta.env.DEV` in a shape Vite/Rollup dead-code-eliminates for good in a
production build (`npm run build`/`npm run build:web`) -- there's no `DebugPanel` chunk, marker
string, or reachable code path in `dist`/`dist-web` at all. `scripts/check-build-budget.mjs`
greps every production build's output for that marker and fails the build if it's ever present;
`.github/workflows/deploy-web.yml` runs it on every deploy.

### Trail editor

Also dev-only: `?trailEditor=true` (or **Open Trail Editor** in the debug panel above) turns the
real Levels map into a drag-to-place editor for every stone, curve handle, and biome-transition
seam -- no more hand-tuned `[x%, y%]` tuples. See
[`docs/dev-tools/trail-editor.md`](docs/dev-tools/trail-editor.md) for how it works, its data
model, and a heads-up that -- unlike the debug panel above -- it isn't fully dead-code-eliminated
from production yet.

### Desktop

```bash
npm run tauri dev      # dev, with hot reload
npm run tauri build    # production build
```

### Android

```bash
npm run tauri android dev              # dev, on an emulator or connected device
npm run tauri android build -- --debug # debug APK
npm run tauri android build            # release build
```

### Web (PWA)

A separate build target from the Tauri app — same game, no Tauri runtime required.

```bash
npm run build:web      # outputs to dist-web/
npm run preview:web    # serve the production build locally
```

Pushes to `master` that touch the app automatically rebuild and redeploy the web build to GitHub Pages via [`.github/workflows/deploy-web.yml`](.github/workflows/deploy-web.yml).

## Releasing

Push a tag like `v0.3.0` to trigger [`.github/workflows/release.yml`](.github/workflows/release.yml), which builds Windows, macOS (universal), and Linux desktop binaries plus the signed Android APK, and attaches all of them to a draft GitHub Release for you to review and publish.

## Credits

Category background art sourced from Pixabay — see [`public/backgrounds/CREDITS.md`](public/backgrounds/CREDITS.md) for full attribution.
