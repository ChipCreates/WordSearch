export type PowerupId =
    | "single-letter-sprout"
    | "lumina-cyclone"
    | "super-root"
    | "bioluminescent-compass"
    | "flora-spectrometer"
    | "nitrogen-booster";

export type PowerupInventory = Record<PowerupId, number>;

export type PowerupDefinition = {
    id: PowerupId;
    title: string;
    shortLabel: string;
    description: string;
    cost: number;
    image: string;
};

export const POWERUP_DEFINITIONS: Record<PowerupId, PowerupDefinition> = {
    "single-letter-sprout": {
        id: "single-letter-sprout",
        title: "Single Letter Sprout",
        shortLabel: "Hint",
        description: "Highlights the starting letter of a target word",
        cost: 50,
        image: "/powerups/sprout_radar.png",
    },
    "lumina-cyclone": {
        id: "lumina-cyclone",
        title: "Lumina Cyclone",
        shortLabel: "Shuffle",
        description: "Scrambles the board while keeping your progress",
        cost: 100,
        image: "/powerups/lumina_cyclone.png",
    },
    "super-root": {
        id: "super-root",
        title: "Super Root Hint",
        shortLabel: "Solve word",
        description: "Instantly reveals and solves an entire target word",
        cost: 250,
        image: "/powerups/root_tunneler.png",
    },
    "bioluminescent-compass": {
        id: "bioluminescent-compass",
        title: "Bioluminescent Compass",
        shortLabel: "Compass",
        description: "Shows a directional guide towards the next word",
        cost: 350,
        image: "/powerups/bioluminescent_compass.png",
    },
    "flora-spectrometer": {
        id: "flora-spectrometer",
        title: "Flora Spectrometer",
        shortLabel: "Spectrometer",
        description: "Temporarily highlights every unfound word's starting cell",
        cost: 500,
        image: "/powerups/flora_spectrometer.png",
    },
    "nitrogen-booster": {
        id: "nitrogen-booster",
        title: "Nitrogen Booster",
        shortLabel: "Double Seeds",
        description: "Doubles seed rewards for the rest of this level",
        cost: 600,
        image: "/powerups/nitrogen_booster.png",
    },
};

export const DEFAULT_POWERUP_INVENTORY: PowerupInventory = {
    "single-letter-sprout": 0,
    "lumina-cyclone": 0,
    "super-root": 0,
    "bioluminescent-compass": 0,
    "flora-spectrometer": 0,
    "nitrogen-booster": 0,
};

export function normalizePowerupInventory(value: unknown): PowerupInventory {
    const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return Object.fromEntries(
        (Object.keys(DEFAULT_POWERUP_INVENTORY) as PowerupId[]).map(id => [
            id,
            typeof source[id] === "number" && Number.isFinite(source[id])
                ? Math.max(0, Math.floor(source[id] as number))
                : DEFAULT_POWERUP_INVENTORY[id],
        ]),
    ) as PowerupInventory;
}

export function addPowerupCharge(inventory: PowerupInventory, id: PowerupId): PowerupInventory {
    return { ...inventory, [id]: inventory[id] + 1 };
}

export function consumePowerupCharge(inventory: PowerupInventory, id: PowerupId): { inventory: PowerupInventory; consumed: boolean } {
    if (inventory[id] <= 0) return { inventory, consumed: false };
    return { inventory: { ...inventory, [id]: inventory[id] - 1 }, consumed: true };
}

export function purchasePowerupCharge(
    seeds: number,
    inventory: PowerupInventory,
    id: PowerupId,
): { seeds: number; inventory: PowerupInventory; purchased: boolean } {
    const cost = POWERUP_DEFINITIONS[id].cost;
    if (seeds < cost) return { seeds, inventory, purchased: false };
    return { seeds: seeds - cost, inventory: addPowerupCharge(inventory, id), purchased: true };
}
