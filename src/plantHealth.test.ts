import { describe, expect, it } from "vitest";
import { PLANTS_CATALOG } from "./plantsCatalog";
import {
    DEAD_PLANT_ORDER,
    DEAD_PLANT_SPRITESHEET,
    getDeadPlantSprite,
    getPlantArtwork,
    getSickPlantSprite,
    SICK_PLANT_ORDER,
    SICK_PLANT_SPRITESHEET,
} from "./plantHealth";

describe("plant health artwork", () => {
    it("keeps the sprite order aligned with the plant catalog", () => {
        expect(SICK_PLANT_ORDER).toEqual(PLANTS_CATALOG.map(plant => plant.id));
        expect(DEAD_PLANT_ORDER).toEqual(PLANTS_CATALOG.map(plant => plant.id));
        expect(SICK_PLANT_ORDER).toHaveLength(
            SICK_PLANT_SPRITESHEET.columns * SICK_PLANT_SPRITESHEET.rows,
        );
        expect(DEAD_PLANT_ORDER).toHaveLength(
            DEAD_PLANT_SPRITESHEET.columns * DEAD_PLANT_SPRITESHEET.rows,
        );
    });

    it("resolves dead artwork from the matching sprite cells", () => {
        expect(getDeadPlantSprite("moss-sprout")).toMatchObject({
            src: "/plants/dead-plants-spritesheet.webp",
            index: 0,
            column: 0,
            row: 0,
            backgroundSize: "500% 400%",
            backgroundPosition: "0% 0%",
        });
        expect(getPlantArtwork(100, "ficus-lyrata", "dead")).toMatchObject({
            kind: "sprite",
            index: 19,
            column: 4,
            row: 3,
            backgroundPosition: "100% 100%",
        });
    });

    it("resolves the first and last sprite cells", () => {
        expect(getSickPlantSprite("moss-sprout")).toMatchObject({
            index: 0,
            column: 0,
            row: 0,
            backgroundSize: "500% 400%",
            backgroundPosition: "0% 0%",
        });
        expect(getSickPlantSprite("ficus-lyrata")).toMatchObject({
            index: 19,
            column: 4,
            row: 3,
            backgroundPosition: "100% 100%",
        });
    });

    it("leaves healthy artwork on the existing lifecycle images", () => {
        expect(getPlantArtwork(50, "emerald-fern")).toEqual({
            kind: "image",
            src: "/plants/lifecycle/emerald-fern-young.webp",
        });
        expect(getPlantArtwork(100, "emerald-fern", "sick")).toMatchObject({
            kind: "sprite",
            index: 1,
            column: 1,
            row: 0,
        });
    });

    it("fails clearly when the spritesheet has no matching plant", () => {
        expect(() => getSickPlantSprite("unknown-plant")).toThrow(
            'No sick plant sprite is registered for "unknown-plant".',
        );
        expect(() => getDeadPlantSprite("unknown-plant")).toThrow(
            'No dead plant sprite is registered for "unknown-plant".',
        );
    });
});
