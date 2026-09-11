# Word Sprout — Post-1.0 Implementation Plan

## Purpose

This plan carries forward the remaining work in `wordsprout-evolution.txt` after the 1.0 boundary established by Tier 2.5. The goal is to let the puzzle grow with the player while keeping Word Sprout recognizably a word-search game.

The work is deliberately staged. Each wave adds one new assumption about the puzzle surface, proves that it is fair and accessible, and only then makes it available to progression content. No wave is authorized to broaden the app into a new game mode, replace the stable surrounding interface, or use visual novelty as an unmeasured difficulty increase.

## Guiding constraints

- The canonical board/cell/path model, conservative masks, theme seam, multidimensional difficulty metadata, and accessibility gates from Tier 2.5 are prerequisites.
- Straight-line word discovery remains common in every advanced content set. New path types create difficulty peaks; they do not replace the core experience.
- Board shape, cell geometry, topology, word-path complexity, glyph orientation, and Board Theme are independent dimensions. A content profile must state which dimensions it uses.
- Recognizable silhouettes, touch-target size, and letter legibility take priority over mathematically perfect shapes or stylistic detail.
- Difficulty is introduced one mechanic at a time where possible. Visual evolution may provide breathing room without introducing a new rule.
- Generated puzzle state is runtime data. Do not add player-save schema fields merely to support a board surface unless persistence becomes an explicit requirement.

## Dependency map

| Wave | Outcome | Depends on | Promotion gate |
|---|---|---|---|
| 0 | Contract hardening and instrumentation | Tier 2.5 | Existing puzzles are behaviorally equivalent and measurable |
| 1 | Recognizable masked boards and cell geometry | Wave 0 | Shape, hit testing, and solvability pass on target devices |
| 2 | Non-straight paths and topology variants | Waves 0–1 | Path-quality, fairness, and accessibility playtest pass |
| 3 | Rotated glyphs and selection normalization | Wave 0; Wave 2 path contract | Recognition and accommodation pass; no mirrored glyphs |
| 4 | Full composable surface progression | Waves 1–3; Tier 3 shared motion/performance work | Theme compatibility, performance, and content audit pass |
| 5 | Long-term rollout and certification | Waves 1–4 | Profile matrix, device QA, and post-release telemetry-free review |

## Wave 0 — Contract hardening and measurement

**Owner:** Engineering — systems and gameplay/rendering · **Priority:** P1

Complete or verify the Tier 2.5 foundation before adding advanced mechanics. This is the permanent seam that prevents every later feature from becoming a renderer-specific exception.

### Work

- Stabilize the board, cell, topology, and ordered-path contracts.
- Keep renderer, hit testing, accessibility semantics, and generator validation on the same cell identities and neighbor graph.
- Add seeded puzzle snapshots and a developer inspection surface showing mask, cell IDs, neighbors, path order, glyph orientation, and active theme components.
- Extend difficulty profiles with reserved fields for turns, topology, glyph orientation, and surface complexity; unset dimensions must be explicit rather than inferred.
- Build path-quality instrumentation: direction changes, turn severity, crossings, boundary proximity, distractor pressure, rotation count, and topology complexity.
- Add a compatibility suite proving the existing six-region 1.0 content produces the same target words, rewards, and interaction outcomes.

### Exit criteria

- Existing 1.0 content passes the compatibility suite with no unexplained difficulty drift.
- Every new metric is deterministic and bounded, and its meaning is documented for Design.
- A generated puzzle can be inspected and reproduced from a seed without relying on UI state.

## Wave 1 — Board shapes and cell geometry

**Owner:** Engineering — gameplay/rendering + Design · **Priority:** P1

Turn the conservative mask abstraction into a small, reusable vocabulary. Start with shapes that read immediately and have reliable touch layouts.

### Work

- Add a curated registry for rectangle, diamond, and triangle first; evaluate circle, oval, heart, hexagon, star, cross, hourglass, crescent, and clover only as separate candidates.
- Keep logical coordinates independent from the visible silhouette. Disabled cells must remain absent from placement, scanning, selection, and accessibility traversal.
- Add square, rounded-square, and diamond cell treatments where they improve readability; keep material independent from geometry.
- Define minimum cell size, inter-cell spacing, edge padding, and glyph scale per viewport class. Use measured values from representative phone, tablet, and desktop devices.
- Add shape-specific layout snapshots and visual regression checks for portrait and landscape.

### Exit criteria

- Each promoted shape has a legal-path test, hit-testing test, reduced-motion rendering test, and manual playtest note.
- A player can select a word across every promoted shape without learning a separate interaction gesture.
- No shape is assigned to campaign levels until Design records that the silhouette is understandable and the generator remains fair.

## Wave 2 — Path geometry and topology

**Owner:** Engineering — systems/gameplay + Design · **Priority:** P1

Relax the straight-vector assumption in controlled stages. The ordered cell path is the source of truth; every consecutive cell must satisfy the active topology.

### Stage 2A: single-bend paths

- Allow one direction change with a bounded, visually coherent turn.
- Keep straight and reverse paths dominant in mixed puzzles.
- Reject sharp or ambiguous turns, accidental near-words, and paths that become unreadable near a mask boundary.
- Add path previews in the developer inspector and a complexity budget per difficulty profile.

### Stage 2B: multi-segment paths

- Add two or more segments only after single-bend puzzles pass playtesting.
- Constrain turns to smooth, intentional movement; arbitrary zigzags are invalid design output even if technically legal.
- Expand scoring to include turn severity, segment count, crossings, and nearby distractor sequences.

### Stage 2C: alternate topology

- Introduce hexagonal or other non-square adjacency only as a separately tested topology, never as an accidental consequence of a visual hex tile.
- Define neighbor rules, selection traversal, keyboard/screen-reader traversal, and content authoring rules before promotion.
- Keep a square-topology fallback for players who disable unusual geometry/topology.

### Exit criteria

- Every path type has generator validity, selection, cancellation, replay, and accessibility coverage.
- A fairness review confirms that difficulty comes from spatial reasoning, not hidden adjacency or arbitrary path movement.
- Mixed puzzles preserve the traditional word-search rhythm and have a documented ratio of straight to advanced paths.

## Wave 3 — Glyph orientation and selection normalization

**Owner:** Engineering — gameplay/rendering + Design/Accessibility · **Priority:** P2

Introduce orientation only after the path and cell contracts are stable. This is a visual-recognition challenge, not a board rotation feature.

### Work

- Support only discrete 0°, 90°, 180°, and 270° glyph orientations initially.
- Never mirror glyphs. Do not use arbitrary angles until a separate evidence-based decision approves them.
- Progress in stages: rotated filler glyphs, then one rotated target glyph, then several target glyphs, then independently varied target/filler orientations.
- Implement selection normalization as a reversible visual aid: a selected rotated glyph may animate toward canonical upright; cancellation restores the puzzle orientation; completion behavior is defined and tested.
- Ensure orientation is independent of Board Theme glyph treatment (engraved, painted, inset, and so on).
- Add accessibility controls that disable rotation without changing vocabulary, rewards, board size, or progression difficulty outside the visual mechanic.

### Exit criteria

- Recognition, selection, cancellation, and completion remain unambiguous at every promoted orientation stage.
- Reduced-motion mode uses an instantaneous or static normalization treatment while preserving feedback.
- Playtesting shows that players understand the mechanic through interaction; add only a minimal hint if evidence shows the mechanic is not self-teaching.

## Wave 4 — Composable Board Theme progression

**Owner:** Art + Engineering · **Priority:** P2

Expand the puzzle surface’s visual vocabulary without creating a bespoke skin for every level or every shape/material combination.

### Work

- Maintain the composable surface model: environment/theme, board treatment, board shape, cell material, cell geometry, glyph treatment, selection effect, word-found effect, completion celebration, and ambient effect.
- Build compatible component sets for a small number of theme families such as Terracotta Garden, Woodland, River Garden, Morning Garden, Moon Garden, and Wildflower Garden. These are art-direction candidates, not mandatory launch count commitments.
- Allow-list coherent combinations. For example, a material may support square, diamond, and hex cells differently; unsupported combinations must fall back predictably rather than assemble randomly.
- Keep word-found effects localized and short; completion celebrations can be larger but brief and skippable. Neither may block continued play.
- Reuse Tier 3’s shared ambient layer for drifting leaves, fireflies, pollen, water shimmer, and similar effects. Pause backgrounded animation, cap particles, and respect reduced motion and performance settings.
- Keep the surrounding navigation, typography, controls, word list, dialogs, and botanical identity stable.

### Exit criteria

- A screenshot comparison across early and advanced content shows clear puzzle-surface growth while remaining unmistakably Word Sprout.
- Theme changes do not alter generator probabilities or hidden difficulty.
- Asset fallback, reduced motion, background pause, and Android performance are tested before a family enters progression content.

## Wave 5 — Profile authoring, rollout, and certification

**Owner:** Design + Engineering + QA · **Priority:** P1 release gate for each advanced content batch

Use the independent dimensions to author progression deliberately rather than hard-coding a single “advanced” level.

### Work

- Author difficulty profiles as combinations of dimensions: board shape, cell geometry, topology, path mix, word length/count, reverse/diagonal frequency, overlap, distractors, glyph orientation, and Board Theme.
- Introduce one novelty dimension at a time in early experiments, then combine only dimensions that have already passed their individual gates.
- Use profile-level complexity budgets and seeded generation audits to reject unfair combinations before playtesting.
- Keep accessibility variants on the same logical puzzle and reward path; only presentation and permitted visual mechanics change.
- Run structured playtests at each promotion boundary and record observations separately from interpretations. Track confusion, missed words, selection errors, completion time, cancellation behavior, and preference for accommodations.
- Certify portrait/landscape, touch/keyboard/screen-reader behavior, reduced motion, background/foreground transitions, and representative device performance.

### Final exit criteria

- Every promoted profile has a seed, a difficulty rationale, a compatible theme declaration, an accessibility variant, and a rollback/fallback configuration.
- Tier 0 validity and quality certification remains green across all promoted shapes, paths, and profiles.
- No advanced mechanic is required for baseline campaign completion; advanced content is additive and can be disabled or routed around without save loss.
- A release note states which mechanics are enabled, which remain experimental, and which stay deferred.

## Explicitly deferred until evidence supports promotion

- Arbitrary-angle glyph rotation, mirrored glyphs, and any orientation treatment that creates genuine letter ambiguity.
- Unbounded winding paths, chaotic zigzags, cell reuse, or paths that are difficult only because they are hard to trace.
- Every proposed board silhouette and every possible Theme × Shape × Cell combination.
- A procedural art/particle system that bypasses the shared performance and reduced-motion controls.
- Any new progression currency, account feature, online service, or separate game mode justified only by this visual-evolution work.

## Maintenance rule

When a new mechanic is proposed, add it to this plan with its contract, dependency wave, accessibility accommodation, measurement, and promotion gate before implementing it. The long-term principle remains: do not increase difficulty only by making the puzzle bigger; increase the player's visual vocabulary in a way that remains fair, readable, and recognizably Word Sprout.
