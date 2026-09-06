# WordSprout Architecture Mitigation & Implementation Plan

This document outlines a step-by-step, comprehensive engineering plan to resolve the architectural gaps, code smells, and gameplay issues identified in the recent system analysis. 

The mitigation is organized into four logical phases to ensure stability and continuous delivery.

---

## Phase 1: Core Architecture & State Unification

**Goal:** Eliminate volatile `localStorage` usage, establish a single source of truth, and strictly adhere to the Tauri "local-first" sovereign doctrine.

1.  **Centralize State Management**
    *   **Action:** Refactor `App.tsx`, `GardenView.tsx`, and `useWordSearchGame.ts`. 
    *   **Details:** Move `wateredTimestamps`, `growthByPlant`, and `ownedPlants` out of localized `useState` hooks. Centralize all persistent data into a unified global state object (or Context Provider) managed primarily by `useWordSearchGame.ts`.
2.  **Implement Data Schema Versioning**
    *   **Action:** Wrap the new unified state in a versioned envelope (e.g., `{ version: 1, data: { ... } }`).
    *   **Details:** Create a `migration.ts` utility that reads the persisted JSON, checks the version, and applies sequential data migrations before injecting the state into the React tree.
3.  **Migrate to Tauri Native File System (`tauri-plugin-store`)**
    *   **Action:** Add `tauri-plugin-store` to the Rust backend (`Cargo.toml` & `src-tauri/src/lib.rs`).
    *   **Details:** Replace all `localStorage.getItem`/`setItem` calls with asynchronous IPC calls to the Tauri store. Ensure there is a Web fallback (using standard `localStorage`) to preserve browser compatibility (e.g., for GitHub Pages deployments).

## Phase 2: Performance & Rendering Optimization

**Goal:** Eliminate DOM thrashing, frame drops, and unnecessary React reconciliations during high-frequency gameplay events.

1.  **Resolve React State Thrashing in `GameCanvas`**
    *   **Action:** Remove `setActiveDragString` from the `onPointerMove` event handler in `GameCanvas.tsx`.
    *   **Details:** Attach a React `useRef` directly to the drag-preview bubble's DOM element. During pointer movement, mutate `bubbleRef.current.textContent` directly to completely bypass the React render cycle, ensuring butter-smooth 60+ FPS drawing.
2.  **Memoize Contextual Callbacks**
    *   **Action:** Audit `App.tsx` and parent containers.
    *   **Details:** Wrap inline arrow functions (like `onSelectLevel`, `onOpenGarden`, `onRestart`) in `useCallback`. Ensure large child components (`LevelsView`, `GardenView`) are wrapped in `React.memo` so they do not needlessly re-render during gameplay interactions.
3.  **Refactor Global Event Listeners**
    *   **Action:** Clean up `useAudio.ts`.
    *   **Details:** Remove the direct `window.addEventListener('pointerdown')` attachment. Instead, attach a React synthetic `onPointerDown` event to the root application container in `App.tsx` and trigger the audio initialization contextually.

## Phase 3: Gameplay Loop & Mechanics Refinement

**Goal:** Fix logical bugs in the game economy, hint systems, and puzzle generation that detract from the player experience.

1.  **Fix the "Auto-Solve" Hint Flaw**
    *   **Action:** Modify the `handleRevealEntireWord` logic in `App.tsx`.
    *   **Details:** Instead of invoking `submitSelection` to instantly collect the word, introduce a `hintedLine` state in `GameCanvas`. When a hint is used, visually trace or pulse the path for the player, forcing them to execute the swipe themselves to earn the word.
2.  **Rebalance the Garden Economy**
    *   **Action:** Adjust the cooldown constants in `GardenView.tsx`.
    *   **Details:** Change the 24-hour watering cooldown (`COOLDOWN_MS`) to something tied to the core game loop—such as allowing one water action per 3 completed levels, or reducing the global cooldown to a shorter, more engaging interval (e.g., 2 hours).
3.  **Correct the "Shuffle" Semantics**
    *   **Action:** Split the `restart()` logic into `restart()` and `shuffleBoard()`.
    *   **Details:** `shuffleBoard()` should retain the currently selected vocabulary list and re-calculate their grid placements, rather than tossing out the current level's word set completely.
4.  **Derisk Random Letter Generation**
    *   **Action:** Update the grid fill algorithm in `useWordSearchGame.ts`.
    *   **Details:** Replace the `Math.random() * 26` uniform distribution with either a weighted English frequency distribution (A, E, I, O, T) or exclusively use letters sampled from the target words. This prevents the accidental generation of off-list valid or offensive words.
5.  **Extract Hardcoded Mechanics**
    *   **Action:** Remove logic formulas from hooks.
    *   **Details:** Move scoring math, board sizing caps, and tier thresholds into a dedicated `gameMechanics.ts` constants file for easy tuning.

## Phase 4: Test Coverage & Parity Assurance

**Goal:** Protect the codebase from regressions and ensure identical behavior across Web and Desktop build targets.

1.  **Cross-Environment Parity Suite**
    *   **Action:** Create a unified test fixture.
    *   **Details:** Ensure that both the Rust `get_puzzle_words` algorithm and any TypeScript fallback generators produce the exact same deterministic output for the same level/tier inputs.
2.  **Tauri Backend Integration Tests**
    *   **Action:** Expand `src-tauri/src/lib.rs` tests.
    *   **Details:** Add automated tests covering the new `tauri-plugin-store` save integration to verify that reads, writes, and schema migrations operate correctly at the native filesystem level.
