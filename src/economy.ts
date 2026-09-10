import type { PlantDef } from "./plantsCatalog";

export const STARTER_PLANT_ID = "moss-sprout";
export const STARTER_BLOOM_BOUNTY = 50;
export const PURCHASED_BLOOM_REBATE_RATE = 0.5;
export const FERTILIZER_RATE = 0.1;
export const MIN_FERTILIZER_COST = 25;
export const FERTILIZER_ROUNDING = 5;

export type PlantEconomy = {
    purchaseCost: number;
    bloomBounty: number;
    fertilizerCost: number;
};

function roundReadable(value: number): number {
    return Math.max(FERTILIZER_ROUNDING, Math.round(value / FERTILIZER_ROUNDING) * FERTILIZER_ROUNDING);
}

export function getPlantEconomy(plant: Pick<PlantDef, "id" | "seedCost">): PlantEconomy {
    const purchaseCost = plant.id === STARTER_PLANT_ID ? 0 : plant.seedCost;
    const bloomBounty = plant.id === STARTER_PLANT_ID
        ? STARTER_BLOOM_BOUNTY
        : roundReadable(purchaseCost * PURCHASED_BLOOM_REBATE_RATE);
    const fertilizerCost = Math.max(MIN_FERTILIZER_COST, roundReadable(purchaseCost * FERTILIZER_RATE));
    return { purchaseCost, bloomBounty, fertilizerCost };
}

export function pathNetSeeds(plant: Pick<PlantDef, "id" | "seedCost">, fertilizerApplications: number): number {
    const economy = getPlantEconomy(plant);
    return economy.bloomBounty - economy.purchaseCost - economy.fertilizerCost * fertilizerApplications;
}

// Cosmetic/collectible store items -- one-time unlocks with no gameplay
// effect. Consolidated here (not inline in SeedStoreDialog) for the same
// reason plant/powerup pricing lives in one place: a component reading its
// own copy of a price for display and a separate copy for the actual
// charge is exactly how those two numbers drift apart.
export type CosmeticId = "autumn-theme" | "ocean-theme" | "golden-crest";
export type CosmeticDefinition = { id: CosmeticId; title: string; cost: number };

export const COSMETIC_DEFINITIONS: Record<CosmeticId, CosmeticDefinition> = {
    "autumn-theme": { id: "autumn-theme", title: "Autumn Canopy Theme", cost: 800 },
    "ocean-theme": { id: "ocean-theme", title: "Ocean Trench Theme", cost: 800 },
    "golden-crest": { id: "golden-crest", title: "Golden Sprout Crest", cost: 1500 },
};
