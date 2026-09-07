import { describe, expect, it } from "vitest";
import { getSidebarProfileModel } from "./sidebarModels";
import { getGardenCareModel } from "./gardenModels";
import { getClosestMilestones } from "./achievementModels";
import { DEFAULT_SAVE_DATA } from "../../persistence";

describe("sidebar profile model", () => {
    it("derives progress from the permanent frontier, not the replay selection", () => {
        const model = getSidebarProfileModel(10);
        expect(model.level).toBe(10);
        expect(model.rankTitle).toBe("Moonlit Keeper");
        expect(model.progress).toBeGreaterThan(0);
        expect(model.nextRankTitle).toBe("Canopy Guide");
        expect(model.levelsToNextRank).toBe(3);
    });

    it("handles the max-rank boundary", () => {
        const model = getSidebarProfileModel(999);
        expect(model.isMaxRank).toBe(true);
        expect(model.nextRankTitle).toBeNull();
        expect(model.progress).toBe(1);
    });
});

describe("sidebar contextual models", () => {
    it("orders garden care by readiness and nearest bloom", () => {
        const now = 10_000_000;
        const model = getGardenCareModel(["moss-sprout", "emerald-fern"], { "moss-sprout": 0, "emerald-fern": now }, { "moss-sprout": 25, "emerald-fern": 75 }, now);
        expect(model.readyCount).toBe(1);
        expect(model.closestPlant).toEqual({ name: "Emerald Fern", growth: 75 });
        expect(model.collectionCount).toBe(2);
    });

    it("sorts closest milestones by normalized remaining progress", () => {
        const stats = { ...DEFAULT_SAVE_DATA, totalCategories: 54 };
        const milestones = getClosestMilestones({
            levelsCompleted: stats.levelsCompleted,
            seeds: 999,
            categoriesSeen: stats.categoriesSeen.length,
            foundDiagonal: false,
            totalCategories: 54,
            bonusWordsFound: 4,
            levelsCompletedWithoutHint: 0,
            maxBonusWordsInLevel: 0,
            reverseWordsFound: 0,
            plantsBloomed: 0,
            bloomedRarityTiers: 0,
            uniqueCategoriesCompleted: 0,
            powerupsUsed: 0,
        }, new Set());
        expect(milestones[0].achievement.id).toBe("bloom-herald");
        expect(milestones.every(item => item.ratioRemaining > 0)).toBe(true);
    });
});
