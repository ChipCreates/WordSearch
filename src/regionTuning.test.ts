import { describe, expect, it } from "vitest";
import { generatePuzzle, getPuzzleDifficulty, type PuzzleDifficulty, type PuzzleMode } from "./puzzleGenerator";
import {
    applyRegionDifficultyBias, buildBiasedCategorySequence, DIFFICULTY_CLAMP_BOUNDS,
    getRegionPuzzleDifficulty, pickCategoryForLevel, regionIdForLevel,
    REGION_CATEGORY_BIAS, REGION_DIFFICULTY_BIAS, REGION_LEVEL_RANGES,
    type RegionDifficultyBias, type RegionId,
} from "./regionTuning";
import { createSeededRng as seeded } from "./rng";

const REGION_IDS: RegionId[] = [
    "glowing-grove", "sunlit-falls", "crystal-conservatory",
    "mosswood-hollows", "cloudreach-summit", "verdant-beyond",
];
const MODES: PuzzleMode[] = ["easy", "standard", "challenging"];

function isWithin(value: number, bounds: { min: number; max: number }): boolean {
    return value >= bounds.min && value <= bounds.max;
}

function expectWithinSaneBounds(difficulty: PuzzleDifficulty): void {
    expect(isWithin(difficulty.gridSize, DIFFICULTY_CLAMP_BOUNDS.gridSize)).toBe(true);
    expect(isWithin(difficulty.targetCount, DIFFICULTY_CLAMP_BOUNDS.targetCount)).toBe(true);
    expect(isWithin(difficulty.minWordLength, DIFFICULTY_CLAMP_BOUNDS.minWordLength)).toBe(true);
    expect(isWithin(difficulty.maxWordLength, DIFFICULTY_CLAMP_BOUNDS.maxWordLength)).toBe(true);
    expect(difficulty.minWordLength).toBeLessThanOrEqual(difficulty.maxWordLength);
    expect(isWithin(difficulty.reverseWordProbability, DIFFICULTY_CLAMP_BOUNDS.reverseWordProbability)).toBe(true);
    expect(isWithin(difficulty.diagonalProbability, DIFFICULTY_CLAMP_BOUNDS.diagonalProbability)).toBe(true);
    expect(isWithin(difficulty.overlapPressure, DIFFICULTY_CLAMP_BOUNDS.overlapPressure)).toBe(true);
    expect(isWithin(difficulty.bonusCandidateCount, DIFFICULTY_CLAMP_BOUNDS.bonusCandidateCount)).toBe(true);
}

describe("regionIdForLevel", () => {
    it("resolves the six frozen level ranges from WordSprout_1.0_Plan.md section 2.1", () => {
        expect(regionIdForLevel(1)).toBe("glowing-grove");
        expect(regionIdForLevel(20)).toBe("glowing-grove");
        expect(regionIdForLevel(21)).toBe("sunlit-falls");
        expect(regionIdForLevel(30)).toBe("sunlit-falls");
        expect(regionIdForLevel(31)).toBe("crystal-conservatory");
        expect(regionIdForLevel(40)).toBe("crystal-conservatory");
        expect(regionIdForLevel(41)).toBe("mosswood-hollows");
        expect(regionIdForLevel(50)).toBe("mosswood-hollows");
        expect(regionIdForLevel(51)).toBe("cloudreach-summit");
        expect(regionIdForLevel(70)).toBe("cloudreach-summit");
        expect(regionIdForLevel(71)).toBe("verdant-beyond");
        expect(regionIdForLevel(100)).toBe("verdant-beyond");
    });

    it("keeps resolving to Verdant Beyond past level 100 -- play continues (WSP-2.4/2.7), it doesn't run out of region", () => {
        expect(regionIdForLevel(101)).toBe("verdant-beyond");
        expect(regionIdForLevel(500)).toBe("verdant-beyond");
    });

    it("never returns undefined for a defensive out-of-range level", () => {
        expect(regionIdForLevel(0)).toBeDefined();
        expect(regionIdForLevel(-5)).toBeDefined();
    });

    it("covers 1-100 with no gaps and no overlaps across the six regions", () => {
        for (let level = 1; level <= 100; level++) {
            const matches = REGION_IDS.filter(id => {
                const range = REGION_LEVEL_RANGES[id];
                return level >= range.start && level <= range.end;
            });
            expect(matches).toHaveLength(1);
        }
    });
});

describe("applyRegionDifficultyBias clamping", () => {
    it("never pushes any field outside DIFFICULTY_CLAMP_BOUNDS, regardless of base mode or bias magnitude", () => {
        const extremeBiasesUp: RegionDifficultyBias = {
            gridSizeDelta: 999,
            targetCountDelta: 999,
            minWordLengthDelta: 999,
            maxWordLengthDelta: 999,
            reverseWordProbabilityDelta: 999,
            diagonalProbabilityDelta: 999,
            overlapPressureDelta: 999,
            bonusCandidateCountDelta: 999,
        };
        const extremeBiasesDown: RegionDifficultyBias = {
            gridSizeDelta: -999,
            targetCountDelta: -999,
            minWordLengthDelta: -999,
            maxWordLengthDelta: -999,
            reverseWordProbabilityDelta: -999,
            diagonalProbabilityDelta: -999,
            overlapPressureDelta: -999,
            bonusCandidateCountDelta: -999,
        };

        for (const mode of MODES) {
            for (const level of [1, 15, 50, 100]) {
                const base = getPuzzleDifficulty(level, mode);
                expectWithinSaneBounds(applyRegionDifficultyBias(base, extremeBiasesUp));
                expectWithinSaneBounds(applyRegionDifficultyBias(base, extremeBiasesDown));
            }
        }
    });

    it("swaps an inverted min/max word length back into a valid order instead of shipping one", () => {
        const base = getPuzzleDifficulty(10, "standard");
        const inverted = applyRegionDifficultyBias(base, { minWordLengthDelta: 999, maxWordLengthDelta: -999 });
        expect(inverted.minWordLength).toBeLessThanOrEqual(inverted.maxWordLength);
    });

    it("returns the base difficulty unchanged when the bias has no deltas set", () => {
        const base = getPuzzleDifficulty(12, "standard");
        expect(applyRegionDifficultyBias(base, {})).toEqual(base);
    });

    it("applies every real region's profile within sane bounds at every mode and every region's own level range", () => {
        for (const regionId of REGION_IDS) {
            const bias = REGION_DIFFICULTY_BIAS[regionId];
            const range = REGION_LEVEL_RANGES[regionId];
            for (const mode of MODES) {
                for (const level of [range.start, Math.floor((range.start + range.end) / 2), range.end]) {
                    const base = getPuzzleDifficulty(level, mode);
                    expectWithinSaneBounds(applyRegionDifficultyBias(base, bias));
                }
            }
        }
    });
});

describe("region tuning identities match WordSprout_1.0_Plan.md section 2.1", () => {
    it("Glowing Grove (comfort): shorter words, fewer diagonals, a more generous board than the base mode", () => {
        const base = getPuzzleDifficulty(10, "standard");
        const tuned = applyRegionDifficultyBias(base, REGION_DIFFICULTY_BIAS["glowing-grove"]);
        expect(tuned.maxWordLength).toBeLessThanOrEqual(base.maxWordLength);
        expect(tuned.diagonalProbability).toBeLessThan(base.diagonalProbability);
        expect(tuned.gridSize).toBeGreaterThanOrEqual(base.gridSize);
        expect(tuned.overlapPressure).toBeLessThanOrEqual(base.overlapPressure);
    });

    it("Sunlit Falls (confidence): more diagonals, a slightly bigger board than the base mode", () => {
        const base = getPuzzleDifficulty(25, "standard");
        const tuned = applyRegionDifficultyBias(base, REGION_DIFFICULTY_BIAS["sunlit-falls"]);
        expect(tuned.diagonalProbability).toBeGreaterThan(base.diagonalProbability);
        expect(tuned.gridSize).toBeGreaterThanOrEqual(base.gridSize);
    });

    it("Crystal Conservatory (sophistication): longer words than the base mode", () => {
        const base = getPuzzleDifficulty(35, "standard");
        const tuned = applyRegionDifficultyBias(base, REGION_DIFFICULTY_BIAS["crystal-conservatory"]);
        expect(tuned.minWordLength).toBeGreaterThanOrEqual(base.minWordLength);
        expect(tuned.maxWordLength).toBeGreaterThan(base.maxWordLength);
    });

    it("Mosswood Hollows (discovery): more reverses, less obvious placement, richer bonus potential", () => {
        const base = getPuzzleDifficulty(45, "standard");
        const tuned = applyRegionDifficultyBias(base, REGION_DIFFICULTY_BIAS["mosswood-hollows"]);
        expect(tuned.reverseWordProbability).toBeGreaterThan(base.reverseWordProbability);
        expect(tuned.overlapPressure).toBeGreaterThan(base.overlapPressure);
        expect(tuned.bonusCandidateCount).toBeGreaterThan(base.bonusCandidateCount);
    });

    it("Cloudreach Summit (mastery): density, long words, overlap pressure", () => {
        const base = getPuzzleDifficulty(60, "standard");
        const tuned = applyRegionDifficultyBias(base, REGION_DIFFICULTY_BIAS["cloudreach-summit"]);
        expect(tuned.targetCount).toBeGreaterThan(base.targetCount);
        expect(tuned.maxWordLength).toBeGreaterThan(base.maxWordLength);
        expect(tuned.overlapPressure).toBeGreaterThan(base.overlapPressure);
    });

    it("Verdant Beyond (full mechanical vocabulary while staying fair): touches multiple axes at once, none as far as a single-identity region", () => {
        const base = getPuzzleDifficulty(85, "standard");
        const tuned = applyRegionDifficultyBias(base, REGION_DIFFICULTY_BIAS["verdant-beyond"]);
        expect(tuned.diagonalProbability).toBeGreaterThan(base.diagonalProbability);
        expect(tuned.reverseWordProbability).toBeGreaterThan(base.reverseWordProbability);
        expect(tuned.overlapPressure).toBeGreaterThan(base.overlapPressure);
        expect(tuned.bonusCandidateCount).toBeGreaterThan(base.bonusCandidateCount);
        // "Staying fair": every one of Verdant Beyond's own deltas is milder
        // than Crystal Conservatory's / Cloudreach Summit's equivalent
        // single-identity push on the same axis.
        const crystalBias = REGION_DIFFICULTY_BIAS["crystal-conservatory"];
        const summitBias = REGION_DIFFICULTY_BIAS["cloudreach-summit"];
        expect(Math.abs(REGION_DIFFICULTY_BIAS["verdant-beyond"].overlapPressureDelta ?? 0))
            .toBeLessThan(Math.abs(summitBias.overlapPressureDelta ?? 0));
        expect(Math.abs(REGION_DIFFICULTY_BIAS["verdant-beyond"].maxWordLengthDelta ?? 0))
            .toBeLessThanOrEqual(Math.abs(crystalBias.maxWordLengthDelta ?? 0));
    });
});

describe("region difficulty tuning is layered on top of the player's own mode, not a replacement for it", () => {
    it("the same region still varies by base mode -- e.g. Cloudreach Summit's easy build stays easier than its challenging build", () => {
        const easyTuned = getRegionPuzzleDifficulty(60, "easy", "cloudreach-summit");
        const challengingTuned = getRegionPuzzleDifficulty(60, "challenging", "cloudreach-summit");
        expect(challengingTuned.diagonalProbability).toBeGreaterThan(easyTuned.diagonalProbability);
        expect(challengingTuned.reverseWordProbability).toBeGreaterThan(easyTuned.reverseWordProbability);
    });

    it("getRegionPuzzleDifficulty infers the region from level when none is passed explicitly", () => {
        const explicit = getRegionPuzzleDifficulty(45, "standard", "mosswood-hollows");
        const inferred = getRegionPuzzleDifficulty(45, "standard");
        expect(inferred).toEqual(explicit);
    });

    it("feeds straight into generatePuzzle via difficultyOverride and actually changes the generated board's grid size", () => {
        const level = 5;
        const mode: PuzzleMode = "standard";
        const tunedDifficulty = getRegionPuzzleDifficulty(level, mode, "glowing-grove");
        const words = ["ALPHA", "BETA", "GAMMA"];
        const result = generatePuzzle({
            targetWords: words, category: "Region", level, mode,
            difficultyOverride: tunedDifficulty, rng: seeded(1),
        });
        expect(result.gridSize).toBe(tunedDifficulty.gridSize);
    });
});

describe("buildBiasedCategorySequence / pickCategoryForLevel", () => {
    const pool = [{ name: "A" }, { name: "B" }, { name: "C" }];

    it("never drops an unfavored entry from the sequence", () => {
        const sequence = buildBiasedCategorySequence(pool, ["B"], 4);
        expect(sequence.filter(c => c.name === "A")).toHaveLength(1);
        expect(sequence.filter(c => c.name === "B")).toHaveLength(4);
        expect(sequence.filter(c => c.name === "C")).toHaveLength(1);
    });

    it("with no favorites, matches the plain pool order exactly", () => {
        const sequence = buildBiasedCategorySequence(pool, [], 5);
        expect(sequence.map(c => c.name)).toEqual(pool.map(c => c.name));
    });

    it("a favored name absent from the pool changes nothing", () => {
        const sequence = buildBiasedCategorySequence(pool, ["Not In Pool"], 5);
        expect(sequence.map(c => c.name)).toEqual(pool.map(c => c.name));
    });

    it("pickCategoryForLevel with no bias matches plain level-indexed cycling", () => {
        for (let level = 1; level <= 6; level++) {
            expect(pickCategoryForLevel(pool, level)).toEqual(pool[(level - 1) % pool.length]);
        }
    });

    it("pickCategoryForLevel with a bias picks a favored entry more often across a full cycle", () => {
        const bias = { favoredCategories: ["B"], weight: 3 };
        const picks = Array.from({ length: 15 }, (_, i) => pickCategoryForLevel(pool, i + 1, bias)?.name);
        const bCount = picks.filter(name => name === "B").length;
        const aCount = picks.filter(name => name === "A").length;
        expect(bCount).toBeGreaterThan(aCount);
        // Still guaranteed a turn -- never fully excluded.
        expect(picks).toContain("A");
        expect(picks).toContain("C");
    });

    it("returns undefined for an empty pool instead of throwing", () => {
        expect(pickCategoryForLevel([], 1)).toBeUndefined();
        expect(pickCategoryForLevel([], 1, { favoredCategories: ["X"], weight: 2 })).toBeUndefined();
    });
});

describe("REGION_CATEGORY_BIAS data", () => {
    it("defines every region with at least one favored category and a weight greater than 1", () => {
        for (const regionId of REGION_IDS) {
            const bias = REGION_CATEGORY_BIAS[regionId];
            expect(bias.favoredCategories.length).toBeGreaterThan(0);
            expect(bias.weight).toBeGreaterThan(1);
        }
    });
});
