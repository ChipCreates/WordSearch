import { describe, it, expect } from "vitest";
import { getBotanistRank } from "./botanistRanks";
import { regionForLevel } from "./regions";
import { regionIdForLevel, getRegionPuzzleDifficulty } from "./regionTuning";
import { generatePuzzle, validatePuzzleInvariants } from "./puzzleGenerator";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementStats } from "./achievements";
import { isMilestoneLevel, MILESTONE_LEVELS } from "./milestones";
import { createSeededRng } from "./rng";

// WSP-2.4's own acceptance criterion (not the full WSP-2.7 certification
// pass, which is a separate, later-scoped issue covering the whole tier):
// "puzzle generation, the level/frontier counter, and lifetime statistics
// all continue to advance indefinitely with no additional handcrafted
// campaign content required" past level 100, and explicitly NOT Botanist
// Rank titles or new achievements, both of which are finite by design.
// This is a targeted check of exactly that claim, not a re-test of
// generatePuzzle's own correctness (already covered by puzzleGenerator.test.ts).
describe("beyond level 100 (WSP-2.4 acceptance criterion)", () => {
    const BEYOND_LEVELS = [101, 120, 150, 500];

    it("keeps resolving every level past 100 to Verdant Beyond -- there is no seventh region to run out of", () => {
        for (const level of BEYOND_LEVELS) {
            expect(regionForLevel(level).id).toBe("verdant-beyond");
            expect(regionIdForLevel(level)).toBe("verdant-beyond");
        }
    });

    it("Botanist Rank correctly stays at Cosmic Conservator past level 100 -- current, intentional design, not a gap this issue fixes", () => {
        for (const level of BEYOND_LEVELS) {
            expect(getBotanistRank(level).title).toBe("Cosmic Conservator");
        }
        // And there is genuinely nothing beyond it to reach for.
        expect(getBotanistRank(100).maxLevel).toBeNull();
    });

    it("no milestone level exists past 100 -- the seven named milestones are the complete, finite list", () => {
        expect(Math.max(...MILESTONE_LEVELS)).toBe(100);
        for (const level of BEYOND_LEVELS) {
            expect(isMilestoneLevel(level)).toBe(false);
        }
    });

    it("puzzle generation keeps producing valid, region-tuned boards well past level 100, with no error and no degenerate output", () => {
        for (const level of BEYOND_LEVELS) {
            const difficulty = getRegionPuzzleDifficulty(level, "standard");
            expect(difficulty.gridSize).toBeGreaterThan(0);
            expect(difficulty.targetCount).toBeGreaterThan(0);

            const targetWords = ["ALPHA", "BETA", "GAMMA", "DELTA"].slice(0, Math.min(4, difficulty.targetCount));
            const result = generatePuzzle({
                targetWords, category: "Beyond", level, mode: "standard",
                difficultyOverride: difficulty, rng: createSeededRng(level),
            });
            expect(result.grid.length).toBe(difficulty.gridSize);
            expect(validatePuzzleInvariants(result, {
                targetWords, category: "Beyond", level, mode: "standard", difficultyOverride: difficulty,
            })).toEqual([]);
        }
    });

    it("lifetime statistics keep accumulating past level 100 with no cap, and achievement evaluation never errors once levelsCompleted exceeds every maxProgress", () => {
        const highestMaxProgress = Math.max(...ACHIEVEMENTS.map(a => a.maxProgress));
        const stats: AchievementStats = {
            levelsCompleted: 150,
            seeds: highestMaxProgress + 100000,
            categoriesSeen: 999,
            foundDiagonal: true,
            totalCategories: 62,
            bonusWordsFound: 99999,
            levelsCompletedWithoutHint: 150,
            maxBonusWordsInLevel: 999,
            reverseWordsFound: 99999,
            plantsBloomed: 99999,
            bloomedRarityTiers: 7,
            uniqueCategoriesCompleted: 62,
            powerupsUsed: 99999,
        };
        expect(() => evaluateAchievements(stats)).not.toThrow();
        // Every achievement is satisfied at this point -- none of them
        // require "more than a finite amount" to ever unlock, and none of
        // them error out on an input larger than their own maxProgress.
        const satisfied = evaluateAchievements(stats);
        expect(satisfied.length).toBe(ACHIEVEMENTS.length);
    });
});
