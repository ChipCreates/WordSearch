# Word Sprout 1.0 — Tier 2 Issues

Source of truth: `WordSprout_1.0_Plan.md` (frozen). Nothing below changes that document's scope — this is Tier 2 ("The Journey", levels 1–100) broken into individually assignable, agent-ready units, in the same spirit as `WordSprout_1.0_Tier0-1_Issues.md`. If an issue's acceptance criteria and the plan ever disagree, the plan wins and this file gets corrected, not the other way around.

**Numbering:** issue IDs mirror the plan's section numbers (`WSP-2.1`, etc.). Suggested GitHub milestone: `1.0 — Tier 2`.

**Prerequisite:** Tier 0 and Tier 1 are both complete and merged into `release/1.0` as of this writing (`9691080`), including the WSP-1.4 early playtest checkpoint (`docs/playtest/wsp-1.4-first-hour-findings.md`). Tier 2 work should branch from that state.

**Dependency graph for this batch:**

```
WSP-2.2  independent — start immediately, but its reward-intensity hierarchy
         (routine -> small -> medium -> major -> exceptional) is a shared
         foundation piece
WSP-2.1  independent for the region data file + tuning; soft dependency on
         WSP-2.2's reward-intensity hierarchy for milestone presentation
         weight (level 100 should visibly read as "exceptional", not just
         "another card")
WSP-2.3  independent for growth-stage art, watering beat, and Conservatory
         fullness; soft dependency on WSP-2.2's hierarchy for bloom
         presentation scaling by rarity tier
```

None of the three is a hard blocker on either of the others — all can run in parallel across separate agents/sessions. The soft dependencies just mean WSP-2.2's hierarchy definition (the first part of its acceptance criteria) should land or at least be agreed early, since both WSP-2.1's milestone weighting and WSP-2.3's bloom-by-rarity presentation are described in the plan using that same vocabulary and shouldn't invent a second, incompatible one.

---

## WSP-2.1 — Region identities and campaign structure

**Tier:** 2 (The Journey) · **Labels:** `feature`, `P2`, `tier-2`, `content` · **Owner:** Design agent
**Blocks:** nothing directly
**Blocked by:** none hard; soft-depends on WSP-2.2 for milestone presentation weight

### Context

Six regions already exist, but only as boundaries and flavor text hardcoded directly in the view layer — `LEVEL_REGIONS` in `src/components/LevelsView.tsx` (id, start/end level, name, tagline) — with the ranges the plan says to keep: Glowing Grove (1–20), Sunlit Falls (21–30), Crystal Conservatory (31–40), Mosswood Hollows (41–50), Cloudreach Summit (51–70), Verdant Beyond (71–100). There is no visual/ambient theme, category bias, difficulty profile, or entry/completion reward data anywhere yet — the level-select view currently *owns* these as inline literals rather than *consuming* them.

The puzzle generator (`src/puzzleGenerator.ts`) already has the difficulty knobs a region tuning identity would modulate — `reverseWordProbability`, `diagonalProbability`, `overlapPressure` in `PuzzleDifficulty`, currently keyed only on the player's own three-tier difficulty mode (easy/standard/challenging), not on level or region. Region tuning should layer on top of that existing system, not replace or duplicate it. Category selection (`src/backend.ts`'s `getPuzzleWords`) currently cycles deterministically through every category in a tier with no per-region weighting at all — "category bias" per region is genuinely new.

There is currently no milestone/region-transition presentation system of any kind — no title card, no scenery change, nothing at levels 10/20/30/40/50/70/100. (The existing `BotanistPromotionCeremony` is a related but separate, much more frequent system — rank promotions happen roughly every 3–4 levels and are not a substitute for a once-per-region milestone moment.)

### Acceptance criteria

- [ ] Region definitions (id, name, tagline, start/end level, visual/ambient theme reference, category bias, a difficulty-tuning profile, entry/completion rewards) live in a dedicated data module, not inline in `LevelsView.tsx` — the view consumes this data rather than owning it
- [ ] The six existing regions and their level ranges are preserved exactly (1–20 / 21–30 / 31–40 / 41–50 / 51–70 / 71–100) — this is a refactor + extension of existing content, not a redesign
- [ ] Each region's difficulty-tuning profile is expressed as a modifier/bias on top of the existing `PuzzleDifficulty` knobs (`reverseWordProbability`, `diagonalProbability`, `overlapPressure`) and board sizing — not a second, parallel difficulty system that can drift from the player's own easy/standard/challenging setting
- [ ] Region tuning identities match the plan's descriptions: Glowing Grove (comfort — short words, few diagonals, generous boards), Sunlit Falls (confidence — more diagonals, slightly bigger boards), Crystal Conservatory (sophistication — longer words, rarer vocabulary), Mosswood Hollows (discovery — more reverses, less obvious placement, richer bonus potential), Cloudreach Summit (mastery — density, long words, overlap pressure), Verdant Beyond (full mechanical vocabulary, while staying fair)
- [ ] A region transition (crossing from one region's level range into the next) shows a short (3–6 second), skippable title card and scenery change
- [ ] `prefers-reduced-motion` gets an instant static transition instead of the animated one — no exception
- [ ] Milestone presentation exists at levels 10, 20, 30, 40, 50, 70, and 100, distinct from both the per-level completion summary and the Botanist Rank promotion ceremony
- [ ] Level 100 specifically gets real weight ("The Verdant Beyond Blooms" or equivalent) and reads as the most significant milestone in the game — see WSP-2.2's reward-intensity hierarchy for what "real weight" should look like relative to everything else
- [ ] The game makes clear (in the level-100 milestone's own copy) that play continues past it — this is not framed as an ending
- [ ] Past level 100, puzzles keep generating and rank/achievements/Garden progress keep advancing indefinitely with no additional handcrafted campaign content required — confirm this by playing/simulating past level 100 and checking nothing errors, stalls, or silently stops progressing
- [ ] `src/components/LevelsView.test.tsx` continues to pass after the data-file extraction (it does not currently test `regionForLevel`/`LEVEL_REGIONS` directly — add coverage for the extracted data module rather than assuming it's already covered)
- [ ] The level-100-and-beyond player fixture (`level100PlayerSave` in `src/test/fixtures/saves/index.ts`) still round-trips correctly through persistence after any region-data changes

### Implementation prompt

```
You are extracting Word Sprout's six campaign regions from the view layer
into real data, then building the tuning and milestone-presentation systems
the release plan describes for Tier 2 ("The Journey").

Part 1 — Data extraction: LEVEL_REGIONS in src/components/LevelsView.tsx
currently holds id/start/end/name/tagline for all six regions, inline in the
view. Move this into a dedicated module (e.g. src/regions.ts) and extend
each entry with: a visual/ambient theme reference (whatever's cheapest to
wire up now -- a background/palette key is enough, full art is Tier 3's
job), a category bias, a difficulty-tuning profile, and entry/completion
rewards. LevelsView should import and consume this data, not define it.
Keep the six regions' exact level ranges unchanged (1-20, 21-30, 31-40,
41-50, 51-70, 71-100) -- existing tests and fixtures depend on them.

Part 2 — Difficulty tuning: src/puzzleGenerator.ts's PuzzleDifficulty
already has reverseWordProbability, diagonalProbability, and
overlapPressure, currently varied only by the player's own easy/standard/
challenging mode. Add a region-level modifier on top of these (and on grid
sizing) so each region gets the tuning *identity* the plan describes --
Glowing Grove comfort, Sunlit Falls confidence-building, Crystal
Conservatory sophistication (longer words, rarer vocabulary), Mosswood
Hollows discovery (more reverses, less obvious placement, richer bonus
potential), Cloudreach Summit mastery (density, long words, overlap
pressure), Verdant Beyond using the full mechanical vocabulary while
staying fair. This is tuning, not new mechanics -- don't introduce a
puzzle feature that doesn't already exist elsewhere in the generator.
Category bias (which categories a region's puzzles favor) is new -- design
and wire up a reasonable weighting, and document the reasoning for which
categories were chosen per region.

Part 3 — Milestone presentation: build a short (3-6s), skippable title
card + scenery change for region transitions, and standalone milestone
presentation at levels 10, 20, 30, 40, 50, 70, and 100 -- distinct from the
per-level completion summary (SuccessScreen) and from BotanistPromotionCeremony
(rank promotions are a separate, much more frequent system; don't conflate
the two). Respect prefers-reduced-motion with an instant static transition,
matching the pattern already established for the onboarding coachmark and
achievement banner elsewhere in this codebase. Level 100 needs to read as
the biggest moment in the campaign -- coordinate with WSP-2.2's
reward-intensity hierarchy (routine -> small -> medium -> major ->
exceptional) so "exceptional" has one consistent visual/audio vocabulary
across achievements, milestones, and (per WSP-2.3) rare blooms, rather than
three independent ideas of what "big" looks like. Its copy must make clear
play continues afterward -- this is not an ending state.

Part 4 — Beyond level 100: confirm (via the existing puzzle-audit or
economy-simulation tooling, or a new targeted test) that puzzles keep
generating and rank/achievements/Garden progress keep advancing past level
100 with zero additional handcrafted content -- no hardcoded upper bound
anywhere in the level/region/rank logic.

Do not build Tier 3's art/audio here -- reference art/ambient theme keys
are enough for this issue; full production art direction is separately
scoped.
```

---

## WSP-2.2 — Progression, achievements, and rewards

**Tier:** 2 (The Journey) · **Labels:** `feature`, `P2`, `tier-2`, `balance` · **Owner:** Design agent
**Blocks:** nothing directly, but its reward-intensity hierarchy is a shared foundation for WSP-2.1's milestones and WSP-2.3's bloom presentation
**Blocked by:** none

### Context

Five separate progression systems already exist and are already reasonably distinct in *purpose*: levels/regions (`src/regions.ts` per WSP-2.1, currently `LevelsView.tsx`) are where you've been, Botanist Rank (`src/botanistRanks.ts`, 10 ranks from Seedling Scout to Cosmic Conservator) is long-term mastery, achievements (`src/achievements.ts`, 26 entries) are interesting things you did, the Garden (`src/plantsCatalog.ts` + `src/components/GardenView.tsx`) is what you've collected, and Field Notes (`src/fieldNotes.ts`, 8 rotating short-term goals) are short-term optional goals. The plan's ask here is an audit, not a redesign of the boundaries between them.

Concrete drift already visible in the current achievement list:
- `zenith-climber` ("Zenith Climber", complete 50 levels, no `family`/`tier`) sits alongside a separate `level-clears` family (`level-clears-10`/`level-clears-25`/`level-clears-100`, with `family`/`tier` set) that tracks the exact same `levelsCompleted` stat via the same predicate shape, just at different thresholds and without a 50-level rung in the family itself — two systems measuring the same thing, one of them not integrated into the other.
- `daily-dew` is named "Garden Cartographer" and its description ("Complete levels in 10 unique categories") has nothing to do with anything daily/calendar-based — the id is a leftover from something else, exactly the kind of "no drift" this audit exists to catch.
- Roughly half the achievement list has `family`/`tier`/`actionableCopy` set (the newer ones) and half doesn't (the original, older entries) — the reward-intensity/presentation hook this issue asks for doesn't have anywhere consistent to attach yet.
- No achievement is region-specific today, which is good — the plan's warning against "an achievement for every region" hasn't been violated yet, but region-completion *rewards* (as opposed to achievements) don't exist yet either; that's WSP-2.1's job to add, this issue's job to make sure it doesn't duplicate an achievement for the same moment.

### Acceptance criteria

- [ ] Every existing achievement's `description` is audited against what its `getProgress` predicate actually checks — no drift between what an achievement says it does and what it actually tracks
- [ ] `daily-dew`'s id (and any other id that no longer matches its own name/description) is renamed to something that reflects what it actually checks, with a save-migration note if the id is ever persisted anywhere that matters (check `unlockedAchievements` in `SaveData` — it stores ids as strings, so a rename needs a migration path, not a silent swap)
- [ ] The `zenith-climber` / `level-clears` duplication (two separate systems both keying off `levelsCompleted`) is resolved into one — either fold `zenith-climber`'s 50-level milestone into the `level-clears` family or remove the redundant one, but the "no duplicate predicates" rule from the plan is satisfied
- [ ] No two achievements share the same underlying predicate/stat at the same effective threshold
- [ ] No achievement description implies daily/calendar-based logic unless real calendar logic backs it (there is currently none in this codebase — `AchievementStats` has no date/streak field)
- [ ] A reward-intensity hierarchy (routine → small → medium → major → exceptional) is defined once, consistently, and every existing achievement is mapped onto it (extending the current `AchievementTier` type as needed) — presentation (icon treatment, banner duration/scrim, audio cue) visibly scales with intensity, not just achievement-to-achievement but system-to-system (an achievement and a milestone at the same intensity level should feel comparably weighted)
- [ ] Region-boundary achievements are *not* added on a per-region basis (six region-complete achievements is explicitly the anti-pattern the plan calls out) — region completion gets a reward (Seeds/cosmetic/Garden unlock, defined in WSP-2.1's region data) instead of its own achievement entry
- [ ] Actual achievements are reserved for genuinely distinctive moments: first region complete, the level-50 halfway point, the full level-100 journey, and one or two region-specific feats that stand on their own merits (not "you existed in this region")
- [ ] Every achievement change is covered by the existing `evaluateAchievements`/achievement-progress test patterns — no regression to already-passing achievement tests

### Implementation prompt

```
You are auditing and rationalizing Word Sprout's progression/reward
systems for Tier 2 of the release plan. The five systems already have
distinct jobs by design -- levels are where you've been, Botanist Rank is
long-term mastery, achievements are interesting things you did, the Garden
is what you've collected, Field Notes are short-term optional goals. Your
job is to find and fix places where that separation has drifted, not to
redesign the boundaries themselves.

Part 1 -- Achievement audit: read every entry in src/achievements.ts and
check its description against what getProgress actually evaluates. Two
concrete issues already known going in: (a) "daily-dew" is named "Garden
Cartographer" and checks uniqueCategoriesCompleted -- nothing about it is
daily or calendar-based, so the id is stale and misleading; rename it
(with a migration note, since unlockedAchievements persists ids as
strings in SaveData -- check src/persistence.ts's normalizeSaveData for
the right place to add a rename mapping so an existing player's unlocked
"daily-dew" doesn't silently vanish). (b) "zenith-climber" (50 levels, no
family) and the "level-clears" family (10/25/100 levels, with family set)
both key off the same levelsCompleted stat -- fold one into the other so
there's one system, not two, for "how many levels have you cleared."
Look for any other predicate collisions or description/logic mismatches
across all 26 entries while you're in there.

Part 2 -- Reward-intensity hierarchy: define routine -> small -> medium ->
major -> exceptional as the one shared intensity scale, and map every
achievement onto it (the existing AchievementTier type -- bronze/silver/
gold/exceptional, currently only set on about half the list -- is your
starting point, not necessarily the final shape). Presentation must
visibly scale with intensity: a routine achievement shouldn't get the same
banner treatment, duration, or audio cue as an exceptional one. This scale
needs to be usable by WSP-2.1 (milestone presentation, especially level
100) and WSP-2.3 (bloom presentation by plant rarity) too -- coordinate so
all three consume the same vocabulary instead of inventing their own.

Part 3 -- Resist per-region achievements: WSP-2.1 is adding
entry/completion rewards to each region's data. Those are rewards
(Seeds, a cosmetic, a Garden unlock), not achievements. Make sure nothing
in this pass or WSP-2.1's adds a "completed region N" achievement for
each of the six regions -- reserve real achievement slots for first region
complete, the level-50 halfway point, the full level-100 journey, and one
or two region-specific feats that are genuinely distinctive on their own
(not just "you were here").

Run the existing test suite after every change in this issue -- achievement
predicate changes are exactly the kind of edit that silently breaks an
existing achievement-unlock test without a clear error pointing at why.
```

---

## WSP-2.3 — Garden emotional payoff

**Tier:** 2 (The Journey) · **Labels:** `feature`, `P2`, `tier-2`, `presentation` · **Owner:** Design + Art agents
**Blocks:** nothing directly
**Blocked by:** none hard; soft-depends on WSP-2.2's reward-intensity hierarchy for bloom presentation scaling by rarity

### Context

Better news than the plan's framing suggests: growth-stage art already exists and already works. `getPlantArtwork` (`src/plantHealth.ts`) and `plantsCatalog.ts`'s stage thresholds (`growth >= 100` bloom / `>= 50` young / `>= 25` sprout / else vessel) already swap real per-stage artwork rather than just displaying a percentage — the plan's stated worry ("rather than just showing a percentage") is already substantially addressed. `GardenView.tsx` does also show a raw percentage number alongside the art (`{growth}% (Bounty: +N Seeds)`), which is fine as supplementary detail, not a replacement for the visual stage change.

What's genuinely missing is the *feel* of the two key actions. Watering (`handleWaterPlant` in `GardenView.tsx`) is currently an instant state update (`updateWateredTimestamp` + `updatePlantGrowth`) followed by a plain Snackbar-style toast ("💧 {Plant} grew 25%. Keep nurturing it toward bloom!") -- no animation, no tap-to-response beat at all. Blooming (`recordPlantBloom` + the bloom toast, "🎉 Fantastic! ... bloomed! ... +N Seeds! 🌸") is the same shape -- a state change plus a text toast, regardless of whether the plant is a Common starter or a Legendary rarity. There is currently no rarity-scaled presentation anywhere in the bloom path. There is also no "the Conservatory looks fuller as the collection grows" treatment -- `GardenView.tsx` renders owned plants as a flat grid/list with no accumulation visual.

### Acceptance criteria

- [ ] Confirm and preserve the existing growth-stage artwork system (vessel/sprout/young/bloom via `getPlantArtwork`) — this issue extends it, it does not replace working infrastructure
- [ ] Watering becomes a real sub-1.5-second beat: tap → animation → soil/droplet response → plant reacts → quiet feedback — replacing (or building on top of) the current instant-update-plus-toast flow
- [ ] The watering beat never blocks continued interaction with the Garden past its own ~1.5s — matching the non-blocking-feedback principle already established for bonus-word discovery (WSP-1.2) and the onboarding coachmark
- [ ] Bloom presentation (brighten, animate, reveal, soft particles, reward, collection update) replaces the current plain-toast bloom flow
- [ ] Bloom presentation intensity scales with the plant's rarity tier — a Common bloom and a Legendary bloom must not receive the same presentation weight, using WSP-2.2's reward-intensity hierarchy as the shared scale rather than a bespoke one
- [ ] As the collection grows, the Conservatory itself visibly looks fuller (a shelf, greenhouse tableau, or similarly cheap-to-build accumulation visual) rather than staying a flat, static-looking list regardless of collection size
- [ ] The accumulation visual is explicitly not required to be a decorating/arrangement system for 1.0 — a passive "more plants owned = fuller-looking Conservatory" is sufficient scope
- [ ] `prefers-reduced-motion` is respected for both the watering beat and bloom presentation, consistent with the reduced-motion handling already established elsewhere (onboarding coachmark, achievement banner, success overlay)
- [ ] Existing Garden tests (growth thresholds, watering cooldown, bloom bounty/economy) continue to pass — this issue changes presentation, not the underlying growth/economy math

### Implementation prompt

```
You are building the Garden's emotional payoff for Tier 2 of the release
plan. Start from what already exists rather than rebuilding it: plantHealth.ts's
getPlantArtwork() and plantsCatalog.ts's growth-stage thresholds (vessel /
sprout / young / bloom, at 0/25/50/100% growth) already swap real artwork
per stage -- that part of the plan's ask is done. Your job is the two
actions that currently have no felt presentation at all: watering and
blooming, both of which today are just a state update plus a plain toast
(see handleWaterPlant and the bloom branch inside it, in GardenView.tsx).

Part 1 -- Watering beat: build a real, sub-1.5-second sequence for tapping
Water Vessel -- tap acknowledgment, a droplet/soil animation, the plant
visibly reacting, then quiet feedback (replacing or layering over the
current instant updateWateredTimestamp/updatePlantGrowth + toast). It must
not block further interaction with the Garden past its own ~1.5s, matching
the non-blocking pattern already used for bonus-word discovery
(BonusDiscoveryToast) and the onboarding coachmark elsewhere in this
codebase -- read those for the established non-blocking-overlay + portal
pattern before inventing a new one.

Part 2 -- Bloom presentation: this is the biggest reward moment in the
Garden loop and currently gets the exact same plain-toast treatment
regardless of whether the plant is Common or Legendary. Build a real
sequence -- brighten, animate, reveal, soft particles, reward, collection
update -- and scale its intensity by the plant's rarity tier using
whatever reward-intensity hierarchy WSP-2.2 defines (routine -> small ->
medium -> major -> exceptional), so presentation weight is consistent with
how achievements and milestones express the same scale elsewhere. Don't
invent a second, incompatible intensity vocabulary.

Part 3 -- Conservatory fullness: as ownedPlants grows, GardenView should
visibly look fuller -- a shelf, greenhouse tableau, or whatever's cheapest
to build that reads as "this player has been playing a while." This is
explicitly not a decorating/arrangement system for 1.0 -- passive visual
accumulation is enough scope; don't over-build placement/customization
here.

Respect prefers-reduced-motion for both the watering beat and bloom
presentation -- an instant, static equivalent, matching the pattern
already established for the onboarding coachmark, achievement banner, and
success overlay. Don't touch the underlying growth math, watering
cooldown, or bloom bounty/economy calculations -- this issue is
presentation only; existing Garden/economy tests should be unaffected.
```
