# Word Sprout 1.0 — Tier 2 Issues

Source of truth: `WordSprout_1.0_Plan.md` (frozen). Nothing below changes that document's scope — this is Tier 2 ("The Journey", levels 1–100) broken into individually assignable, agent-ready units, in the same spirit as `WordSprout_1.0_Tier0-1_Issues.md`. If an issue's acceptance criteria and the plan ever disagree, the plan wins and this file gets corrected, not the other way around.

**Revision note:** the first version of this file (3 issues, one per plan subsection) was reviewed before implementation started and found not yet agent-ready — several concrete defects and missing contracts would have let three parallel agents build incompatible pieces or miss real bugs already in the codebase. This version splits the work into 7 issues per that review's recommendation, with the specific findings folded into the relevant issue's Context/Acceptance criteria. See "What changed in this revision" at the bottom for the full list.

**Numbering:** issue IDs are `WSP-2.x`, ordered by dependency, not by a 1:1 mapping to the plan's `2.1`/`2.2`/`2.3` subsections (each of which now spans multiple issues). Suggested GitHub milestone: `1.0 — Tier 2`.

**Prerequisite:** Tier 0 and Tier 1 are both complete and merged into `release/1.0` as of this writing (`d5d56ae`), including the WSP-1.4 early playtest checkpoint (`docs/playtest/wsp-1.4-first-hour-findings.md`). Tier 2 work should branch from that state. Before running any test count for this work, confirm `vite.config.ts`'s `test.exclude` still excludes `**/.claude/worktrees/**` — a stale nested worktree was silently doubling every reported test count earlier in this project's history (fixed in `d5d56ae`); if that fix is ever reverted, test numbers reported against this plan cannot be trusted.

**Dependency graph for this batch:**

```
WSP-2.1  independent — start immediately (shared reward-intensity type)
         HARD blocker for WSP-2.4, WSP-2.6

WSP-2.2  independent — start immediately (region data + reward/event model)
WSP-2.3  independent — start immediately (generator tuning + native/web parity)
WSP-2.5  independent — start immediately (achievement audit + rarity-tracking fix)

WSP-2.4  hard dependency on WSP-2.1 (consumes the intensity type)
         soft dependency on WSP-2.2 (consumes the reward/event model's
         presentation-queue contract)
WSP-2.6  hard dependency on WSP-2.1 (consumes the intensity type)
         hard dependency on WSP-2.5 (bloom presentation must key off the
         corrected, unique-tier-identity rarity data, not the old counter)

WSP-2.7  hard dependency on WSP-2.2, WSP-2.3, WSP-2.5 all reaching a
         testable state (it verifies their combined behavior past level 100)
```

WSP-2.1 is a real, hard, upfront blocker — not a soft one. The original version of this plan treated the reward-intensity hierarchy as something WSP-2.1/2.3's presentation work could coordinate on "as they went"; in practice that invites three agents inventing three incompatible types and resolving it as merge churn instead of a design decision. Pull it out and land it first. WSP-2.2, 2.3, and 2.5 can genuinely run in parallel with WSP-2.1 and each other — none of them touches presentation. WSP-2.4 and WSP-2.6 are the presentation-heavy issues and need WSP-2.1 landed first; WSP-2.6 additionally needs WSP-2.5's corrected rarity data, not the current broken counter. WSP-2.7 is a gate, not a task, same as WSP-1.4 was for Tier 1 — it verifies the others, it doesn't get picked up before they're demoable.

---

## WSP-2.1 — Shared reward-intensity type and presentation contract

**Tier:** 2 (The Journey) · **Labels:** `feature`, `P2`, `tier-2`, `foundation` · **Owner:** Design agent
**Blocks:** WSP-2.4, WSP-2.6 (hard)
**Blocked by:** none

### Context

The plan's 2.2 section asks for "a reward-intensity hierarchy (routine → small → medium → major → exceptional)" with presentation scaling to match, and both 2.1 (level-100 milestone weight) and 2.3 (bloom presentation by plant rarity) are written assuming that same hierarchy exists. Today it doesn't, in any form — the closest thing is `AchievementTier` (`src/achievements.ts`): a 4-value type (`bronze`/`silver`/`gold`/`exceptional`) set on only about 15 of 28 achievements, with no defined mapping to presentation (banner duration, scrim, audio) at all.

Pulling this out as its own issue, landed before any presentation work starts, is what lets WSP-2.4 (milestones) and WSP-2.6 (bloom) consume one real shared contract instead of each inventing its own and reconciling later.

### Acceptance criteria

- [ ] A single exported type/enum for the five intensity levels (`routine`, `small`, `medium`, `major`, `exceptional`) exists in one module every consumer imports — not redefined per-feature
- [ ] Each level has a defined, concrete presentation contract: banner/overlay duration, whether a full-screen scrim applies (mobile and desktop may differ, per the existing `AchievementBanner` precedent of a mobile-only scrim), audio cue category, and any particle/animation intensity note — enough for an implementer to build against without re-deriving intent
- [ ] The existing `AchievementTier` type is either replaced by this new type or explicitly mapped onto it 1:1 (document the mapping if kept separate) — no achievement is left without an intensity classification
- [ ] The contract explicitly covers cross-system comparability: an achievement, a milestone (WSP-2.4), and a bloom (WSP-2.6) at the same intensity level must read as comparably significant — this is a design note plus enough concrete parameters (from the bullet above) that two different implementers building two different features would independently produce comparable results
- [ ] Documented in the same file as the type (or a adjacent short doc) so WSP-2.4 and WSP-2.6 have one place to read this from

### Implementation prompt

```
Define Word Sprout's shared reward-intensity hierarchy: routine -> small ->
medium -> major -> exceptional. This is a foundation piece two other Tier 2
issues (milestone presentation, bloom presentation) depend on directly --
its job is to exist as one real, importable contract, not prose that each
consumer reinterprets.

Create the type in one module (colocate with src/achievements.ts or a new
small src/rewardIntensity.ts -- your call, but pick one canonical home).
For each of the five levels, define: banner/overlay duration, whether a
full-screen scrim applies on mobile (desktop may stay a small corner toast
at every level, matching the existing AchievementBanner pattern -- see how
it already differentiates mobile/desktop treatment), an audio cue
category, and a note on animation/particle intensity. Concrete enough that
an implementer building milestone presentation and an implementer building
bloom presentation, working independently, would produce results that
feel comparably weighted at the same intensity level.

Map every existing achievement (src/achievements.ts, 28 entries) onto this
scale -- either retire the existing AchievementTier type in favor of this
one, or keep it and document the 1:1 mapping explicitly. Don't leave any
achievement unclassified.

This issue does not build any presentation itself -- no milestone cards,
no bloom animations. It defines the contract those later issues consume.
```

---

## WSP-2.2 — Region data and exactly-once reward/event model

**Tier:** 2 (The Journey) · **Labels:** `feature`, `P2`, `tier-2`, `content` · **Owner:** Design agent
**Blocks:** WSP-2.4 (soft)
**Blocked by:** none

### Context

Six regions already exist, but only as boundaries and flavor text hardcoded directly in the view layer — `LEVEL_REGIONS` in `src/components/LevelsView.tsx` (id, start/end level, name, tagline) — with the ranges the plan says to keep: Glowing Grove (1–20), Sunlit Falls (21–30), Crystal Conservatory (31–40), Mosswood Hollows (41–50), Cloudreach Summit (51–70), Verdant Beyond (71–100). There is no visual/ambient theme, category bias, difficulty profile, or entry/completion reward data anywhere yet.

The plan's "entry/completion rewards" phrase is doing a lot of unstated work. As soon as a region grants a reward on completion, real questions appear that the plan doesn't answer and the first draft of this file didn't either: does replaying an already-completed level re-grant the region-completion reward? What happens to a save that already has `highestUnlockedLevel` past a region boundary when this ships — does it retroactively grant that region's reward, or is the player just past it with nothing? Levels 20, 30, 40, 50, and 70 are *both* a region boundary *and* (per WSP-2.4) a milestone level — and level 50 is also the "halfway point" achievement (per WSP-2.5) — so a single level-completion event at, say, level 50 can trigger a completion summary, a milestone card, a region-transition title card, an achievement unlock, and potentially a Botanist Rank promotion, all at once. Nothing today defines what order those present in, whether they combine into one experience or queue sequentially, or what happens if two of them would each want a full-screen presentation simultaneously.

### Acceptance criteria

- [ ] Region definitions (id, name, tagline, start/end level, visual/ambient theme reference, category bias, a difficulty-tuning profile *reference* — the actual tuning values are WSP-2.3's job — and entry/completion rewards) live in a dedicated data module, not inline in `LevelsView.tsx`
- [ ] The six existing regions and their level ranges are preserved exactly (1–20 / 21–30 / 31–40 / 41–50 / 51–70 / 71–100)
- [ ] Region-completion rewards are claimed exactly once per save, ever — define and implement the persisted claim-tracking mechanism (e.g. a set of claimed region ids in `SaveData`, normalized the same way every other collection field is in `src/persistence.ts`)
- [ ] Explicit rule for a save that reaches or starts past a region boundary without that region's completion having been explicitly "claimed" in the old sense (new players won't have this problem, but a save mid-migration or an existing WSP-1.x playtest save might) — document whether such a save is retroactively granted the reward once on next load, or intentionally starts clean with no retroactive grants, and implement whichever is chosen
- [ ] Explicit rule for replaying an already-completed level within a region: replaying does not re-grant that region's completion reward if it was already claimed
- [ ] A single presentation-queue/ordering policy exists for the case where a level completion coincides with more than one presentable moment (region transition, milestone from WSP-2.4, achievement unlock, Botanist Rank promotion) — define the order (e.g. completion summary, then rank promotion if any, then milestone/region transition, then achievement toast) and whether any of them visually combine rather than strictly sequence
- [ ] The ordering policy is implemented as one shared queue/controller other systems feed into, not per-feature ad hoc sequencing — `justUnlocked`, `promotionQueue`, and any new milestone/region-transition state should all be arbitrated by (or explicitly coordinate with) this one policy
- [ ] Tests cover: a level completion with zero coincident events, one coincident event, and the maximum realistic stack (level 50: completion + rank promotion + milestone + achievement) resolving in the defined order without dropping or duplicating any of them

### Implementation prompt

```
Extract Word Sprout's six campaign regions from the view layer into real
data, and — this is the harder and more important half of this issue —
define exactly when and how often a region's rewards are granted.

Part 1 -- Data extraction: LEVEL_REGIONS in src/components/LevelsView.tsx
currently holds id/start/end/name/tagline for all six regions, inline in
the view. Move this into a dedicated module (e.g. src/regions.ts) and
extend each entry with a visual/ambient theme reference (a key is enough,
full art is Tier 3's job), a category bias, a reference to a
difficulty-tuning profile (WSP-2.3 defines the actual values), and
entry/completion rewards. LevelsView should consume this data, not define
it. Keep the six regions' exact level ranges unchanged.

Part 2 -- Exactly-once reward claims: add persisted tracking (in
src/persistence.ts's SaveData, normalized like every other collection
field there) for which regions' completion rewards have actually been
claimed. Define and implement: replaying an already-completed level must
never re-grant a region's reward; a save that already has
highestUnlockedLevel past a region boundary when this ships must not
silently double-grant or silently skip that region's reward -- pick one
policy (retroactive one-time grant on next load, or "no retroactive
grants, starts clean going forward") and implement it explicitly, don't
leave it to whatever the code happens to do.

Part 3 -- Presentation queue: level 50 alone can trigger a level-complete
summary, a Botanist Rank promotion (BotanistPromotionCeremony), a
milestone card (WSP-2.4), a region-transition title card (also WSP-2.4),
and an achievement toast (the "halfway point" achievement from WSP-2.5) --
all from one puzzle completion. Define one ordering policy for this (e.g.
completion summary -> rank promotion if any -> milestone/region transition
-> achievement toast) and build it as a shared queue/controller, not
separate ad hoc timers per feature -- justUnlocked and promotionQueue
already exist as separate pieces of state in useWordSearchGame.ts/App.tsx;
this issue's job is to give any new milestone/region-transition state a
real arbitration point alongside them, not a third independent timer that
races the other two.

Test the queue directly: zero coincident events, one, and the worst-case
stack (level 50) all need coverage showing every event still fires,
in the defined order, none dropped or duplicated.
```

---

## WSP-2.3 — Generator tuning and native/web category-bias parity

**Tier:** 2 (The Journey) · **Labels:** `feature`, `P2`, `tier-2`, `balance` · **Owner:** Design agent
**Blocks:** nothing directly
**Blocked by:** none

### Context

`PuzzleDifficulty` (`src/puzzleGenerator.ts`) already has every knob a region tuning identity needs: `gridSize`, `targetCount`, `minWordLength`, `maxWordLength`, `allowedDirections`, `reverseWordProbability`, `diagonalProbability`, `overlapPressure`, `bonusCandidateCount` — currently varied only by the player's own three-tier difficulty mode (easy/standard/challenging), not by level or region. The plan's region identities need more than the three knobs the first draft of this issue named: "shorter/longer words" (Glowing Grove vs. Crystal Conservatory) needs `minWordLength`/`maxWordLength`; "richer bonus potential" (Mosswood Hollows) needs `bonusCandidateCount` and/or bonus-goal-related tuning, not just direction/overlap probabilities.

Category selection has a real parity problem, not just a missing feature. The web path (`src/backend.ts`'s `getPuzzleWords`) is plain TypeScript reading `src/categories/*.json`. The **native Android/Tauri path is a completely separate Rust implementation** — `get_puzzle_words` in `src-tauri/src/lib.rs`, reading its own `categories` Rust module — that the native app calls over IPC instead of ever executing `backend.ts`'s selection logic at all. Any category-bias logic added only to `backend.ts` would work in a browser and silently not exist on Android, which is most of this game's actual target platform (per the release plan's Play Store distribution goal). This is exactly the kind of split the release plan's own "no save-schema change without a migration and a test, no exceptions" discipline exists to prevent for data — the same rigor applies to game-logic parity between the two platforms.

### Acceptance criteria

- [ ] Every region's difficulty-tuning profile is expressed using the full existing `PuzzleDifficulty` shape as needed per region — not just the three knobs (`reverseWordProbability`/`diagonalProbability`/`overlapPressure`) named in the plan prose, but `minWordLength`/`maxWordLength` (for "shorter/longer words") and `bonusCandidateCount` (for "richer bonus potential") where a region's identity calls for them
- [ ] Region tuning is a modifier/bias layered on top of the player's own easy/standard/challenging mode — not a second, parallel difficulty system, and not a replacement for the player's own setting
- [ ] Clamping rules are explicit and tested: a region's bias can never push a difficulty value out of a sane range (e.g. `overlapPressure` below 0 or above 1) regardless of which base mode it's layered onto
- [ ] Region tuning identities match the plan's descriptions (comfort / confidence / sophistication / discovery / mastery / full-vocabulary-while-fair, per region, as detailed in the plan doc)
- [ ] Category bias is implemented identically in **both** `src/backend.ts` (web) and `src-tauri/src/lib.rs` (native) — same weighting behavior, same favorite-category precedence rules, from the same region data (or two data copies proven to agree, if a shared data format across TS and Rust isn't practical — document which approach was taken and why)
- [ ] Favorite-category precedence is explicitly defined: today, an explicit `category_name` (favorites mode) already wins over tier-pool selection in both `getPuzzleWords` implementations — region bias must not override or conflict with that existing precedence order in either path
- [ ] A parity test (or paired tests, one per platform's test infrastructure) confirms the native and web category-selection paths produce compatible behavior for the same region/level/tier inputs — this cannot be verified by web-only tests alone, since `src-tauri/src/lib.rs` has its own Rust test surface
- [ ] Existing generator/backend tests continue to pass

### Implementation prompt

```
Add region-level difficulty and category tuning to Word Sprout's puzzle
generation, on both platforms it actually ships on.

Part 1 -- Difficulty tuning: PuzzleDifficulty in src/puzzleGenerator.ts
already has gridSize, targetCount, minWordLength, maxWordLength,
allowedDirections, reverseWordProbability, diagonalProbability,
overlapPressure, and bonusCandidateCount -- currently varied only by the
player's easy/standard/challenging mode. Add a region-level modifier layered
on top of (not replacing) that existing mode system, using whichever of
these fields each region's identity actually calls for -- "shorter words,
generous boards" (Glowing Grove) needs minWordLength/maxWordLength and
gridSize, not just direction probabilities; "richer bonus potential"
(Mosswood Hollows) needs bonusCandidateCount. Write explicit clamping so a
region's bias can never push any value outside its sane range regardless
of which base mode it's stacked on, and test the clamping directly.

Part 2 -- Category bias, on BOTH platforms: this is the part most likely
to get missed, so read this carefully before starting. Word Sprout has TWO
independent category-selection implementations: src/backend.ts's
getPuzzleWords() (the web/browser path) and get_puzzle_words in
src-tauri/src/lib.rs (a separate Rust command the native Android/Tauri
build calls over IPC instead of ever running backend.ts's logic). A
region's category bias must be implemented in both, with the same
weighting behavior and the same precedence rules -- in particular, an
explicit category_name (the existing "favorite categories" custom mode)
already wins over tier-pool selection in both current implementations;
region bias must slot in without breaking that precedence in either path.
If a literally-shared data format between TypeScript and Rust isn't
practical, implement the same algorithm independently in both and write a
parity test that feeds the same region/level/tier inputs to each and
checks they produce compatible category-selection behavior -- don't ship
this as web-only and assume it applies everywhere.

Run the existing puzzle-generator and backend test suites after every
change -- this issue touches shared difficulty/selection code multiple
other systems already depend on.
```

---

## WSP-2.4 — Milestone and region-transition presentation

**Tier:** 2 (The Journey) · **Labels:** `feature`, `P2`, `tier-2`, `presentation` · **Owner:** Design agent
**Blocks:** nothing directly
**Blocked by:** WSP-2.1 (hard — consumes the intensity type); WSP-2.2 (soft — consumes the presentation-queue contract)

### Context

There is currently no milestone/region-transition presentation system of any kind — no title card, no scenery change, nothing at levels 10/20/30/40/50/70/100. The existing `BotanistPromotionCeremony` is a related but separate, much more frequent system (rank promotions happen roughly every 3–4 levels) and is not a substitute for a once-per-region milestone moment — but per WSP-2.2, the two *can* fire from the same level completion and need to be arbitrated by that issue's presentation queue, not built as if they'll never collide.

"Progress indefinitely" past level 100 needs a precise definition, not the plan's looser framing. Botanist Rank (`src/botanistRanks.ts`) has 10 fixed ranks; the highest, Cosmic Conservator, starts at level 41 with `maxLevel: null` — there is no rank beyond it in the current design, so "rank progress" cannot mean *new rank titles* unlocking indefinitely; it already stops, by design, at level 41. Achievements (`src/achievements.ts`) are a finite list of 28 — those don't unlock indefinitely either. What genuinely continues indefinitely today, and should be the actual scope of this acceptance criterion, is: puzzle generation itself, the level/frontier counter, and lifetime statistics (Seeds earned, bonus words found, plants bloomed, etc.).

### Acceptance criteria

- [ ] A short (3–6 second), skippable title card and scenery change plays on region transition (crossing from one region's level range into the next)
- [ ] `prefers-reduced-motion` gets an instant static transition instead — no exception
- [ ] Milestone presentation exists at levels 10, 20, 30, 40, 50, 70, and 100, distinct from both the per-level completion summary and `BotanistPromotionCeremony`
- [ ] Milestone and region-transition presentation both consume WSP-2.1's intensity type for their visual/audio weight — level 100 uses the top ("exceptional") tier; earlier milestones use progressively lower tiers, not all treated identically
- [ ] When a milestone, a region transition, a rank promotion, and/or an achievement unlock would coincide (per WSP-2.2's presentation-queue policy), this issue's presentation participates in that queue correctly — verified by WSP-2.2's own coincident-event tests, not reinvented here
- [ ] Level 100's milestone ("The Verdant Beyond Blooms" or equivalent) reads as the single most significant moment in the campaign and its own copy makes explicit that play continues afterward — this is not framed as an ending
- [ ] The "beyond level 100" acceptance criterion is precisely: puzzle generation, the level/frontier counter, and lifetime statistics all continue to advance indefinitely with no additional handcrafted campaign content required. It explicitly does **not** require new Botanist Rank titles or new achievements to keep unlocking past their current fixed ceilings (level 41 for rank; WSP-2.5's finalized achievement count) — those systems being finite by design is not a bug this issue needs to fix. Confirmed via a targeted test or the existing puzzle-audit/economy-simulation tooling extended past level 100.

### Implementation prompt

```
Build milestone and region-transition presentation for Word Sprout's
campaign, consuming WSP-2.1's reward-intensity type and participating in
WSP-2.2's presentation-queue policy rather than inventing independent
timers.

Part 1 -- Region transitions: a short (3-6s), skippable title card +
scenery change when crossing from one region's level range into the next.
prefers-reduced-motion gets an instant static equivalent, no exception --
matching the pattern already established for the onboarding coachmark,
achievement banner, and success overlay elsewhere in this codebase.

Part 2 -- Milestones: standalone presentation at levels 10, 20, 30, 40,
50, 70, and 100, distinct from SuccessScreen (the per-level summary) and
BotanistPromotionCeremony (rank promotions, a separate and more frequent
system). Use WSP-2.1's intensity scale to weight each milestone --
level 100 is "exceptional"; the earlier ones should visibly read as less
significant, not identical copies of the same card with a different
number. Since a single level completion (level 50 especially) can trigger
several of these systems in the same instant, this presentation must
plug into whatever shared queue/controller WSP-2.2 built rather than
firing on its own independent timer that could race BotanistPromotionCeremony
or an achievement toast.

Level 100's copy needs real weight ("The Verdant Beyond Blooms" or
equivalent) and must explicitly say play continues afterward -- this is
not an ending. Do not imply Botanist Rank or achievements keep unlocking
forever past level 100 -- Cosmic Conservator (the top rank) starts at
level 41 with nothing beyond it by current design, and achievements are a
finite list; what actually continues indefinitely is puzzle generation,
the level counter, and lifetime stats. Confirm this with a targeted test
or by extending the existing puzzle-audit/economy-simulation tooling past
level 100 -- don't just assert it in copy without checking nothing errors
or silently stalls.

Do not build Tier 3's art/audio here -- reference art/ambient theme keys
are enough; full production art direction is separately scoped.
```

---

## WSP-2.5 — Achievement audit, ID migration, and unique-rarity correction

**Tier:** 2 (The Journey) · **Labels:** `feature`, `P2`, `tier-2`, `balance` · **Owner:** Design agent
**Blocks:** WSP-2.6 (hard — bloom presentation needs the corrected rarity data)
**Blocked by:** none

### Context

Concrete drift already present in the current achievement list, verified against the actual code (not just described from the plan):

- **`zenith-climber`** ("Zenith Climber", complete 50 levels, no `family`/`tier`) sits alongside a separate `level-clears` family (`level-clears-10`/`level-clears-25`/`level-clears-100`, with `family`/`tier` set) that tracks the exact same `levelsCompleted` stat, just at different thresholds and without a 50-level rung in the family itself.
- **`daily-dew`** is named "Garden Cartographer" and checks `uniqueCategoriesCompleted` — nothing about it is daily/calendar-based; the id is a stale leftover.
- **`verdant-voyager`** ("Bloom plants from 3 rarity tiers") is a real, confirmed bug, not just a naming issue: `recordPlantBloom()` in `src/hooks/useWordSearchGame.ts` takes **zero parameters** and just does `setBloomedRarityTiers(count => Math.min(7, count + 1))` — a raw bloom-event counter, capped at 7, with no concept of *which* rarity tiers were actually bloomed. `GardenView.tsx` calls it as `recordPlantBloom(plantDef?.tier ?? "Common")` at both its water-triggered and fertilize-triggered bloom sites — TypeScript allows this silently (a function typed to accept fewer parameters than its call site provides is structurally valid), so the tier argument is passed and silently dropped at runtime, with no compiler error. Separately, `waterAllReady` (bulk "water all ready" — a *third*, independent bloom-triggering path) has its own **inline duplicate** of the same broken logic (`setBloomedRarityTiers(previous => Math.min(7, previous + bloomCount))`), not routed through `recordPlantBloom` at all. Net effect: three Common-tier blooms unlock "Bloom plants from 3 rarity tiers" today, and there are two separate, independently-broken implementations of the same broken concept.
- Roughly half the achievement list has `family`/`tier`/`actionableCopy` set (the newer entries) and half doesn't — see WSP-2.1 for the intensity-mapping consequence of this.
- No achievement is region-specific today, which is good — the plan's warning against "an achievement for every region" hasn't been violated yet.

### Acceptance criteria

- [ ] Every existing achievement's `description` is audited against what its `getProgress` predicate actually checks
- [ ] `daily-dew`'s id is renamed to something reflecting what it actually checks (`uniqueCategoriesCompleted`), with a migration mapping in `src/persistence.ts` so a player whose `unlockedAchievements` already contains `"daily-dew"` doesn't lose it — `unlockedAchievements` persists ids as bare strings, so a rename without a migration silently revokes the achievement for anyone who already earned it
- [ ] The `zenith-climber` / `level-clears` duplication is resolved into one system — fold `zenith-climber`'s 50-level milestone into the `level-clears` family or remove the redundant entry, with the same never-revoke-an-earned-achievement migration discipline as above
- [ ] `bloomedRarityTiers` is corrected from a raw event counter into a persisted record of *which distinct rarity tiers* have actually been bloomed (e.g. a set/array of tier identifiers in `SaveData`, normalized like every other collection field in `src/persistence.ts`) — three Common blooms must no longer satisfy "3 rarity tiers"
- [ ] `recordPlantBloom` is corrected to actually use its tier argument (its own declared prop type in `GardenView.tsx` already says `(tier: string) => void` — the implementation in `useWordSearchGame.ts` needs to match what it already claims to accept, not just be given a type signature it also ignores)
- [ ] `waterAllReady`'s separate inline bloom-rarity-tracking logic is unified with `recordPlantBloom` (or both call one shared internal function) — there must be exactly one implementation of "record a plant bloom, including which rarity tier it was," not two
- [ ] A migration handles existing saves with a nonzero legacy `bloomedRarityTiers` count: an already-unlocked `verdant-voyager` achievement is never revoked by this migration, regardless of whether the exact historical tiers can be reconstructed; best-effort reconstruction from currently-owned, currently-bloomed (`growthByPlant >= 100`) plants' tiers is acceptable where exact history isn't recoverable — document whatever approach is taken
- [ ] No two achievements share the same underlying predicate/stat at the same effective threshold after the above fixes
- [ ] No achievement description implies daily/calendar-based logic unless real calendar logic backs it (there is currently none — `AchievementStats` has no date/streak field)
- [ ] Every achievement is mapped onto WSP-2.1's reward-intensity type
- [ ] Region-boundary achievements are not added on a per-region basis; region completion gets a reward (WSP-2.2's region data), not its own achievement entry. Real achievement slots are reserved for first region complete, the level-50 halfway point, the full level-100 journey, and one or two region-specific feats that are genuinely distinctive on their own
- [ ] All of the above is covered by tests: the achievement-rename migration, the `level-clears` consolidation, the corrected `bloomedRarityTiers` behavior (including the "three Common blooms is not 3 tiers" negative case), and the never-revoke migration guarantee

### Implementation prompt

```
Audit and fix Word Sprout's achievement system for Tier 2. Three concrete,
verified defects to fix, not just a general audit:

1. daily-dew's id doesn't match what it checks (uniqueCategoriesCompleted,
nothing daily/calendar-based about it). Rename it and add a migration
mapping in src/persistence.ts so a player who already has "daily-dew" in
their unlockedAchievements string array keeps their earned achievement
under the new id -- a bare rename silently revokes it for anyone who
already unlocked it.

2. zenith-climber (50 levels, standalone) and the level-clears family
(10/25/100 levels) both key off levelsCompleted -- fold one into the
other, with the same never-revoke-an-earned-achievement migration
discipline.

3. The real bug: recordPlantBloom() in src/hooks/useWordSearchGame.ts
takes zero parameters and increments bloomedRarityTiers as a raw counter
(capped at 7) every time ANY plant blooms -- it has no concept of which
rarity tier. GardenView.tsx calls it as
recordPlantBloom(plantDef?.tier ?? "Common") at two call sites (water and
fertilize blooms) -- TypeScript allows passing an argument to a function
that ignores it (a function accepting fewer params is structurally valid
wherever more are expected), so this compiles cleanly but the tier is
silently dropped. Separately, waterAllReady (the bulk "water all ready"
button -- a third, independent bloom-triggering path) has its own INLINE
duplicate of the same broken counter logic, never routing through
recordPlantBloom at all. Net effect: "Bloom plants from 3 rarity tiers"
(verdant-voyager) currently unlocks from three Common blooms.

Fix this properly: change bloomedRarityTiers from a number into a
persisted set/array of which distinct tier identifiers have actually been
bloomed (normalized in src/persistence.ts like every other collection
field there), make recordPlantBloom actually use the tier argument its own
declared type already claims to accept, and unify waterAllReady's
duplicate logic to go through the same corrected path -- there should be
exactly one implementation of "record a bloom, including its tier," not
two. Write a migration for existing saves: never revoke an already-earned
verdant-voyager achievement, even if you can't reconstruct the exact
historical tiers bloomed -- best-effort reconstruction from currently-owned,
fully-grown plants' tiers is fine where exact history isn't available.

Beyond those three, audit the remaining achievements for the same class of
issue (description says one thing, predicate checks another; two
achievements measuring the same stat), map every achievement onto WSP-2.1's
reward-intensity type, and make sure this pass doesn't add a per-region
achievement for each of the six regions -- region completion gets a reward
(WSP-2.2), not its own achievement; reserve real achievement slots for
first region complete, the level-50 halfway point, the full level-100
journey, and one or two genuinely distinctive region-specific feats.

Test every fix directly, including the negative case for the rarity fix
(three Common-tier blooms must NOT satisfy verdant-voyager) and the
migration's never-revoke guarantee.
```

---

## WSP-2.6 — Garden watering and bloom presentation, across every bloom path

**Tier:** 2 (The Journey) · **Labels:** `feature`, `P2`, `tier-2`, `presentation` · **Owner:** Design + Art agents
**Blocks:** nothing directly
**Blocked by:** WSP-2.1 (hard — consumes the intensity type); WSP-2.5 (hard — bloom presentation must key off corrected, unique rarity data)

### Context

Better news than the plan's framing suggests: growth-stage art already exists and already works. `getPlantArtwork` (`src/plantHealth.ts`) and `plantsCatalog.ts`'s stage thresholds (`growth >= 100` bloom / `>= 50` young / `>= 25` sprout / else vessel) already swap real per-stage artwork rather than just displaying a percentage.

What's genuinely missing is presentation for the actions themselves, and there are **three separate bloom-triggering paths today, not one**:

1. Individual watering (`handleWaterPlant` in `GardenView.tsx`) — instant state update, then a plain toast.
2. Individual fertilizing (`handleFertilizePlant` in `GardenView.tsx`, line ~175) — same shape, can also trigger a bloom if the 25% boost reaches 100%.
3. Bulk "water all ready" (`waterAllReady` in `src/hooks/useWordSearchGame.ts`) — a *different code path entirely*, outside `GardenView.tsx`, that can bloom several plants in one action.

The first draft of this issue only mentioned watering. A presentation built against only `handleWaterPlant` would leave fertilizer-triggered and bulk-triggered blooms with the old plain-toast treatment — an inconsistent, half-finished feature. All three need to emit the same typed bloom event and receive the same rarity-scaled presentation.

### Acceptance criteria

- [ ] Confirm and preserve the existing growth-stage artwork system (vessel/sprout/young/bloom via `getPlantArtwork`) — this issue extends it, it does not replace working infrastructure
- [ ] Watering becomes a real sub-1.5-second beat: tap → animation → soil/droplet response → plant reacts → quiet feedback
- [ ] The watering beat never blocks continued interaction with the Garden past its own ~1.5s, matching the non-blocking pattern already established for bonus-word discovery (`BonusDiscoveryToast`) and the onboarding coachmark
- [ ] A single typed bloom event/pathway is emitted from **all three** current bloom-triggering sites — individual watering, individual fertilizing, and bulk "water all ready" — rather than each having its own presentation logic (or, per WSP-2.5, its own separate broken tracking logic)
- [ ] Bloom presentation (brighten, animate, reveal, soft particles, reward, collection update) replaces the current plain-toast bloom flow at all three sites
- [ ] Bloom presentation intensity scales with the plant's rarity tier per WSP-2.1's intensity type, using WSP-2.5's corrected per-tier bloom tracking as the data source — not the old broken counter
- [ ] Bulk "water all ready" blooming multiple plants at once is handled explicitly: define whether multiple simultaneous blooms present sequentially, combine into one summarized presentation, or something else — don't leave this to accident
- [ ] As the collection grows, the Conservatory itself visibly looks fuller (a shelf, greenhouse tableau, or similarly cheap-to-build accumulation visual) — explicitly not a decorating/arrangement system for 1.0
- [ ] `prefers-reduced-motion` is respected for the watering beat and all bloom presentation
- [ ] Dedicated component-level tests exist for: each of the three bloom-triggering sources reaching the same presentation path, reduced-motion behavior, rapid repeated input (e.g. mashing the water button, or bulk-watering while an animation is still playing), dismissal, and non-blocking behavior. There is currently no `GardenView.test.tsx` at all — existing coverage (`plantHealth.test.ts`, `economy.test.ts`, `gardenCare.test.ts`) covers artwork selection, pricing, and the passive care-nudge logic, not watering/bloom presentation; this issue needs to add that coverage, not assume it already exists
- [ ] Existing Garden tests (growth thresholds, watering cooldown, bloom bounty/economy) continue to pass — this issue changes presentation and bloom-tracking correctness (per WSP-2.5), not the underlying growth/economy math

### Implementation prompt

```
Build the Garden's emotional payoff for Word Sprout, across every path
that can currently trigger a bloom -- not just one of them.

Start from what already exists: plantHealth.ts's getPlantArtwork() and
plantsCatalog.ts's growth-stage thresholds (vessel/sprout/young/bloom)
already swap real artwork per stage. Don't rebuild that.

There are three bloom-triggering sites today, and all three need to reach
the same presentation:
1. handleWaterPlant in GardenView.tsx (individual watering)
2. handleFertilizePlant in GardenView.tsx, ~line 175 (individual
   fertilizing -- the 25% boost can also push a plant to 100%)
3. waterAllReady in src/hooks/useWordSearchGame.ts (bulk "water all
   ready" -- a separate code path outside GardenView entirely, which can
   bloom several plants in a single action)

Part 1 -- Watering beat: a real, sub-1.5-second sequence for tapping Water
Vessel -- tap acknowledgment, droplet/soil animation, the plant visibly
reacting, quiet feedback. Must not block further Garden interaction past
its own ~1.5s, matching the non-blocking pattern already used by
BonusDiscoveryToast and the onboarding coachmark elsewhere in this
codebase -- read those before inventing a new overlay pattern.

Part 2 -- One bloom event, three sources: define a single typed bloom
event (plant id, rarity tier, bounty) and make all three sites above emit
it, rather than each carrying its own presentation (or, as they do today,
each carrying its own separately-broken tracking logic -- WSP-2.5 fixes
the tracking; this issue is what actually presents it). Bulk watering
blooming multiple plants at once needs an explicit decision: sequential
presentation, one combined summary, or something else -- pick one and
implement it, don't leave the multi-bloom case as an accident of whatever
a single-bloom animation does when called three times in a row.

Part 3 -- Bloom presentation: brighten, animate, reveal, soft particles,
reward, collection update -- scaled by the plant's rarity tier using
WSP-2.1's intensity type, reading from WSP-2.5's corrected per-tier bloom
data (not the old broken raw counter).

Part 4 -- Conservatory fullness: as ownedPlants grows, GardenView should
visibly look fuller -- a shelf, greenhouse tableau, or whatever's cheapest
to build that reads as accumulation. Explicitly not a decorating/
arrangement system for 1.0.

Respect prefers-reduced-motion throughout. Write real component tests --
there is no GardenView.test.tsx today at all. Cover all three bloom
sources reaching the same presentation, reduced motion, rapid repeated
input (mashing the water button, bulk-watering mid-animation), dismissal,
and non-blocking behavior. Don't touch the underlying growth math,
watering cooldown, or bloom bounty/economy calculations.
```

---

## WSP-2.7 — Beyond-level-100 verification

**Tier:** 2 (The Journey) · **Labels:** `test`, `P2`, `tier-2`, `certification` · **Owner:** Engineering agent
**Blocks:** nothing (final gate for this batch)
**Blocked by:** WSP-2.2, WSP-2.3, WSP-2.5 all reaching a testable state

### Context

The release plan requires that after level 100, "keep generating puzzles and progressing rank/achievements/Garden indefinitely without requiring more handcrafted campaign content." As WSP-2.4 clarifies, this needs a precise reading: Botanist Rank (10 fixed ranks, Cosmic Conservator terminal at level 41 with no rank beyond it) and the achievement list (finite) do not literally unlock forever — what must genuinely continue indefinitely is puzzle generation, the level/frontier counter, and lifetime statistics. This issue is the certification pass confirming that's actually true once WSP-2.2/2.3/2.5 have landed, the same role WSP-1.4 played for Tier 1.

### Acceptance criteria

- [ ] A test or simulation plays/generates puzzles well past level 100 (at minimum level 150; ideally matching the existing economy simulation's horizon conventions) and confirms: no error, no stall, no silent stop in puzzle generation
- [ ] Region tuning (WSP-2.3) at and past level 100 (Verdant Beyond, 71–100, and whatever applies past it) doesn't throw or degenerate — confirm level 101+ puzzles still generate with sane parameters
- [ ] Category bias (WSP-2.3) continues to function past level 100 on both the web and native selection paths
- [ ] Lifetime statistics (Seeds, bonus words found, plants bloomed, etc.) continue to accumulate correctly past level 100 — no cap, no silent reset
- [ ] Confirm explicitly, and assert in a test, that Botanist Rank correctly remains at Cosmic Conservator past level 100 (this is expected, current-by-design behavior, not a bug to fix) and that no achievement-evaluation code path errors when `levelsCompleted` exceeds every achievement's `maxProgress`
- [ ] The existing `level100PlayerSave` fixture (`src/test/fixtures/saves/index.ts`) still round-trips correctly through persistence after all of WSP-2.2/2.3/2.5's schema changes (region-claim tracking, achievement id renames, `bloomedRarityTiers` shape change)
- [ ] Findings are written up the same way `docs/playtest/wsp-1.4-first-hour-findings.md` was for Tier 1 — observations separated from interpretations, linked to whichever of WSP-2.2/2.3/2.4/2.5/2.6 needs a follow-up if anything surfaces

### Implementation prompt

```
Certify that Word Sprout's campaign genuinely continues past level 100
once WSP-2.2 (region data + rewards), WSP-2.3 (generator tuning + category
parity), and WSP-2.5 (achievement audit + rarity fix) have landed. This is
the Tier 2 equivalent of WSP-1.4's early playtest checkpoint -- a
certification gate, not a feature to build.

Extend the existing puzzle-audit or economy-simulation tooling (or write a
new targeted test, whichever fits better) to generate/simulate well past
level 100 and confirm: puzzle generation never errors or stalls; region
tuning and category bias (both the web and native/Rust paths) keep
functioning with sane parameters; lifetime statistics keep accumulating
with no cap or silent reset.

Explicitly assert the parts that are SUPPOSED to stop, not just the parts
that continue: Botanist Rank correctly stays at Cosmic Conservator (the
top rank, starting at level 41) past level 100 -- this is current,
intentional design, not something to "fix" -- and no achievement-evaluation
code errors once levelsCompleted exceeds every achievement's maxProgress.

Round-trip the existing level100PlayerSave fixture
(src/test/fixtures/saves/index.ts) through persistence after all of this
tier's schema changes (region-claim tracking from WSP-2.2, achievement id
renames from WSP-2.5, the bloomedRarityTiers shape change from WSP-2.5) to
confirm nothing about a long-time player's save breaks.

Write up findings the same way docs/playtest/wsp-1.4-first-hour-findings.md
did for Tier 1's checkpoint -- observations separated from interpretations,
and file anything that surfaces as a follow-up against whichever of this
tier's other issues owns it.
```

---

## What changed in this revision

The first draft of this file (3 issues, one per plan subsection: 2.1/2.2/2.3) was reviewed before implementation started. Every finding below was independently verified against the current codebase before being folded in here:

1. **Region category bias omitted the native implementation path entirely.** `src-tauri/src/lib.rs`'s `get_puzzle_words` is a separate Rust command the native Android/Tauri build actually calls, bypassing `src/backend.ts`'s web-only selection logic completely. Now explicit in WSP-2.3, with a required parity test.
2. **The achievement audit missed a real, already-shipped semantic bug.** `verdant-voyager` claims to track 3 rarity tiers bloomed; `recordPlantBloom()` takes zero parameters and just increments a counter, so three Common blooms satisfy it today. `waterAllReady` has its own separate, independently-broken copy of the same logic. Now a required fix in WSP-2.5, with a migration and a negative test.
3. **Reward/presentation events had no trigger, idempotency, or collision rules.** Pulled into WSP-2.2 as its own acceptance criteria: exactly-once claims, replay/retroactive-save behavior, and one shared presentation queue for the (real, level-50-and-others) case of several presentable events firing from one level completion.
4. **The Garden issue covered only one of three bloom paths.** Fertilizing (`handleFertilizePlant`) and bulk watering (`waterAllReady`) can each also trigger a bloom, outside the one path (`handleWaterPlant`) the first draft named. WSP-2.6 now requires one typed bloom event shared by all three.
5. **The difficulty contract as written couldn't express all six region identities.** `minWordLength`/`maxWordLength` and `bonusCandidateCount` (both already real fields on `PuzzleDifficulty`) weren't named alongside `reverseWordProbability`/`diagonalProbability`/`overlapPressure`. Now explicit in WSP-2.3.
6. **The dependency graph understated a real shared-contract dependency.** The reward-intensity hierarchy is now its own upfront issue (WSP-2.1), a hard blocker for the two presentation-heavy issues (WSP-2.4, WSP-2.6), instead of a "soft dependency" three parallel agents were expected to informally coordinate on.
7. **"Progress indefinitely" wasn't precisely testable as originally worded.** Botanist Rank has a terminal rank (Cosmic Conservator, level 41+, no rank beyond it) and achievements are finite — "progress" now explicitly means the level counter and lifetime statistics, not new rank titles or achievements unlocking forever. Clarified in WSP-2.4 and certified in the new WSP-2.7.
8. **Test coverage claims were too optimistic, and a real test-infrastructure bug was found in the process.** There is no `GardenView.test.tsx` today; WSP-2.6 now requires building that coverage rather than assuming it exists. Separately, a stale nested git worktree under `.claude/worktrees/` was found to be silently duplicating every test file Vitest discovered, roughly doubling every test count reported earlier in this project's history — fixed in `vite.config.ts` (`d5d56ae`) by excluding it from test discovery. The true baseline as of that fix is 352 tests across 38 files, not ~574/65.

Recommended issue split (implemented above): a shared reward-intensity foundation issue, region data with an exactly-once reward/event model, generator tuning with real native/web category parity, milestone/transition presentation with queue arbitration, an achievement audit with an ID migration and the unique-rarity correction, Garden watering/bloom presentation across every bloom entry path, and a beyond-level-100 certification pass — WSP-2.1 through WSP-2.7 above, in that order.
