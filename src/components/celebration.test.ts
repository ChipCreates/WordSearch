import { describe, expect, it } from "vitest";
import { celebrationPoints, drawConstellation } from "./celebration";

describe("celebration route", () => {
    it("visits every collapsed word midpoint in discovery order", () => {
        expect(celebrationPoints([
            { startR: 0, startC: 0, endR: 0, endC: 4, color: "#ffffff" },
            { startR: 1, startC: 4, endR: 1, endC: 1, color: "#ffffff" },
            { startR: 2, startC: 2, endR: 4, endC: 4, color: "#ffffff" },
            { startR: 5, startC: 0, endR: 2, endC: 0, color: "#ffffff" },
        ])).toEqual([{ x: 2.5, y: 0.5 }, { x: 3, y: 1.5 }, { x: 3.5, y: 3.5 }, { x: 0.5, y: 4 }]);
    });

    it("visits overlapping dots once", () => {
        expect(celebrationPoints([
            { startR: 0, startC: 0, endR: 0, endC: 4, color: "#ffffff" },
            { startR: 0, startC: 4, endR: 0, endC: 0, color: "#ffffff" },
        ])).toEqual([{ x: 2.5, y: 0.5 }]);
    });

    it("handles an empty board without drawing", () => {
        expect(celebrationPoints([])).toEqual([]);
        drawConstellation({} as CanvasRenderingContext2D, [], 30, 1, 3000);
    });
});
