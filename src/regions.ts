// Word Sprout's six campaign regions (WSP-2.2). Extracted from the view
// layer -- LevelsView.tsx previously defined `LEVEL_REGIONS` inline, with
// only id/start/end/name/tagline, and no other system could see it without
// importing a whole React component tree (see the comment scripts/
// audit-puzzles.ts used to carry, explaining why it duplicated the array
// instead). This module is the single canonical source now: pure data, zero
// React/MUI dependencies, safe for the trail view, the game hook,
// persistence, and standalone scripts (audit-puzzles.ts) to all import
// directly.
//
// Level ranges are frozen by WordSprout_1.0_Plan.md section 2.1 and must
// never change once balance/content work depends on them: Glowing Grove
// 1-20, Sunlit Falls 21-30, Crystal Conservatory 31-40, Mosswood Hollows
// 41-50, Cloudreach Summit 51-70, Verdant Beyond 71-100.
//
// WSP-2.4 wiring note: this module (WSP-2.2) originally hardcoded its own
// `categoryBias` array per region, built independently and concurrently
// with WSP-2.3's data/region_category_bias.json -- the two worktrees never
// saw each other's category lists, and by the time both merged the two
// arrays had completely different (mostly non-overlapping) category names
// per region. data/region_category_bias.json is the one actually consumed
// at runtime (src/backend.ts, src-tauri/src/regions.rs) and validated by
// parity tests against the real category names in category_order.json;
// this module's own array was pure unvalidated documentation data that had
// already drifted from real behavior. Rather than hand-editing this
// module's array to match a snapshot of the JSON (which would just drift
// again the next time someone tunes a region's bias in the JSON and
// forgets this file exists), `categoryBias` below is derived directly from
// REGION_CATEGORY_BIAS at module load -- there is now exactly one array of
// favored categories per region, not two, so this can't drift again.

import { REGION_CATEGORY_BIAS } from "./regionTuning";

export type RegionReward = {
    /** Seeds granted exactly once -- see claimedRegionRewards in persistence.ts
     *  and queueRegionRewards in useWordSearchGame.ts for the exactly-once
     *  bookkeeping this relies on. */
    seeds: number;
};

export type RegionDefinition = {
    id: string;
    name: string;
    tagline: string;
    start: number;
    end: number;
    /** Ambient/visual theme reference -- a key only. Tier 3
     *  (WordSprout_1.0_Plan.md sections 3.1/3.2) owns actually producing the
     *  art and wiring the shared ambient-layer component that will eventually
     *  read this key; this issue just reserves the slot. */
    ambientThemeKey: string;
    /** Category names (matching src/categories/*.json's `name` field) this
     *  region's puzzles should favor. Derived directly from
     *  data/region_category_bias.json (via REGION_CATEGORY_BIAS in
     *  regionTuning.ts) at module load -- WSP-2.3 owns the actual weighting
     *  algorithm (and its native/web parity between src/backend.ts and
     *  src-tauri/src/regions.rs) that consumes the underlying data; this
     *  field exists on RegionDefinition purely so a consumer that already
     *  has a RegionDefinition in hand (e.g. LevelsView) can read a region's
     *  favored categories without a second import, not as a second source
     *  of truth for them (see the module-level comment above). */
    categoryBias: readonly string[];
    /** Reference key into WSP-2.3's difficulty-tuning profile table. Kept as
     *  its own field (rather than reusing `id` directly) even though it's
     *  1:1 with the region today, so a future many-region-share-one-profile
     *  remap is a one-line change here instead of a region rename. The
     *  actual tuning values (minWordLength, overlapPressure, etc.) are
     *  WSP-2.3's job, not this issue's. */
    difficultyProfileRef: string;
    /** Granted once, the first time a save's frontier crosses into this
     *  region (i.e. `highestUnlockedLevel` first reaches `start`). Null for
     *  the first region -- a new save already starts inside it, so there is
     *  no "entry" moment to reward. */
    entryReward: RegionReward | null;
    /** Granted exactly once per save, the first time this region's final
     *  level (`end`) is completed. */
    completionReward: RegionReward;
};

export const REGIONS: readonly RegionDefinition[] = [
    {
        id: "glowing-grove", name: "The Glowing Grove", tagline: "Where curiosity takes root.",
        start: 1, end: 20, ambientThemeKey: "glowing-grove",
        categoryBias: REGION_CATEGORY_BIAS["glowing-grove"].favoredCategories,
        difficultyProfileRef: "glowing-grove",
        entryReward: null,
        completionReward: { seeds: 150 },
    },
    {
        id: "sunlit-falls", name: "Sunlit Falls", tagline: "Let curiosity flow further.",
        start: 21, end: 30, ambientThemeKey: "sunlit-falls",
        categoryBias: REGION_CATEGORY_BIAS["sunlit-falls"].favoredCategories,
        difficultyProfileRef: "sunlit-falls",
        entryReward: { seeds: 50 },
        completionReward: { seeds: 200 },
    },
    {
        id: "crystal-conservatory", name: "The Crystal Conservatory", tagline: "Rare words. Extraordinary growth.",
        start: 31, end: 40, ambientThemeKey: "crystal-conservatory",
        categoryBias: REGION_CATEGORY_BIAS["crystal-conservatory"].favoredCategories,
        difficultyProfileRef: "crystal-conservatory",
        entryReward: { seeds: 60 },
        completionReward: { seeds: 250 },
    },
    {
        id: "mosswood-hollows", name: "Mosswood Hollows", tagline: "Deeper words. Wilder wonders.",
        start: 41, end: 50, ambientThemeKey: "mosswood-hollows",
        categoryBias: REGION_CATEGORY_BIAS["mosswood-hollows"].favoredCategories,
        difficultyProfileRef: "mosswood-hollows",
        entryReward: { seeds: 75 },
        completionReward: { seeds: 300 },
    },
    {
        id: "cloudreach-summit", name: "Cloudreach Summit", tagline: "Higher thinking. Greater horizons.",
        start: 51, end: 70, ambientThemeKey: "cloudreach-summit",
        categoryBias: REGION_CATEGORY_BIAS["cloudreach-summit"].favoredCategories,
        difficultyProfileRef: "cloudreach-summit",
        entryReward: { seeds: 100 },
        completionReward: { seeds: 400 },
    },
    {
        id: "verdant-beyond", name: "The Verdant Beyond", tagline: "A lifetime of words still to grow.",
        start: 71, end: 100, ambientThemeKey: "verdant-beyond",
        categoryBias: REGION_CATEGORY_BIAS["verdant-beyond"].favoredCategories,
        difficultyProfileRef: "verdant-beyond",
        entryReward: { seeds: 125 },
        completionReward: { seeds: 750 },
    },
];

/** Falls back to the last region for any level past Verdant Beyond's `end`,
 *  matching "play continues indefinitely past level 100" (WordSprout_1.0_Plan.md
 *  section 2.1 / WSP-2.4's context) -- there is no seventh region, so a
 *  level 137 player is still, correctly, "in" Verdant Beyond. */
export const regionForLevel = (level: number): RegionDefinition =>
    REGIONS.find(r => level >= r.start && level <= r.end) ?? REGIONS[REGIONS.length - 1];

export const getRegionById = (id: string): RegionDefinition | undefined =>
    REGIONS.find(r => r.id === id);

export type RegionRewardKind = "entry" | "completion";

/** Canonical key for one specific region-reward claim, used in both
 *  SaveData.claimedRegionRewards (persistence.ts) and the presentation queue
 *  (presentationQueue.ts) -- centralized here so every caller builds the
 *  exact same string instead of each hand-rolling `${id}:${kind}` and
 *  risking a typo'd mismatch between the writer and the reader. */
export const regionRewardClaimKey = (regionId: string, kind: RegionRewardKind): string => `${regionId}:${kind}`;

export const isRegionRewardClaimed = (
    claimedRegionRewards: readonly string[],
    regionId: string,
    kind: RegionRewardKind,
): boolean => claimedRegionRewards.includes(regionRewardClaimKey(regionId, kind));
