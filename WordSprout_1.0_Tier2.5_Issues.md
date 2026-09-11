# Word Sprout 1.0 — Tier 2.5 Issues

## Purpose and boundary

`wordsprout-evolution.txt` proposes a long-term Puzzle Surface Progression System: board masks, cell geometry, explicit topology, path-based words, glyph orientation, composable Board Themes, and multidimensional difficulty. For 1.0, the correct fold is **architecture first, conservative content second**.

This tier must leave the engine capable of growing without forcing every advanced mechanic into the release. The 1.0 player-facing slice is limited to recognizable boards, a small allow-listed set of masks and cell treatments, predominantly straight words, and restrained surface feedback. Winding/multi-bend paths, hex topology, rotated target glyphs, selection normalization, arbitrary-angle rotation, and a large procedural theme matrix are post-1.0 unless a later playtest explicitly promotes a narrow piece.

This tier complements Tier 0. It defines the representation and its focused tests; it does not replace the existing broad generator certification or pull post-1.0 mechanics forward.

## WS25-1 — Canonical puzzle-surface model

**Tier:** 2.5 · **Labels:** `architecture`, `feature`, `P1` · **Owner:** Engineering — gameplay/rendering

### Context

The current word-search model is optimized for rectangular coordinates and straight vectors. The evolution proposal requires a stable seam between logical puzzle structure and rendering so future shapes do not require a rewrite.

### Acceptance criteria

- [ ] Define a runtime `Board` model with shape/mask, cells, topology, and ordered word paths; use the repository's existing naming and typing conventions rather than inventing duplicate concepts.
- [ ] Each cell has a stable identity, position, glyph, glyph orientation, cell geometry, and explicit neighbor IDs (or the smallest equivalent contract that preserves these semantics).
- [ ] Each target word stores an ordered path of cell IDs. Straight words are represented through that path; no consumer needs to infer a path solely from start cell, direction, and length.
- [ ] Adjacency is validated from the board topology. A path cannot leave the mask, use a disabled cell, or reuse a cell unless a future rule explicitly enables reuse.
- [ ] Existing rectangular puzzles, selection, found-word highlighting, bonus-word detection, and completion behavior remain behaviorally unchanged.
- [ ] Add focused tests for rectangular construction, mask exclusion, neighbor validity, forward/backward paths, invalid paths, and serialization/round-trip of the new runtime contract.
- [ ] The model does not add persistence fields to player saves unless a later issue proves they are needed; generated puzzle state remains runtime data.

### Implementation prompt

Refactor around a logical board/cell/path contract, not a visual skin. Read the existing constants, generator, canvas, selection, and tests first. Preserve the current rectangle/straight-line behavior through adapters if necessary, but make the adapter temporary and test its equivalence. Keep rendering concerns separate from topology and do not add winding or hex behavior in this issue.

## WS25-2 — Masked boards and conservative 1.0 geometry slice

**Tier:** 2.5 · **Labels:** `feature`, `P1`, `tier-2.5`, `generator` · **Owner:** Engineering — gameplay/rendering, with Design

### Context

The proposal recommends recognizable shapes over mathematically perfect silhouettes and says readability, touch targets, and puzzle quality take priority. 1.0 needs a small, certifiable step rather than every shape in the proposal.

### Acceptance criteria

- [ ] Add a data-driven board-shape registry with the existing rectangle plus a small, explicitly chosen set of recognizable masks (initial candidates: diamond and triangle; Design may narrow this before implementation).
- [ ] Disabled cells are excluded consistently from placement, filler generation, word validation, bonus-word scanning, hit testing, highlighting, and accessibility semantics.
- [ ] The renderer and selection geometry use the same mask and cell centers; no shape relies on viewport-specific hard-coded exceptions.
- [ ] Cell geometry is independently selectable from board shape. Ship only square and diamond treatments in the initial slice unless a design review promotes another form.
- [ ] Touch targets, glyph legibility, and board density are measured on representative phone, tablet, and desktop sizes; no shape ships solely because it looks correct at one viewport.
- [ ] Seeded tests prove every requested target is placed on a legal path and every selected path resolves identically across supported surfaces.
- [ ] New shapes are not silently assigned to existing campaign levels until a playtest gate records that players understand them and generation quality remains acceptable.

### Implementation prompt

Build masks as data over a common coordinate space. Start with the smallest shape set that proves the abstraction. Reuse the existing straight placement rules through the new path model. Keep topology square for this issue; a diamond-shaped board is not permission to introduce hex adjacency. Add visual comparison coverage and leave a clear feature flag or registry boundary for future shapes.

## WS25-3 — Multidimensional difficulty and path-quality metadata

**Tier:** 2.5 · **Labels:** `architecture`, `test`, `P1`, `tier-2.5` · **Owner:** Engineering — systems, with Design

### Context

The evolution proposal separates board complexity, cell topology, path complexity, glyph rotation, word count/length, reverse frequency, distractor density, and overlap density. Existing Tier 0 certification remains the broad reliability gate; this issue makes the new dimensions expressible and prevents accidental difficulty jumps.

### Acceptance criteria

- [ ] Define a versioned, data-driven difficulty profile that can describe board shape/mask, cell geometry/topology, min/max word length, word count, reverse/diagonal probabilities, overlap pressure, distractor density, and bonus-candidate count using the existing difficulty contract's conventions.
- [ ] Separate mechanical difficulty from visual/theme metadata; changing a Board Theme alone does not change generator probabilities.
- [ ] Add a deterministic path-complexity score with documented inputs. For the 1.0 slice, it may score straight/reverse paths, turns (zero in shipped content), crossings, boundary proximity, and local distractor pressure without pretending to score mechanics that do not exist yet.
- [ ] Region profiles in Tier 2 can opt into the conservative shape slice without losing their existing tuning identity.
- [ ] Tests cover profile serialization, deterministic scoring, sane bounds, and regression against the existing six-region difficulty expectations.
- [ ] No timing, threshold, or acceptance number is invented without a measurement or a documented design rationale.

### Implementation prompt

Extend the existing difficulty data instead of creating a second progression ladder. Keep level and region tuning readable to Design. The score is a targeting and audit aid, not a replacement for validity checks or human playtesting. Leave explicit placeholders for future bends, topology, and glyph rotation rather than encoding fake values.

## WS25-4 — Composable Board Theme contract and initial surface treatment

**Tier:** 2.5 · **Labels:** `feature`, `presentation`, `P2`, `tier-2.5` · **Owner:** Art + Engineering

### Context

The proposal calls for visual progression inside a stable WordSprout interface. Theme material and tile geometry must remain independent, and combinations must be curated rather than randomly multiplied.

### Acceptance criteria

- [ ] Define a Board Theme contract for board treatment, cell material, glyph treatment, selection effect, word-found effect, completion celebration, and ambient effect.
- [ ] Existing app-level themes/navigation/typography remain outside this contract; a Board Theme is not a full application skin.
- [ ] Components are composable and allow-listed. At least two internally coherent surface treatments can be demonstrated without bespoke assets for every shape/material combination.
- [ ] Word-found feedback is localized, short, responsive, and non-blocking; completion celebration is distinct, brief, and does not prevent continuing.
- [ ] Ambient effects pause when backgrounded, are performance-bounded, never obscure letters, and respect reduced motion.
- [ ] Focused component tests cover theme selection, unsupported combinations, reduced-motion output, dismissal/non-blocking behavior, and stable fallback when an asset is unavailable.
- [ ] Art review confirms legibility before decorative detail and records the initial asset/component allow-list.

### Implementation prompt

Create reusable surface vocabulary, not six complete skins. Keep the current botanical identity and controls stable. Start with the cheapest coherent treatment that proves material/geometry separation. Do not make theme choice a hidden difficulty modifier and do not add a particle framework that duplicates Tier 3's shared ambient-layer work.

## WS25-5 — Accessibility, fairness, and promotion gate

**Tier:** 2.5 · **Labels:** `accessibility`, `test`, `P1`, `certification` · **Owner:** Engineering + QA

### Context

The proposal explicitly separates difficulty from accessibility. Advanced visual mechanics may be disabled without forcing easier vocabulary, smaller boards, or a different progression track.

### Acceptance criteria

- [ ] Add independent settings/feature gates for unusual cell geometry, glyph rotation, winding paths, and selection animation, with only the applicable controls exposed for mechanics shipped in 1.0.
- [ ] Reduced motion removes or simplifies selection, word-found, completion, and ambient animation while preserving state, feedback, and continued play.
- [ ] Disabling a visual mechanic does not alter target words, reward values, region progression, or generator difficulty dimensions unrelated to that mechanic.
- [ ] Keyboard/screen-reader semantics and touch hit testing remain correct for masked boards and non-square cells.
- [ ] Tests cover reduced motion, each setting independently, rapid repeated selection/cancellation, and equivalence of puzzle outcomes with visual accommodations enabled or disabled.
- [ ] A playtest note records observations separately from interpretations for each new shape/treatment. Any confusion, illegibility, or generator-quality regression becomes a follow-up issue before promotion into campaign progression.
- [ ] Tier 2.5 closes with a release decision listing what is enabled in 1.0 and what remains post-1.0; no advanced mechanic is promoted by implementation convenience.

### Implementation prompt

Treat accessibility as a first-class presentation layer over the same logical puzzle. Certify the conservative slice on representative devices and with reduced-motion enabled. The exit decision should be evidence-based: architecture can be complete even when a proposed visual mechanic is deliberately deferred.

## Explicitly deferred from 1.0

- Winding and multi-segment target paths, curved/perimeter paths, and path reuse rules.
- Hexagonal topology or any topology whose adjacency differs from the square contract.
- Rotated target glyphs, selection normalization, arbitrary-angle rotation, and glyph mirroring.
- Full shape vocabulary (circle, oval, heart, star, cross, hourglass, crescent, clover) and unrestricted theme combinations.
- Procedural theme assembly and a large library of ambient/particle effects.

These are valid post-1.0 extensions only after the canonical model, fairness tests, accessibility seams, and playtest evidence from this tier exist.
