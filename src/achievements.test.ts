import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementStats } from "./achievements";

const baseStats: AchievementStats = {
    levelsCompleted: 0,
    seeds: 0,
    categoriesSeen: 0,
    foundDiagonal: false,
    totalCategories: 20,
    bonusWordsFound: 0,
    levelsCompletedWithoutHint: 0,
    maxBonusWordsInLevel: 0,
    reverseWordsFound: 0,
    plantsBloomed: 0,
    bloomedRarityTiers: 0,
    uniqueCategoriesCompleted: 0,
    powerupsUsed: 0,
};

describe("achievements", () => {
    it("has unique IDs and descriptions that match distinct predicates", () => {
        expect(new Set(ACHIEVEMENTS.map(achievement => achievement.id)).size).toBe(ACHIEVEMENTS.length);
        expect(new Set(ACHIEVEMENTS.map(achievement => achievement.description)).size).toBe(ACHIEVEMENTS.length);
    });

    it("keeps the strongest legacy badge IDs while rewarding distinct behaviors", () => {
        const unlocked = evaluateAchievements({
            ...baseStats,
            levelsCompleted: 50,
            seeds: 1000,
            categoriesSeen: 8,
            foundDiagonal: true,
            bonusWordsFound: 5,
            levelsCompletedWithoutHint: 5,
            maxBonusWordsInLevel: 3,
            reverseWordsFound: 1,
            plantsBloomed: 1,
            bloomedRarityTiers: 3,
            uniqueCategoriesCompleted: 10,
            powerupsUsed: 1,
        });

        expect(unlocked).toHaveLength(ACHIEVEMENTS.length);
        expect(unlocked).toContain("nimble-planter");
        expect(unlocked).toContain("word-weaver");
        expect(unlocked).toContain("root-master");
    });
});
