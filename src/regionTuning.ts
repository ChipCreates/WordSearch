import regionCategoryBiasData from "../data/region_category_bias.json";
import type { PuzzleDifficulty, PuzzleMode } from "./puzzleGenerator";
import { getPuzzleDifficulty } from "./puzzleGenerator";

// WSP-2.3 -- region-level difficulty and category tuning.
//
// WSP-2.2 (running concurrently, in a separate worktree) owns the full
// region data module: name, tagline, visual/ambient theme, entry/completion
// rewards, and a *reference* to whatever difficulty-tuning profile applies.
// This file is deliberately scoped to just the tuning values this issue
// needs -- level ranges (frozen by WordSprout_1.0_Plan.md section 2.1, so
// safe to duplicate short-term), a difficulty bias table, and a category
// bias table -- in a shape WSP-2.2 can reference or merge with later
// without this issue depending on a module that doesn't exist yet here.
// Don't confuse this for WSP-2.2's region data: it has no name/tagline/
// rewards/theme, only the numbers a puzzle-generation call needs.

export type RegionId =
    | "glowing-grove"
    | "sunlit-falls"
    | "crystal-conservatory"
    | "mosswood-hollows"
    | "cloudreach-summit"
    | "verdant-beyond";

// The six regions' exact level ranges, unchanged from LEVEL_REGIONS in
// src/components/LevelsView.tsx (view layer, WSP-2.2's to relocate) --
// duplicated here rather than imported, since a data/tuning module
// importing from a view component would be a backwards dependency this
// module shouldn't carry even short-term. WSP-2.2 should treat these two
// lists as needing to agree, not this one needing to import that one.
export const REGION_LEVEL_RANGES: Record<RegionId, { start: number; end: number }> = {
    "glowing-grove": { start: 1, end: 20 },
    "sunlit-falls": { start: 21, end: 30 },
    "crystal-conservatory": { start: 31, end: 40 },
    "mosswood-hollows": { start: 41, end: 50 },
    "cloudreach-summit": { start: 51, end: 70 },
    "verdant-beyond": { start: 71, end: 100 },
};

// Ordered the same way REGION_LEVEL_RANGES is declared, so iteration order
// matches level progression -- matters only for the "no range matched"
// fallback below.
const REGION_ORDER: RegionId[] = [
    "glowing-grove", "sunlit-falls", "crystal-conservatory",
    "mosswood-hollows", "cloudreach-summit", "verdant-beyond",
];

/**
 * Level 100 is a real milestone (WSP-2.4), but play continues past it
 * (WSP-2.7 certifies this). A level past every defined range -- or, in
 * theory, before level 1 -- resolves to the last region rather than
 * `undefined`, the same fallback LevelsView.tsx's own `regionForLevel`
 * already uses for its analogous lookup.
 */
export function regionIdForLevel(level: number): RegionId {
    for (const id of REGION_ORDER) {
        const range = REGION_LEVEL_RANGES[id];
        if (level >= range.start && level <= range.end) return id;
    }
    return REGION_ORDER[REGION_ORDER.length - 1];
}

// ---------------------------------------------------------------------------
// Part 1: difficulty tuning -- a bias layered on top of the player's own
// easy/standard/challenging mode, never a replacement for it.
// ---------------------------------------------------------------------------

export type RegionDifficultyBias = {
    gridSizeDelta?: number;
    targetCountDelta?: number;
    minWordLengthDelta?: number;
    maxWordLengthDelta?: number;
    reverseWordProbabilityDelta?: number;
    diagonalProbabilityDelta?: number;
    overlapPressureDelta?: number;
    bonusCandidateCountDelta?: number;
};

// Sane absolute bounds a region's bias can never push a difficulty value
// outside of, regardless of which base mode it's stacked on. gridSize/
// targetCount/word-length bounds are chosen with headroom around the real
// range calculateGridSize already produces (grid sizes 3-12 across easy/
// normal/hard, src/gameMechanics.ts) rather than invented independently of
// what the generator can actually render well; the four probability/count
// knobs use PuzzleDifficulty's own natural domains.
export const DIFFICULTY_CLAMP_BOUNDS = {
    gridSize: { min: 3, max: 14 },
    targetCount: { min: 3, max: 18 },
    minWordLength: { min: 2, max: 8 },
    maxWordLength: { min: 3, max: 14 },
    reverseWordProbability: { min: 0, max: 1 },
    diagonalProbability: { min: 0, max: 1 },
    overlapPressure: { min: 0, max: 1 },
    bonusCandidateCount: { min: 0, max: 14 },
} as const;

function clamp(value: number, bounds: { min: number; max: number }): number {
    return Math.min(bounds.max, Math.max(bounds.min, value));
}

/**
 * Applies a region's difficulty bias on top of an already-computed base
 * PuzzleDifficulty (from getPuzzleDifficulty(level, mode)), clamping every
 * field to DIFFICULTY_CLAMP_BOUNDS afterward. Pure and independently
 * testable from any specific region's numbers -- the clamping rule itself
 * (never leave a sane range, regardless of base mode or bias magnitude) is
 * what WSP-2.3's acceptance criteria requires be explicit and tested, not
 * just true by construction of the six profiles below.
 */
export function applyRegionDifficultyBias(base: PuzzleDifficulty, bias: RegionDifficultyBias): PuzzleDifficulty {
    const gridSize = clamp(base.gridSize + (bias.gridSizeDelta ?? 0), DIFFICULTY_CLAMP_BOUNDS.gridSize);
    const targetCount = clamp(base.targetCount + (bias.targetCountDelta ?? 0), DIFFICULTY_CLAMP_BOUNDS.targetCount);
    let minWordLength = clamp(base.minWordLength + (bias.minWordLengthDelta ?? 0), DIFFICULTY_CLAMP_BOUNDS.minWordLength);
    let maxWordLength = clamp(base.maxWordLength + (bias.maxWordLengthDelta ?? 0), DIFFICULTY_CLAMP_BOUNDS.maxWordLength);
    // minWordLength and maxWordLength are clamped independently above; none
    // of the six profiles below push them past each other, but a future
    // bias (or a bias stacked oddly with an extreme mode) could. Swapping
    // rather than leaving an inverted range means a caller never receives a
    // PuzzleDifficulty no word length can satisfy.
    if (minWordLength > maxWordLength) {
        [minWordLength, maxWordLength] = [maxWordLength, minWordLength];
    }
    const reverseWordProbability = clamp(
        base.reverseWordProbability + (bias.reverseWordProbabilityDelta ?? 0),
        DIFFICULTY_CLAMP_BOUNDS.reverseWordProbability,
    );
    const diagonalProbability = clamp(
        base.diagonalProbability + (bias.diagonalProbabilityDelta ?? 0),
        DIFFICULTY_CLAMP_BOUNDS.diagonalProbability,
    );
    const overlapPressure = clamp(
        base.overlapPressure + (bias.overlapPressureDelta ?? 0),
        DIFFICULTY_CLAMP_BOUNDS.overlapPressure,
    );
    const bonusCandidateCount = clamp(
        base.bonusCandidateCount + (bias.bonusCandidateCountDelta ?? 0),
        DIFFICULTY_CLAMP_BOUNDS.bonusCandidateCount,
    );

    return {
        gridSize,
        targetCount,
        minWordLength,
        maxWordLength,
        allowedDirections: base.allowedDirections,
        reverseWordProbability,
        diagonalProbability,
        overlapPressure,
        bonusCandidateCount,
    };
}

// One bias entry per region, matching WordSprout_1.0_Plan.md section 2.1's
// identities:
//   Glowing Grove       -- comfort: short words, few diagonals, generous boards
//   Sunlit Falls        -- confidence: more diagonals, slightly bigger boards
//   Crystal Conservatory-- sophistication: longer words, rarer vocabulary
//                           (vocabulary rarity is the category-bias table below;
//                           this table covers the "longer words" half)
//   Mosswood Hollows     -- discovery: more reverses, less obvious placement,
//                           richer bonus potential
//   Cloudreach Summit    -- mastery: density, long words, overlap pressure
//   Verdant Beyond       -- full mechanical vocabulary while staying fair:
//                           a moderate touch of every knob, none pushed as
//                           far as a single-identity region pushes its own
export const REGION_DIFFICULTY_BIAS: Record<RegionId, RegionDifficultyBias> = {
    "glowing-grove": {
        maxWordLengthDelta: -1,
        diagonalProbabilityDelta: -0.15,
        overlapPressureDelta: -0.1,
        gridSizeDelta: 1,
    },
    "sunlit-falls": {
        diagonalProbabilityDelta: 0.1,
        gridSizeDelta: 1,
    },
    "crystal-conservatory": {
        minWordLengthDelta: 1,
        maxWordLengthDelta: 1,
    },
    "mosswood-hollows": {
        reverseWordProbabilityDelta: 0.15,
        overlapPressureDelta: 0.1,
        bonusCandidateCountDelta: 2,
    },
    "cloudreach-summit": {
        targetCountDelta: 1,
        maxWordLengthDelta: 1,
        overlapPressureDelta: 0.15,
    },
    "verdant-beyond": {
        diagonalProbabilityDelta: 0.08,
        reverseWordProbabilityDelta: 0.08,
        overlapPressureDelta: 0.05,
        bonusCandidateCountDelta: 1,
        maxWordLengthDelta: 1,
    },
};

/**
 * Convenience for callers (e.g. a future useWordSearchGame.ts integration):
 * computes the player's own mode-based difficulty, then layers the given
 * region's bias on top of it, clamped. Ready to pass straight into
 * generatePuzzle's `difficultyOverride` (see src/puzzleGenerator.ts).
 */
export function getRegionPuzzleDifficulty(
    level: number,
    mode: PuzzleMode,
    regionId: RegionId = regionIdForLevel(level),
    gridSizeOverride?: number,
): PuzzleDifficulty {
    const base = getPuzzleDifficulty(level, mode, gridSizeOverride);
    return applyRegionDifficultyBias(base, REGION_DIFFICULTY_BIAS[regionId]);
}

// ---------------------------------------------------------------------------
// Part 2: category bias -- implemented identically on both platforms (see
// src-tauri/src/regions.rs). Both read the same weighting rule; the actual
// favored-category lists live in data/region_category_bias.json, the single
// source of truth both platforms' parity tests check against
// (src/backend.test.ts, src-tauri/src/lib.rs).
// ---------------------------------------------------------------------------

export type RegionCategoryBias = {
    favoredCategories: string[];
    weight: number;
};

export const REGION_CATEGORY_BIAS: Record<RegionId, RegionCategoryBias> =
    regionCategoryBiasData as Record<RegionId, RegionCategoryBias>;

/**
 * Builds a deterministic, order-preserving "weighted round robin" sequence
 * from `pool`: every entry appears at least once (a region's bias can never
 * exclude a category from ever being selected), and every entry whose name
 * is in `favoredNames` appears `weight` times instead of once. Cycling an
 * index through this sequence (rather than through `pool` itself) is what
 * makes a region's favored categories come up more often while still
 * guaranteeing every category in the tier eventually gets a turn.
 *
 * Reimplemented identically (not shared code, since TS and Rust can't share
 * a function body) in src-tauri/src/regions.rs's `build_biased_sequence` --
 * keep the two in sync; the parity tests in backend.test.ts and lib.rs both
 * check against the same data/region_category_bias.json + data/
 * category_order.json fixtures specifically so a drift between the two
 * implementations fails a test on both sides rather than only being
 * noticed by a player on one platform.
 */
export function buildBiasedCategorySequence<T extends { name: string }>(
    pool: readonly T[],
    favoredNames: readonly string[],
    weight: number,
): T[] {
    const favored = new Set(favoredNames);
    const effectiveWeight = Math.max(1, Math.floor(weight));
    const sequence: T[] = [];
    for (const item of pool) {
        const times = favored.has(item.name) ? effectiveWeight : 1;
        for (let i = 0; i < times; i++) sequence.push(item);
    }
    return sequence;
}

/**
 * Picks a category for `level` from `pool`, applying `bias` (if given) via
 * buildBiasedCategorySequence. With no bias (or a bias with an empty
 * favorites list), this is byte-for-byte the same plain
 * `pool[(level - 1) % pool.length]` indexing backend.ts and lib.rs already
 * used before this issue -- so a caller that never passes a region gets
 * exactly the old, fixture-verified behavior, unchanged.
 */
export function pickCategoryForLevel<T extends { name: string }>(
    pool: readonly T[],
    level: number,
    bias?: RegionCategoryBias,
): T | undefined {
    if (pool.length === 0) return undefined;
    if (!bias || bias.favoredCategories.length === 0) return pool[(level - 1) % pool.length];
    const sequence = buildBiasedCategorySequence(pool, bias.favoredCategories, bias.weight);
    return sequence[(level - 1) % sequence.length];
}
