import { GARDEN_WATERING_COOLDOWN_MS } from "./gameMechanics";
import { getPlantEconomy } from "./economy";
import type { AfflictionState } from "./plantAffliction";
import { PLANTS_CATALOG } from "./plantsCatalog";

export type GardenCareCheck = {
    ownedPlants: string[];
    growthByPlant: Record<string, number>;
    wateredTimestamps: Record<string, number>;
    afflictions: AfflictionState;
    seeds: number;
    now: number;
};

/**
 * A single, generic "your garden needs attention" signal -- deliberately not
 * a per-plant breakdown. A player with many plants sharing the same 2-hour
 * watering cooldown could otherwise come back to a wall of individual
 * "X needs watering" lines; this stays exactly the same size regardless of
 * garden size; the player decides what (if anything) to do about it, and
 * where -- this is purely informational, it never names a plant or points
 * anywhere.
 */
export function gardenNeedsTending({ ownedPlants, growthByPlant, wateredTimestamps, afflictions, seeds, now }: GardenCareCheck): boolean {
    const growingUnafflicted = PLANTS_CATALOG.filter(plant =>
        ownedPlants.includes(plant.id) &&
        (growthByPlant[plant.id] ?? 0) < 100 &&
        !afflictions[plant.id],
    );
    // The same "ready to water again" threshold waterAllReady itself uses --
    // NOT plantAffliction's isNeglected, which requires several times longer
    // (it's judging affliction-onset risk, a stricter and unrelated
    // question from "is it due for a routine watering").
    const needsWatering = growingUnafflicted.some(plant =>
        now - (wateredTimestamps[plant.id] ?? 0) >= GARDEN_WATERING_COOLDOWN_MS,
    );
    if (needsWatering) return true;
    return growingUnafflicted.some(plant => seeds >= getPlantEconomy(plant).fertilizerCost);
}
