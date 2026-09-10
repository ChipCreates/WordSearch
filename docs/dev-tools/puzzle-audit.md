# Puzzle generator audit

Standalone certification for `puzzleGenerator.ts` (WSP-0.2 in
`WordSprout_1.0_Tier0-1_Issues.md`): generates a large batch of boards
spanning every difficulty, region, and grid size, and reports generation
failures, retry counts, direction/diagonal distribution, duplicate
incidents, and content-safety hits. Run it before every release candidate,
not just once.

## Quick start

```bash
npm run audit:puzzles
```

This runs 50,000 boards and takes roughly 2–4 minutes. It's excluded from
the default `npm test` run (see the `--exclude` flag on the `test` script in
`package.json`) so the normal test loop stays fast; run it explicitly
instead.

## Reading the report

The report prints to the console (also visible in the test's own output)
and asserts two hard requirements: zero validity failures and zero
content-safety hits. Everything else is informational:

- **Hard fallbacks** — boards where randomized placement couldn't legally
  fit every target word within the retry bound, so the generator fell back
  to its deterministic one-word-per-row layout. This should stay low; a
  sudden jump usually means a difficulty tier is asking for more/longer
  target words than its grid size can realistically hold — a
  difficulty-tuning question (Tier 2 in the release plan), not a generator
  bug. (Bonus words are never the cause: a shortfall there is absorbed by
  `scorePuzzleQuality`'s `bonusDensity` term instead of triggering a
  fallback — see the note below on why that distinction mattered in
  practice.)
- **Quality misses** — boards that placed every word legally but never hit
  a board matching the difficulty's intended direction/reverse/overlap mix
  within the quality-retry bound, so the best-scoring candidate shipped
  instead. See `scorePuzzleQuality`/`QUALITY_THRESHOLD` in
  `puzzleGenerator.ts`.
- **Attempt-count distribution** — how many boards needed 1 attempt, 2, 3,
  etc. A distribution skewed heavily toward the max is the same
  difficulty-tuning signal as a high hard-fallback count.

## Reproducing a specific failure

Every board is generated from a seed (the audit's loop index), which
determines *both* which words get drawn from the category (via
`getPuzzleWords`'s optional `rng`) and how the generator places them (via
`generatePuzzle`'s `rng`) — reported failures are fully reproducible by
reusing that same seed number for both, as `scripts/audit-puzzles.ts` does
internally.

## Fixed finding: bonus-word shortfalls were driving most fallbacks

The first real-content audit run found a 6.4% hard-fallback rate —
suspiciously high given the old (short, synthetic) test word lists never
triggered it. Isolating targets from bonus words showed why: a 9-word,
mostly-6-to-8-letter target set placed into a 10×10 grid with zero
failures across 500 trials, but adding the difficulty's full complement of
candidate bonus words on top pushed the fallback rate to 98.4% for that
same board. `getBonusGoalCount` estimates how many bonus words *should*
fit from leftover cell count, but cell count isn't the same as leftover
*contiguous run length* — a board can have plenty of empty cells and still
have nowhere a 6+ letter word actually fits once overlap-seeking target
placement has fragmented it. The generator was treating "couldn't reach
the estimated bonus goal" as a reason to discard an otherwise fully valid,
well-placed board and retry from scratch — 20 times, then give up to the
fallback — even though bonus words are explicitly optional content ("if
you can" in the level-goal copy, not a promise like targets are).

The fix: a bonus shortfall (down to zero) no longer discards the board.
`scorePuzzleQuality`'s existing `bonusDensity` term already scores a
shortfall lower, so quality-search naturally still prefers a board with
more bonus words when one's reachable within its retry budget, without a
hard reject blocking an otherwise-good board. Post-fix on the same
50,000-board audit: hard fallbacks dropped from ~3,100 to ~310 (0.64%),
and content-safety hits dropped to zero (fewer fallback boards means far
less exposure to that path's own residual, below).

## Known accepted residual: fallback-path content safety

The emergency fallback board (see `generatePuzzle`'s tail in
`puzzleGenerator.ts`) lays each word out on its own dedicated row, mostly
surrounded by filler. `sanitizeAccidentalDeniedStrings` cleans up filler
that accidentally spells a denied term there just like it does on a normal
board, but it can't fix the rare case where two *adjacent* placed words'
own letters — not filler — happen to spell one out along a diagonal,
without corrupting one of those words. The normal (non-fallback) path
doesn't have this problem: it discards and retries the whole candidate
instead, since it still has attempt budget to spare. This residual is
therefore both rare (only when the fallback triggers at all, itself an
uncommon path) and explicitly documented in code — see the comment above
the fallback's `sanitizeAccidentalDeniedStrings` call.
