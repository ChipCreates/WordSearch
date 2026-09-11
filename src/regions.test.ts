import { describe, it, expect } from "vitest";
import { REGIONS, regionForLevel, getRegionById, regionRewardClaimKey, isRegionRewardClaimed } from "./regions";

describe("REGIONS (WSP-2.2)", () => {
    it("preserves the six existing regions and their exact level ranges", () => {
        expect(REGIONS.map(r => [r.id, r.start, r.end])).toEqual([
            ["glowing-grove", 1, 20],
            ["sunlit-falls", 21, 30],
            ["crystal-conservatory", 31, 40],
            ["mosswood-hollows", 41, 50],
            ["cloudreach-summit", 51, 70],
            ["verdant-beyond", 71, 100],
        ]);
    });

    it("covers levels 1-100 contiguously with no gaps or overlaps", () => {
        for (let i = 1; i < REGIONS.length; i++) {
            expect(REGIONS[i].start).toBe(REGIONS[i - 1].end + 1);
        }
        expect(REGIONS[0].start).toBe(1);
        expect(REGIONS[REGIONS.length - 1].end).toBe(100);
    });

    it("every region carries a theme reference, category bias, difficulty profile reference, and completion reward", () => {
        for (const region of REGIONS) {
            expect(region.ambientThemeKey.length).toBeGreaterThan(0);
            expect(region.categoryBias.length).toBeGreaterThan(0);
            expect(region.difficultyProfileRef.length).toBeGreaterThan(0);
            expect(region.completionReward.seeds).toBeGreaterThan(0);
        }
    });

    it("only the first region has no entry reward -- every other region does", () => {
        expect(REGIONS[0].entryReward).toBeNull();
        for (const region of REGIONS.slice(1)) {
            expect(region.entryReward?.seeds).toBeGreaterThan(0);
        }
    });

    it("regionForLevel resolves boundary levels to the correct region", () => {
        expect(regionForLevel(1).id).toBe("glowing-grove");
        expect(regionForLevel(20).id).toBe("glowing-grove");
        expect(regionForLevel(21).id).toBe("sunlit-falls");
        expect(regionForLevel(50).id).toBe("mosswood-hollows");
        expect(regionForLevel(51).id).toBe("cloudreach-summit");
        expect(regionForLevel(100).id).toBe("verdant-beyond");
    });

    it("regionForLevel falls back to the last region indefinitely past level 100", () => {
        expect(regionForLevel(101).id).toBe("verdant-beyond");
        expect(regionForLevel(9999).id).toBe("verdant-beyond");
    });

    it("getRegionById finds a region by id and returns undefined for an unknown one", () => {
        expect(getRegionById("mosswood-hollows")?.name).toBe("Mosswood Hollows");
        expect(getRegionById("nonexistent-region")).toBeUndefined();
    });

    it("regionRewardClaimKey/isRegionRewardClaimed build and check the same canonical key", () => {
        const key = regionRewardClaimKey("glowing-grove", "completion");
        expect(key).toBe("glowing-grove:completion");
        expect(isRegionRewardClaimed([key], "glowing-grove", "completion")).toBe(true);
        expect(isRegionRewardClaimed([key], "glowing-grove", "entry")).toBe(false);
        expect(isRegionRewardClaimed([], "glowing-grove", "completion")).toBe(false);
    });
});
