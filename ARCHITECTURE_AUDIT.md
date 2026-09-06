# Word Sprout — Architecture & UX Audit

A senior-architect pass over the Tauri + React word-search game: where the UI, the two puzzle-generation runtimes, and the platform boundary disagree with each other, whether the codebase follows the project's game-architecture doctrine, and a revision of that doctrine to fit what this game actually is.

**Scope:** `refactor/ui-refactor` @ `96d11c5`. Line references match that commit and will drift as the branch moves.

**Stack:** Tauri 2 · React 19 · MUI 9 · Rust (native backend, no WASM) · targets: Desktop (Linux), Android, Web (GitHub Pages).

---

## Summary

The codebase is small, deliberate, and unusually well-commented for its size — the placement algorithm, the audio hook, and the theming tokens all show evidence of real bugs found and fixed in production. The problems below are concentrated in three places: **wiring** (a handful of props that discard the value they're given), **a design system split in two** (CSS custom properties vs. a hardcoded MUI theme that has already drifted apart), and **a CSP that the app's own icon font violates** on every non-web build. None of it is architecturally deep to fix; all of it is currently live.

Findings: **3 Critical · 2 High · 7 Medium · 4 Low**

---

## Functional breaks

Bugs a player will hit directly, in the current build, doing the obvious thing.

### 🔴 Critical — Selecting a level in the Levels dialog resets your progress instead of jumping to it
`src/App.tsx:560–567` · `src/components/LevelsDialog.tsx:64–67`

`LevelsDialog` correctly calls `onSelectLevel(lvl)` with the clicked level number. `App.tsx` wires it as `onSelectLevel={() => { restart(); }}` — the `lvl` argument is discarded, and `restart()` sets level back to **1** and stars to **0**. Clicking any unlocked level in the level map wipes the player's run instead of navigating to it.

### 🔴 Critical — "Shuffle" and "Restart" are the same button
`src/App.tsx:293–300`

Both sidebar buttons call `restart()`, which resets level to 1 and stars to 0. A player reaching for "Shuffle" — reasonably expecting a fresh layout of the *current* puzzle — loses all progress instead. There's no code path that reshuffles a puzzle in place; both buttons perform a full game reset.

### 🟠 High — Achievements screen is fed two hardcoded, permanently-wrong stats
`src/App.tsx:361–367` · `src/hooks/useWordSearchGame.ts:303–309`

`useWordSearchGame` tracks real `categoriesSeen` and `foundDiagonal` state internally (used correctly for unlocking achievements) but never returns them from the hook. `App.tsx` can't reach the real values, so it passes literals instead: `categoriesSeen: 3, foundDiagonal: true`. The achievement *unlock logic* is correct; the achievement *screen's progress bars* for anything keyed on those two stats will show numbers that don't move and are frequently wrong (e.g. "diagonal found" reads true from the very first render, before the player has dragged anything).

### 🟠 High — Material Symbols icons are loaded from a CDN the app's own CSP blocks
`index.html:15` · `src-tauri/tauri.conf.json` — `app.security.csp`

Every icon in the app (`eco`, `settings`, `videogame_asset`, `emoji_events`, and dozens more) depends on `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols…">`. The Tauri window's CSP is `style-src 'self' 'unsafe-inline'` with no allowance for `fonts.googleapis.com` or `fonts.gstatic.com`. On the desktop and Android builds — the ones this CSP actually governs — that stylesheet, and the font it loads, should be blocked outright, leaving every icon rendering as literal fallback text ("eco", "settings", …) instead of a glyph. The web build has no such CSP and is unaffected, which is exactly the kind of divergence a cross-platform check should have caught before release.

---

## UX / UI consistency

Nothing here crashes the app, but each one erodes trust that the "botanical tactical" design language is actually one system.

### 🟡 Medium — Two color systems, already out of sync
`src/App.css:62` vs `src/theme.ts:96`

The design tokens live as CSS custom properties in `App.css` (`--color-primary`, etc.) and are used everywhere in the hand-styled parts of the app. MUI components instead run on `theme.ts`'s own hardcoded hex palette. In Midnight mode these have already diverged: `--color-primary` is `#00e479`, but the MUI dark theme's `primary.main` is `#95d4b3` — a visibly different green. Every MUI dialog (Settings, About, Levels) will read as a slightly different brand than the chrome around it.

### 🟡 Medium — Glow colors are hardcoded to the dark theme's green, everywhere, in light mode too
`src/App.tsx`, `GardenView.tsx`, `AchievementsView.tsx` — dozens of call sites

`rgba(0, 228, 121, …)` — the Midnight theme's primary — is inlined directly into box-shadows, borders, and backgrounds across the sidebar, the daily-goal card, the garden tiles, and the achievement cards, rather than referencing `var(--color-primary)`. In Sprout (light) mode, where the real primary is a dark forest green (`#0f5238`), these highlights stay neon-green regardless — they read as leftover dark-mode styling that never got themed.

### 🟡 Medium — Achievement copy describes mechanics the game doesn't have
`src/achievements.ts:19–137`

"Solve 50 puzzles in under 30 seconds each," "Use the 'Hint' spell without breaking your combo 10 times," "Reach a daily streak of 30 days" — there is no timer, no combo counter, and no streak tracking anywhere in the codebase. Every `getProgress` quietly substitutes `levelsCompleted` or `stars` as a stand-in. The unlock math works; the sentence the player reads to explain why they unlocked it is fiction.

### 🟡 Medium — 13 achievements share 9 pieces of art
`src/achievements.ts`

`root-master.png`, `night-bloomer.png`, `solar-scribe.png`, and `speed-sprouter.png` are each reused for a second, unrelated achievement. In a collection screen designed around distinct "species," duplicate art is the first thing a completionist player notices.

### 🟡 Medium — "Water Sprout (10 SEEDS)" spends nothing
`src/components/GardenView.tsx:121–127, 346`

The Garden's copy ("Water and nurture your collection using harvested SEEDS") and the button label both imply a spend against the player's seed balance. `handleWaterPlant` only adds the plant's id to a local `Set` — no seed deduction, no persistence beyond the session. It's a cosmetic toggle wearing an economy's clothing.

### 🟡 Medium — Footer version, copyright, and legal links are all fake
`src/App.tsx:475–482`

`© 2024 Word Sprout Studio. v1.2.0-beta` is a hardcoded string; `package.json` and `tauri.conf.json` both say `0.1.0`. "Terms of Service," "Privacy Policy," and "Support" are all `href="#"` links that just reopen the About dialog. Harmless for a solo hobby project, but worth knowing it's there before anyone screenshots the footer expecting it to mean something.

---

## Architectural gaps

### 🟠 High — Zero automated tests, across two hand-synced implementations
repo-wide

There is no `*.test.*` file and no `test` script anywhere in the project. That's a bigger deal here than in most small apps: puzzle generation, tier ordering, and dictionary validation each exist *twice* — once in Rust (`src-tauri/src/lib.rs`, `dictionary.rs`) for the Tauri builds, once in TypeScript (`src/backend.ts`) for the web build — and nothing enforces that the two stay behaviorally identical beyond a human remembering to update both. The Fisher-Yates fix and the longest-first placement fix were each applied to both sides by hand; the next fix might not be.

### 🟡 Medium — Three fully-built components are dead code
`src/components/GardenDialog.tsx` · `AchievementsDialog.tsx` · `WordList.tsx`

None of these are imported anywhere. They appear to be earlier, modal-based versions of what's now `GardenView` and `AchievementsView` (full-page tabs), plus a simpler word-list panel superseded by the inline list in `App.tsx`. Safe to delete — keeping them invites someone to edit the wrong copy later.

### 🟢 Low — All application state lives in one 300-line hook plus raw `localStorage` keys
`src/hooks/useWordSearchGame.ts`

Fine at the current size, but there's no schema versioning on any of the seven `localStorage` keys — a future shape change (as already happened once, per the comments around backfilling `categoriesSeen` for pre-existing players) has to be handled ad hoc, in-place, every time.

### 🟢 Low — Category/theme keying is a silent lookup, not a checked one
`src/App.tsx:142` · `src/categoryThemes.ts:64`

`CATEGORY_THEMES[category] ?? DEFAULT_THEME` — of the ~44 categories, only 10 have dedicated background art; the rest fall back silently. That's a documented, intentional trade-off (per the comment in `categoryThemes.ts`), not a bug — flagged here only because nothing surfaces which categories are still missing art if someone wants to close the gap later.

---

## Performance

### 🟢 Low — The Rust dictionary is a 125,315-line generated source file
`src-tauri/src/dictionary.rs`

`pub static DICTIONARY: &[&str]` with one string literal per line for the full ENABLE word list. Lookups are a clean `binary_search` — that part's fine. The cost is upstream: this one file is a meaningful chunk of every clean-build compile time and every diff that touches it, purely as source text. Worth moving to `include_str!` over a flat newline-delimited asset (parsed into a sorted `Vec` once, lazily, e.g. via `OnceLock`) rather than one `const` entry per word — same runtime behavior, far less for rustc to parse.

### 🟢 Low — Every non-matching drag re-imports the Tauri bridge
`src/backend.ts:73, 85`

`getPuzzleWords` and `validateWord` both do `const { invoke } = await import("@tauri-apps/api/core")` inline, on every call — including every drag that doesn't match a listed word and falls through to a bonus-word dictionary check. The module is cached after first use, so steady-state cost is negligible, but it's indirection on what is, in practice, the hottest path in the game.

---

## Security

### 🟢 Low — Tauri devtools ship in release builds by design, not by accident of a debug flag
`src-tauri/Cargo.toml:16` — `tauri = { version = "2", features = ["devtools"] }`

The `devtools` feature is unconditional, so the WebView inspector is reachable in the shipped desktop and Android release, not just local dev builds. For this app that mostly means a curious player can open devtools and hand-edit their own `localStorage` progress — low actual stakes with no server or multiplayer to cheat against, but worth it being a deliberate call (e.g. gated behind `#[cfg(debug_assertions)]`) rather than a default nobody revisited before release.

### ✅ Solid — Android signing secrets are handled the way they should be
`.github/workflows/release.yml:73–86`

Keystore comes in as a base64 GitHub secret, decoded to `$RUNNER_TEMP` (not checked into the repo or workspace), and `keystore.properties` is generated at build time from secrets rather than committed. This is the correct pattern — flagged here as a positive, not a gap.

---

## Memory & resource management

### 🟢 Low — Achievement toast re-subscribes its window listeners on unrelated re-renders
`src/components/AchievementBanner.tsx:32–53`

The effect's dependency array includes `onDismiss`, which is `dismissJustUnlocked` from `useWordSearchGame` — a new closure on every render of that hook, not wrapped in `useCallback`. Cleanup runs correctly, so this isn't a leak, but the `click`/`touchstart` listeners on `window` get torn down and rebuilt far more often than the achievement toast itself actually changes.

### ✅ Solid — SFX pooling and blob-URL caching are both deliberate, bounded, and correct
`src/hooks/useAudio.ts:29, 53–61, 158–174`

A fixed 4-element round-robin pool per effect avoids the "rapid swipes cut each other off" problem without unbounded allocation, and the module-level `blobUrlCache` is keyed by a fixed, small set of asset paths — it never grows unbounded even though the URLs it creates are never explicitly revoked. Good instinct on both counts.

---

## Cross-platform consistency

Beyond the CDN/CSP break already called out above:

### ✅ Solid — The GStreamer/WebKitGTK audio workaround is a genuinely good fix
`src/hooks/useAudio.ts:47–61`

Linux's WebKitGTK plays `<audio>` through GStreamer, which has no handler for Tauri's custom `tauri://` protocol — so audio pointed straight at an asset URL silently fails to play on that one platform only. Fetching the bytes and handing the element a `blob:` URL sidesteps it cleanly, and is a documented no-op everywhere else. This is exactly the kind of platform-specific landmine that's easy to miss without a Linux desktop test pass — good that it's caught and explained inline.

### ✅ Solid — `assetUrl()` correctly abstracts the Tauri-root vs. GitHub-Pages-subpath split
`src/categoryThemes.ts:35–37`

`import.meta.env.BASE_URL` is applied consistently everywhere an asset path is built at runtime (backgrounds, music, SFX), rather than only where Vite's bundler would catch it statically. This is the right level of care for an app that ships to `/` on Tauri and `/WordSearch/` on Pages from the same source.

### 🟡 Medium — Fixing the icon-font CSP break
`index.html:15`

Three other display faces (Quicksand, Space Grotesk, Work Sans) are already self-hosted via `@fontsource` — the same pattern isn't applied to Material Symbols, which is the one face pulled from a live Google Fonts URL. Self-hosting it (an `@fontsource/material-symbols-outlined`-style package, or the variable font file dropped into `public/`) removes the CDN dependency entirely and makes the desktop/Android/web builds render identically, without touching the CSP at all.

---

## What's already working well

- **The Fisher-Yates fix.** `array.sort(() => Math.random() - 0.5)` was replaced with a correct shuffle in both `useWordSearchGame.ts` and `backend.ts`, with a comment explaining exactly why the sort-based version was biased. Small, correct, and documented — the standard the rest of this audit is measuring everything else against.
- **Direction-first word placement.** `placeWord` picks a direction uniformly first, then a valid position within it, rather than sampling (direction, row, col) jointly — which would otherwise favor horizontal/vertical placements on small grids where diagonals have far fewer valid starting cells. Longest-word-first, main-words-before-bonus-words ordering avoids a long bonus word starving out a shorter required one on dense grids. This is careful, non-obvious correctness work.
- **The `gridSize`/`gridData` same-render guarantee.** The comment in `initGame` notes a real prior crash — a larger `gridSize` committed one render ahead of its matching `gridData`, reading out of bounds. Setting both together closes that class of bug for good.

## Recommended sequence

1. **Fix the two wiring bugs first.** Pass `lvl` through in the Levels dialog handler, and give "Shuffle" its own puzzle-only reset instead of aliasing full restart. Both are one-line fixes with outsized player impact.
2. **Self-host the Material Symbols font.** Removes the CSP conflict and the desktop/Android-vs-web icon divergence in one change, with no CSP edits required.
3. **Return `categoriesSeen` and `foundDiagonal` from the hook** and delete the hardcoded stand-ins in `App.tsx`, so the achievements screen reflects real progress.
4. **Pick one color system.** Either feed the CSS custom properties into `theme.ts` at theme-creation time, or replace the hardcoded MUI hex values with references to the same tokens — whichever direction, stop maintaining the palette twice.
5. **Delete the three dead components** and either wire the Garden's seed economy to actually spend seeds or drop the "(10 SEEDS)" framing from the button copy.
6. **Add a thin test layer around puzzle generation** — even just a shared fixture of (category, level, tier) → expected word set, run against both the Rust and TypeScript implementations — before the next gameplay change has to be hand-ported to both again.

---

# Doctrine compliance

The project's stated architectural doctrine (React/Canvas/Rust-WASM/Tauri paradigm rules, reproduced in full at the end of this document) was checked against the actual codebase. Verdict: **partially compliant, with one clear hard violation, one architecture-shape mismatch that makes a large chunk of the doctrine inapplicable, and several places where the code is already doing the right thing.**

## 1. Sovereign / local-first & no silent network calls

| Principle | Verdict | Evidence |
|---|---|---|
| Offline-capable core gameplay | ✅ | Puzzle generation and word validation are pure local logic (Rust for Tauri, TS for web) — no network in the actual game loop. |
| No silent network calls | ❌ **Violation** | `index.html:15` loads Material Symbols from `fonts.googleapis.com` on every launch, unconditionally, on **every build target** including the sovereign desktop/Android ones. Not logged, not gated, not user-visible — exactly what the doctrine forbids. (Ironically the Tauri CSP blocks it, which is *why* icons likely break on desktop.) |
| No telemetry/crash reporters/analytics SDKs | ✅ | None present anywhere in `package.json` or `Cargo.toml`. |

## 2. The paradigm divide

The doctrine assumes a genre this game isn't. There's no continuous simulation, no entities, no physics, no hex grid — it's a pointer-driven, turn-based puzzle with one short celebration animation. Most of the **Rust/WASM Core Engine** section doesn't apply because **there is no WASM at all** — confirmed: no `wasm-bindgen`, no `wasm32` target, nothing. The Rust side is two ordinary Tauri IPC commands (`validate_word`, `get_puzzle_words`), called once per level or once per drag — not a `world.tick(dt)` engine.

| Layer | Rule | Verdict |
|---|---|---|
| React | Game-loop vars in `useRef`, not `useState` | ⚪ N/A (no 60fps loop) — but where a rAF loop *does* exist (celebration animation), it correctly uses `celebrateProgressRef`, not state ✅ |
| React | Overlay React UI on canvas for HUD/menus | ✅ for menus/dialogs/word-list. ⚠️ Partial: grid *letters* are still rendered via `ctx.fillText`, which the doctrine warns against — defensible since letters are interactive content, not decoration, but literally the pattern the rule flags. |
| React | Capture input in React, feed engine via bitflag buffer | ⚪ N/A — pointer events are captured correctly in `GameCanvas`, but there's no engine tick to feed a buffer into. |
| Canvas | Single `useEffect` + `requestAnimationFrame` | ✅ |
| Canvas | Scale via `devicePixelRatio` | ✅ — done explicitly and correctly in `GameCanvas.tsx`. |
| Canvas | Read-only, never dictates state | ✅ — canvas gets props, reports back via callbacks. |
| Canvas | Integer coords + `pixelated` for pixel art | ⚪ N/A — not a pixel-art game; flooring coords would hurt the soft glows/rounded pills it's going for. |
| Rust/WASM | SoA, `tick(dt)`, fixed timestep, shared linear memory, panic hooks | ⚪ N/A — no WASM engine exists to apply any of it to. |

## 3. Tauri — this is where the real violation lives

| Rule | Verdict | Evidence |
|---|---|---|
| No IPC in a frame-by-frame loop | ✅ | IPC calls happen once per level / once per submitted drag — never per-frame. |
| **Save state via SQLite/filesystem, not localStorage** | ❌ **Violation** | All 7 persistence keys (level, stars, achievements, categoriesSeen, difficulty, audio settings, theme) go through plain `localStorage` — 22 call sites, zero filesystem/SQLite writes. `Cargo.toml` has no `tauri-plugin-fs` or `tauri-plugin-sql` at all. Directly contradicts: *"Never write to localStorage… for critical game saves; route all saves through Tauri to the local filesystem."* |
| Asset streaming via `asset://` protocol | ❌ Not used | Confirmed `assetProtocol` is disabled (`"enable": false, "scope": []`) in the generated config. Assets are bundled/served normally instead — reasonable at this asset size, but not what the doctrine prescribes. |
| Capabilities gate fs/asset access — check before assuming | ✅ followed by omission | `capabilities/default.json` grants only `core:default` + `opener:default` — consistent with the fact that no fs/sql access exists. |
| Save schema/version field + forward-compatible migration | ❌ Not present | No version field on any stored value. The `categoriesSeen`/`levelsCompleted` backfill logic in `useWordSearchGame.ts` is exactly the ad-hoc patch the versioning rule exists to avoid. |

## 4. Performance checklist

Mostly N/A for genre reasons, but one real hit: `draw()` allocates a fresh `Map` (`pillColorByCell`) on every call, and it's called every rAF tick during the ~550ms celebration animation — a small but literal violation of "avoid allocating new objects inside the per-frame callback." Low-stakes given the duration, but present.

## 5. Reliability

The WASM-specific rules (panic hooks, `Result` across the boundary) don't apply — no WASM boundary exists. What *does* apply — "no network calls/telemetry unless explicit" — comes back to the same Google Fonts link as the headline violation.

**Net assessment:** the codebase isn't running a different architecture *badly* — it's running a genuinely different genre (turn-based puzzle, no simulation) that makes the WASM-engine half of the doctrine moot rather than violated. But the two rules that *are* squarely applicable regardless of genre — **local filesystem saves instead of localStorage**, and **no silent third-party network calls** — are both broken, and the second one shares its root cause with the icon-rendering bug above.

---

# Revised doctrine

The original doctrine assumed a real-time, WASM-simulated engine (entities, physics, a 60fps tick). Word Sprout is a turn-based, pointer-driven puzzle with one transient animation — a different shape, not a worse one. This revision keeps everything genre-agnostic from the original (sovereignty, no telemetry, capability-gating discipline) and replaces the parts that assumed a simulation with rules that fit what this game actually is. Same five-section shape, drop-in replacement.

## 1. Architectural Philosophy

Unchanged in substance:

> All applications in this ecosystem follow a sovereign, local-first philosophy: the user owns their data and save files, and the game must run entirely offline. **No silent network calls** — no analytics, telemetry, crash reporters, or third-party SDKs/CDNs that phone home, even for "helpful" reasons (font loading, usage stats, update checks). Any network access is an explicit, logged, user-visible exception — never a default asset load. *Concretely: webfonts, icon fonts, and any other CDN `<link>`/`fetch` must be self-hosted and bundled, not pulled live — this is not a performance nice-to-have, it's the sovereignty rule applied to the one place this codebase currently breaks it.*

## 2. Paradigm Divide — rewritten for a turn-based puzzle, not a simulation

**React — application state, rules, and orchestration**
- Game state that changes on discrete user actions (grid generated, word found, level complete) is **ordinary `useState`/hook state** — correct here, not a compromise, because nothing updates 60×/second. Reach for `useRef` only for values that must survive frame-to-frame *inside an active transient animation* (drag position while dragging, animation progress during the celebration) without forcing a re-render per frame — the split already used in `GameCanvas.tsx`.
- Capture pointer/keyboard events at this layer, but translate them into **domain terms** immediately — a selected cell, a drag start/end pair — before they reach any game-logic function. Never pass raw pixel coordinates past the component that captured them.
- One custom hook per concern (`useWordSearchGame`, `useAudio`) is the right granularity at this size. Don't introduce a state manager pre-emptively — only graduate to one if a hook's state tree genuinely becomes unwieldy to reason about.

**Canvas — the grid renderer**
- Canvas owns exactly one job: rendering the interactive grid (letters, found-word pills, drag trace, hint glow) from props. It is not a general sprite/entity renderer and doesn't need to become one.
- Redraw is driven by prop/state changes via `useEffect`, not a persistent idle `requestAnimationFrame` loop. A rAF loop is only justified for the duration of an actual transient animation and must stop scheduling itself once that animation finishes — as already implemented.
- Always scale via `devicePixelRatio` (already correct — keep it).
- Canvas reads props, never writes game state — interaction is reported upward via callbacks (already correct — keep it).
- Grid letters rendered via `ctx.fillText` are **correct here**, not a violation to fix — they're the interactive game board, tied to per-cell hit-testing and highlight compositing. Reserve "overlay React, don't render text on canvas" for chrome: buttons, dialogs, the word list — which already are React.
- Drop the pixel-art rule (`Math.floor` + `image-rendering: pixelated`) — not a pixel-art game; flooring coordinates would fight the soft glows and rounded pills the visual language depends on. Apply it later only if a pixel-art feature is ever added.
- Hoist or reuse allocations made inside a per-frame callback (e.g. the `pillColorByCell` Map rebuilt on every celebration-frame `draw()`) where the underlying data doesn't change frame-to-frame — nice-to-have given how short the celebration loop runs, not urgent.

**Rust — the native backend (not a WASM engine)**
- Rust is the deterministic, stateless implementation of puzzle generation and dictionary lookup, exposed as ordinary Tauri IPC commands (`get_puzzle_words`, `validate_word`) called on discrete events — once per level, once per submitted selection. This is *not* the "IPC in a frame loop" anti-pattern — there is no frame loop for it to be in. Calling IPC here is correct and doesn't need optimizing away.
- The real risk unique to this project isn't serialization overhead — it's that the same gameplay logic (word placement, tier ordering, shuffle) exists **twice**, once in Rust for Tauri builds and once in TypeScript for the web build, with nothing enforcing they behave identically. **Rule: any change to shared puzzle-generation or validation logic must be applied to both `src-tauri/src/` and `src/backend.ts` in the same change, and should be covered by a parity test** (same category/level/tier in → same word set out), not left to a human remembering.
- Drop the WASM-specific rules wholesale — SoA layout, `world.tick(dt)`, fixed timestep, shared linear memory, typed-array view refetching, `console_error_panic_hook`. None of them have anything to apply to. **If a future feature genuinely needs continuous simulation**, introduce WASM *then* and reinstate this section verbatim — don't carry it as dead weight until it's needed.
- Keep "don't panic on untrusted input" as a live rule even without a WASM boundary: `validate_word` and `get_puzzle_words` must stay panic-free for any string/number the frontend could send, exactly as they are today.

**Tauri — OS integration and the one real gap**
- Window management and native capabilities: unchanged.
- **Save data**: distinguish **save data** (level, stars, achievements, difficulty mode — anything representing actual progress, the thing "sovereignty" is meant to protect) from **ephemeral UI memory** (last-open settings tab, a dismissed one-time tooltip). Save data should live in a real, discoverable file via Tauri's filesystem plugin — something the player could find, back up, or hand-edit, which `localStorage`'s opaque per-webview storage structurally can't offer. Ephemeral UI state can stay in `localStorage` without violating anything. Today, everything — including actual progress — is in `localStorage`; that's the one concrete migration this revision calls for.
- **Save schema**: whatever the storage backend, every persisted save blob gets an explicit `schemaVersion` field from day one, with load logic that branches on it. The `categoriesSeen`/`levelsCompleted` backfill already in `useWordSearchGame.ts` is exactly the ad-hoc patching this rule exists to make unnecessary next time.
- **`asset://` protocol**: not warranted yet. Total asset budget (backgrounds, audio, the bundled dictionary) is a few MB — fine to ship as ordinary bundled assets. Revisit only if bundle size grows into a range where webview memory actually becomes a concern.
- Keep capability-gating discipline as-is: check `capabilities/*.json` before assuming any fs/asset access is available, exactly as the current `["core:default", "opener:default"]` grant correctly reflects that none is.

## 3. Code Generation Heuristics — rewritten routing table

1. **Visual HUD, menu, or settings surface?** → React component + existing hook state. No atomic state manager unless a hook genuinely outgrows readability.
2. **Puzzle rule — word placement, grid generation, dictionary lookup, matching a drag to a word?** → Implement once, in the Rust Tauri command where one exists; treat the TypeScript web-build equivalent as a *mirrored, tested* fallback, not an independently-evolving reimplementation. Any change here touches both files and the parity test.
3. **Rendering a grid cell, highlight, or hint to the screen?** → Canvas 2D commands inside the component's `draw()`, called from `useEffect` on the relevant prop change, or from a bounded rAF loop only while a transient animation is actively running.
4. **Saving progress, loading settings, or window management?** → Rust on the Tauri backend, exposed via `invoke`, backed by a versioned save file — not `localStorage`, once the migration above lands.
5. **Capturing input?** → Pointer/keyboard events handled directly where they occur, translated into domain terms before being handed to game-state functions. No bitflag buffer or per-frame consumer needed — there's no tick loop on the other end to feed.

## 4. Performance checklist — trimmed to what applies

- Scale canvas rendering via `devicePixelRatio` (already correct).
- Avoid allocating inside a callback that actually runs every frame — applies narrowly to the celebration rAF loop, not to IPC calls (infrequent) or component renders (event-driven, not frame-driven).
- Keep dictionary/category lookups at their current complexity (binary search / `Set` lookup) as data size grows — the generated 125k-entry `dictionary.rs` is fine at runtime; its cost is compile-time/diff-size, worth moving to a parsed flat asset if it keeps growing, but not a hot-path performance issue.
- Drop pixel-art flooring and WASM typed-array-refetch rules — no target for either.
- Once save data moves off `localStorage`: writes should be debounced/batched, not fired on every single state change, since filesystem writes are more expensive than the `localStorage` writes they replace.

## 5. Reliability & Safety — rewritten for the actual boundary

- Rust Tauri commands must stay panic-free for any input the frontend can send, full stop — this replaces the WASM-`Result` rule, applied to the boundary that actually exists.
- Once a real save file exists, its load path must tolerate a missing, corrupt, or older-schema file by falling back to sane defaults for the unreadable parts, never crashing the app on launch.
- Keep the network/telemetry restriction, made concrete by the one violation found: this explicitly includes third-party font and icon-CDN links, not just analytics SDKs. Self-host, as the other three typefaces already do.
