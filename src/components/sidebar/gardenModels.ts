import { GARDEN_WATERING_COOLDOWN_MS } from "../../gameMechanics";
import { PLANTS_CATALOG } from "../../plantsCatalog";
import type { AfflictionState } from "../../plantAffliction";

export type GardenCareModel = {
    readyCount: number;
    nextReadyAt: number | null;
    closestPlant: { name: string; growth: number } | null;
    collectionCount: number;
    bloomCount: number;
    sickCount: number;
};

export function getGardenCareModel(
    ownedPlants: string[],
    wateredTimestamps: Record<string, number>,
    growthByPlant: Record<string, number>,
    now: number,
    afflictions: AfflictionState = {},
): GardenCareModel {
    const plants = PLANTS_CATALOG.filter(plant => ownedPlants.includes(plant.id));
    const ready = plants.filter(plant => {
        const growth = growthByPlant[plant.id] ?? 0;
        return growth < 100 && now - (wateredTimestamps[plant.id] ?? 0) >= GARDEN_WATERING_COOLDOWN_MS;
    });
    const nextReadyAt = plants
        .filter(plant => (growthByPlant[plant.id] ?? 0) < 100)
        .map(plant => (wateredTimestamps[plant.id] ?? 0) + GARDEN_WATERING_COOLDOWN_MS)
        .filter(timestamp => timestamp > now)
        .sort((a, b) => a - b)[0] ?? null;
    const closest = plants
        .filter(plant => (growthByPlant[plant.id] ?? 0) < 100)
        .sort((a, b) => (growthByPlant[b.id] ?? 0) - (growthByPlant[a.id] ?? 0))[0];
    return {
        readyCount: ready.length,
        nextReadyAt,
        closestPlant: closest ? { name: closest.name, growth: growthByPlant[closest.id] ?? 0 } : null,
        collectionCount: plants.length,
        bloomCount: plants.filter(plant => (growthByPlant[plant.id] ?? 0) >= 100).length,
        sickCount: plants.filter(plant => afflictions[plant.id]).length,
    };
}

export function formatCareCountdown(timestamp: number | null, now: number): string {
    if (timestamp === null) return "No plants waiting";
    const remaining = Math.max(0, timestamp - now);
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    return `${hours}h ${minutes}m`;
}
