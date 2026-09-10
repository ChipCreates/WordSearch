import { describe, expect, it } from "vitest";
import { PLANTS_CATALOG } from "./plantsCatalog";
import { COSMETIC_DEFINITIONS, getPlantEconomy, pathNetSeeds, STARTER_PLANT_ID } from "./economy";

describe("garden economy", () => {
    it("keeps the starter plant free with a 50 Seed first-bloom bounty", () => {
        const starter = PLANTS_CATALOG.find(plant => plant.id === STARTER_PLANT_ID)!;
        expect(getPlantEconomy(starter)).toMatchObject({ purchaseCost: 0, bloomBounty: 50 });
        expect(pathNetSeeds(starter, 0)).toBe(50);
    });

    it("keeps every purchased plant negative on the all-water path", () => {
        for (const plant of PLANTS_CATALOG.filter(plant => plant.id !== STARTER_PLANT_ID)) {
            const economy = getPlantEconomy(plant);
            expect(economy.bloomBounty).toBeGreaterThanOrEqual(plant.seedCost * 0.4);
            expect(economy.bloomBounty).toBeLessThanOrEqual(plant.seedCost * 0.6);
            expect(pathNetSeeds(plant, 0)).toBeLessThan(0);
        }
    });

    it("scales fertilizer cost and makes every four-fertilizer path non-positive", () => {
        for (const plant of PLANTS_CATALOG) {
            const economy = getPlantEconomy(plant);
            expect(economy.fertilizerCost).toBeGreaterThanOrEqual(25);
            if (plant.id !== STARTER_PLANT_ID) expect(pathNetSeeds(plant, 4)).toBeLessThan(0);
        }
    });
});

describe("cosmetic store consolidation (WSP-1.3)", () => {
    it("gives every cosmetic a positive, sane cost with a matching id/key", () => {
        for (const [key, def] of Object.entries(COSMETIC_DEFINITIONS)) {
            expect(def.id).toBe(key);
            expect(def.cost).toBeGreaterThan(0);
            expect(def.title.length).toBeGreaterThan(0);
        }
    });
});
