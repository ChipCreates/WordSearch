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
     *  region's puzzles should favor. This is the *data* half of "category
     *  bias" -- WSP-2.3 owns the actual weighting algorithm (and its
     *  native/web parity between src/backend.ts and src-tauri/src/lib.rs)
     *  that consumes this list; this module only defines which categories
     *  each region favors, not how strongly or how it's blended with the
     *  player's own tier/favorites selection. */
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
        categoryBias: ["Animals", "Colors", "Fruits", "Gardening"],
        difficultyProfileRef: "glowing-grove",
        entryReward: null,
        completionReward: { seeds: 150 },
    },
    {
        id: "sunlit-falls", name: "Sunlit Falls", tagline: "Let curiosity flow further.",
        start: 21, end: 30, ambientThemeKey: "sunlit-falls",
        categoryBias: ["Weather", "Ocean Life", "Beach & Summer", "Camping & Outdoors"],
        difficultyProfileRef: "sunlit-falls",
        entryReward: { seeds: 50 },
        completionReward: { seeds: 200 },
    },
    {
        id: "crystal-conservatory", name: "The Crystal Conservatory", tagline: "Rare words. Extraordinary growth.",
        start: 31, end: 40, ambientThemeKey: "crystal-conservatory",
        categoryBias: ["Astrology/Zodiac", "Geology/Minerals", "Chemistry Elements/Terms", "Anatomy"],
        difficultyProfileRef: "crystal-conservatory",
        entryReward: { seeds: 60 },
        completionReward: { seeds: 250 },
    },
    {
        id: "mosswood-hollows", name: "Mosswood Hollows", tagline: "Deeper words. Wilder wonders.",
        start: 41, end: 50, ambientThemeKey: "mosswood-hollows",
        categoryBias: ["Mythical Creatures", "Insects", "Mycology (Fungi)", "Horror Themes"],
        difficultyProfileRef: "mosswood-hollows",
        entryReward: { seeds: 75 },
        completionReward: { seeds: 300 },
    },
    {
        id: "cloudreach-summit", name: "Cloudreach Summit", tagline: "Higher thinking. Greater horizons.",
        start: 51, end: 70, ambientThemeKey: "cloudreach-summit",
        categoryBias: ["Space & Astronomy", "Architecture", "Computer Science", "Business"],
        difficultyProfileRef: "cloudreach-summit",
        entryReward: { seeds: 100 },
        completionReward: { seeds: 400 },
    },
    {
        id: "verdant-beyond", name: "The Verdant Beyond", tagline: "A lifetime of words still to grow.",
        start: 71, end: 100, ambientThemeKey: "verdant-beyond",
        categoryBias: ["Emotions", "Mythical Creatures", "Space & Astronomy", "Gardening"],
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
