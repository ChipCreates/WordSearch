import { getStageImage } from "./plantsCatalog";

export type PlantVisualState = "healthy" | "sick";

export const SICK_PLANT_ORDER = [
    "moss-sprout",
    "emerald-fern",
    "succulent-rosette",
    "midnight-lotus",
    "golden-sunflower",
    "bonsai-bloom",
    "crystal-succulent",
    "solar-vine",
    "starlight-dahlia",
    "monstera-deliciosa",
    "frost-rose",
    "lunar-bamboo",
    "amber-flytrap",
    "calathea-orbifolia",
    "ether-cherry",
    "prism-cactus",
    "shadow-thistle",
    "pothos-trailing",
    "aurora-clover",
    "ficus-lyrata",
] as const;

export const SICK_PLANT_SPRITESHEET = {
    src: "/plants/sick-plants-spritesheet.webp",
    width: 2560,
    height: 2048,
    columns: 5,
    rows: 4,
    cellWidth: 512,
    cellHeight: 512,
} as const;

export type SickPlantId = (typeof SICK_PLANT_ORDER)[number];

export type PlantArtwork =
    | { kind: "image"; src: string }
    | {
        kind: "sprite";
        src: string;
        index: number;
        column: number;
        row: number;
        backgroundSize: string;
        backgroundPosition: string;
    };

const sickPlantIndexes = new Map<string, number>(
    SICK_PLANT_ORDER.map((plantId, index) => [plantId, index]),
);

function backgroundAxisPosition(cell: number, cellCount: number): string {
    if (cellCount <= 1) return "0%";
    return `${(cell / (cellCount - 1)) * 100}%`;
}

/**
 * Returns CSS background coordinates for a plant's 512px cell in the sick-state
 * sheet. This is intentionally presentation-only; it does not decide whether or
 * why a plant is sick.
 */
export function getSickPlantSprite(plantId: string): Extract<PlantArtwork, { kind: "sprite" }> {
    const index = sickPlantIndexes.get(plantId);
    if (index === undefined) {
        throw new Error(`No sick plant sprite is registered for "${plantId}".`);
    }

    const column = index % SICK_PLANT_SPRITESHEET.columns;
    const row = Math.floor(index / SICK_PLANT_SPRITESHEET.columns);

    return {
        kind: "sprite",
        src: SICK_PLANT_SPRITESHEET.src,
        index,
        column,
        row,
        backgroundSize: `${SICK_PLANT_SPRITESHEET.columns * 100}% ${SICK_PLANT_SPRITESHEET.rows * 100}%`,
        backgroundPosition: `${backgroundAxisPosition(column, SICK_PLANT_SPRITESHEET.columns)} ${backgroundAxisPosition(row, SICK_PLANT_SPRITESHEET.rows)}`,
    };
}

/**
 * Future-facing artwork resolver. Existing callers can keep using getStageImage;
 * sickness remains opt-in and has no gameplay or persistence behavior yet.
 */
export function getPlantArtwork(
    growth: number,
    plantId: string,
    visualState: PlantVisualState = "healthy",
): PlantArtwork {
    return visualState === "sick"
        ? getSickPlantSprite(plantId)
        : { kind: "image", src: getStageImage(growth, plantId) };
}
