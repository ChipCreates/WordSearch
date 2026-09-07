import { describe, expect, it } from "vitest";
import { celebrationPoints, drawConstellation } from "./celebration";

describe("celebration route", () => {
    it("places an orb on every letter of the final discovered word", () => {
        expect(celebrationPoints([
            { startR: 0, startC: 0, endR: 0, endC: 4, color: "#ffffff" },
            { startR: 0, startC: 4, endR: 0, endC: 0, color: "#ffffff" },
            { startR: 2, startC: 2, endR: 4, endC: 4, color: "#ffffff" },
        ])).toEqual([{ x: 2.5, y: 2.5 }, { x: 3.5, y: 3.5 }, { x: 4.5, y: 4.5 }]);
    });

    it("handles an empty board without drawing", () => {
        drawConstellation({} as CanvasRenderingContext2D, [], 30, 1, 3000);
    });
});
