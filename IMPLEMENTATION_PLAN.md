# Word Sprout — Remediation Implementation Plan

## Context

`ARCHITECTURE_AUDIT.md` (project root) documents 19+ findings across functional bugs, UX/UI drift, architecture, performance, security, and sovereignty — plus a revised architectural doctrine tailored to what this game actually is (a turn-based, pointer-driven puzzle, not a real-time WASM-simulated engine). This plan turns that audit into sequenced, executable work.

**Two things shape the sequencing below:**
1. **Dependency order, not just severity.** Icon migration needs to happen before the color-token sweep touches the same files. Test tooling needs to exist before later phases can be verified by it. Dead-code removal is deferred past everything else so it never competes with active fixes for the same files.
2. **Asset generation via Stitch MCP.** This plan will be executed in Google Antigravity, where the Stitch MCP tool is available. Phases 3 and 4 include explicit Stitch-generation tasks with exact specs (dimensions, style reference, transparent background) derived from the actual existing asset files, not placeholders.

**Out of scope, deliberately:** building a real seeds-spending economy (Phase 6 aligns copy with what exists instead — a real economy is a feature request, not a remediation item), and generating background art for the ~34 categories that currently fall back to `DEFAULT_THEME` (listed as an optional backlog item at the end — the audit rated this Low/intentional, not a required fix).

---

## Phase 1 — Critical Functional Fixes

No dependencies. Ship first — these are the bugs a player hits immediately.

**1.1 — Level select must navigate, not reset.**
In `src/hooks/useWordSearchGame.ts`, add `const goToLevel = (lvl: number) => setLevel(lvl);` alongside the existing `nextLevel`/`restart`, and export it. In `src/App.tsx`, change the `LevelsDialog`'s `onSelectLevel` prop from `() => { restart(); }` to `(lvl) => { goToLevel(lvl); }`. `initGame` already regenerates the puzzle on any `level` change via its existing `useEffect([level, difficultyMode])`, so no other change is needed — going to a lower level doesn't affect `stars`/`levelsCompleted`/achievements, which is correct (they only change on actual completion).

**1.2 — Give "Shuffle" and sidebar "Restart" distinct, non-destructive meanings.**
Currently both call `restart()` (full wipe to level 1, 0 stars) — that's the bug. Add two new functions to `useWordSearchGame.ts`:
- `reshuffle()` — calls the existing `initGame()` again for the *current* level/tier. This re-rolls the grid layout and re-picks the word subset from the category pool (via `getPuzzleWords`), giving a genuinely fresh puzzle without touching `level` or `stars`.
- `retryLevel()` — clears `foundWords`, `foundLines`, and `levelComplete` for the *existing* `gridData` (no regeneration) — a "start this exact grid over" action.

Wire in `App.tsx`: the "Shuffle" sidebar button → `reshuffle()`; the sidebar "Restart" button → `retryLevel()`. Leave `SuccessScreen`'s "Restart Game" button as the only caller of the real `restart()` — it's the one place a full wipe is explicitly labeled and deliberately chosen.

**1.3 — Return the real achievement stats from the hook.**
`useWordSearchGame.ts` already tracks `categoriesSeen` (a `Set<string>`) and `foundDiagonal` (`boolean`) correctly for unlock logic — it just never returns them. Add both to the hook's return object (`categoriesSeen` as the `Set`, `foundDiagonal` as-is). In `App.tsx`, delete the hardcoded `categoriesSeen: 3, foundDiagonal: true` literals passed to `AchievementsView`'s `stats` prop and replace with `categoriesSeen: categoriesSeen.size, foundDiagonal`.

---

## Phase 2 — Test & Tooling Foundation

Introduced now (not at the end) so every later phase has somewhere to put a regression test as it lands, instead of one big deferred test-writing phase.

**2.1 — Add Vitest.** `npm install -D vitest`. Add a `"test": "vitest run"` script to `package.json`. Vitest is the natural choice here — same config surface as the existing Vite setup, ESM-native, no separate transform pipeline to maintain.

**2.2 — First tests: lock in Phase 1's fixes.** Create `src/hooks/useWordSearchGame.test.ts` covering: `goToLevel` changes `level` without touching `stars`; `reshuffle` preserves `level`/`stars` but produces a new `gridData`; `retryLevel` clears `foundWords`/`foundLines` without changing `gridData`; the hook's returned `categoriesSeen`/`foundDiagonal` reflect what `evaluateAchievements` actually receives.

**2.3 — Rust side: `cargo test` smoke tests.** In `src-tauri/src/lib.rs`, add `#[test]` functions asserting `get_puzzle_words` never panics across the full level range for both tiers, and `validate_word` returns `false` (never panics) for empty strings, non-alphabetic input, and very long strings.

---

## Phase 3 — Icon System Migration (drop the Google Fonts CDN)

Resolves the CSP-blocked icon font (functional finding) and the desktop/Android-vs-web rendering divergence (cross-platform finding) in one pass — this is the same underlying fix for both.

**3.1 — Inventory.** Every `material-symbols-outlined` usage across `src/App.tsx`, `src/components/GardenView.tsx` maps to one of these 21 glyphs: `eco, emoji_events, settings, lock, check_circle, videogame_asset, spa, shuffle, refresh, magic_button, help_outline, grid_view, format_list_bulleted, dark_mode, light_mode, music_note, music_off, shower, volume_off, volume_up, water_drop`.

**3.2 — Swap 19 of 21 glyphs for existing `@mui/icons-material` components** (already a dependency, already used in `AboutDialog.tsx`/`LevelsDialog.tsx`/`SettingsDialog.tsx` — this extends an existing pattern, not a new one). Confirmed available exports: `EmojiEventsOutlined, SettingsOutlined, LockOutlined, CheckCircleOutlined, VideogameAssetOutlined, SpaOutlined, ShuffleOutlined...` (verify the `Outlined`-suffixed variant exists for each at implementation time; fall back to the bare/default-style export where a given icon doesn't have one).
- `magic_button` → `AutoFixHigh` (a wand-with-sparkles icon — the closest stock semantic match for the "Reveal Root" hint action; no exact "magic_button" equivalent exists in this icon set).

**3.3 — Generate the one glyph with no adequate stock match: `eco`.** This is the single most-used icon (brand wordmark, Garden nav tab, primary "Next Level" action) and `@mui/icons-material` has **no `Eco` export at all** (confirmed — neither the base nor any styled variant). Stock substitutes (`Park`, `Forest`, `Grass`) are literal park/tree icons, not a clean minimal leaf glyph, and would look like the odd one out next to the rest of the (thin-stroke, outlined-style) icon set.
- **Stitch MCP task:** generate a single-color, outline-style leaf/sprout glyph icon as an SVG, stroke-based (not filled), visually consistent with Material Symbols Outlined's ~2px stroke weight at 24×24 viewBox, transparent background, exportable as a React component or raw SVG usable with `currentColor` so it inherits text color/theme automatically (matching how the ligature icons currently pick up color via CSS). Save as `src/components/icons/EcoLeaf.tsx` (a tiny local SVG-wrapped component, same call signature as an MUI icon: `<EcoLeaf sx={{ fontSize: 32 }} />` or a plain `<svg>` sized via `width`/`height` props — match whichever call sites in `App.tsx` need it).

**3.4 — Remove the CDN dependency.** Delete the `<link href="https://fonts.googleapis.com/...">` line from `index.html`. No CSP changes needed — this removes the network dependency entirely rather than trying to allow-list it, which is the correct fix per the sovereignty principle (no silent third-party network calls, not even for icons).

**3.5 — Test:** a lightweight render test (`src/App.icons.test.tsx`) asserting the app mounts with zero `material-symbols-outlined` classNames remaining in the rendered tree — a regression guard against the CDN dependency creeping back in.

---

## Phase 4 — Visual Asset Remediation via Stitch MCP

Fixes the "13 achievements share 9 images" and "4 garden plants borrow achievement art" findings by generating the actual missing assets, rather than papering over them with emoji fallbacks.

**4.1 — Reference spec (derived from existing files, confirmed via `identify`):** all existing achievement and plant art in `public/achievements/` and `public/plants/` is **1024×1024 PNG, transparent background, glossy bioluminescent-emerald botanical illustration style** (glowing terrarium/medallion aesthetic matching the "Verdant Sprout" design language in `App.css`'s `--color-primary`/glow tokens). New assets must match this spec exactly so they don't stand out from the existing set.

**4.2 — Achievement badges to generate (4):** each a circular/medallion-style badge icon, 1024×1024 PNG, transparent background, matching the existing badge set's glow/style:

| File | For achievement | Visual cue from its description |
|---|---|---|
| `public/achievements/moss-mystic.png` | Moss Mystic | glowing purple/violet crystal-ball or rune motif ("use the Hint spell") |
| `public/achievements/midnight-sun.png` | Midnight Sun | yin-yang or eclipse motif, dark background with a glowing green crescent/circle |
| `public/achievements/daily-dew.png` | Daily Dew | a water droplet on a leaf, soft blue-green glow |
| `public/achievements/static-charge.png` | Static Charge | a lightning-bolt-through-leaf motif, sharper/brighter glow than the others |

**4.3 — Plant illustrations to generate (4):** each a full terrarium/plant illustration, 1024×1024 PNG, transparent background, matching the existing plant set's style (`moss-sprout.png`, `emerald-fern.png`, `bio-orchid.png`, `midnight-lotus.png`):

| File | For plant | Visual cue from its description |
|---|---|---|
| `public/plants/golden-sunflower.png` | Golden Sunflower | a glowing golden sunflower in a geometric glass terrarium |
| `public/plants/bonsai-bloom.png` | Bonsai Bloom | a miniature ancient bonsai tree, bioluminescent moss at its base |
| `public/plants/crystal-succulent.png` | Prismatic Echeveria | a succulent with crystalline, light-refracting leaf tips |
| `public/plants/solar-vine.png` | Solaris Vine | a climbing golden vine on a trellis, illuminated arches |

**4.4 — Wire them in.** In `src/achievements.ts`, change `moss-mystic`, `midnight-sun`, `daily-dew`, and `static-charge` from their current borrowed `image` paths to their new dedicated files. In `src/components/GardenView.tsx`, do the same for `golden-sunflower`, `bonsai-bloom`, `crystal-succulent`, `solar-vine`. No component logic changes — both `AchievementsView`/`AchievementBanner`/`GardenView` already just render whatever `image` path they're given.

---

## Phase 5 — Design Token Unification

Fixes the core "two color systems, already out of sync" finding. Recommended approach and why, over the alternatives considered:
- ❌ *Read CSS custom properties into `theme.ts` via `getComputedStyle` at module-load time* — risky: a production build's stylesheet is loaded via a render-blocking `<link>`, but script module evaluation isn't guaranteed to wait for it, so this could silently read empty values on some builds.
- ❌ *Pass `var(--color-primary)` strings straight into MUI's palette* — breaks anywhere MUI or `theme.ts` derives a color via `alpha()`/`lighten()`/`darken()`, which expects a real parsable color, not a CSS variable reference.
- ✅ **Single plain-object TS token module, both `theme.ts` and `App.css` build from it, with a test enforcing they match.**

**5.1 — Create `src/theme/tokens.ts`** exporting `{ sprout: {...}, midnight: {...} }`, each a flat object of the same hex values currently duplicated across `App.css`'s `:root`/`[data-theme="midnight"]` blocks and `theme.ts`'s two `createTheme` calls (one field per token: `colorPrimary`, `colorSecondary`, `colorSurface`, etc. — mirror the existing `--color-*` naming so the mapping is obvious).

**5.2 — Refactor `theme.ts`** to import from `tokens.ts` and build both `sproutLightTheme`/`sproutDarkTheme` palettes from it instead of separate hardcoded hex literals. This is the fix for the MUI-vs-CSS-var drift (`#00e479` vs `#95d4b3` in Midnight mode) — after this, there's exactly one place either value can be edited.

**5.3 — Update `App.css`'s two `:root` blocks** to reference the same values (still plain CSS hex, since CSS can't import a TS module directly) with a comment: `/* keep in sync with src/theme/tokens.ts — see tokens.sync.test.ts */`.

**5.4 — Add the sync guard test:** `src/theme/tokens.sync.test.ts` — reads `App.css` as text, extracts each `--color-*: #hex;` declaration via a small regex, and asserts each one equals the corresponding value in `tokens.ts`. This is what turns "silent drift" into "a failing test," proportionate to a project this size (no build-time CSS generation pipeline needed).

**5.5 — Sweep hardcoded glow colors.** Add `--color-primary-rgb` (and any other frequently-glowed token) as a comma-triplet alongside the existing hex token in both `App.css` blocks (e.g. `--color-primary-rgb: 15, 82, 56;` for Sprout, `0, 228, 121` for Midnight) — sourced from the same `tokens.ts` values, covered by the same sync test. Then replace every hardcoded `rgba(0, 228, 121, …)` across `App.tsx`, `GardenView.tsx`, `AchievementsView.tsx`, `AchievementBanner.tsx` with `rgba(var(--color-primary-rgb), …)`, preserving each call site's existing alpha value. This is a mechanical, file-by-file sweep — grep for `rgba(0, 228, 121` and `rgba(0,228,121` to find every instance.

---

## Phase 6 — Content & Economy Honesty

**6.1 — Rewrite achievement descriptions** in `src/achievements.ts` so each description states what its `getProgress` function actually measures (levels completed, stars/seeds earned, categories seen, or the diagonal-word flag) instead of the current fictional mechanics (timers, combos, streaks, biome-specific flower collection). Keep the whimsical tone; drop the false specificity.

**6.2 — Garden seed economy.** `handleWaterPlant` in `GardenView.tsx` doesn't spend anything — building a real spend/deduct system is out of scope for this pass (see Context). Fix: remove the `"(10 SEEDS)"` label and the "using harvested SEEDS" copy from the header description; keep "Water Sprout" as the free cosmetic action it already functions as, so the UI stops promising an economy that doesn't exist.

**6.3 — Footer honesty**, `src/App.tsx`:
- Version: replace the hardcoded `v1.2.0-beta` with the real value. Add `define: { __APP_VERSION__: JSON.stringify(pkg.version) }` to **both** `vite.config.ts` and `vite.web.config.ts` (reading `pkg` from `package.json`), declare the global in `src/vite-env.d.ts`, and render `__APP_VERSION__` in the footer.
- Copyright year: replace the hardcoded `2024` with `new Date().getFullYear()`.
- Legal links: remove the dead `href="#"` "Terms of Service" and "Privacy Policy" links entirely (nothing backs them). Replace "Support" with a real link to the GitHub repo (reuse the URL already in `AboutDialog.tsx`).

---

## Phase 7 — Dead Code Removal

Deferred to here so it never conflicts with active edits to the same directory in earlier phases.

**7.1 — Delete** `src/components/GardenDialog.tsx`, `src/components/AchievementsDialog.tsx`, `src/components/WordList.tsx`. Confirm zero remaining imports first (`grep -rn "GardenDialog\|AchievementsDialog\|WordList" src/` should return nothing outside the files themselves).

---

## Phase 8 — Sovereign Persistence Migration

Fixes the doctrine's one hard, unambiguous violation: save data lives in `localStorage`, not a real, user-owned file.

**8.1 — Split "save data" from "ephemeral UI state."** Save data (migrates): `level`, `stars`, `unlockedAchievements`, `levelsCompleted`, `categoriesSeen`, `foundDiagonal`, `difficultyMode` — the seven keys currently read/written in `useWordSearchGame.ts`. Ephemeral UI state (stays in `localStorage`, on every platform): theme mode (`App.tsx`), music/SFX mute+volume (`useAudio.ts`) — cosmetic device preferences, not progress.

**8.2 — Consolidate save data into one versioned blob.** Define `type SaveDataV1 = { schemaVersion: 1; level: number; stars: number; unlockedAchievements: string[]; levelsCompleted: number; categoriesSeen: string[]; foundDiagonal: boolean; difficultyMode: Tier }` in a new `src/save.ts`.

**8.3 — Add `@tauri-apps/plugin-store` + Rust plugin registration.** `npm install @tauri-apps/plugin-store`; add the corresponding Rust crate to `src-tauri/Cargo.toml` and register it in `src-tauri/src/lib.rs`'s `tauri::Builder` (`.plugin(tauri_plugin_store::Builder::default().build())`); grant it in `src-tauri/capabilities/default.json` (add the plugin's default permission, scoped to the app data directory only). This is a JSON-file-backed key/value store maintained by the Tauri org — it gives a real, discoverable file on disk with almost no custom Rust code, which is the right amount of infrastructure for seven scalar/array values.

**8.4 — `src/save.ts` mirrors `backend.ts`'s existing `isTauri()` split** (same pattern already established for puzzle generation — don't invent a new convention): on Tauri, load/save through the store plugin; on web, load/save the same `SaveDataV1` shape as a single JSON blob under one `localStorage` key (`wordsearch.save`) instead of seven separate keys.

**8.5 — One-time migration for existing players.** On load, if no versioned save exists yet (Tauri: store file absent; web: `wordsearch.save` key absent), read the seven legacy `localStorage` keys (still present in the Tauri webview even though they're being retired), run the existing backfill logic already in `useWordSearchGame.ts` (the `categoriesSeen`/`levelsCompleted` reconciliation), and write the result out as a `schemaVersion: 1` blob. Leave the old keys in place afterward rather than deleting them — safer than proactively removing something that isn't causing harm.

**8.6 — Replace the ad-hoc backfill with real migration branching.** Future shape changes become `if (raw.schemaVersion === 1) { /* migrate to 2 */ }` inside `save.ts`'s loader, rather than another one-off patch embedded in hook initialization.

**8.7 — Test:** `src/save.test.ts` — round-trips a `SaveDataV1` object through both the web (`localStorage`) and legacy-migration code paths; asserts a missing/corrupt blob falls back to sane defaults without throwing.

---

## Phase 9 — Security, Reliability & Performance Cleanup

Smaller, independent fixes — no ordering dependency on each other, grouped here because each is a one-file, low-risk change.

**9.1 — Gate Tauri devtools to debug builds.** In `src-tauri/Cargo.toml`, remove `"devtools"` from the `tauri` dependency's `features` list. Tauri's own default behavior (devtools available in debug, disabled in release) is correct as-is — the explicit feature flag was overriding that default for every build, including release.

**9.2 — Remove the per-call dynamic import in `backend.ts`.** Replace the `await import("@tauri-apps/api/core")` inside `getPuzzleWords`/`validateWord` with a static top-level `import { invoke } from "@tauri-apps/api/core";`. Safe in the web build too — importing the module has no side effect; only calling `invoke()` requires the Tauri bridge, and that call is already gated behind the existing `isTauri()` check.

**9.3 — Stabilize `dismissJustUnlocked`.** Wrap it in `useCallback` in `useWordSearchGame.ts` (`useCallback(() => setJustUnlocked(prev => prev.slice(1)), [])`) so `AchievementBanner`'s `window` click/touchstart listeners aren't torn down and rebuilt on every unrelated re-render.

**9.4 — Hoist the celebration-loop `Map` allocation.** In `GameCanvas.tsx`, move `pillColorByCell` construction out of `draw()` and into a `useMemo`/ref recomputed only when `foundLines` changes, not on every rAF tick during the celebration animation. `draw()` reads the memoized value instead of rebuilding it.

**9.5 — Shrink the generated dictionary source.** Rewrite `scripts/gen_dictionary.py`'s Rust output to emit a flat, newline-delimited text asset (e.g. `src-tauri/src/dictionary.txt`) plus a small loader in `src-tauri/src/dictionary.rs`:
```rust
static RAW: &str = include_str!("dictionary.txt");
static DICTIONARY: std::sync::OnceLock<Vec<&'static str>> = std::sync::OnceLock::new();
fn dictionary() -> &'static [&'static str] {
    DICTIONARY.get_or_init(|| RAW.lines().collect())
}
```
(`OnceLock` is stable in the toolchain already in use — confirmed `rustc 1.96.1`.) Same sorted-input invariant, same `binary_search` lookup, but rustc now parses one string literal instead of 125,315 individual `&str` consts. `public/dictionary.json` generation (the web build's copy) is unaffected.

**9.6 — Puzzle-generation parity test.** Add a test on each side asserting the shared invariant both implementations rely on: `category = pool[(level - 1) % pool.length]` for a given tier, using the same fixture (category name ordering) on both. TS: extend `src/backend.ts`'s test file. Rust: extend the `#[test]` block added in Phase 2.3. Document in both files, next to the test, that a change to this selection formula must be mirrored in the other language.

---

## Phase 10 — Backlog (not required for this pass)

- Category background art for the ~34 categories currently falling back to `DEFAULT_THEME` in `src/categoryThemes.ts` — same Stitch-generation approach as Phase 4 (scene/pattern-style background art matching the existing 10), scoped as its own follow-up given the size (34 images vs. 8).

---

## Verification

- **Automated:** `npm run test` (Vitest suite from Phases 2/3/5/8/9) and `cargo test` (from `src-tauri/`) both pass. `npm run build` and `npm run build:web` both succeed with no TypeScript errors.
- **Manual — desktop (Tauri):** `npm run tauri dev`. Confirm: every icon renders as a glyph, not literal text (Phase 3); Settings/About/Levels dialogs and the main chrome show the same green in both Sprout and Midnight mode (Phase 5); clicking a level in the Levels dialog jumps to it without resetting stars (Phase 1.1); "Shuffle" reshuffles in place, sidebar "Restart" clears the current grid, only the Success screen's "Restart Game" does a full wipe (Phase 1.2); Achievements screen's progress numbers move as you actually play (Phase 1.3); the four new achievement badges and four new plant images render distinctly, no duplicates (Phase 4); progress survives an app restart and is now backed by a real file under the app's data directory, not `localStorage` (Phase 8 — locate the store file on disk to confirm).
- **Manual — web build:** `npm run build:web && npm run preview:web`. Confirm icons render identically to desktop (no CDN dependency to differ on), and progress still persists via `localStorage` under the new single-key shape.
- **Manual — Android:** at minimum, confirm icons render (this was the platform most exposed to the CSP break) and the store-plugin capability grant doesn't block app launch.
