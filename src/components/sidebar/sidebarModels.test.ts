import { describe, expect, it } from "vitest";
import { getSidebarProfileModel } from "./sidebarModels";

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
