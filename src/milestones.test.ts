import { describe, it, expect } from "vitest";
import {
    MILESTONE_LEVELS, isMilestoneLevel, getMilestoneContent,
    getRegionTransitionIntensity, REGION_TRANSITION_DURATION_MS,
} from "./milestones";
import { REWARD_INTENSITY_LEVELS, type RewardIntensity } from "./rewardIntensity";

describe("MILESTONE_LEVELS (WSP-2.4)", () => {
    it("is exactly the seven levels the plan calls out, in order", () => {
        expect(MILESTONE_LEVELS).toEqual([10, 20, 30, 40, 50, 70, 100]);
    });

    it("isMilestoneLevel is true only for those seven levels", () => {
        for (const level of MILESTONE_LEVELS) {
            expect(isMilestoneLevel(level)).toBe(true);
        }
        for (const level of [1, 5, 11, 19, 21, 45, 71, 99, 101, 150]) {
            expect(isMilestoneLevel(level)).toBe(false);
        }
    });

    it("every milestone level has real content with a valid intensity", () => {
        for (const level of MILESTONE_LEVELS) {
            const content = getMilestoneContent(level);
            expect(content).toBeDefined();
            expect(content!.level).toBe(level);
            expect(content!.title.length).toBeGreaterThan(0);
            expect(content!.body.length).toBeGreaterThan(0);
            expect(REWARD_INTENSITY_LEVELS).toContain(content!.intensity);
        }
    });

    it("returns undefined for a non-milestone level instead of throwing", () => {
        expect(getMilestoneContent(11)).toBeUndefined();
        expect(getMilestoneContent(0)).toBeUndefined();
    });

    it("intensity is not identical across every milestone -- earlier ones read as lighter than later ones", () => {
        const intensities = MILESTONE_LEVELS.map(level => getMilestoneContent(level)!.intensity);
        expect(new Set(intensities).size).toBeGreaterThan(1);
        // Non-decreasing when walked in level order, and level 10's
        // intensity is strictly lower than level 100's -- "progressively
        // lower tiers" for earlier milestones, not a flat line.
        const rank = (intensity: RewardIntensity) => REWARD_INTENSITY_LEVELS.indexOf(intensity);
        for (let i = 1; i < intensities.length; i++) {
            expect(rank(intensities[i])).toBeGreaterThanOrEqual(rank(intensities[i - 1]));
        }
        expect(rank(intensities[0])).toBeLessThan(rank(intensities[intensities.length - 1]));
    });

    it("level 100 uses the top ('exceptional') tier, per WSP-2.4's acceptance criteria", () => {
        expect(getMilestoneContent(100)!.intensity).toBe("exceptional");
    });

    it("level 100's copy explicitly says play continues -- this is not framed as an ending", () => {
        const content = getMilestoneContent(100)!;
        const text = `${content.title} ${content.subtitle} ${content.body}`.toLowerCase();
        // Must actually say the journey continues, not just avoid the word "end".
        expect(text).toMatch(/keep|continu|more to give|more words to find|isn't the end/);
        // And must not imply Botanist Rank or achievements keep unlocking
        // forever past level 100 -- neither system is mentioned as still
        // growing in this copy.
        expect(text).not.toMatch(/new rank|higher rank|more achievements|new achievement/);
    });
});

describe("region-transition intensity/duration (WSP-2.4)", () => {
    it("completion reads as a bigger moment than entry", () => {
        const entryRank = REWARD_INTENSITY_LEVELS.indexOf(getRegionTransitionIntensity("entry"));
        const completionRank = REWARD_INTENSITY_LEVELS.indexOf(getRegionTransitionIntensity("completion"));
        expect(completionRank).toBeGreaterThan(entryRank);
    });

    it("duration stays within the acceptance criteria's 3-6 second window on both platforms", () => {
        expect(REGION_TRANSITION_DURATION_MS.desktop).toBeGreaterThanOrEqual(3000);
        expect(REGION_TRANSITION_DURATION_MS.desktop).toBeLessThanOrEqual(6000);
        expect(REGION_TRANSITION_DURATION_MS.mobile).toBeGreaterThanOrEqual(3000);
        expect(REGION_TRANSITION_DURATION_MS.mobile).toBeLessThanOrEqual(6000);
    });
});
