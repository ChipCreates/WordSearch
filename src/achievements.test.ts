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
            levelsCompleted: 100,
            seeds: 1000,
            categoriesSeen: 50,
            totalCategories: 50,
            foundDiagonal: true,
            bonusWordsFound: 100,
            levelsCompletedWithoutHint: 50,
            maxBonusWordsInLevel: 3,
            reverseWordsFound: 50,
            plantsBloomed: 20,
            bloomedRarityTiers: 3,
            uniqueCategoriesCompleted: 10,
            powerupsUsed: 50,
        });

        expect(unlocked).toHaveLength(ACHIEVEMENTS.length);
        expect(unlocked).toContain("nimble-planter");
        expect(unlocked).toContain("word-weaver");
        expect(unlocked).toContain("root-master");
    });

    it("keeps long-term families ordered by stable tier metadata", () => {
        const levels = ACHIEVEMENTS.filter(achievement => achievement.family === "level-clears");
        // WSP-2.5 folded the old standalone "zenith-climber" (50 levels) into
        // this family as its "gold" rung -- it used to sit unlabeled between
        // level-clears-25 and level-clears-100, duplicating the same
        // levelsCompleted predicate this family already tracks.
        expect(levels.map(achievement => achievement.tier)).toEqual(["bronze", "silver", "gold", "exceptional"]);
        expect(levels.map(achievement => achievement.maxProgress)).toEqual([10, 25, 50, 100]);
        expect(ACHIEVEMENTS.filter(achievement => achievement.actionableCopy).length).toBeGreaterThan(10);
    });

    it("never leaves an achievement description implying daily/calendar logic (WSP-2.5)", () => {
        // AchievementStats has no date/streak field -- any description
        // implying daily/calendar-based tracking would be describing
        // behavior the code doesn't actually have.
        for (const achievement of ACHIEVEMENTS) {
            expect(achievement.description.toLowerCase()).not.toMatch(/\bdaily\b|\bstreak\b|\bcalendar\b/);
        }
    });

    it("has no two achievements checking the same stat at the same effective threshold", () => {
        // Fuzz across many random stat combinations and compare each
        // achievement's full progress "fingerprint" (its getProgress output
        // across every trial). Two achievements that produce an identical
        // fingerprint AND share the same maxProgress are, for all practical
        // purposes, tracking the same underlying stat at the same threshold
        // -- exactly the zenith-climber/level-clears-50 duplication this
        // issue fixed. Genuinely distinct "first X" achievements
        // (night-bloomer, root-master, solar-scribe, moss-mystic -- all
        // maxProgress 1, but keyed off different stats) reliably diverge
        // across these trials since each only reacts to its own field.
        const rng = (seed: number) => {
            let state = seed;
            return () => {
                state = (state * 1103515245 + 12345) & 0x7fffffff;
                return state / 0x7fffffff;
            };
        };
        const next = rng(20260911);
        const trials: AchievementStats[] = Array.from({ length: 40 }, () => ({
            levelsCompleted: Math.floor(next() * 140),
            seeds: Math.floor(next() * 1500),
            categoriesSeen: Math.floor(next() * 40),
            foundDiagonal: next() > 0.5,
            totalCategories: 40,
            bonusWordsFound: Math.floor(next() * 130),
            levelsCompletedWithoutHint: Math.floor(next() * 60),
            maxBonusWordsInLevel: Math.floor(next() * 5),
            reverseWordsFound: Math.floor(next() * 60),
            plantsBloomed: Math.floor(next() * 25),
            bloomedRarityTiers: Math.floor(next() * 7),
            uniqueCategoriesCompleted: Math.floor(next() * 15),
            powerupsUsed: Math.floor(next() * 60),
        }));

        const fingerprints = ACHIEVEMENTS.map(achievement => ({
            id: achievement.id,
            maxProgress: achievement.maxProgress,
            signature: trials.map(stats => achievement.getProgress(stats)).join(","),
        }));

        for (let i = 0; i < fingerprints.length; i++) {
            for (let j = i + 1; j < fingerprints.length; j++) {
                const a = fingerprints[i];
                const b = fingerprints[j];
                if (a.maxProgress === b.maxProgress && a.signature === b.signature) {
                    throw new Error(
                        `"${a.id}" and "${b.id}" track the same stat at the same threshold `
                        + `(identical progress across ${trials.length} randomized trials).`,
                    );
                }
            }
        }
    });
});
