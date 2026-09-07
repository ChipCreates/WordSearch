# Word Sprout — Luna Context Sidebar & Progression Completion Plan

## Mission

Complete the next product-quality pass on Word Sprout by turning the desktop sidebar into a genuinely useful context-sensitive action rail and repairing the progression, reward, power-up, and retry semantics that the rail will expose.

This is an implementation plan, not a design-only exercise. Luna should complete the work end to end, including save migration, automated coverage, responsive behavior, visual QA, and final verification. Do not commit, push, publish, deploy, or release. Preserve unrelated working-tree changes.

## Product outcome

After this pass:

- The sidebar answers “what can I do next?” on every desktop destination.
- Every store power-up can be activated and produces the promised gameplay effect.
- Replaying an old level never destroys or lowers the player’s progression frontier or Botanist rank.
- Restarting a puzzle cannot be used to repeatedly harvest the same bonus-word reward.
- Difficulty modes materially change puzzle composition, not only board size.
- Botanist promotions and longer-term achievements provide visible progression.
- The same critical information and actions remain available below the desktop-sidebar breakpoint.
- Lazy-loaded destinations transition with local skeletons instead of blanking the whole application.
- The test run is clean, including canvas tests without repeated `getContext()` warnings.

## Current baseline

Use the current working tree as the source of truth. Before making changes, run and record:

```powershell
git status --short
npm test -- --reporter=dot
npm run build:web
npm run check:budgets
```

Baseline observed during the planning review:

- 16 Vitest files passed.
- 164 tests passed.
- The web production build passed.
- Largest JavaScript entry: approximately 0.36 MB against a 0.49 MB budget.
- PWA precache: approximately 2.89 MB against a 20 MB budget.
- The test suite repeatedly warns that `HTMLCanvasElement.getContext()` is not implemented in jsdom.
- The web build reports an empty `react-vendor` chunk.

Do not treat those counts as immutable. Report the final counts and final bundle numbers.

## Non-negotiable implementation principles

1. Preserve the local-first Web/Tauri architecture and the existing persistence abstraction.
2. Keep one canonical owner for player state. Do not add new direct `localStorage` islands.
3. Use pure derivation helpers for sidebar models, achievement progress, care readiness, rewards, and puzzle difficulty wherever practical.
4. Do not put new feature logic directly into the large JSX block in `App.tsx`. Extract components and helpers.
5. A disabled action must explain how it becomes available.
6. A purchasable item must have a reachable, tested use action.
7. Critical actions added to the desktop rail must have an equivalent mobile/tablet path.
8. Do not add a daily-login streak, notification system, server dependency, telemetry, or real-time clock dependency beyond the garden cooldown already present.
9. Respect reduced motion, keyboard navigation, screen readers, and 44×44 touch targets.
10. Reuse the current botanical art direction, tokens, and glass-panel vocabulary. Do not introduce a second visual system.

---

## Phase 1 — Repair progression and reward integrity

Complete this phase before building the new sidebar. The sidebar must not advertise broken state.

### 1.1 Separate the progression frontier from the level being played

The current `level` value is simultaneously used as the selected puzzle, the highest unlocked level, the save frontier, and the Botanist-rank input. Replaying an older level therefore moves the apparent career backward.

Introduce these concepts:

- `highestUnlockedLevel`: persisted canonical progression frontier; minimum 1.
- `playingLevel`: current puzzle being displayed; transient UI/game-session state initialized from `highestUnlockedLevel` on load.
- `completedLevels`: persisted first-clear level identifiers, or an equivalent compact representation that can reliably distinguish a first clear from a replay.
- `totalPuzzleCompletions`: persisted lifetime completed runs, including replays, for profile statistics if desired.

Required behavior:

- Selecting an unlocked older level changes only `playingLevel`.
- Completing the frontier level advances `highestUnlockedLevel` exactly once and records its first clear.
- Completing a replay never reduces or advances the frontier.
- “Next Level” after a frontier clear opens the newly unlocked level.
- A replay completion offers “Return to Level N” and “Replay again”; it must not strand the player at the old level.
- Botanist rank is derived from `highestUnlockedLevel`, never `playingLevel`.
- The level map uses `highestUnlockedLevel` to decide completed/current/locked states.
- Puzzle difficulty and category selection use `playingLevel`.

Rename ambiguous props and local variables. Avoid retaining a generic `level` name where its meaning would be unclear.

### 1.2 Define first-clear and replay rewards

Use explicit reward semantics:

- First clear of a level: current full completion reward (`REWARDS.LEVEL_COMPLETE_SEEDS`).
- Replay clear: a smaller explicit replay reward, initially 10 Seeds.
- Bonus words: pay once per generated puzzle instance, regardless of restart attempts.
- Re-entering a level creates a new puzzle instance and may offer new bonus rewards; restarting the same board does not.
- A paid Double Seeds effect applies to both first-clear/replay completion rewards and valid bonus-word rewards for that puzzle instance.

Centralize these values and calculations in `gameMechanics.ts`; do not inline reward math in UI components.

### 1.3 Close the retry bonus-word farming loophole

The current retry path clears `foundWords`, which allows already-paid bonus words on the unchanged board to pay again.

Add a per-puzzle identity and reward ledger, or an equivalently robust structure:

- `puzzleInstanceId`
- `rewardedBonusWords: Set<string>` scoped to that instance

On retry:

- Clear target completion and target highlight state as intended.
- Preserve the rewarded-bonus ledger.
- Either preserve bonus highlights or show already-discovered bonus words in a non-paying “discovered” state.
- Never deduct previously earned Seeds.
- Clearly message an already-rewarded bonus selection.

On a genuinely newly generated puzzle, reset the ledger.

### 1.4 Save migration

Bump `CURRENT_SCHEMA_VERSION` and provide an idempotent migration.

Migration requirements:

- Derive `highestUnlockedLevel` from the safest available legacy value.
- Initialize `playingLevel` at runtime; do not persist stale replay selection unless there is a strong reason.
- Derive first-cleared levels conservatively from the old frontier. If the old data cannot prove a clear, prefer not to grant an unearned first-clear reward.
- Preserve all Seeds, garden state, achievements, themes, settings, favorites, onboarding state, and power-up inventory.
- Add safe defaults for new counters and Field Notes state introduced later in this plan.
- Loading and saving the migrated data twice must produce the same result.

### Phase 1 tests

- Replaying Level 1 while Level 10 is unlocked leaves the frontier and rank at Level 10.
- Completing Level 10 unlocks Level 11 exactly once.
- Replaying a completed level grants only the replay reward.
- Restarting the same puzzle cannot repay the same bonus word.
- A new puzzle instance can reward its own bonus discoveries.
- Legacy saves migrate without losing existing state.
- Migration is idempotent.

Primary files:

- `src/hooks/useWordSearchGame.ts`
- `src/persistence.ts`
- `src/gameMechanics.ts`
- `src/App.tsx`
- `src/components/LevelsView.tsx`
- `src/components/SuccessScreen.tsx`
- Corresponding tests

---

## Phase 2 — Finish the power-up system

The store currently sells six charge types, but only the basic hint and shuffle have reachable play controls. Finish all promised mechanics before surfacing the inventory in the sidebar.

### 2.1 Shared activation contract

Create a single activation pathway that:

1. Validates that the action has a meaningful target.
2. Validates available inventory.
3. Consumes exactly one charge only after successful activation.
4. Increments `powerupsUsed` exactly once.
5. Produces specific status/live-region feedback.
6. Clears temporary visual effects when the board, level, tab, or puzzle instance changes.

Do not let individual UI buttons reproduce inventory mutation logic.

### 2.2 Implement each power-up

#### Single Letter Sprout

- Preserve the first free hint per generated puzzle.
- Paid uses highlight the first cell of one unfound word.
- Clearly distinguish “Free” from paid inventory in the control label.

#### Lumina Cyclone

- Preserve already-found targets and their board paths.
- Reposition only unfound target words.
- Guarantee every unfound target is placed; do not silently drop a word.
- Reset temporary hint overlays after reshuffling.

#### Super Root Hint

- Solve one unfound target word.
- Do not award bonus-word Seeds.
- Completion caused by Super Root must still run the normal completion transition once.
- Mark the level as having used a hint for hint-free achievement logic.

#### Bioluminescent Compass

- For approximately 4 seconds, show the direction from the first cell toward the rest of one unfound word.
- Do not reveal the entire spelling or mark the word found.
- Provide a reduced-motion version using a static arrow/path.

#### Flora Spectrometer

- For approximately 5 seconds, mark the starting cell of every unfound target.
- Use a visual treatment distinct from Single Letter Sprout.
- Announce the number of starts highlighted to assistive technology.

#### Nitrogen Booster

- Activate for the current puzzle instance.
- Display an obvious persistent “2× Seeds active” state in the Play rail and completion overlay.
- Prevent activating a second charge during the same puzzle.
- Clear only when a new puzzle instance begins.

### 2.3 Store integrity

- Keep all store descriptions synchronized with actual behavior.
- Show current inventory on every power-up store card.
- After purchase, offer a non-disruptive “Use in Play” affordance when applicable.
- Items unavailable due to onboarding must state the unlock condition.
- Never spend Seeds twice through both store and activation paths.

### Phase 2 tests

- Every charge can be purchased, activated, consumed, persisted, and reloaded.
- Failed activations do not consume inventory.
- Temporary overlays expire and clear on puzzle changes.
- Power-up-caused completion pays once.
- Nitrogen Booster doubles the intended rewards once and cannot stack.
- Shuffle retains found progress and always retains every target.

Primary files:

- `src/powerups.ts`
- `src/hooks/useWordSearchGame.ts`
- `src/components/GameCanvas.tsx`
- `src/components/SeedStoreDialog.tsx`
- `src/App.tsx`
- Power-up and hook tests

---

## Phase 3 — Build the context-sensitive sidebar

### 3.1 Component architecture

Extract the rail from `App.tsx` into a component family such as:

```text
src/components/sidebar/
  ContextSidebar.tsx
  ProfileSummaryCard.tsx
  PlayActionPanel.tsx
  JourneyProgressPanel.tsx
  GardenCarePanel.tsx
  TrophyProgressPanel.tsx
  SidebarUtilities.tsx
  sidebarModels.ts
```

Names may vary, but keep view rendering separate from pure derivation logic.

`ContextSidebar` owns layout only. It receives a compact view model and callbacks rather than the entire game hook object.

### 3.2 Persistent profile summary

Retain the avatar, title, and level, then add:

- A progress bar through the current Botanist-rank range.
- “N levels to [next rank]”.
- A max-rank state for Cosmic Conservator.
- The Golden Sprout Crest when owned.
- Click-through to the existing detailed player profile.

Add helpers such as `getNextBotanistRank()` and `getRankProgress()`. Base them on `highestUnlockedLevel`.

Keep the card visually shorter than the current version if necessary; the avatar should remain prominent but should not consume space needed for actionable content at 1280×720.

### 3.3 Play panel — Tactical Toolkit plus decision context

Keep the existing Hint, Shuffle, and Restart actions and expand the panel to include:

- Current puzzle reward summary: first-clear or replay completion reward and bonus-word reward.
- An active 2× reward badge when Nitrogen Booster is active.
- Reachable controls for all six power-ups.
- Inventory counts.
- Clear disabled states and concise acquisition guidance.
- The closest achievement that can be advanced by this puzzle, when one exists.

Avoid duplicating the main target-word list or large Level Goal header. The sidebar should explain tactical choices and rewards, not mirror the board.

For six tools in 256px, use one primary action plus a compact two-column tool grid or icon-and-label rows. Tooltips cannot be the only source of essential information.

### 3.4 Levels panel — Journey Progress

Evolve or replace `GreenhouseFloorplanPanel` with information relevant to choosing and understanding levels:

- Highest unlocked level.
- Currently selected/playing level when it differs.
- Current Botanist rank and next rank threshold.
- Next board-size increase for the active difficulty.
- First-clear count and optional total replay count.
- Compact plant collection/bloom summary as a secondary section, not the primary message.
- A “Return to current level” action while browsing/replaying an old level.

Do not duplicate the selected-level reward card already present in the main level trail.

### 3.5 Garden panel — Care Queue

This is the most important new contextual panel.

Derive and display:

- Count ready to water now.
- The next plant becoming ready and a countdown.
- The closest non-bloomed plant to 100% growth.
- Total collection and bloom counts.
- “Water all ready” when at least one plant is ready.
- Seed Store shortcut when useful.

Bulk watering must be implemented as one state transaction. It must:

- Re-evaluate readiness at action time.
- Update every eligible timestamp and growth value atomically.
- Grant each newly earned bloom bounty exactly once.
- Record each new bloom and rarity accurately.
- Produce one summary toast rather than a toast storm.
- Disable itself if nothing is ready.

The countdown should update efficiently. Use one shared minute-level ticker for the panel, not one interval per plant.

### 3.6 Trophies panel — Closest Milestones

For locked achievements:

- Compute normalized progress as `current / maxProgress`.
- Sort by smallest remaining normalized progress, then stable catalog order.
- Show up to three closest achievable milestones.
- Include concrete next-action copy, not only a percentage.
- Show the most recently unlocked trophy when the session has one.
- Provide shortcuts to the Unlocked and Locked filters.

Exclude impossible, malformed, already-unlocked, and zero-denominator entries safely.

Examples of actionable copy:

- “Complete 3 more levels without hints.”
- “Find 2 more bonus words.”
- “Bloom your starter plant.”

### 3.7 Compact utility dock

Replace the tall bottom block with:

- Compact SFX and Music toggles with visible state and accessible names.
- A Help button.
- Settings if space permits and it does not duplicate top navigation unnecessarily.

Keep this dock pinned to the bottom, but let the contextual middle region scroll independently at short desktop heights.

### Phase 3 tests

- The correct panel renders for each active destination.
- Rank progress handles every rank boundary and max rank.
- Care Queue ordering and countdown derivation are deterministic.
- Water-all applies one correct transaction and one summary.
- Closest-achievement sorting is stable and percentage-based.
- All sidebar controls have accessible names and keyboard focus states.

Primary files:

- `src/App.tsx`
- `src/App.css`
- `src/botanistRanks.ts`
- `src/components/GreenhouseFloorplanPanel.tsx` (replace, rename, or remove cleanly)
- New sidebar component directory and tests

---

## Phase 4 — Responsive equivalents

The desktop rail appears only at 1280px and above. Do not make new critical functionality desktop-only.

### Tablet, 768–1279px

- Use a compact contextual strip or collapsible “Field Kit” panel near the top of each destination.
- Preserve board-first hierarchy on Play.
- Keep power-up access no more than one extra interaction away.
- Garden should show readiness count and the next timer without requiring card scanning.

### Mobile, below 768px

- Extend the existing mobile tactical toolbar with an expandable tool drawer for the additional power-ups.
- Put Garden Care Queue summary above the plant cards.
- Put Closest Milestone summary below the Trophies overview and filters.
- Put rank-to-next progress in the Player Profile sheet.
- Do not increase the fixed bottom-navigation height.
- Respect safe-area insets and ensure overlays do not collide with the bottom navigation.

Use shared derivation models so desktop and responsive views cannot disagree about readiness, inventory, rank, or achievement progress.

### Phase 4 tests

- Critical actions are reachable at mobile, tablet, and desktop breakpoints.
- No horizontal overflow at the required QA sizes.
- The board remains the primary mobile element.
- Focus returns logically after closing a mobile power-up drawer or profile sheet.

---

## Phase 5 — Make difficulty modes materially different

`PuzzleDifficulty` defines diagonal and reverse probabilities, but placement currently does not apply them. Implement the advertised distinctions.

### Required generation behavior

- Easy: favors horizontal/vertical and forward words; fewer overlaps; smallest boards.
- Standard: balanced directions and moderate overlap.
- Challenging: materially more diagonal, reverse, and overlapping placements; largest boards.
- Every target must still be present.
- Generation must remain bounded and retain its safe fallback.

Refactor placement candidate scoring to include:

- Direction class.
- Reverse orientation.
- Desired mode probabilities or weights.
- Existing overlap pressure.
- Deterministic RNG supplied by the generator test seam.

Fix `fillGrid()` so its supplied RNG actually controls generated letters during deterministic tests. Do not call global `Math.random()` through that path.

### Statistical tests

Use seeded repeated generation to verify broad distributions without brittle exact boards:

- Challenging produces a significantly higher diagonal share than Easy.
- Challenging produces a significantly higher reverse share than Easy.
- All modes always include every target across a substantial fixture set.
- Same seed and request produce the same result.
- Fallback remains valid.

Do not write flaky tests around uncontrolled randomness.

Primary files:

- `src/puzzleGenerator.ts`
- `src/gameMechanics.ts`
- `src/puzzleGenerator.test.ts`
- Any Rust parity code/tests affected by shared behavior

---

## Phase 6 — Expand long-term progression

### 6.1 Tiered achievements

Retain existing unlocks and IDs for save compatibility. Add progression families rather than deleting earned trophies.

Recommended families:

- Level clears: 10 / 25 / 50 / 100.
- Bonus words: 5 / 25 / 100.
- Categories completed: 10 / 30 / all available for the selected corpus/tier where feasible.
- Hint-free clears: 5 / 20 / 50.
- Plants bloomed: 1 / 5 / 20.
- Power-ups used: 1 / 10 / 50.
- Reverse or diagonal discoveries: suitable cumulative thresholds after counters exist.

Add achievement metadata where needed:

- `family`
- `tier`
- Actionable locked-state copy or an action formatter.
- Stable ordering.

Use frame/color variants for bronze, silver, gold, and exceptional tiers. New bespoke images are optional; do not block implementation on generating a large art set.

Ensure the Trophy sidebar chooses useful near-term goals instead of always promoting a far-away gold tier.

### 6.2 Botanist promotion ceremony

When a frontier clear crosses a rank threshold:

- Queue a one-time promotion celebration after level completion.
- Show old rank, new rank, new avatar, and a concise botanical message.
- Do not fire on initial load, save migration, replay completion, or navigation.
- Respect reduced motion.
- Ensure it composes safely with achievement banners and the success overlay; use a queue rather than stacking overlays.

### Phase 6 tests

- Existing achievement IDs remain unlocked after migration.
- Tier progress and sorting are correct.
- Rank promotion triggers once at each boundary.
- Loading a save at a higher level does not replay historical promotions.
- Replay completion does not promote the player.

---

## Phase 7 — Add rotating Field Notes without a daily streak

Only begin this phase after Phases 1–6 are stable.

Field Notes should provide three small, rotating objectives using mechanics that already exist. They are not daily-login obligations and must not punish absence.

### Initial objective pool

- Complete one frontier puzzle without a hint.
- Find two bonus words across puzzles.
- Find a reverse word.
- Find a diagonal word.
- Use one tactical power-up.
- Water one plant.
- Bloom one plant.
- Complete puzzles in two different categories.

### Rotation and rewards

- Present three active Notes.
- Generate the set deterministically from an expedition index stored in SaveData.
- Refresh the set when all three are completed and claimed, or after a small frontier milestone such as three first clears.
- Do not use calendar time, login streaks, push notifications, or server time.
- Award small Seeds amounts, initially 15–30 depending on effort.
- Auto-complete progress but require a deliberate “Collect” action, unless accessibility testing shows auto-claim is clearer.
- Prevent duplicate claims transactionally.

### Event architecture

Do not sprinkle independent counter mutations through components. Introduce a narrow internal game-event function or reducer-like update path for relevant events:

- `puzzle_completed`
- `bonus_word_found`
- `word_found_reverse`
- `word_found_diagonal`
- `powerup_used`
- `plant_watered`
- `plant_bloomed`
- `category_completed`

Achievements, Field Notes, and profile statistics should consume consistent facts from this path.

### Sidebar presentation

- Show one-line progress for the three Notes beneath the context panel when vertical space allows.
- Collapse completed Notes and emphasize Collect.
- On mobile, place Field Notes in the Player Profile or a compact destination card rather than adding another permanent navigation tab.

### Phase 7 tests

- Deterministic objective generation.
- Event progress increments exactly once.
- Claims pay once and persist.
- Rotation preserves unclaimed rewards safely.
- Migration initializes Field Notes without altering prior balances.

---

## Phase 8 — Replace global lazy-loading blank screens

The application currently wraps nearly the entire tree in a root-level `Suspense`, causing first-time destination loads to replace the whole UI with “Loading your conservatory…”.

Required changes:

- Keep the application shell, top navigation, sidebar/bottom navigation, and background mounted.
- Add localized Suspense boundaries around Levels, Garden, Trophies, Settings, About, and Seed Store.
- Create destination-specific skeletons that approximately match final geometry.
- Keep skeletons lightweight and theme-aware.
- Do not show a full-screen blank state during normal section switching.
- Consider preloading the likely next destination after initial Play is interactive, without increasing the initial bundle beyond budget.

Tests should verify that navigation remains present while a lazy destination is pending.

---

## Phase 9 — Clean test output and strengthen interaction coverage

### Canvas environment

Provide a deterministic canvas mock in `src/test/setup.ts`, or use a small maintained dev dependency if it materially reduces custom code.

Requirements:

- No repeated `HTMLCanvasElement.getContext()` warnings.
- Mock enough drawing and measurement APIs for `GameCanvas` effects to run.
- Do not conceal genuine exceptions from game code.

### New integration coverage

Add focused tests for:

- Context panel switching.
- All power-up control states.
- Frontier vs. replay navigation.
- Reward ledger behavior.
- Garden bulk watering.
- Closest achievements.
- Rank promotion queue.
- Field Notes progress/claim/rotation.
- Localized Suspense shell persistence.
- Keyboard access to every new action.

### Build warning

Investigate the empty `react-vendor` chunk. Remove or adjust the manual chunk rule if it is obsolete. Do not sacrifice sensible code splitting merely to silence the warning.

---

## Phase 10 — Visual and usability refinement

### Sidebar layout requirements

- Width may remain 256px unless testing shows that 272px materially improves tool labels without harming the board.
- At 1280×720, profile, primary contextual content, and utility dock must remain reachable.
- The contextual middle region may scroll; the entire page should not need to scroll merely to reach audio/help.
- Use one strong primary action per context, then compact secondary controls.
- Maintain AA text contrast.
- Avoid using gold for routine controls; reserve it for rewards, trophy tiers, and promotions.
- Provide visible hover, focus, pressed, active, disabled, and cooldown states.
- Avoid animation loops in countdowns and progress cards.

### Required visual QA matrix

Inspect at minimum:

- 390×844 portrait mobile.
- 844×390 landscape mobile.
- 768×1024 tablet portrait.
- 1024×768 tablet landscape.
- 1280×720 desktop.
- 1440×900 desktop.
- 1920×1080 desktop.

At each applicable viewport, inspect:

- Play with zero and nonzero power-up inventory.
- Play with Nitrogen Booster active.
- A completed frontier level.
- A completed replay level.
- Levels while viewing an older level.
- Garden with nothing ready, one plant ready, and several plants ready.
- Trophies with near, completed, and long-range milestones.
- Rank promotion.
- Field Notes with active and collectable objectives.
- Localized loading skeletons.
- Player profile and Seed Store.

Test Midnight and Sprout thoroughly. Spot-check Autumn and Ocean after unlocking them through controlled test state.

Also test:

- Keyboard-only navigation.
- Reduced motion.
- 200% browser zoom at a desktop viewport.
- Long translated-like labels or artificially lengthened strings to reveal clipping.

Capture updated desktop and mobile screenshots only after the final layout is accepted. Do not overwrite existing user-modified screenshots casually; inspect `git status` first and preserve unrelated changes.

---

## Recommended implementation order

Follow this order unless a concrete dependency requires a small adjustment:

1. Baseline and save fixtures.
2. Progression split and migration.
3. Reward ledger and replay semantics.
4. Complete all power-up effects.
5. Extract sidebar architecture and pure models.
6. Implement Play, Levels, Garden, and Trophies panels.
7. Add responsive equivalents.
8. Correct difficulty-mode generation.
9. Add tiered achievements and promotion ceremony.
10. Add Field Notes and its event path.
11. Localize Suspense fallbacks.
12. Clean canvas test environment and build warning.
13. Full automated, manual, responsive, and theme verification.

Keep the application runnable after each numbered step. Do not perform a giant unverified rewrite of the game hook and UI in one pass.

## Suggested state and component boundaries

### Persisted domain state

- Progress frontier and first-cleared levels.
- Seeds and inventory.
- Lifetime achievement counters.
- Garden ownership/growth/cooldowns/bloom history.
- Achievement unlocks.
- Rank-related permanent rewards such as the crest, but not derived rank itself.
- Field Notes objective set, progress, expedition index, and claim state.
- Existing settings, favorites, themes, and onboarding.

### Transient puzzle/UI state

- `playingLevel` unless deliberate resume behavior is added.
- Current generated board and puzzle identity.
- Current target highlights and temporary power-up overlays.
- Success, achievement, promotion, and toast queues.
- Active navigation destination.
- Sidebar expansion/collapse state.

### Pure derived models

- Current and next rank.
- Rank-range percentage.
- First-clear vs. replay reward preview.
- Ready-to-water plants and next-ready timestamp.
- Closest-to-bloom plant.
- Closest achievements.
- Next board-size change.
- Power-up availability and disabled reason.

Do not persist values that can be reliably derived from canonical state.

---

## Final verification commands

Run and report the exact results:

```powershell
npm test -- --reporter=dot
npm run build:web
npm run check:budgets
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
git status --short
```

If a command cannot run due to the environment, report the exact blocker. Do not imply it passed.

Perform manual clean-save and migrated-save playthroughs.

### Clean-save route

1. Complete onboarding and the first frontier level.
2. Verify rank progress and first-clear reward.
3. Use the free hint, then a paid hint.
4. Purchase and activate every power-up.
5. Discover a bonus word, restart, and verify it cannot pay twice.
6. Complete a frontier level with Double Seeds.
7. Replay an earlier level and confirm the frontier/rank remain unchanged.
8. Water several ready plants with the bulk action and verify bounties.
9. Complete and claim Field Notes.
10. Trigger an achievement and a rank promotion.

### Migrated-save route

1. Load a copy of a schema-v2 save with meaningful progress.
2. Verify frontier, Seeds, inventory, trophies, themes, favorites, settings, and garden state.
3. Replay an old level without regression.
4. Save, reload, and compare state.
5. Repeat on Web persistence and Tauri persistence when available.

---

## Definition of done

This pass is complete only when all of the following are true:

- Play, Levels, Garden, and Trophies each have a useful, distinct sidebar panel on desktop.
- Rank progress is visible and based on the permanent frontier.
- Garden readiness and nearest trophy progress are available without scanning the full destination.
- Every store power-up has a reachable, accurate, tested gameplay effect.
- Replay selection cannot lower unlocked progress or displayed rank.
- First-clear, replay, bonus, and doubled rewards are explicit and cannot pay twice accidentally.
- Difficulty probabilities materially affect generated boards and deterministic tests prove it.
- Achievement tiers and rank promotions extend long-term goals without invalidating existing saves.
- Field Notes provide rotating goals without daily-login pressure or duplicate claims.
- Mobile and tablet retain equivalent access to critical information and actions.
- Destination switching never blanks the whole app during lazy loading.
- Tests pass without canvas-environment warning spam.
- Web and Tauri checks pass, or exact environment blockers are documented.
- Bundle and precache budgets still pass.
- Required viewport, theme, keyboard, reduced-motion, clean-save, and migrated-save QA is complete.
- No commit, push, deployment, publication, or release was performed.

## Required final handoff from Luna

Report:

1. Files added, changed, removed, or intentionally left untouched.
2. Final save-schema version and migration behavior.
3. Final progression model and replay behavior.
4. Complete first-clear/replay/bonus/Field Notes reward table.
5. Power-up behavior and activation path for all six items.
6. Sidebar content by destination and responsive equivalents.
7. Achievement families and rank-promotion thresholds added.
8. Test file count, test count, exact commands, and results.
9. Web/Tauri build results and every remaining warning.
10. Before/after JavaScript entry and PWA-precache sizes.
11. Visual QA coverage by viewport and theme.
12. Any deliberate deviation from this plan and the evidence behind it.
13. Every known issue with reproduction steps.

