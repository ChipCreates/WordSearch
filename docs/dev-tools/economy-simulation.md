# Economy simulation

Standalone certification for the Seed economy (WSP-1.3 in
`WordSprout_1.0_Tier0-1_Issues.md`): models five player profiles across
several time horizons and reports Seeds earned/spent and time-to-afford per
plant rarity tier, so progression targets are tuned from this output
instead of intuition.

## Quick start

```bash
npm run simulate:economy
```

Runs in under a second and prints the full report (casual, regular,
enthusiast, optimizer, and hint-heavy profiles, each across a 7-day window,
a 30-day window, and a 100-level campaign horizon).

## What's consolidated where

Per the release plan, every Seed-related number lives in one place per
domain, not scattered through components:

- **Puzzle/bonus rewards** -- `REWARDS` in `src/gameMechanics.ts`
- **Plant prices, bloom bounty, fertilizer cost** -- `src/plantsCatalog.ts`
  (raw `seedCost` per plant) derived through `getPlantEconomy()` in
  `src/economy.ts`. Nothing reads a plant's bloom/fertilizer value any
  other way -- there used to be a second, unused `bloomBounty` field
  directly on the catalog that quietly disagreed with the computed value
  (roughly 2x cost vs. the real 0.5x rebate); removed as dead, misleading
  data rather than left as a landmine for a future read.
- **Power-up prices** -- `POWERUP_DEFINITIONS` in `src/powerups.ts`
- **Cosmetic/theme prices** -- `COSMETIC_DEFINITIONS` in `src/economy.ts`.
  Previously inline literals in `SeedStoreDialog.tsx`, duplicated once for
  display and again for the actual charge -- exactly the kind of drift the
  consolidation requirement exists to prevent.

## Modeling notes

- A forward-progressing player (the default every profile models) always
  earns the full `LEVEL_COMPLETE_SEEDS` rate, with no cap at level 100 --
  the campaign keeps generating fresh, never-before-seen levels
  indefinitely past 100 (see the release plan's Tier 2.1), so there's no
  rate change to model there. `REWARDS.REPLAY_COMPLETE_SEEDS` only applies
  to the alternative of deliberately revisiting an already-completed level,
  which `forwardProgressAlwaysOutearnsReplaying()` confirms is never more
  profitable than just continuing forward, for any bonus-word rate.
- "Time to afford tier X" measures the cheapest *purchasable* plant in that
  tier, deliberately excluding the starter plant (free, already owned) --
  the plan's one documented free exception, not a real purchase data point.
- The Garden loop itself (watering, blooming) contributes no income to
  these simulations, matching the real game: watering only grants growth,
  and a purchased plant's lifetime bloom/rebate value stays below its
  purchase cost (see `economy.test.ts`'s "keeps every purchased plant
  negative on the all-water path"). The only income term in this file is
  puzzle completion, by construction -- see the "idle player earns zero"
  test in `simulate-economy.test.ts`.
