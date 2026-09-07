import { describe, expect, it } from "vitest";
import {
    DEFAULT_POWERUP_INVENTORY,
    addPowerupCharge,
    consumePowerupCharge,
    purchasePowerupCharge,
} from "./powerups";

describe("power-up economy", () => {
    it("buys exactly one charge and deducts the configured price", () => {
        const result = purchasePowerupCharge(150, DEFAULT_POWERUP_INVENTORY, "lumina-cyclone");

        expect(result.purchased).toBe(true);
        expect(result.seeds).toBe(50);
        expect(result.inventory["lumina-cyclone"]).toBe(1);
    });

    it("does not change seeds or inventory after a failed purchase", () => {
        const result = purchasePowerupCharge(99, DEFAULT_POWERUP_INVENTORY, "lumina-cyclone");

        expect(result.purchased).toBe(false);
        expect(result.seeds).toBe(99);
        expect(result.inventory).toEqual(DEFAULT_POWERUP_INVENTORY);
    });

    it("consumes a charge exactly once and refuses empty inventory", () => {
        const stocked = addPowerupCharge(DEFAULT_POWERUP_INVENTORY, "single-letter-sprout");
        const first = consumePowerupCharge(stocked, "single-letter-sprout");
        const second = consumePowerupCharge(first.inventory, "single-letter-sprout");

        expect(first.consumed).toBe(true);
        expect(first.inventory["single-letter-sprout"]).toBe(0);
        expect(second.consumed).toBe(false);
        expect(second.inventory).toEqual(first.inventory);
    });
});
