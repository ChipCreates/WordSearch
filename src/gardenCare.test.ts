import { describe, expect, it } from "vitest";
import { gardenNeedsTending } from "./gardenCare";
import { GARDEN_WATERING_COOLDOWN_MS } from "./gameMechanics";
import { createAfflictionState } from "./plantAffliction";
import { MIN_FERTILIZER_COST } from "./economy";

const NOW = 1_700_000_000_000;
const STARTER_PLANT_ID = "moss-sprout"; // purchaseCost 0 -> fertilizerCost is always MIN_FERTILIZER_COST

function baseParams() {
    return {
        ownedPlants: [STARTER_PLANT_ID],
        growthByPlant: { [STARTER_PLANT_ID]: 20 },
        wateredTimestamps: { [STARTER_PLANT_ID]: NOW },
        afflictions: createAfflictionState(),
        seeds: 0,
        now: NOW,
    };
}

describe("gardenNeedsTending", () => {
    it("is false when nothing is owned", () => {
        expect(gardenNeedsTending({ ...baseParams(), ownedPlants: [] })).toBe(false);
    });

    it("is false for a freshly-watered, unaffordable-fertilizer garden", () => {
        expect(gardenNeedsTending(baseParams())).toBe(false);
    });

    it("is true once a growing, unafflicted plant passes its watering cooldown", () => {
        const params = baseParams();
        params.wateredTimestamps[STARTER_PLANT_ID] = NOW - GARDEN_WATERING_COOLDOWN_MS - 1;
        expect(gardenNeedsTending(params)).toBe(true);
    });

    it("is false for a neglected plant that's already fully grown", () => {
        const params = baseParams();
        params.wateredTimestamps[STARTER_PLANT_ID] = NOW - GARDEN_WATERING_COOLDOWN_MS - 1;
        params.growthByPlant[STARTER_PLANT_ID] = 100;
        expect(gardenNeedsTending(params)).toBe(false);
    });

    it("is false for a neglected plant that's currently afflicted (needs treatment, not watering)", () => {
        const params = baseParams();
        params.wateredTimestamps[STARTER_PLANT_ID] = NOW - GARDEN_WATERING_COOLDOWN_MS - 1;
        params.afflictions[STARTER_PLANT_ID] = { type: "blight", severity: 1, puzzlesSinceOnset: 0 };
        expect(gardenNeedsTending(params)).toBe(false);
    });

    it("is true when the player can afford fertilizer for a growing plant, even if recently watered", () => {
        const params = baseParams();
        params.seeds = MIN_FERTILIZER_COST;
        expect(gardenNeedsTending(params)).toBe(true);
    });

    it("is false when the player can't yet afford fertilizer for any growing plant", () => {
        const params = baseParams();
        params.seeds = MIN_FERTILIZER_COST - 1;
        expect(gardenNeedsTending(params)).toBe(false);
    });
});
