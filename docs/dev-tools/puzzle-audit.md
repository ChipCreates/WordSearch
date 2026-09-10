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
  fit every target/bonus word within the retry bound, so the generator fell
  back to its deterministic one-word-per-row layout. This should stay low;
  a sudden jump usually means a difficulty tier is asking for more/longer
  words than its grid size can realistically hold — a difficulty-tuning
  question (Tier 2 in the release plan), not a generator bug.
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
