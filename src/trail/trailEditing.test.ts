import { describe, expect, it } from "vitest";
import {
    autoTangentOffset, buildBezierPath, clampPercent, defaultTransitionSpan,
    expandToTileCount, getStoneHandles, insertPathPoint, movePathPoint, negateAnchor,
    pathPointsAfterIndex, pxDeltaToPercent, removePathPoint, resolveTransitionCenter,
    resolveTransitionSpan, setPathPointHandle, setStoneHandle, snapValue,
} from "./trailEditing";
import type { PathPointMap } from "../data/trailLayout";

describe("expandToTileCount", () => {
    it("leaves an already-expanded array untouched", () => {
        const anchors: [number, number][] = Array.from({ length: 20 }, (_, i) => [i, i]);
        expect(expandToTileCount(anchors, 2)).toBe(anchors);
    });

    it("loops the first 10 entries across every tile when short", () => {
        const base: [number, number][] = Array.from({ length: 10 }, (_, i) => [i, i * 2]);
        const expanded = expandToTileCount(base, 3);
        expect(expanded).toHaveLength(30);
        expect(expanded.slice(0, 10)).toEqual(base);
        expect(expanded.slice(10, 20)).toEqual(base);
        expect(expanded.slice(20, 30)).toEqual(base);
    });
});

describe("clampPercent", () => {
    it("clamps to the default -5..105 range", () => {
        expect(clampPercent(-50)).toBe(-5);
        expect(clampPercent(500)).toBe(105);
        expect(clampPercent(42)).toBe(42);
    });
});

describe("pxDeltaToPercent", () => {
    it("maps the along-tile axis to tileLength and cross axis to crossSize in landscape", () => {
        const { dx, dy } = pxDeltaToPercent(100, 50, true, 1000, 400);
        expect(dx).toBeCloseTo(10);
        expect(dy).toBeCloseTo(12.5);
    });

    it("swaps which screen axis maps to which in portrait", () => {
        const { dx, dy } = pxDeltaToPercent(100, 50, false, 1000, 400);
        expect(dx).toBeCloseTo(25);
        expect(dy).toBeCloseTo(5);
    });
});

describe("snapValue", () => {
    it("rounds to the nearest multiple of size", () => {
        expect(snapValue(37, 25)).toBe(25);
        expect(snapValue(38, 25)).toBe(50);
        expect(snapValue(10, 0)).toBe(10);
    });
});

describe("path points", () => {
    it("insert/order/remove round-trips", () => {
        let map: PathPointMap = {};
        map = insertPathPoint(map, "grove", 2, 40, 60, "a");
        map = insertPathPoint(map, "grove", 2, 45, 65, "b");
        const ordered = pathPointsAfterIndex(map, "grove", 2);
        expect(ordered.map(p => p.id)).toEqual(["a", "b"]);
        map = removePathPoint(map, "grove", "a");
        expect(pathPointsAfterIndex(map, "grove", 2).map(p => p.id)).toEqual(["b"]);
    });

    it("moves and clamps a point's position", () => {
        let map: PathPointMap = insertPathPoint({}, "grove", 0, 50, 50, "a");
        map = movePathPoint(map, "grove", "a", 999, -999);
        const [p] = pathPointsAfterIndex(map, "grove", 0);
        expect(p.x).toBe(105);
        expect(p.y).toBe(-5);
    });

    it("stores independent in/out handles on a path point", () => {
        let map: PathPointMap = insertPathPoint({}, "grove", 0, 50, 50, "a");
        map = setPathPointHandle(map, "grove", "a", "out", [5, -5]);
        map = setPathPointHandle(map, "grove", "a", "in", [-3, 3]);
        const [p] = pathPointsAfterIndex(map, "grove", 0);
        expect(p.handleOut).toEqual([5, -5]);
        expect(p.handleIn).toEqual([-3, 3]);
    });
});

describe("stone handles", () => {
    it("get/set round-trips per region and index", () => {
        let map = setStoneHandle({}, "grove", 3, "out", [4, 6]);
        expect(getStoneHandles(map, "grove", 3)).toEqual({ out: [4, 6] });
        map = setStoneHandle(map, "grove", 3, "in", [-4, -6]);
        expect(getStoneHandles(map, "grove", 3)).toEqual({ out: [4, 6], in: [-4, -6] });
        expect(getStoneHandles(map, "grove", 4)).toEqual({});
    });
});

describe("negateAnchor", () => {
    it("flips both components", () => {
        expect(negateAnchor([3, -4])).toEqual([-3, 4]);
    });
});

describe("autoTangentOffset", () => {
    it("is one-sixth of the distance between neighbors", () => {
        expect(autoTangentOffset({ x: 0, y: 0 }, { x: 60, y: -30 })).toEqual([10, -5]);
    });
});

describe("buildBezierPath", () => {
    it("matches the original Catmull-Rom-derived formula when no point has explicit handles", () => {
        const pts = [{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 0 }, { x: 30, y: 8 }];
        const expected = smoothTrailPathReference(pts);
        expect(buildBezierPath(pts)).toBe(expected);
    });

    it("uses an explicit handleOut/handleIn instead of the auto tangent when set", () => {
        const pts = [
            { x: 0, y: 0, handleOut: [5, 5] as [number, number] },
            { x: 10, y: 0, handleIn: [-5, 5] as [number, number] },
        ];
        expect(buildBezierPath(pts)).toBe("M 0 0 C 5 5, 5 5, 10 0");
    });

    it("returns an empty string for fewer than two points", () => {
        expect(buildBezierPath([])).toBe("");
        expect(buildBezierPath([{ x: 1, y: 1 }])).toBe("");
    });
});

describe("transition span/center resolution", () => {
    it("falls back to the fixed pano/mist-only formula with no override", () => {
        expect(defaultTransitionSpan(true, 1000)).toBeCloseTo(1050);
        expect(defaultTransitionSpan(true, 2000)).toBe(1300);
        expect(defaultTransitionSpan(false, 1000)).toBe(240);
    });

    it("prefers an override's span/center but floors span at the minimum", () => {
        // tileLength 1000 here, so percent and px happen to match 1:1.
        expect(resolveTransitionSpan(240, 1000, { spanPercent: 1, centerOffsetPercent: 0 })).toBe(60);
        expect(resolveTransitionSpan(240, 1000, { spanPercent: 30, centerOffsetPercent: 0 })).toBe(300);
        expect(resolveTransitionSpan(240, 1000)).toBe(240);
        expect(resolveTransitionCenter(1000, 1000, { spanPercent: 0, centerOffsetPercent: -5 })).toBe(950);
        expect(resolveTransitionCenter(1000, 1000)).toBe(1000);
    });

    it("keeps an overridden seam at the same relative position across tile sizes", () => {
        // A seam nudged by 5% of the tile stays a 5% nudge whether the tile is
        // a wide desktop tile or a narrow mobile one -- the whole point of
        // storing the override as a percentage instead of a raw pixel delta.
        const override: import("../data/trailLayout").TransitionOverride = { centerOffsetPercent: 5, spanPercent: 20 };
        expect(resolveTransitionCenter(1000, 1000, override)).toBe(1050);
        expect(resolveTransitionCenter(1000, 400, override)).toBe(1020);
        expect(resolveTransitionSpan(240, 1000, override)).toBe(200);
        expect(resolveTransitionSpan(240, 400, override)).toBe(80);
    });
});

// A faithful copy of LevelsView's original `smoothTrailPath`, kept only in
// this test as a reference to prove buildBezierPath's no-handles path is
// byte-identical to what shipped before this feature.
function smoothTrailPathReference(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index++) {
        const before = points[index - 1] ?? points[index];
        const current = points[index];
        const next = points[index + 1];
        const after = points[index + 2] ?? next;
        const c1 = { x: current.x + (next.x - before.x) / 6, y: current.y + (next.y - before.y) / 6 };
        const c2 = { x: next.x - (after.x - current.x) / 6, y: next.y - (after.y - current.y) / 6 };
        path += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${next.x} ${next.y}`;
    }
    return path;
}
