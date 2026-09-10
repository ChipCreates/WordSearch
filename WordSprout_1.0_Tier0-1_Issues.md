# Word Sprout 1.0 — Tier 0 & Tier 1 Issues

Source of truth: `WordSprout_1.0_Plan.md` (frozen). Nothing below changes that document's scope — this is Tier 0 and Tier 1 broken into individually assignable, agent-ready units. If an issue's acceptance criteria and the plan ever disagree, the plan wins and this file gets corrected, not the other way around.

**Numbering:** issue IDs mirror the plan's section numbers (`WSP-0.1`, `WSP-1.2`, etc.) so they're traceable back to source. Suggested GitHub milestone: `1.0 — Tier 0` and `1.0 — Tier 1`.

**Dependency graph for this batch:**

```
WSP-0.1  independent — start immediately
WSP-0.2  independent — start immediately
WSP-0.3  independent — start immediately

WSP-1.3  independent — start immediately
WSP-1.2  soft dependency on WSP-1.3 for final reward values
WSP-1.1  hard dependency on WSP-0.3
         soft dependency on WSP-0.2 for final level 1–10 difficulty tuning
WSP-1.4  hard dependency on WSP-1.1 + WSP-1.2 + WSP-1.3 all reaching a testable state
```

Tier 0's three issues have no dependencies on each other and can run fully in parallel across three separate agents. WSP-1.3 can start immediately alongside them. WSP-1.1 is a real hard dependency on WSP-0.3 — onboarding's returning-player detection has to key off the hardened save system, not an ad hoc flag — and a softer one on WSP-0.2, since its level 1–10 difficulty tuning is described as running "against the certified generator." An agent can build the onboarding UI itself earlier, but the early difficulty curve shouldn't be signed off before generator certification lands. WSP-1.4 is a gate, not a task — it shouldn't be picked up until the other three Tier 1 issues are demoable.

---

## WSP-0.1 — Fix responsive level-trail path positioning

**Tier:** 0 (release blocker) · **Labels:** `bug`, `P0`, `tier-0`, `mobile` · **Owner:** Engineering — gameplay/rendering
**Blocks:** nothing directly, but no later tier's mobile-facing work should be considered final until this closes
**Blocked by:** nothing

### Context

The level-trail/map editor (`LevelsView`) authors trail stones, Bézier handles, path points, and biome transition anchors separately for portrait and landscape. These are drifting relative to one another across viewport sizes and orientations. This does **not** affect word-search puzzle solvability — that geometry is generated independently by `puzzleGenerator.ts` — but it breaks the campaign map, one of the game's primary progression surfaces, making stones, paths, and environmental art appear misaligned or disconnected on mobile.

### Acceptance criteria

- [ ] All trail artwork, stones, path points, Bézier handles, and transition anchors are stored under a single canonical coordinate model
- [ ] Coordinates are normalized within each tile/region rather than stored as viewport-dependent pixel values
- [ ] Portrait and landscape retain their own authored compositions (not forced into one shared layout), but each scales predictably and independently across device sizes
- [ ] A developer-facing comparison surface exists that renders the same trail segment simultaneously at representative phone, tablet, and desktop sizes
- [ ] Automated tests cover the coordinate transform functions directly (not just visual spot checks)
- [ ] All six regions have been manually verified post-fix on an actual mobile viewport — not assumed correct because the transform math checks out
- [ ] No regression to desktop/tablet trail rendering
- [ ] Existing authored trail data is migrated or converted to the new coordinate model — not discarded and re-authored from scratch for all six regions

### Implementation prompt

```
You are fixing a coordinate-space bug in Word Sprout's level-trail map editor
(LevelsView), not the word-search puzzle geometry — those are separate systems
and puzzle solvability is unaffected by this bug.

Trail stones, Bézier handles, path points, and biome transition anchors are
currently drifting relative to each other across viewport sizes and
orientations. Find where these are currently stored and rendered, determine
whether they're being persisted as absolute/viewport-relative pixel values,
and refactor to a single canonical, normalized coordinate model (0–1 fraction
of the relevant tile/region bounds, or another consistent scheme — pick one
and apply it everywhere, don't mix schemes).

Portrait and landscape are allowed to keep deliberately different authored
compositions — you are not required to unify them into one layout — but each
orientation must scale predictably and independently across device sizes
once normalized.

Deliverables:
1. The coordinate-model refactor itself, including migrating/converting the
   existing authored trail data into the new model. Do not throw out the
   current authoring work and require all six regions to be manually
   re-authored — a migration script or conversion pass is the expected
   approach, not a rebuild.
2. A developer-only comparison view/tool that renders the same trail segment
   at phone, tablet, and desktop dimensions simultaneously, for fast visual
   verification during this fix and for regression-catching later.
3. Automated tests directly exercising the coordinate transform functions
   (unit-level, not just visual).
4. A manual verification pass across all six regions on a real or emulated
   mobile viewport, documented in the PR description.

Do not touch puzzleGenerator.ts or word-search grid rendering — out of scope
for this issue. Do not add new trail features, biomes, or visual content —
this is a correctness fix only.
```

---

## WSP-0.2 — Puzzle generator certification

**Tier:** 0 (release blocker) · **Labels:** `bug`, `P0`, `tier-0`, `tooling` · **Owner:** Engineering — systems
**Blocks:** nothing directly, but Tier 2 region-tuning work should treat generator output as trustworthy only after this closes
**Blocked by:** nothing

### Context

Word Sprout's puzzle generator must be extremely difficult to break. It needs to stay pure and isolated from UI/hooks — that architecture is already correct and should not be restructured for its own sake. The work here is invariant enforcement, quality scoring on top of validity, and a repeatable large-scale audit tool.

### Acceptance criteria

- [ ] Generator supports seeded/deterministic generation, so any bad board is reproducible from a seed
- [ ] Every generated puzzle is verified to satisfy: all requested targets exist on the board along a legal line; no target goes out of bounds or contains illegal characters; board size matches requested difficulty; no duplicate target words; placement completes within a bounded retry count (no unbounded loops)
- [ ] A quality-scoring pass exists on top of raw validity (overlap ratio, direction distribution, reverse ratio, bonus-word density at minimum) and boards that are valid but low-quality are rejected/regenerated
- [ ] Quality rejection has a bounded retry/fallback policy of its own — failing to meet the preferred quality threshold must never create an unbounded generation loop; after the bound is hit, the generator falls back to the best-scoring valid board produced rather than looping indefinitely
- [ ] An audit script exists that generates at least 50,000 boards across every difficulty, region, and grid size, and reports generation failures, retry counts, direction/diagonal distribution, and duplicate incidents
- [ ] The audit report distinguishes validity failures (a board that couldn't legally place its targets) from quality failures (a legal board that fell short of the preferred quality threshold) as separate categories, not one combined failure count
- [ ] The audit script is runnable as a standalone command (for pre-release-candidate use, not just local dev)
- [ ] A deny/review list exists for accidental inappropriate strings in generated boards and the bonus-word dictionary, checked in one central place rather than scattered through generator logic
- [ ] Latest 50,000-board audit run is attached to the PR with a zero-failure result (or documented, justified exceptions)

### Implementation prompt

```
You are hardening Word Sprout's puzzle generator (puzzleGenerator.ts and
related generation logic) against ever producing an invalid or low-quality
board. Keep the generator pure/isolated from UI and React hooks — that
separation is intentional and should not change.

Part 1 — Determinism: ensure the generator accepts an optional RNG seed so
any specific output is reproducible for debugging.

Part 2 — Invariants: add explicit validation (ideally as part of the
generation/retry loop, not just a post-hoc check) that every generated
puzzle satisfies:
- every requested target word is present and selectable along a legal line
- no target is out of bounds or contains illegal characters
- board size matches the configured difficulty
- no duplicate target words
- generation completes within a bounded number of retries — never an
  unbounded loop

Part 3 — Quality scoring: define a scoring function evaluating overlap
ratio, direction distribution, reverse ratio, and bonus-word candidate
density. A board can be structurally valid and still get rejected for poor
quality (e.g. all words in one corner, no diagonals at all). Wire this into
the generation/retry flow, but give quality rejection its own bounded
retry/fallback policy separate from the validity retry loop — if the
preferred quality threshold isn't met within that bound, fall back to the
best-scoring valid board generated so far rather than retrying
indefinitely. A strict quality bar must never be able to hang generation.

Part 4 — Audit tooling: build a standalone script (e.g.
scripts/audit-puzzles.mjs or equivalent) that generates at least 50,000
boards spanning every difficulty tier, every region, and every supported
grid size, and reports: generation failure count, retries-per-board
distribution, target count accuracy, direction/diagonal distribution,
reverse-word distribution, and duplicate-word incidents. Output should be
runnable on demand (CI or local) ahead of any release candidate. Report
validity failures (couldn't legally place requested targets) and quality
failures (legal board, missed the preferred quality score) as separate
categories — collapsing them into one failure count hides which part of
the generator actually needs attention.

Part 5 — Content safety: implement a single, centralized deny/review list
mechanism that scans generated boards and the bonus-word dictionary for
accidental inappropriate strings. This is not about aggressive filtering of
legitimate dictionary words — it's a narrow, explicit list, not scattered
inline checks.

Run the audit script yourself before opening the PR and include the summary
output. Do not add new puzzle mechanics, new grid shapes, or new difficulty
tiers — this issue is about certifying what already exists, not expanding
it.
```

---

## WSP-0.3 — Persistence and migration hardening

**Tier:** 0 (release blocker) · **Labels:** `bug`, `P0`, `tier-0`, `data-integrity` · **Owner:** Engineering — systems
**Blocks:** WSP-1.1 (onboarding-state persistence should be built/tested against the hardened save system, not the current one)
**Blocked by:** nothing

### Context

A player's garden and progress must never be destroyed by an update. This requires schema versioning discipline, real migration tests against old-save fixtures, and safe failure behavior — not code that's merely assumed to read old saves correctly.

### Acceptance criteria

- [ ] Save schema has an explicit version field
- [ ] Every schema change is paired with a deterministic migration function and a version bump
- [ ] A fixture library exists covering: fresh save, previous-schema-version save, advanced player, level-100 player, large garden, unlocked themes, many achievements, a save with missing optional fields, and a malformed-but-recoverable save
- [ ] Automated tests run every fixture through migration and assert the resulting state is correct and complete
- [ ] Round-trip save/load tests exist (save → load → save again → compare) for at least the current schema version
- [ ] On persistence failure at runtime: raw data is preserved (not discarded), a real user-facing error is shown, and any reset only happens on explicit user action — never silently
- [ ] A save whose schema version is *newer* than the running application's is never interpreted as an older schema or overwritten — the app fails safely and leaves the save intact (covers a player running an older build, portable/PWA/native mismatch, or a rollback against a newer save)
- [ ] No existing player-facing save/load behavior regresses

### Implementation prompt

```
You are hardening Word Sprout's save/persistence system so no schema change
can ever silently destroy a player's progress. This applies to whatever
local persistence mechanism the game currently uses (check both the Tauri
native path and the web/localStorage fallback path — both need to be
covered, not just one).

Part 1 — Versioning: add or confirm an explicit version field on the saved
state. Every future schema change must bump this and ship a migration.

Part 2 — Migration fixtures: build a fixture library (e.g. under
src/test/fixtures/saves/) containing: a fresh/new-player save, a save from
an older schema version, an advanced-player save, a level-100-player save, a
save with a large garden/many owned plants, a save with unlocked themes, a
save with many achievements unlocked, a save with missing optional fields,
and a deliberately malformed-but-partially-recoverable save.

Part 3 — Migration tests: write automated tests that load each fixture
through the current migration path and assert the resulting in-memory state
is correct, with nothing silently dropped.

Part 4 — Round-trip tests: save → load → save again → diff, to catch
lossy serialization independent of migration correctness.

Part 5 — Failure handling: when persistence fails at runtime (corrupt data,
unreadable file, etc.), preserve the raw data rather than discarding it,
surface a real error to the user, and only ever offer a reset as an explicit
user action — never trigger one automatically.

Part 6 — Forward-version safety: handle the case where a save's schema
version is *newer* than what the running build knows about (e.g. someone
launches an older portable/PWA/native build against a save written by a
newer one). Never attempt to downgrade-migrate or silently overwrite a
newer save — fail safely, leave the save file untouched, and surface a
clear message rather than guessing at a lossy interpretation.

Do not change what data gets persisted (no new fields, no new save-worthy
state) — this issue is about making the existing save surface reliable, not
expanding it. If you find fields that appear unversioned or unmigrated
today, that's exactly the kind of thing this issue should surface and fix.
```

---

## WSP-1.1 — Onboarding through level 5

**Tier:** 1 (first hour) · **Labels:** `feature`, `P1`, `tier-1`, `onboarding` · **Owner:** Design (agent), Engineering (support — existing onboarding-state system)
**Blocks:** WSP-1.4
**Blocked by:** WSP-0.3 (should build/test against the hardened persistence layer, particularly for returning-player detection)

### Context

Teach the game through play, not explanation, across the first five levels. Build on the existing onboarding-state infrastructure — it stays, it isn't replaced.

### Acceptance criteria

- [ ] Level 1 teaches only: drag/select interaction, valid directions, the target list, and level completion — no Garden, achievements, themes, or power-up exposure yet
- [ ] Immediately after first level completion, Seeds are introduced in one sentence or equivalent minimal copy
- [ ] Level 2 introduces Bonus Sprouts, ideally triggered contextually the first time the player actually finds one rather than as an unprompted interruption
- [ ] Level 3 unlocks the Conservatory, grants/directs the player to a starter plant, and teaches watering
- [ ] Level 5 unlocks the full Seed Store and the trophy case — unlocking/exposing the trophy case is required at level 5, but teaching the achievement system is not; a brief unlock acknowledgement is permitted, no achievement-explainer flow should be added
- [ ] Unlock gating is real, not just coachmark sequencing: the Garden/Conservatory is actually unavailable before level 3, and the full Seed Store/trophy case are actually unavailable before level 5, whichever gating model (route guard, feature flag, disabled nav item, etc.) fits the current app's architecture
- [ ] Levels 1–10's generation configuration (not the generator itself) is hand-tuned to be deliberately gentle
- [ ] All onboarding messaging uses anchored coachmarks, not modals; no coachmark exceeds roughly two short sentences
- [ ] Returning players with an existing save are never routed through new-player onboarding again
- [ ] Onboarding remains manually replayable from Help for any player who wants to revisit it
- [ ] A first-time tester with zero help text reaches level 5 and can correctly describe, in their own words, what target words, bonus words, Seeds, and the Garden are (validated via WSP-1.4, but the flow should be built to make this achievable)

### Implementation prompt

```
You are implementing Word Sprout's first-five-levels onboarding sequence.
Build on the existing onboarding-state system — do not replace or
re-architect it; extend it.

Sequence to implement:
- Level 1: only teach drag/select, valid directions, the target word list,
  and completion. No mention or exposure of Garden, achievements, themes,
  or power-ups at this stage.
- Immediately after first completion: introduce the Seeds concept in one
  short sentence.
- Level 2: introduce Bonus Sprouts. Prefer triggering the explanation
  contextually — the first time the player actually finds a bonus word —
  over an unprompted upfront explanation.
- Level 3: unlock the Conservatory, grant or direct the player to their
  starter plant, and teach the watering interaction.
- Level 5: unlock the full Seed Store and the trophy/achievement case.

Unlocking and teaching are different things: the trophy case must actually
become available at level 5 (this should be real gating — Garden/Store/
trophy case genuinely unavailable before their unlock level, not just
absent from the coachmark script — implemented however the app currently
handles route/feature gating), but do not build an achievement-system
tutorial or explainer flow. A brief, minimal unlock acknowledgement (e.g.
"Trophy Case unlocked") is fine; a guided tour of the achievement system is
not — that stays out per the minimalist onboarding philosophy this issue is
built on.

Also hand-tune the *generation configuration* (difficulty parameters fed to
the certified generator from WSP-0.2 — not the generator's internals) for
levels 1–10 specifically, so the early difficulty curve is deliberately
gentle rather than whatever the default region tuning would produce.

Presentation constraints: use anchored coachmarks, never modal dialogs, and
keep each coachmark to roughly two short sentences maximum.

Returning-player handling: a player with an existing save must never be
routed through this sequence again. Detect return status against the
hardened save/persistence system (see WSP-0.3) rather than any ad hoc
localStorage flag. The full onboarding sequence should remain manually
replayable through Help for anyone who wants to revisit it.

This is scoped to levels 1–5 (with the difficulty tuning extending informally
to level 10). Do not add onboarding content for systems beyond what's listed
above (no power-up tutorial, no achievement tutorial) — those are explicitly
out of scope for this issue per the release plan.
```

---

## WSP-1.2 — Bonus words as the signature mechanic

**Tier:** 1 (first hour) · **Labels:** `feature`, `P1`, `tier-1`, `gameplay-feel` · **Owner:** Design + Engineering
**Blocks:** WSP-1.4
**Blocked by:** none hard; soft-depends on WSP-1.3 for final Seed reward values (build against placeholder numbers, swap in final values once 1.3 lands)

### Context

Bonus-word discovery is the game's best idea and currently lacks presentation to match. This issue gives it a typed result model, real feedback, and correctness guarantees against double-rewarding.

### Acceptance criteria

- [ ] Word selections resolve to a typed result: `target-found`, `bonus-found`, `duplicate`, or `invalid`, and all downstream feedback (visual/audio/haptic) is driven off this type
- [ ] Seed reward, local stats update, toast, audio event, and haptic event for a bonus-found result all originate from the same resolution point/function call — presentation code (toast, audio, haptics) cannot independently trigger a Seed award
- [ ] Bonus discovery triggers a non-blocking toast reading approximately "Bonus Sprout! [WORD] +N Seeds"
- [ ] Bonus feedback includes a localized leaf/glow burst, Seed particles animating toward the Seed balance, a distinct audio cue, and an optional light haptic double-pulse
- [ ] Bonus feedback duration is roughly 1.2–1.8 seconds and never blocks continued puzzle interaction
- [ ] Bonus feedback is never presented as a modal
- [ ] Level-completion summary separately lists: target words found, bonus words found (with the actual words listed), base reward, bonus reward, and total
- [ ] Reverse-direction discovery of a word does not pay twice
- [ ] Capitalization does not affect word matching/reward
- [ ] A target word never also counts or pays as a bonus word
- [ ] A given word cannot be rewarded more than once within the same puzzle attempt
- [ ] Lifetime bonus stats (best single-level bonus count, longest bonus word found) are tracked locally, entirely on-device, with no telemetry leaving the device

### Implementation prompt

```
You are implementing the bonus-word discovery feedback system for Word
Sprout. This is explicitly called out in the release plan as the game's
best differentiator, currently under-presented — the goal is for finding an
unrequested word to feel more surprising and rewarding than finding a
listed one.

Part 1 — Typed result model: introduce a typed result for every word
selection (target-found / bonus-found / duplicate / invalid) and route all
downstream presentation logic (visuals, audio, haptics, score updates)
through this type rather than ad hoc conditionals scattered through the
selection handler. Specifically: the Seed reward, the local stats update,
the toast, the audio cue, and the haptic pulse for a bonus-found result
must all originate from one resolution point. Presentation-layer code
(the toast component, the audio trigger, the haptic call) must never be
able to independently award Seeds — this is the guard against a future
double-payout bug if any one of those pieces gets re-triggered or retried
on its own.

Part 2 — Bonus feedback: on bonus-found, show a non-blocking toast ("Bonus
Sprout! [WORD] +N Seeds") with a localized leaf/glow burst, Seed particles
animating toward the Seed balance UI, a distinct audio cue (coordinate with
whatever audio asset pipeline/placeholder exists — see the frozen plan's
Tier 3.3 audio spec for the eventual final asset), and an optional light
haptic double-pulse where the platform supports it. Target duration
1.2–1.8s. This must never block continued play and must never be a modal —
non-blocking toast only.

Part 3 — Completion summary: extend the level-complete summary screen to
separately show target words found, the actual list of bonus words found,
base Seed reward, bonus Seed reward, and total. Use placeholder/current
reward numbers if WSP-1.3's finalized economy values aren't ready yet — this
issue should not block on that, but flag in the PR that reward numbers will
need a follow-up pass once WSP-1.3 lands.

Part 4 — Correctness: ensure reverse-direction discovery of the same word
doesn't double-pay, matching is case-insensitive, a target word can never
also resolve as a bonus word, and no word can be rewarded more than once per
puzzle attempt regardless of how it's re-selected.

Part 5 — Local stats: track lifetime bonus-word stats (best single-level
count, longest word found) in local persistence only — no network calls, no
telemetry.

Do not add a bonus-word tutorial/explainer screen here — that's owned by
WSP-1.1's onboarding sequence, which should trigger contextually off this
system's events.
```

---

## WSP-1.3 — Economy lock

**Tier:** 1 (first hour) · **Labels:** `feature`, `P1`, `tier-1`, `economy`, `balance` · **Owner:** Design (agent), with an Engineering-built simulation tool
**Blocks:** WSP-1.4; final reward values feed back into WSP-1.2
**Blocked by:** none

### Context

Playing word searches must create wealth faster than any passive loop can. This issue consolidates every Seed number into one place and adds simulation tooling to justify the final values, rather than tuning by feel.

### Acceptance criteria

- [ ] Every Seed-related number (puzzle rewards, bonus rewards, plant prices, fertilizer cost, power-up prices, theme prices) lives in one consolidated location, not scattered through components
- [ ] A simulation script exists modeling at minimum: casual (3 puzzles/day), regular (10/day), enthusiast (30/day), optimizer (bonus-word-focused), and hint-heavy/convenience-heavy (frequent power-up spend) player profiles
- [ ] Simulation runs across 7-day, 30-day, and 100-level horizons and reports Seeds earned/spent and time-to-rarity per plant tier
- [ ] Target progression is set from simulation output, not intuition: common plants reachable in roughly 15–30 minutes of play; legendary plants a genuine long-term goal
- [ ] Watering grants growth only, not recurring Seed income
- [ ] Bloom rewards pay exactly once per plant
- [ ] Any reward, rebate, or recoverable Seed value a purchased plant can produce over its intended lifecycle stays below its purchase cost, unless explicitly accounted for as part of the designed progression economy — and no resale mechanic is introduced if one doesn't already exist in the game
- [ ] The starter plant is the sole documented free exception to normal economy rules
- [ ] No economically rational strategy earns more Seeds by avoiding the core word-search loop than by playing it

### Implementation prompt

```
You are consolidating and tuning Word Sprout's Seed economy. The governing
rule from the release plan: playing word searches creates wealth; Garden
ownership and convenience spending consumes it. If any passive loop
generates Seeds faster than solving puzzles does, that's a defect to fix
here, not a design choice to preserve.

Part 1 — Consolidation: move every Seed-related number (puzzle completion
rewards, bonus-word rewards, plant prices, fertilizer cost, power-up prices,
theme prices) into a single source of truth (e.g. src/economy.ts or
equivalent) rather than leaving them inline in components.

Part 2 — Simulation tool: build a script that models distinct player
profiles — casual (3 puzzles/day), regular (10/day), enthusiast (30/day),
an optimizer profile that leans on bonus-word discovery, and a
hint-heavy/convenience-heavy profile that spends regularly on power-ups
(reveal/hint/reshuffle-type tools) — run each across 7 days, 30 days, and a
100-level horizon, and report Seeds earned, Seeds spent, and
time-to-affordability for each plant rarity tier. The hint-heavy profile
matters specifically because it's the player most likely to perceive the
economy as stingy if power-up spend isn't accounted for against reward
pacing.

Part 3 — Tune against simulation output: adjust the consolidated economy
values so common plants are reachable in roughly 15–30 minutes of active
play and legendary plants represent a genuine multi-session goal, using the
simulation's numbers as the justification, not gut feel. Document the
target-progression table you're tuning against in the PR.

Part 4 — Garden-specific rules: confirm/enforce that watering only grants
growth (never a recurring Seed payout), bloom rewards pay exactly once per
plant, and any reward, rebate, or recoverable Seed value a purchased plant
can generate over its lifecycle stays below its purchase cost unless
explicitly designed otherwise. Do not introduce a resale mechanic to
satisfy this — if the game doesn't already have one, this is a constraint
on existing rebate/reward paths, not a prompt to add a new system. The
starter plant is allowed to be free — document it explicitly as the one
intentional exception rather than leaving it ambiguous.

Part 5 — Exploit check: using the simulation tool, confirm there's no
sequence of actions (e.g. buy-and-rebate loops, watering cadence tricks)
that out-earns straightforward puzzle-solving over any of the three time
horizons.

This issue owns the numbers, not the bonus-word presentation layer (that's
WSP-1.2) — coordinate on final reward values but don't duplicate that
issue's UI work here.
```

---

## WSP-1.4 — Early playtest checkpoint

**Tier:** 1 (first hour) · **Labels:** `process`, `P1`, `tier-1`, `playtest` · **Owner:** Design (agent), human facilitator required
**Blocks:** effectively gates sign-off on Tier 1 as a whole
**Blocked by:** WSP-1.1, WSP-1.2, WSP-1.3 (all three must be in a testable, demoable state)

### Context

Per the frozen plan, this checkpoint must happen as soon as onboarding, bonus-word presentation, and the economy are testable together — not deferred to end-of-project playtesting. It's cheaper to fix a confusing first hour now than to discover it during release-candidate testing.

### Acceptance criteria

- [ ] A fresh-save, first-time-player session is run with no instructions given, human-facilitated
- [ ] Observed and recorded: whether the player selects a word unprompted, whether they notice Seeds appearing without being told, whether they discover the Garden on their own, and where they hesitate or backtrack
- [ ] The facilitator's notes separate raw observations from interpretations — e.g. "tester tapped Garden three times before noticing it was locked" (observation) kept distinct from "unlock treatment may look interactive before level 3" (interpretation) — rather than recording only conclusions
- [ ] Findings are written up (even informally) and linked against WSP-1.1/1.2/1.3 as follow-up issues if problems surface
- [ ] This checkpoint happens before onboarding copy or bonus-word presentation timing is treated as final — not after

### Implementation prompt

```
This is a process/testing issue, not a code issue — it doesn't get "closed"
by a PR, it gets closed by a completed session with written findings.

Once WSP-1.1 (onboarding), WSP-1.2 (bonus-word feedback), and WSP-1.3
(economy numbers, even placeholder-final) are all in a state where a fresh
save can be played through level 5, schedule and run a first-time-player
session:

- Use a completely fresh save.
- Give the tester zero instructions or hints going in.
- Observe and record, without intervening unless the tester is fully
  blocked: Do they discover word selection unprompted? Do they notice Seeds
  appearing? Do they understand what a Bonus Sprout is when they find one?
  Do they find the Garden/Conservatory on their own or need to stumble into
  it? Where specifically do they hesitate, backtrack, or express confusion?

Keep observations and interpretations separate as you take notes — record
what literally happened first, then note what you think it means, as two
distinct things. For example: "Observation: tester tapped Garden three
times before noticing it was locked" is not the same note as
"Interpretation: unlock treatment may look interactive before level 3."
Recording only the interpretation ("tester found Garden confusing") throws
away the evidence behind that conclusion, and is much less useful to
whoever picks up the follow-up issue.

Write up findings as a short report (bullet form is fine) and file follow-up
issues against WSP-1.1/1.2/1.3 for anything that didn't land as intended.
This checkpoint exists specifically to catch first-hour problems before
onboarding copy and bonus-word timing get treated as finished — don't let it
slip to the end of the project.

Do not expand this into a full playtest program here — the later, broader
sessions (30-minute, 2-hour, returning-player, accessibility) are separate,
already scoped under Tier 6 of the release plan.
```
