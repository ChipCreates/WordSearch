# Word Sprout — 1.0 Release Plan

## 0. What 1.0 Means

Word Sprout already has enough mechanical breadth. It doesn't need new systems — it needs the systems it has to feel finished, correct, and coherent. That's the whole job of this release.

The test for every task on this list: does it make an existing thing *right*, or does it add something new? If it's the second one, it doesn't belong in 1.0.

When someone opens Word Sprout for the first time, they should understand how to play within a minute, feel good the first time they find a word, feel *surprised* the first time they find one they weren't looking for, and by level 100 feel like they finished a journey — not that a counter went up. That's the bar. Everything below exists to hit it.

## 1. What We're Not Building

No accounts, no cloud saves, no multiplayer, no leaderboards, no social feed, no ads, no subscriptions, no battle pass, no real-money purchases, no server dependency, no push notifications, no AI-generated content at runtime. The game runs fully offline and stays that way. This isn't a placeholder list — if any of these come up mid-development as a "quick addition," the answer is no, it goes on the post-1.0 backlog.

Visually, we're not building a productivity app, a Material Design demo, a sci-fi dashboard, or anything that reads like a casino. The reference point is a cozy, handcrafted botanical world — bioluminescent, tactile, a little magical, calm rather than frantic.

## 2. How This Plan Is Organized

Everything below is grouped into tiers, not phases. Tiers are priority order — Tier 0 has to be true before anything else matters, and each following tier builds on the one before it. Work within a tier can happen in parallel; work across tiers generally can't (there's no point finalizing reward timing before the economy numbers are locked, for instance).

Each section names the agent role responsible for it. Where a role needs a concrete spec to execute against (file formats, dimensions, naming conventions, technical constraints), that spec is included directly — the goal is that an agent can pick up a section and start producing without a clarifying round-trip.

---

## TIER 0 — Correctness

Nothing in later tiers matters if these aren't true. A beautiful garden built on top of unsolvable puzzles or a save file that eats someone's progress is worse than no garden at all.

### 0.1 Fix responsive level-trail path positioning (release blocker)

**Owner:** Engineering agent — gameplay/rendering

This is the level-trail/map editor in `LevelsView` — trail stones, Bézier handles, path points, and biome transition anchors, authored separately for portrait and landscape — not the word-search puzzle geometry, which `puzzleGenerator.ts` handles independently. Misalignment here doesn't make a puzzle unsolvable; it breaks one of the game's primary progression surfaces, with stones, paths, and environmental art drifting out of position or disconnecting from each other across viewport sizes and orientations.

**Fix requirement:** one canonical coordinate model for all trail artwork, stones, path points, Bézier handles, and transition anchors. Normalize coordinates within each tile/region rather than storing viewport-dependent pixel values. Portrait and landscape can keep deliberately different authored compositions, but each orientation has to scale predictably across device sizes on its own terms.

**Done means:** build a developer comparison surface that renders the same trail segment simultaneously at representative phone, tablet, and desktop sizes, add automated tests for the coordinate transforms themselves, and manually verify all six regions once the fix lands — not just trust the transform math.

### 0.2 Puzzle generator certification

**Owner:** Engineering agent — systems

Make it extremely hard for Word Sprout to ever generate a bad puzzle. Keep the generator pure and isolated from UI/hooks — that architecture is already right, don't touch it for its own sake. Add seeded generation if it doesn't already support it, so any bad board can be reproduced from a seed.

**Every generated puzzle must guarantee:**
- Every requested target word exists on the board along a legal line
- No target goes out of bounds or contains illegal characters
- Board size matches the requested difficulty
- No duplicate target words
- Placement completes within a bounded number of retries (no silent infinite loops)

**Quality scoring, not just validity:** a technically legal board can still be a bad one — all words crammed into one corner, no diagonals, obvious straight-line placement everywhere. Score generated boards on overlap ratio, direction distribution, reverse ratio, and bonus-word density, and reject boards that pass validity but fail quality.

**Audit tooling:** build a script that generates at least 50,000 boards across every difficulty, region, and grid size, and reports generation failures, retry counts, direction/diagonal distribution, and duplicate incidents. Run this before every release candidate, not just once.

**Content safety pass:** scan generated boards and the bonus-word dictionary for accidental inappropriate strings. This isn't about aggressively censoring legitimate words — it's a deny/review list for the genuinely obvious cases, kept in one place rather than scattered through the generator.

### 0.3 Persistence and migration hardening

**Owner:** Engineering agent — systems

A player's garden and progress must never be destroyed by an update. Every save-schema change needs a version bump, a deterministic migration, and a test against a real old-save fixture — not a hope that the new code happens to read old data correctly.

Build a fixture library covering a fresh save, an old-format save, an advanced player, a level-100 player, a large garden, unlocked themes, many achievements, a save with missing optional fields, and a malformed-but-recoverable save. If persistence fails at runtime, preserve the raw data, surface a real error, and only ever reset on explicit user action — never silently.

---

## TIER 1 — The First Hour

This is what determines whether a new player becomes a returning player. Nothing here is complicated in isolation, but it's the tier most likely to get skipped in favor of "more content," which is exactly backwards.

### 1.1 Onboarding through level 5

**Owner:** Design agent, with Engineering support for the existing onboarding-state system (keep it, don't rebuild it)

Teach the game through play, not through explanation. Sequence:

- **Level 1:** only drag/select, valid directions, the target list, and completion. Nothing about Garden, achievements, themes, or power-ups yet.
- **After first completion:** introduce Seeds, in one sentence.
- **Level 2:** introduce Bonus Sprouts — ideally the explanation triggers naturally the first time the player finds one.
- **Level 3:** unlock the Conservatory, hand the player their starter plant, teach watering.
- **Level 5:** unlock the full Seed Store and the trophy case.

Hand-tune the difficulty of levels 1–10 specifically — even though boards are procedural, the *configuration* feeding the generator for these levels should be deliberately gentle. Coachmarks over modals, two sentences max per coachmark. Returning players with existing saves must never be routed through new-player onboarding again — replay stays available from Help only.

**Done means:** a first-time tester can reach level 5 with zero help text and correctly describe, in their own words, what target words, bonus words, Seeds, and the Garden are.

### 1.2 Bonus words as the signature mechanic

**Owner:** Design + Engineering agents

This is the game's best idea and it currently doesn't have presentation to match. Give every word selection a typed result (`target-found`, `bonus-found`, `duplicate`, `invalid`) and drive all feedback off that type.

**Bonus discovery feedback:** a non-blocking toast — "Bonus Sprout! [WORD] +N Seeds" — with a localized leaf/glow burst, Seed particles animating toward the balance, a distinct audio cue, and an optional light haptic double-pulse. Roughly 1.2–1.8 seconds, never interrupts continued play, never a modal.

**Completion summary** should separately show target words found, bonus words found (list them), base reward, bonus reward, and total.

**Correctness rules:** reverse discovery doesn't pay twice, capitalization doesn't matter, target words never also count as bonus words, and a word can't be discovered for reward twice in the same puzzle. Track lifetime bonus stats locally (best single-level count, longest word found) — enough for achievements without any telemetry leaving the device.

### 1.3 Economy lock

**Owner:** Design agent, with a simulation script from Engineering

The rule: playing word searches creates wealth; Garden ownership and convenience spend it. If any passive loop generates Seeds faster than actually solving puzzles, that's a bug, not a feature.

Consolidate every Seed number — puzzle rewards, bonus rewards, plant prices, fertilizer, power-ups, themes — into one place rather than scattered through components. Then build a small simulation tool that runs a casual (3 puzzles/day), regular (10/day), enthusiast (30/day), and optimizer (bonus-word-focused) player profile across 7, 30, and 100 levels, and reports Seeds earned/spent and time-to-rarity for each plant tier. Tune target progression off that output, not off intuition — common plants reachable in 15–30 minutes of play, legendary ones a genuine long-term goal.

Garden-specific rules: watering grants growth, not recurring income; bloom rewards pay once; a purchased plant's resale/rebate value stays below its purchase price; the starter plant is the one deliberate free exception.

### 1.4 Early playtest checkpoint

**Owner:** Design agent, human facilitator

Don't wait until the end of the project to find out if onboarding actually works. As soon as 1.1–1.3 are in a testable state, run a first-time-player session: fresh save, no instructions, just watch. Can they select a word unprompted? Do they notice Seeds appearing? Do they find the Garden on their own? Where do they hesitate or backtrack?

Run this *before* finalizing bonus-word presentation timing or onboarding copy — it's much cheaper to fix a confusing first hour now than to discover it during release-candidate testing when everything downstream assumes it works.

---

## TIER 2 — The Journey (Levels 1–100)

### 2.1 Region identities and campaign structure

**Owner:** Design agent

Six regions already exist as a trail structure — Glowing Grove (1–20), Sunlit Falls (21–30), Crystal Conservatory (31–40), Mosswood Hollows (41–50), Cloudreach Summit (51–70), Verdant Beyond (71–100). Keep these boundaries once balance work starts against them.

Move region definitions out of the view layer into a dedicated data file (name, tagline, level range, visual/ambient theme, category bias, a difficulty profile, entry/completion rewards) so the level-select view consumes data rather than owning design decisions.

Each region gets a *tuning* identity, not new rules: Glowing Grove is comfort (short words, few diagonals, generous boards); Sunlit Falls builds confidence (more diagonals, slightly bigger boards); Crystal Conservatory raises sophistication (longer words, rarer vocabulary); Mosswood Hollows rewards discovery (more reverses, less obvious placement, richer bonus potential); Cloudreach Summit is mastery (density, long words, overlap pressure); Verdant Beyond uses the full mechanical vocabulary while staying fair.

Region transitions get a short (3–6 second, skippable) title card and scenery change — reduced-motion users get an instant static transition instead. Milestone presentation at levels 10, 20, 30, 40, 50, 70, and 100, with level 100 getting real weight ("The Verdant Beyond Blooms") — but make clear play continues past it. After 100, keep generating puzzles and progressing rank/achievements/Garden indefinitely without requiring more handcrafted campaign content.

### 2.2 Progression, achievements, and rewards

**Owner:** Design agent

Keep each system's job distinct: levels are *where you've been*, Botanist Rank is *long-term mastery*, achievements are *interesting things you did*, the Garden is *what you've collected*, Field Notes are *short-term optional goals*. If two systems reward the same action under different names, cut one.

Audit every existing achievement's description against what its code actually checks — no drift, no duplicate predicates, no "daily" language without real calendar logic.

Resist an achievement for every region — six region achievements plus level milestones starts making ordinary campaign progress feel like an achievement vending machine, which undercuts the very principle this section opened with. Use region-completion *rewards* at every region boundary instead, and reserve actual achievements for the moments that are genuinely distinctive: first region complete, the level-50 halfway point, the full level-100 journey, and one or two region-specific feats worth calling out on their own merits. Define a reward-intensity hierarchy (routine → small → medium → major → exceptional) and make sure presentation scales with it — a Common plant shouldn't get the same fanfare as a Legendary one.

### 2.3 Garden emotional payoff

**Owner:** Design + Art agents

The Garden needs to look and feel like evidence of time spent, not a settings screen with plants in it. Each plant should visibly change across growth stages (sprout → young growth → mature → bloom) rather than just showing a percentage. Watering should be a full sub-1.5-second beat: tap, animation, soil/droplet response, plant reacts, quiet feedback.

Bloom is the biggest reward moment in the Garden loop — brighten, animate, reveal, soft particles, reward, collection update — and it should scale with rarity; don't spend Legendary-tier presentation on a Common bloom. As the collection grows, the Conservatory itself should visibly look fuller — a shelf, a greenhouse tableau, whatever's cheapest to build that reads as accumulation. This doesn't need to be a decorating system for 1.0.

---

## TIER 3 — World Presentation

### 3.1 Art direction production pass

**Owner:** Art agent

Reference doc: whatever the current art-direction brief is (consolidate one if it doesn't exist yet as a single source of truth). Audit every screen — Play, Levels, Garden, Trophies, Settings, Store, Help, success screen, onboarding, toasts, empty states, locked states — against material, radius, border treatment, glow, type, icon style, and spacing. MUI is fine as implementation plumbing; its *default* look (stock dialogs, chips, switches, snackbars) should not be visible anywhere in the shipped game.

Reserve gold exclusively for trophies, rare rewards, and legendary states — not as the everyday selected-nav-item color.

**Region art delivery spec:**
- Master working files at high resolution, per region
- Runtime portrait and landscape as separate compositions (not a single crop stretched two ways), WebP/AVIF where the pipeline supports it
- Seams between adjacent level-trail tiles need to be genuinely seamless, not just close
- Level-trail path and stones must stay legible against the artwork — no important UI sitting on top of a busy background detail
- Deliver plant art as a small dedicated thumbnail size *and* a separate medium "detail view" asset — never scale a multi-megabyte master down to a 100px thumbnail at runtime

### 3.2 Environmental motion

**Owner:** Art + Engineering agents

The principle: motion should reward attention, not demand it. Candidate ambient effects — drifting fireflies, pollen motes, an occasional falling leaf, subtle foliage sway, water shimmer, slow glow breathing — should run through one shared ambient-layer component, configured per theme/region, rather than bespoke effects built per screen.

Hard requirements: pause when the tab/app is backgrounded, fully respect `prefers-reduced-motion` (which should also kill sweeping map movement, repeated glow pulses, and the level-complete constellation animation), cap particle counts, and get actually tested for battery/thermal impact on Android hardware — not just assumed fine because it looks fine on desktop.

### 3.3 Audio and haptics

**Owner:** Audio agent

Sonic identity target: leaves, glass, wood, soft water, restrained magical shimmer. Explicitly avoid arcade beeps, casino stingers, harsh digital SFX, or oversized fanfares — the game's calm tone has to hold in its ears the same way it holds in its eyes.

**Deliverable manifest** — every event below needs a discrete audio asset:

| Family | Events |
|---|---|
| Interaction | tap, navigation, store purchase, invalid/error |
| Puzzle | selection start, target word found, bonus word found, duplicate, hint used, shuffle |
| Progress | level complete, achievement unlocked, rank up, region complete |
| Garden | watering, fertilizing, growth stage change, bloom, remedy applied |

**Signature motif:** compose one short, recognizable melodic phrase that becomes the game's sonic signature, then produce it in at least three variants sharing the same underlying motif — standard level-complete, major bloom (richer/fuller), and region-complete (biggest). They need to be audibly the same family at different intensities, not three unrelated stings.

**Technical delivery spec** (so any generated or composed asset drops in without rework):
- Format: OGG Vorbis for runtime, source stems retained separately
- Sample rate: 44.1kHz, 16-bit minimum
- Loudness: normalize SFX to a consistent target (e.g. -16 LUFS) so nothing spikes above another; music beds slightly lower to sit under SFX
- SFX duration: interaction sounds under 300ms, discovery/reward sounds under 1.8s to match the visual feedback window from section 1.2
- Loop points: any ambient/music bed needs clean, sample-accurate loop points (no audible seam) — deliver loop-start/loop-end markers alongside the file
- Naming convention: `sfx_[family]_[event].ogg` (e.g. `sfx_puzzle_bonus-found.ogg`), `music_[context]_[variant].ogg`

**Haptics** (where the platform allows): very light pulse on target find, a light double-pulse on bonus, medium on achievement/bloom, an optional short soft pulse on invalid. Never make haptic feedback the only feedback channel for anything — always paired with audio/visual, and always overridable by platform/user preference.

---

## TIER 4 — Quality Certification

### 4.1 Accessibility

**Owner:** Engineering agent

Build on the existing keyboard implementation rather than replacing it. A player needs to be able to fully complete a level using only a keyboard: focus the board, navigate cells, start/extend/submit/cancel a selection, use power-ups, and move through every screen and dialog.

Expose board dimensions, letters, target-word state (found/unfound), and selection/success/failure feedback to screen readers. Every dialog needs to trap focus correctly and return it to whatever triggered it on close. Visual bar: WCAG AA contrast, no state communicated by color alone, visible focus rings, 44×44px minimum touch targets, and the UI staying usable (not clipped) under OS-level text scaling.

### 4.2 Responsive and device QA

**Owner:** QA agent

Test matrix: phone portrait (390×844) and landscape (844×390), tablet portrait/landscape (768×1024 / 1024×768), small desktop (1280×720), standard desktop (1440×900), and at least one high-DPI desktop viewport — across every primary screen (Play, Levels, Garden, Trophies, Store, Settings, Help, onboarding, success, achievement toast).

Desktop at 1280×720 needs the full board and controls visible with no page scroll during normal play. Mobile portrait needs the board to get layout priority, with nav never covering content and safe-area insets respected. Mobile *landscape* needs an actual designed layout (board alongside the target/tools panel), not a squeezed-down portrait composition — this is worth calling out because it's the mode most likely to get ignored. Foldables get a smoke test, not bespoke architecture.

### 4.3 Asset and performance budgets

**Owner:** Engineering agent

Hard limits: initial minified JS under 500KB, core PWA precache under 20MB, plant thumbnails under 250KB, routine backgrounds under 1MB unless explicitly approved otherwise. Build an asset-inventory script that reports every asset's format, dimensions, byte size, and precache status, sorted largest-first, so bloat is visible rather than discovered by accident.

Precache only what's needed to start playing offline immediately (app shell, bundled fonts, initial UI icons, first-region art, essential SFX); everything else — later regions, uncommon plants, alternate themes, music — loads at runtime and caches after first use. Lazy-load secondary screens (Levels, Garden, Achievements, Settings, Store); never lazy-load the core puzzle screen itself. Wire a budget check into CI that fails the build on a hard-limit violation, with any exception requiring a written reason.

### 4.4 Content audit

**Owner:** Design agent

Treat the word lists as real content, not config. Automated pass across every category for duplicates, whitespace/punctuation issues, case inconsistencies, and word-length bounds; manual pass for inappropriate difficulty placement (no obscure words leaking into Easy) and category pools too small to generate healthy board variety. Same treatment for the bonus-word dictionary specifically — false positives, questionable abbreviations, and an explicit, deliberate policy on proper nouns and edge-case words, rather than leaving it to whatever the source wordlist happened to include.

---

## TIER 5 — Distribution and Store Submission

This tier didn't exist as its own thing before, and it should — it's pure logistics with a hard deadline shape (Google Play's review and testing-track requirements take real calendar time, independent of how finished the game is).

### 5.1 Build pipeline

**Owner:** Engineering/Release agent

The current release workflow builds a signed Android APK but doesn't produce or publish the AAB that Play Store actually requires for submission. Fix: build with `--aab` (or leave both flags off, since Tauri produces both by default) and upload the AAB artifact from `app/build/outputs/bundle/universalRelease/`, not just the APK path.

The existing release keystore can be reused directly as the Play App Signing "upload key" — no new signing infrastructure needed, just make sure the `identifier` field in `tauri.conf.json` (which becomes the Android `applicationId`) is finalized before the first upload, since it can never change afterward.

### 5.2 Play Console requirements

**Owner:** Release agent, with Design for copy/assets

- Developer account setup (one-time fee, identity verification) if not already done
- If the account is newly created (post–November 13, 2023), budget calendar time for the mandatory closed-testing track: at least 12 testers opted in continuously for 14 days before production access can even be applied for. Recruit 15–20, not exactly 12 — a single dropout resets a tester's contribution to the continuous-day count and can reset the whole clock.
- Store listing: title, short/long description, app icon (512×512), feature graphic (1024×500), phone screenshots sized to Play's current spec
- Privacy policy URL — required even for a fully offline, no-data-collection game; a single static page is enough
- Data safety form and content rating questionnaire — both should be quick given the game collects nothing, but both are mandatory and block submission if skipped
- Target API level: Android 16 / API 36 or higher is required for all new app submissions as of August 31, 2026 — this is already in effect, not a future deadline. Target it now, and re-check Play's policy page immediately before submission in case the requirement has moved again by then.

### 5.3 Desktop and web packaging QA

**Owner:** QA agent

Web/PWA: fresh install, offline restart, service-worker update from a prior version, stale-cache recovery, add-to-home-screen, orientation change. Windows: install, launch, save, upgrade, uninstall/reinstall, display scaling. Linux: startup, permissions, audio, GPU rendering across at least one representative distro. macOS: launch, unsigned-app messaging (still applicable without a code-signing cert), persistence, audio, display scale — smoke-tested rather than exhaustively verified given no signing certificate exists yet.

---

## TIER 6 — Release Process

### Release branch model

Cut a `release/1.0` branch once Tier 0–2 work is substantially underway. `master` stays integration-ready; only bug fixes, content polish, tests, and approved balance changes land on the release branch — new feature proposals go straight to the post-1.0 backlog, no exceptions during this window. Any save-schema change on the release branch needs a migration and a test, no exceptions there either.

Use two checkpoints, not more: **Feature Complete** (every required system and content piece exists, nothing new gets added after this) and **Release Candidate** (only release-blocker or explicitly-approved high-severity fixes land).

**Content Freeze** sits between them, once Tier 3 (presentation) is done and Tier 4 (certification) begins: category lists, the plant roster, region boundaries, reward tables, achievement predicates, final UI copy, and asset manifests all stop moving at this point. A change after the freeze needs a documented P0/P1 defect or a balance justification behind it — not a passing "let's just tweak this word list" edit that quietly invalidates the generator audit, the economy simulation, screenshots already taken, or store copy already written.

### Bug bar

- **P0 (blocks release, zero tolerance):** save corruption, unsolvable/impossible puzzle, crash, broken purchase/reward transaction, offline launch failure, broken platform build, accessibility blocker in core play
- **P1 (blocks release by default):** major layout break, onboarding dead end, incorrect economy transaction, wrong achievement behavior, missing major asset, broken migration — any exception needs to be explicitly signed off, not just deprioritized silently
- **P2:** visible polish issues with a workaround — can ship if they don't undermine perceived quality
- **P3:** post-release backlog

### Manual playtest program

Beyond the early first-hour check in Tier 1, run structured sessions later in the cycle: a 30-minute session watching for boredom, difficulty spikes, and power-up usage patterns; a 2-hour session watching for reward fatigue, category repetition, and economy imbalance; a returning-session test (close the game, come back later, check save integrity and re-engagement); and dedicated accessibility passes — keyboard-only completion, a reduced-motion session, and a screen-reader session where resources allow.

### Automated quality gates

Every release-candidate build runs the full suite before it's considered: unit/integration tests, the web build, the asset-budget check, the platform build, the puzzle-generator audit, the economy simulation, and the content audit. Wrap these into one `verify:1.0` script so "is this build releasable" is a single command, not a checklist someone has to remember.

### Versioning and changelog

Bump to `1.0.0` in `package.json` and every native manifest only after the release candidate clears the bug bar and quality gates. Changelog entry should read like something a player would want to read — the journey, Bonus Sprouts, the Conservatory, the plant collection, offline play, supported platforms — not a commit log. Tag `v1.0.0` only after final platform artifacts are verified, not before.

---

## Post-1.0 Backlog

Real ideas, deliberately not now: additional regions past level 100, seasonal cosmetics, more plants and categories, deeper Conservatory decorating, optional challenge modes, additional accessibility preferences, further campaign chapters. Any of these gets picked up later only if it strengthens an existing pillar — none of them should spawn a new, unrelated progression system.

---

## Agent Role Roster (quick reference)

| Role | Owns |
|---|---|
| Engineering — systems | Generator certification, persistence/migration, asset budgets, accessibility implementation |
| Engineering — gameplay/rendering | Mobile path fix, environmental motion implementation |
| Design | Onboarding, economy design + simulation, region tuning, progression/achievements, content audit |
| Art | Region art, plant art, UI visual pass, environmental motion direction |
| Audio | All SFX, music, signature motif, haptics mapping |
| QA | Responsive/device matrix, packaging QA across platforms, structured playtests |
| Release/DevOps | Build pipeline, Play Console submission, versioning, release branch discipline |
