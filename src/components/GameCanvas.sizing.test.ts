import { describe, expect, it } from "vitest";
import { letterScaleForGrid } from "./GameCanvas";

describe("GameCanvas responsive letter sizing", () => {
    it("uses progressively smaller letter ratios for sparse desktop grids", () => {
        expect(letterScaleForGrid(4, false)).toBeLessThan(letterScaleForGrid(5, false));
        expect(letterScaleForGrid(5, false)).toBeLessThan(letterScaleForGrid(6, false));
        expect(letterScaleForGrid(6, false)).toBeLessThan(letterScaleForGrid(8, false));
    });

    it("keeps four-column phone boards compact", () => {
        expect(letterScaleForGrid(4, true)).toBe(0.54);
        expect(letterScaleForGrid(4, true)).toBeLessThan(letterScaleForGrid(7, true));
    });
});
