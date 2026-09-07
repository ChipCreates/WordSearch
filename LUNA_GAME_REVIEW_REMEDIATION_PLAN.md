# WordSprout Game Review Remediation Plan for Luna

## Mission

Resolve the gameplay, progression, presentation, accessibility, and delivery findings from the September 2026 design review without regressing the existing cross-platform game.

This is an execution plan, not a brainstorming document. Work from top to bottom because later phases depend on state and API decisions made earlier.

## Operating rules

- Do not commit, push, open a pull request, publish, or deploy. Leave all changes in the working tree for review.
- Preserve unrelated user changes. Inspect the working tree before editing and avoid touching unrelated files.
- Treat the current source and tests as authoritative. `IMPLEMENTATION_PLAN.md` is historical and contains items that are already complete.
- Keep Web, PWA, Tauri desktop, and Android behavior aligned.
- Prefer small pure functions and focused components over adding more orchestration to `App.tsx`.
- Update tests in the same work package as behavior.
- After every phase, run the phase checks. Do not continue past a failing check without resolving or clearly documenting it.
- Do not replace existing art unless the task explicitly calls for it. The art pass in this plan is primarily hierarchy, styling, copy, compression, and consistent presentation.

## Baseline to preserve

Before editing, verify:

```powershell
npm test -- --reporter=dot
npm run build:web
```

Expected starting point:

- 7 test files pass.
- 138 tests pass.
- The web build succeeds.
- The build currently warns about a large JavaScript chunk and a Tauri import shared between static and dynamic paths.
- The PWA precache is approximately 78 MB.

Record the actual baseline in the final handoff if it differs.

---

## Phase 1 — Correct player-facing semantics

### Goal

Remove labels that promise mechanics the game does not currently implement.

### Tasks

1. In `src/App.tsx`, rename the per-puzzle `Daily Goal` presentation to `Level Goal`.
2. Change the supporting copy from daily/harvest language to a clear level objective, for example `Find all N target words`.
3. Replace the `#<level> STREAK` display with `LEVEL <level>` or an equivalent compact level label.
4. Search the application, README, help dialog, tests, and accessibility labels for contradictory uses of `daily`, `streak`, and `goal`.
5. Do not implement a calendar streak in this pass. Accurate copy is the required fix; a true daily mode is a future feature.

### Acceptance criteria

- No UI calls a per-level counter a daily goal.
- No UI calls the level number a streak.
- Desktop and mobile use the same terminology.
- Existing save data remains compatible.
- Relevant UI tests assert the new labels and reject the old misleading labels.

### Primary files

- `src/App.tsx`
- `src/App.css`
- `src/components/AboutDialog.tsx`
- `README.md`
- `src/App.icons.test.tsx` or a new focused UI-copy test

---

## Phase 2 — Make hints and reshuffling a coherent economy

### Goal

Eliminate the current conflict in which free toolbar actions duplicate Seed Store purchases.

### Product decision

Use a charge-based utility system:

- Restart remains free and resets the current puzzle attempt.
- Reveal Root grants one free charge per level. Further uses consume owned Single Letter Sprout charges.
- Lumina Cyclone consumes an owned charge and reshuffles unfound words while preserving discoveries.
- The Seed Store purchases charges instead of immediately firing an effect.
- Higher-tier power-ups also purchase charges, except permanent themes and the Golden Crest.
- The player must be able to see the number of available charges before pressing a tool.

### Data model

1. Add a typed power-up ID union and inventory record in a new module such as `src/powerups.ts`.
2. Add `powerupInventory` to `SaveData` and bump the schema version.
3. Add a migration from the current schema that initializes every inventory count to zero.
4. Add ephemeral `freeHintUsesRemaining` state that resets to `1` when a new level is generated. Do not persist it across levels.
5. Centralize purchase, consume, and availability checks in pure helpers. Do not duplicate Seed deductions in UI components.

### UI behavior

1. Update the play toolbar to show `Hint · Free`, then `Hint · xN` after the free use is spent.
2. Show `Shuffle · xN`; disable it with an explanatory tooltip when the player owns none.
3. Store buttons should say `Buy charge` and show the resulting inventory count.
4. Purchase success should not close the store unless the player explicitly chooses `Buy & use now` from the play screen.
5. Keep themes and the Golden Crest as one-time unlocks.
6. Keep the Nitrogen Booster scoped to one level, but purchase it as a charge and consume it only when activated.

### Architecture

- Move power-up definitions, prices, labels, and effects out of `SeedStoreDialog.tsx` into `src/powerups.ts`.
- Keep `SeedStoreDialog` presentational.
- Expose inventory operations from the game-state hook or a focused `usePowerups` hook.
- Avoid increasing `App.tsx`'s responsibility; extract a `PlayToolbar` if the new logic makes the existing block larger.

### Tests

- Schema migration preserves all old fields and initializes inventory.
- Buying a charge deducts Seeds exactly once.
- A failed purchase changes neither Seeds nor inventory.
- The free hint is usable exactly once per generated level.
- Paid hint use decrements inventory exactly once.
- Shuffle preserves found words and lines.
- Restart remains usable with zero Seeds and zero inventory.
- Permanent unlocks cannot be purchased twice.

### Primary files

- `src/persistence.ts`
- `src/persistence.test.ts`
- `src/hooks/useWordSearchGame.ts`
- `src/components/SeedStoreDialog.tsx`
- `src/App.tsx`
- `src/gameMechanics.ts`
- New: `src/powerups.ts`
- New: `src/powerups.test.ts`

---

## Phase 3 — Guarantee intentional puzzle composition

### Goal

Never ship a puzzle with fewer target words than the difficulty curve requests.

### Tasks

1. Extract puzzle construction from `useWordSearchGame.ts` into a pure module such as `src/puzzleGenerator.ts`.
2. Define a `PuzzleGenerationResult` containing the grid, target words, placed bonus candidates, category, grid size, attempt count, and any fallback reason.
3. Attempt full target placement a bounded number of times, such as 20 attempts.
4. On each attempt:
   - Start from an empty grid.
   - Place target words longest-first.
   - Prefer useful overlaps.
   - Only place bonus candidates after every target word is placed.
   - Fill remaining cells after placements succeed.
5. If a word set still fails, request or select a replacement word and retry. Do not silently filter failed target words from the final list.
6. Provide a deterministic, safe fallback board if all retries fail. It must still contain the requested number of targets.
7. Keep grid-size behavior compatible with Easy, Standard, and Challenging modes.
8. Preserve reverse and diagonal support, but introduce placement-direction weights that can be tuned by level band.

### Difficulty configuration

Move difficulty into data rather than scattered formulas. Define level bands with at least:

- Grid size.
- Target count.
- Minimum and maximum word length.
- Allowed directions.
- Reverse-word probability.
- Diagonal probability.
- Desired overlap pressure.
- Bonus-candidate count.

Keep the early game gentle, but a Standard level should not collapse below its configured target count.

### Tests

- Generate at least 500 puzzles across modes and representative levels.
- Every target appears in the returned grid in a legal straight line.
- Target count always equals the configured count.
- No out-of-bounds placements occur.
- The generator terminates within the retry bound.
- The fallback path is explicitly tested.
- Existing find/reverse/diagonal behavior remains valid.

### Primary files

- `src/hooks/useWordSearchGame.ts`
- `src/gameMechanics.ts`
- `src/backend.ts`
- `src/hooks/useWordSearchGame.test.ts`
- New: `src/puzzleGenerator.ts`
- New: `src/puzzleGenerator.test.ts`

---

## Phase 4 — Elevate bonus words into a signature mechanic

### Goal

Make bonus-word discovery legible, rewarding, and visible in the completion loop.

### Tasks

1. Replace the boolean-style bonus handling with a typed selection result:
   - `target-found`
   - `bonus-found`
   - `already-found`
   - `invalid`
2. Emit a short-lived bonus discovery event containing the word and Seeds awarded.
3. Add a distinct visual treatment near the board: `Bonus sprout! MARE +10 Seeds`.
4. Use a different SFX or pitch treatment from target-word discovery.
5. Show a compact bonus-word tray or counter during play without cluttering the target list.
6. Add bonus discoveries to `SuccessScreen`, including count, words, and total bonus Seeds.
7. Ensure repeated discovery of the same word in one puzzle never pays twice.
8. Define a minimum bonus-word length in `gameMechanics.ts`; start at three letters unless tests or playability indicate four is safer.
9. Update the help dialog and README to explain bonus words with one concrete example.

### Tests

- Target words never receive bonus rewards.
- A valid off-list word pays once.
- Reverse bonus words are normalized and cannot pay twice in both directions.
- Invalid and duplicate selections provide feedback but no Seeds.
- Double Seeds correctly affects the displayed and awarded bonus amount.
- Completion statistics match the actual discoveries.

### Primary files

- `src/hooks/useWordSearchGame.ts`
- `src/App.tsx`
- `src/components/SuccessScreen.tsx`
- `src/components/GameCanvas.tsx`
- `src/gameMechanics.ts`
- `src/hooks/useAudio.ts`
- `src/components/AboutDialog.tsx`
- `README.md`

---

## Phase 5 — Rebalance the garden as a collection sink

### Goal

Keep nurturing satisfying without allowing plant returns to eclipse the word-search economy.

### Product decision

- Watering advances growth but does not mint routine Seeds.
- Blooming returns a partial rebate plus collection progress; plants are primarily a collection and cosmetic goal.
- Fertilizer cost scales with the plant's purchase cost.
- The starter plant remains free and awards a small first-bloom bonus.

### Economy rules

1. Move all economy values into typed configuration in `gameMechanics.ts` or a new `economy.ts`.
2. Set purchased-plant bloom bounties to approximately 40–60% of purchase price, rounded to readable values.
3. Set the free starter plant's first-bloom bounty to 50 Seeds.
4. Remove the current `+20 Seeds` for every non-final watering.
5. Calculate fertilizer cost per application as roughly 10% of the plant's purchase price, with a sensible minimum and readable rounding.
6. Preserve the four-stage growth model for this pass; species-specific care is future scope.
7. Guarantee that blooming cannot pay repeatedly after reaching 100%.
8. Update every affected store card, garden card, toast, help entry, and README claim.

### Add a balancing audit

Create a pure script or test that prints a table with:

- Plant name and rarity.
- Purchase cost.
- Bloom bounty.
- Four-fertilizer cost.
- Net Seed change for all-water, all-fertilizer, and mixed paths.

Fail the test if any purchased plant has a positive net Seed return under the all-water path. The starter plant is the explicit exception.

### Tests

- Watering advances growth once per cooldown and awards no routine Seeds.
- Final growth awards the bounty once.
- Fertilizer deducts the correct scaled cost.
- A failed fertilizer purchase changes nothing.
- Fully bloomed plants cannot be watered or fertilized for rewards.
- Cooldown copy says `2 hours`, not `today`.

### Primary files

- `src/gameMechanics.ts` or new `src/economy.ts`
- `src/plantsCatalog.ts`
- `src/components/GardenView.tsx`
- `src/components/SeedStoreDialog.tsx`
- `src/hooks/useWordSearchGame.ts`
- `README.md`
- New: `src/economy.test.ts`

---

## Phase 6 — Make achievements distinct and honest

### Goal

Replace the concentration of differently named level-completion achievements with goals that reward different play styles.

### Data additions

Add only the statistics required by the final achievement set. Recommended fields:

- `levelsCompletedWithoutHint`
- `maxBonusWordsInLevel`
- `reverseWordsFound`
- `plantsBloomed`
- `uniqueCategoriesCompleted`
- `powerupsUsed`

Bump and migrate the save schema. Preserve already unlocked achievement IDs; do not revoke earned badges. For stats that cannot be reconstructed, initialize conservatively.

### Achievement redesign

Keep the strongest existing goals:

- First completed level.
- Level 50.
- Eight categories discovered or completed.
- One diagonal word.
- Five bonus words.
- Seed milestone.

Replace or rewrite redundant goals so the final set includes:

- Complete five levels without using a hint.
- Find three bonus words in one level.
- Find a reverse word.
- Bloom the starter plant.
- Bloom plants from multiple rarity tiers.
- Use a tactical power-up successfully.
- Complete a category or biome milestone.

Remove adjectives such as `Quickly` unless elapsed time is actually measured. Do not call an achievement `Daily` unless it uses calendar-day behavior.

### Tests

- Each badge's description exactly matches its predicate.
- No two badges have identical predicates and thresholds.
- Old unlocked IDs remain unlocked after migration.
- New statistics persist on Web and Tauri paths.
- Achievement banners queue and display one at a time.

### Primary files

- `src/achievements.ts`
- `src/components/AchievementsView.tsx`
- `src/components/AchievementBanner.tsx`
- `src/hooks/useWordSearchGame.ts`
- `src/persistence.ts`
- `src/persistence.test.ts`
- Achievement tests, preferably new `src/achievements.test.ts`

---

## Phase 7 — Progressive onboarding and feature disclosure

### Goal

Teach the loop in play rather than exposing every system on the first screen.

### Unlock cadence

- Level 1: drag to select, legal directions, target-word completion.
- First completion: explain Seeds in the success screen.
- Level 2: introduce and celebrate bonus words.
- Level 3: introduce the starter plant and first watering.
- Level 5: introduce the full Seed Store and trophy case.

### Implementation

1. Derive feature availability from `levelsCompleted` wherever possible.
2. Persist only one-time coachmark dismissal state, not redundant unlock state.
3. Add a small versioned `onboardingSeen` record to `SaveData`.
4. Coachmarks must be dismissible, replayable from Help, keyboard reachable, and skipped when reduced motion is requested.
5. Hide or softly lock unavailable navigation with a clear unlock condition; do not present dead controls.
6. Keep returning-player flow fast. No modal should reappear once acknowledged unless explicitly replayed.

### Tests

- A new save sees the correct sequence.
- Existing saves are not forced through introductory coachmarks.
- Dismissal persists.
- All onboarding steps work at 390×844 and 1280×720.

### Primary files

- `src/App.tsx`
- `src/components/AboutDialog.tsx`
- `src/persistence.ts`
- `src/persistence.test.ts`
- New focused onboarding component and tests

---

## Phase 8 — Unify visual language and improve hierarchy

### Goal

Present one coherent world: a cozy botanical fantasy garden illuminated by gentle bioluminescence.

### Art-direction rules

Create `docs/ART_DIRECTION.md` with:

- The one-sentence visual north star above.
- Primary, secondary, neutral, success, warning, locked, and rarity colors.
- Glow intensity tiers: ambient, interactive, reward, legendary.
- Material vocabulary: foliage, glass, aged brass, soft stone, water, and light.
- Icon framing, perspective, border, and shadow rules.
- Illustration treatment for backgrounds, plants, badges, power-ups, and navigation.
- Typography roles and minimum contrast targets.
- Gold reserved for exceptional rewards and premium states, not routine navigation.

### UI pass

1. Shorten `Digital Conservatory & Botanical Sanctuary` to `Moonlit Conservatory` or `My Garden`; use one final name everywhere.
2. Simplify technobabble in plant and power-up copy while preserving flavor.
3. Increase contrast for muted green text, progress labels, locked cards, and footer text.
4. Brighten or enlarge plant and achievement silhouettes so their art reads at card size.
5. Standardize card radius, border opacity, glow strength, icon frame, and rarity chip styling.
6. Reduce gold usage in top and bottom navigation; reserve it for trophies, rare rewards, and selected premium states.
7. Verify all four themes. Do not tune only the default dark theme.

### Desktop layout

At 1280×720, keep the entire board and primary controls visible without page scrolling:

1. Convert the Level Goal into a compact single-row status bar on desktop.
2. Size the board with viewport-aware constraints.
3. Reduce the width of the Found Words panel or allow a two-column/wrapping list when useful.
4. Eliminate large empty regions in the Found Words panel.
5. Keep the left rail functional at shorter desktop heights.

### Mobile layout

1. Preserve the current strong board-first hierarchy and fixed bottom navigation.
2. Verify that switching sections starts each section at its intended scroll position.
3. Ensure modal stores, coachmarks, snackbars, and success overlays never collide with the bottom navigation or safe areas.

### Visual QA matrix

Capture and inspect at minimum:

- 390×844 portrait.
- 844×390 landscape.
- 768×1024 tablet portrait.
- 1024×768 tablet landscape.
- 1280×720 desktop.
- 1440×900 desktop.

Check Play, Levels, Garden, Trophies, Settings, Seed Store, achievement banner, and success overlay in Sprout and Midnight themes. Check Autumn and Ocean after permanent-theme tests unlock them.

### Primary files

- `src/App.css`
- `src/App.tsx`
- `src/theme.ts`
- `src/theme/tokens.ts`
- `src/categoryThemes.ts`
- `src/components/LevelsView.css`
- Garden, store, achievement, and success components
- New: `docs/ART_DIRECTION.md`

---

## Phase 9 — Make the board accessible without sacrificing canvas rendering

### Goal

Support keyboard and screen-reader play while retaining the animated canvas presentation.

### Tasks

1. Give the visible canvas an accessible name, instructions, and focus state.
2. Implement keyboard navigation:
   - Arrow keys move a visible cell focus cursor.
   - Enter or Space marks the selection start.
   - Arrow keys choose the end along a legal direction.
   - Enter or Space submits.
   - Escape cancels.
3. Render a synchronized visually hidden semantic grid with row and column information and each cell's letter.
4. Add a polite live region announcing:
   - Focused letter and coordinates.
   - Current selection string.
   - Target found, bonus found, duplicate, or invalid result.
   - Level completion.
5. Ensure found-word state is communicated by text/icon as well as color.
6. Respect `prefers-reduced-motion` for board celebration, banners, navigation animation, glow pulses, and coachmarks.
7. Ensure touch targets are at least 44×44 CSS pixels where practical.

### Tests

- Complete a fixture puzzle using only keyboard events.
- Screen-reader labels expose every grid cell and target word.
- Found state is available without relying on color.
- Focus remains logical through overlays and returns to the triggering control after close.
- Reduced-motion mode removes nonessential animation but retains state changes.

### Primary files

- `src/components/GameCanvas.tsx`
- `src/App.css`
- `src/App.tsx`
- Success and achievement overlay components
- `src/test/setup.ts`
- New or expanded canvas accessibility tests

---

## Phase 10 — Reduce download and runtime cost

### Goal

Keep offline support while avoiding a roughly 78 MB mandatory first-install precache and oversized initial JavaScript.

### Asset pipeline

1. Inventory every asset with original dimensions, encoded size, usage locations, and whether it must work offline immediately.
2. Convert large photographic/painterly PNGs to WebP, retaining PNG only where alpha quality requires it.
3. Produce card-sized variants for plants, achievements, navigation, and store thumbnails. Do not download multi-megabyte source art to display a small card.
4. Compress music to an appropriate bitrate after listening tests; preserve seamless looping.
5. Keep the core play background, UI icons, current-category data, and essential SFX in the install precache.
6. Runtime-cache optional themes, high-rarity plants, achievement art, level-trail art, and music. Cache on first use for subsequent offline access.
7. Add a graceful placeholder and retry behavior when an optional asset is not yet cached.

### Code splitting

1. Lazy-load Levels, Garden, Achievements, Settings, About, and Seed Store.
2. Keep the play screen and initial category data in the entry bundle.
3. Resolve the Tauri static/dynamic import warning by using one consistent loading strategy per build target.
4. Fix the React style warning caused by mixing `background` shorthand with `backgroundAttachment`.

### Budgets

Use these first-pass targets:

- Initial minified JavaScript: below 500 kB.
- Core PWA precache: below 20 MB.
- No card thumbnail above 250 kB without a documented exception.
- No background above 1 MB without a documented visual-quality reason.

Add a small build-budget script that fails CI/local verification when hard limits are exceeded. Keep the limits centralized and documented.

### Primary files

- `vite.web.config.ts`
- `src/App.tsx`
- `src/categoryThemes.ts`
- `src/backend.ts`
- `src/persistence.ts`
- `scripts/`
- `public/`
- `package.json`

---

## Phase 11 — Final integration and regression pass

### Automated checks

Run:

```powershell
npm test -- --reporter=dot
npm run build:web
npm run build
```

If the environment supports them, also run the appropriate Tauri and Rust checks without publishing artifacts.

### Manual playthroughs

Use a clean save and an existing migrated save.

#### Clean-save route

1. Complete onboarding level 1 with pointer input.
2. Verify Level Goal and Level labels.
3. Use the free hint and verify the second hint requires inventory.
4. Discover a bonus word and verify distinct feedback.
5. Complete the level and verify target, bonus, and Seed totals.
6. Reach each feature-unlock milestone.
7. Water and fertilize a plant through bloom.
8. Purchase and consume each power-up.
9. Unlock and apply each permanent theme.
10. Complete one level using keyboard only.

#### Migration route

1. Load a copy of a current-schema save.
2. Verify level, Seeds, achievements, garden state, favorites, audio, and theme preferences are preserved.
3. Verify new inventory, onboarding, and achievement-stat fields receive safe defaults.
4. Save, reload, and repeat on the Web persistence path.
5. Repeat on the Tauri path if available.

### Regression checklist

- No duplicate Seed deductions or rewards.
- No repeated bloom bounty.
- No target word omitted from a generated puzzle.
- No stale hint markers after shuffle, restart, level change, or navigation.
- No overlay traps keyboard focus.
- No section opens at an accidental prior scroll position.
- Audio starts only after permitted user interaction and respects mute/volume settings.
- Success and achievement sequences remain visually satisfying.
- The game remains playable offline after the intended core assets have been cached.

---

## Required final handoff from Luna

Do not commit. Leave the working tree ready for human review and report:

1. Files added, changed, and removed.
2. Completed phases and intentionally deferred items.
3. Save-schema version and migration behavior.
4. Final economy table.
5. Test counts and exact commands run.
6. Web/Tauri build results and every remaining warning.
7. Before/after initial JavaScript and PWA-precache sizes.
8. Visual QA viewport/theme coverage.
9. Any product decision that deviated from this plan and why.
10. Any known issue, with reproduction steps.

## Definition of done

This remediation is complete only when:

- Player-facing labels accurately describe implemented mechanics.
- Free and paid tactical tools no longer duplicate one another.
- Every generated puzzle contains its configured target count.
- Bonus words receive distinct feedback and completion credit.
- The garden is a controlled collection sink rather than a compounding currency source.
- Achievements reward genuinely different behaviors.
- New-player systems are introduced progressively.
- Desktop play fits at 1280×720 and mobile quality is preserved.
- The board is keyboard and screen-reader playable.
- The core PWA precache and entry bundle meet the stated budgets or have reviewed exceptions.
- All automated and manual acceptance checks pass.
- No commit, push, deployment, or release has been made.
