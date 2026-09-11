# WSP-2.7 — Beyond-level-100 certification findings

Per `WordSprout_1.0_Tier2_Issues.md` (WSP-2.7), this is the certification
pass confirming Word Sprout's campaign genuinely continues past level 100
now that WSP-2.2 (region data + rewards), WSP-2.3 (generator tuning +
category parity), and WSP-2.5 (achievement audit + rarity fix) have landed
— the Tier 2 equivalent of WSP-1.4's early playtest checkpoint. Unlike
WSP-1.4, this isn't a played session: it's a code-level certification,
built as automated tests plus direct reading of the relevant modules,
since "does puzzle generation keep working at level 137" isn't something a
human playtester can usefully sit and click through for the required
number of levels.

**Scope covered:** `src/regions.ts` (WSP-2.2), `src/regionTuning.ts` +
`src-tauri/src/regions.rs` + `src-tauri/src/lib.rs` (WSP-2.3),
`src/achievements.ts` + `src/persistence.ts` (WSP-2.5), `src/botanistRanks.ts`,
`scripts/simulate-economy.ts`, and the `level100PlayerSave` fixture
(`src/test/fixtures/saves/index.ts`). New test coverage added:
`src/beyondLevel100.test.ts` (50 tests), one new Rust test in
`src-tauri/src/lib.rs`, a new economy-simulation horizon + test in
`scripts/simulate-economy.ts`/`.test.ts`, and a new fixture
(`level150PlayerSaveCurrentShape`) plus two targeted tests in
`src/persistence.test.ts`.

Each entry below separates what was literally observed/verified in the
code from what it's judged to mean, per the checkpoint's own format.

---

## 1. Region tuning and category bias (WSP-2.3) are fully built and tested, but never actually reached from real gameplay — at level 1 as much as at level 101

**Observation:** the only puzzle-generation call site reachable from actual
play is `initGame` in `src/hooks/useWordSearchGame.ts` (lines ~396-428). It
computes its own difficulty inline (`getResponsiveGridSize` +
`difficultyMode` only) and calls `getPuzzleWords({ count, maxLength, level,
tier, categoryName, excludeWords })` — no `regionId` field at all — then
calls `generatePuzzle({ targetWords, bonusWords, category, level, mode,
gridSize })` — no `difficultyOverride`. Neither `getRegionPuzzleDifficulty`
nor `REGION_CATEGORY_BIAS`/`regionId` from `src/regionTuning.ts` is imported
or called anywhere in `useWordSearchGame.ts`. Grepping the whole `src/`
tree for `getRegionPuzzleDifficulty` and `getPuzzleWords({` calls confirms
this: the only call sites that ever populate `regionId` or
`difficultyOverride` are test files and this issue's own new
`src/beyondLevel100.test.ts`.

Separately, `regionTuning.ts`'s own doc comment on `getRegionPuzzleDifficulty`
already says as much: "Convenience for callers (e.g. **a future
useWordSearchGame.ts integration**) ... Ready to pass straight into
generatePuzzle's difficultyOverride." — so this isn't a regression or an
oversight introduced by this certification pass; it's a documented,
deliberate scope boundary WSP-2.3 drew for itself.

**Interpretation:** WSP-2.3 delivered a fully correct, clamped,
parity-tested region-tuning and category-bias system on both platforms
(`src/regionTuning.ts` + `data/region_category_bias.json` on the web side,
`src-tauri/src/regions.rs` + `src-tauri/src/lib.rs`'s `get_puzzle_words` on
native) — every one of its own acceptance criteria is satisfied in
isolation, and this certification's own tests confirm all of it keeps
working correctly well past level 100 (see §2-3 below). But because it was
never wired into the one code path real players actually go through, none
of the six regions' difficulty/category identities (comfort, confidence,
sophistication, discovery, mastery, full-vocabulary-while-fair) are
currently expressed in a real playthrough at *any* level, not just past
100. This means WSP-2.7's own acceptance criterion "region tuning ... at
and past level 100 ... doesn't throw or degenerate" is true in the sense
that the tuning module itself is sound, but it isn't yet meaningfully
testable through play, because play never invokes it.

This is a real functional gap, not something in this certification issue's
own charter to fix (wiring `getRegionPuzzleDifficulty`/`regionId` into
`initGame` touches the live gameplay loop, needs its own testing pass
against the existing puzzle-regeneration/favorites-mode logic, and isn't a
trivial patch).

**Follow-up filed against:** WSP-2.3 (or a new issue, if the project
prefers not to reopen a "done" issue) — wire
`getRegionPuzzleDifficulty(level, mode)` into `initGame`'s
`generatePuzzle` call via `difficultyOverride`, and pass
`regionIdForLevel(playingLevel)` as `getPuzzleWords`'s `regionId` (guarding
correctly against `usingFavorites`, which must keep winning per WSP-2.3's
own precedence rule — already true structurally, since `categoryName` wins
unconditionally in both `backend.ts` and `lib.rs`, this just needs the
`regionId` field actually populated on the non-favorites branch).

---

## 2. Region fallback past level 100 is correct, and — unlike finding #1 — already genuinely exercised, on both platforms

**Observation:** `regionForLevel` (`src/regions.ts`) and `regionIdForLevel`
(`src/regionTuning.ts`) both fall back to the last region (Verdant Beyond)
for any level past 100, via `REGIONS.find(...) ?? REGIONS[REGIONS.length -
1]` and an equivalent loop-with-fallback respectively. `regionForLevel` is
genuinely called from the real reward/milestone pipeline
(`useWordSearchGame.ts`'s `queueRegionRewards`-equivalent logic around line
331), which IS reachable from real play — this is the one region-related
system that's actually wired in today. On the Rust side,
`RegionId::for_level` in `src-tauri/src/regions.rs` has its own dedicated
test (`for_level_matches_the_frozen_plan_boundaries`) asserting level 150
resolves to `VerdantBeyond`, and `src-tauri/src/lib.rs`'s
`test_get_puzzle_words_with_region_bias_never_panics` already exercises
levels up to 150 across every region and tier — both added by WSP-2.3,
with the latter's own comment explicitly citing "WSP-2.7's beyond level 100
concern."

This certification's new tests
(`src/beyondLevel100.test.ts`'s "region resolution keeps landing on Verdant
Beyond past level 100" block) independently re-verify both TS functions
agree with each other at levels 101, 110, 125, 137, 150, and 160, and add
one new Rust test (`test_get_puzzle_words_without_region_bias_never_panics_past_level_100`)
covering the *unbiased* path specifically (matching what finding #1 shows
is the actual production call shape) up to level 100,000.

**Interpretation:** no defect. WSP-2.2's fallback design and WSP-2.3's own
beyond-100 test additions were both already correct and already exercised
before this certification pass started; this entry documents that
verification rather than reporting a new finding.

**Follow-up:** none.

---

## 3. Puzzle generation, difficulty tuning, and category bias all remain sane and error-free at least through level 160 — confirmed via direct execution, not just fallback logic

**Observation:** `src/beyondLevel100.test.ts` runs the full
`getPuzzleWords` → `generatePuzzle` → `validatePuzzleInvariants` pipeline at
levels 101, 110, 125, 137, 150, and 160, across all three difficulty modes,
via two separate paths:

- The WSP-2.3 region-tuned path (`getRegionPuzzleDifficulty` +
  `difficultyOverride`) — 18 generated boards, zero invariant violations,
  every `PuzzleDifficulty` field within `DIFFICULTY_CLAMP_BOUNDS`.
- The actual production path (`getResponsiveGridSize` + `generatePuzzle`
  with no override, matching what finding #1 shows real players get) — 18
  more generated boards, same result.

Grid size does not grow unboundedly as level climbs: `calculateGridSize`
(`src/gameMechanics.ts`) caps at 8/10/12 depending on mode, and
`getRegionPuzzleDifficulty(100_000, mode)` for every mode stays within
`DIFFICULTY_CLAMP_BOUNDS.gridSize.max` (14). Category bias
(`REGION_CATEGORY_BIAS` via `pickCategoryForLevel`/`getPuzzleWords`) returns
a non-empty category and word list for every region × tier × beyond-100
level combination tested, on the web path; native parity is covered by
existing + new Rust tests (§2). The existing 50,000-board WSP-0.2 audit
(`scripts/audit-puzzles.test.ts`) also still passes in full (144s, under
its 180s default timeout on this run) after every change in this pass,
though that audit itself samples levels only within each region's own
range and so doesn't independently cover past-100 levels — the new
`beyondLevel100.test.ts` is what actually covers that range.

**Interpretation:** no defect. Puzzle generation genuinely continues
indefinitely with sane, bounded parameters, matching the release plan's
core "beyond level 100" requirement.

**Follow-up:** none.

---

## 4. Lifetime statistics accumulate with no cap and no silent reset past level 100

**Observation:** every lifetime-stat setter in `useWordSearchGame.ts`
(`setLevelsCompleted`, `setSeeds`, `setPlantsBloomed`, `setBonusWordsFound`,
`setReverseWordsFound`, `setPowerupsUsed`, and the `bloomedRarityTiers`
`Set`) is a pure increment or `Set.add` with no `Math.min` ceiling anywhere
in the file — confirmed by grep across the whole hook. This is a direct
improvement over the pre-WSP-2.5 state, where `bloomedRarityTiers` used to
be `Math.min(7, count + 1)` (the bug WSP-2.5 fixed); no equivalent cap
exists on any other lifetime stat, before or after that fix.
`scripts/simulate-economy.ts` was extended with a second, 150-level horizon
(`BEYOND_CAMPAIGN_LENGTH`) alongside the existing 100-level one; the new
test (`scripts/simulate-economy.test.ts`) confirms every player profile's
Seeds-earned-per-level rate is numerically identical at the 100-level and
150-level horizons (`toBeCloseTo(..., 10)`), and that `seedsEarned` at 150
levels is strictly greater than at 100 — i.e. no cap, no plateau, no reset.

**Interpretation:** no defect. This satisfies the acceptance criterion
directly, and the extended economy-simulation horizon gives the project a
reusable, permanent regression check (not just a one-time confirmation) for
this exact property.

**Follow-up:** none.

---

## 5. Botanist Rank correctly stays at Cosmic Conservator past level 100, and no achievement-evaluation path errors once every stat exceeds every `maxProgress`

**Observation:** `getBotanistRank` (`src/botanistRanks.ts`) returns the
"Cosmic Conservator" rank (`maxLevel: null`) for every level from 41
upward, verified directly at 101, 110, 125, 137, 150, 160, 1,000, 100,000,
and `Number.MAX_SAFE_INTEGER`; `getNextBotanistRank` returns `null` at
every beyond-100 level tested, and `getBotanistPromotion` never fires
between two beyond-100 levels. `evaluateAchievements`
(`src/achievements.ts`) is a pure `Array.filter` over `getProgress`
predicates that all route through a shared `capped(value, max) =>
Math.min(max, value)` helper — structurally incapable of throwing on an
over-large stat. Confirmed directly: it does not throw with every stat set
to 1000× the largest `maxProgress` in the list, nor at
`Number.MAX_SAFE_INTEGER`, and correctly unlocks all 28 achievements (no
duplicates) when every stat is driven past its threshold.

**Interpretation:** no defect; this is exactly the "expected, current-by-design
behavior, not a bug" the issue asks to confirm explicitly, and it's now
asserted directly rather than only being true by inspection.

**Follow-up:** none.

---

## 6. The Tier 2 issues doc's achievement count ("26 entries as of WSP-2.5") is stale against the actual code — the real count is 28

**Observation:** `grep -c '{ id:' src/achievements.ts` returns 28, and a
manual count of `ACHIEVEMENTS` confirms it: `night-bloomer`, `petal-poet`,
`midnight-sun`, `sunlight-harvester`, `bloom-herald`, `nimble-planter`,
`word-weaver`, `root-master`, `solar-scribe`, `verdant-voyager`,
`moss-mystic`, `categories-completed-10`, `level-clears-10/25/50/100`
(4), `bonus-words-25/100` (2), `categories-30`, `categories-all`,
`hint-free-20/50` (2), `plants-bloomed-5/20` (2), `powerups-used-10/50`
(2), `reverse-words-10/50` (2) — 28 total. `WordSprout_1.0_Tier2_Issues.md`
(both WSP-2.4's context section and WSP-2.7's own implementation prompt)
says "26 (or however many WSP-2.5 leaves it at)" / "26 achievements as of
WSP-2.5's consolidation."

**Interpretation:** this is a stale figure in the planning document, not a
code defect — the parenthetical hedge ("or however many WSP-2.5 leaves it
at") already anticipated the number might drift, and WSP-2.5's actual
consolidation (folding `zenith-climber` into `level-clears-50`, renaming
`daily-dew`) reduced the count by exactly the two entries it names, from
whatever the pre-WSP-2.5 total was — the doc's "26" simply wasn't updated
to the post-consolidation actual count. This certification's own new test
(`src/beyondLevel100.test.ts`, "ACHIEVEMENTS currently has 28 entries")
pins the real, current count directly against the code so this doesn't
drift silently again.

**Follow-up:** none needed for code; worth a one-line correction to
`WordSprout_1.0_Tier2_Issues.md`'s "26" mentions if that document is
revised again, but that's documentation hygiene, not a functional issue.

---

## 7. `level100PlayerSave` fixture: still in its pre-Tier-2 shape, which is correct and load-bearing, not a gap — plus one unrelated, pre-existing, harmless fixture quirk

**Observation:** `git log --all -- src/test/fixtures/saves/index.ts` shows
this file was last touched in `f8d0981` (WSP-1.2), before any of
WSP-2.1-2.6 landed. `level100PlayerSave` still uses the pre-Tier-2 shape:
`bloomedRarityTiers: 6` (the old raw counter, not the new
`bloomedRarityTierIds` array), and it has no `claimedRegionRewards` or
`regionRewardsBackfilled` fields at all. Running it through
`loadSaveData()` (both the existing generic migration-coverage/round-trip
loops in `persistence.test.ts` and this issue's new, sharper
WSP-2.7-specific assertions) confirms it migrates correctly: every region's
completion (and every entry past Glowing Grove) gets marked claimed exactly
once with **no retroactive Seeds** (the save's 48,500 Seeds figure is
unchanged after migration, matching `backfillRegionRewardClaims`'s
documented "no retroactive grants" policy), `bloomedRarityTierIds`
normalizes to `[]` (this save has no `ownedPlants`/`growthByPlant` of its
own to reconstruct from, and never held `verdant-voyager`, so the honest
empty reconstruction is correct — not data loss), and achievement
evaluation over its stats doesn't throw and correctly includes
`level-clears-100`.

Separately, and unrelated to any Tier 2 schema change: this fixture's
`unlockedAchievements` array (`["speed-sprouter", "night-bloomer",
"word-weaver", "root-master", "world-rooted", "flora-atlas"]`) contains
three ids — `speed-sprouter`, `world-rooted`, `flora-atlas` — that don't
match any id currently in `src/achievements.ts`, any id in
`ACHIEVEMENT_ID_MIGRATIONS`, or (as far as this pass could determine) any
id from the game's visible history. `night-bloomer`, `word-weaver`, and
`root-master` are real, current ids. `world-rooted` and `flora-atlas` look
like they were typo'd from the current achievement *names* ("World
Rooted", "Flora Atlas") rather than their ids (`categories-30`,
`categories-all`) — but this predates Tier 2 (present since at least
`f8d0981`) and isn't something WSP-2.2/2.3/2.5 touched or introduced.

**Interpretation:** keeping `level100PlayerSave` in its old shape is the
*correct* choice, not an oversight to fix — the fixture library's own
stated purpose (see its file-header comment) is to prove old/malformed
shapes migrate correctly, and a save from before this tier shipped is
exactly the real-world scenario WSP-2.7's own acceptance criterion is
worried about. The three unrecognized ids are harmless at runtime
(`migrateAchievementIds` passes any id it doesn't recognize through
unchanged, so they just sit inertly in `unlockedAchievements` forever,
matching no real achievement and never displayed anywhere) but are still a
latent, pre-existing fixture-data quality issue.

**Action taken:** left `level100PlayerSave` unmodified (correct as
pre-Tier-2 migration coverage) rather than "fixing" it into the current
shape, which would have defeated its purpose. Added a second fixture,
`level150PlayerSaveCurrentShape`, representing a level-150 long-time player
whose save is *already* on the current WSP-2.2/2.3/2.5 schema
(`bloomedRarityTierIds` as a real tier-identifier array, fully populated
`claimedRegionRewards` built directly from `REGIONS`/`regionRewardClaimKey`
rather than hand-typed strings, and current, real achievement ids) — this
certifies the other direction the original fixture couldn't: that an
already-migrated save round-trips completely inert, with no double-grant
of region rewards, no re-backfill, and no id mangling. Both fixtures now
have dedicated WSP-2.7 assertions in `src/persistence.test.ts` beyond the
pre-existing generic loops.

**Follow-up filed against:** none blocking — the three stale ids in
`level100PlayerSave` are cosmetic and pre-date Tier 2 entirely. If the
project wants fixture hygiene cleaned up generally, that's a small,
separate, low-priority task, not a Tier 2 issue.

---

## Outcome

Every acceptance criterion for WSP-2.7 is certified:

- Puzzle generation past level 100 (through level 160, and stress-checked
  to level 100,000 for grid-size boundedness): no error, no stall, no
  degenerate parameters — confirmed on both the region-tuned path and the
  actual production path.
- Region tuning and category bias (WSP-2.3) continue to function correctly
  past level 100 on both platforms — with the significant caveat in
  finding #1 that this tuning is not currently reachable from real
  gameplay at any level, a pre-existing gap this pass surfaced rather than
  introduced or is responsible for fixing.
- Lifetime statistics (Seeds, bonus words, plants bloomed, reverse words,
  power-ups used, etc.) accumulate correctly past level 100 with no cap and
  no silent reset, now backed by a permanent 150-level economy-simulation
  regression check.
- Botanist Rank correctly, deliberately stays at Cosmic Conservator past
  level 100, and achievement evaluation never errors regardless of how far
  past every `maxProgress` a stat goes — both explicitly asserted.
- `level100PlayerSave` round-trips correctly through persistence after
  every Tier 2 schema change, confirmed with sharper, WSP-2.7-specific
  assertions beyond the pre-existing generic coverage; a new companion
  fixture certifies the already-migrated case too.

New/changed test coverage from this pass: `src/beyondLevel100.test.ts` (new,
50 tests), one new Rust test in `src-tauri/src/lib.rs`, one new economy
horizon + test in `scripts/simulate-economy.ts`/`.test.ts`, one new fixture
+ two targeted tests in `src/persistence.test.ts`. Full suite: 496 tests
across 44 files, all green (including the 50,000-board WSP-0.2 audit, which
took 144s on this run — under its 180s default, but see that test's own
comment about slower machines); `tsc --noEmit` clean; `cargo test` in
`src-tauri/` clean (16/16, including the new test). `vite.config.ts`'s
`test.exclude` still lists `**/.claude/worktrees/**`, so this count is
trustworthy per the Tier 2 issues doc's own warning about that prior
double-counting bug.

The one real, non-blocking follow-up from this pass is finding #1: region
difficulty/category tuning is fully built, tested, and correct on both
platforms, but not yet wired into the actual gameplay loop. It doesn't
block WSP-2.7's own certification (which is about whether the *systems*
degrade past level 100, and they don't), but it means none of WSP-2.3's
region-identity work is live for players yet, at any level.
