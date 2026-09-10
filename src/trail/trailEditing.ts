import type { HandleMap, HandlePair, PathPoint, PathPointMap, TrailAnchor, TransitionOverride } from "../data/trailLayout";
export type { TrailAnchor } from "../data/trailLayout";

export const LEVELS_PER_TILE = 10;

export type OrientationKey = "portrait" | "landscape";

// Stones are looped across every tile of a region by default (see `point()`
// in LevelsView) unless the region's anchor array already has a full
// tileCount*10 entries. The editor materializes the loop into explicit
// per-tile entries the moment you drag a stone, so an edit on tile 2 never
// silently reappears on tile 0.
export function expandToTileCount(anchors: TrailAnchor[], tileCount: number): TrailAnchor[] {
    const needed = tileCount * LEVELS_PER_TILE;
    if (anchors.length >= needed) return anchors;
    const base = anchors.slice(0, LEVELS_PER_TILE);
    const result: TrailAnchor[] = [];
    for (let tile = 0; tile < tileCount; tile++) {
        for (let slot = 0; slot < LEVELS_PER_TILE; slot++) {
            result.push(anchors[tile * LEVELS_PER_TILE + slot] ?? base[slot % base.length]);
        }
    }
    return result;
}

// Anchors are percentages of a tile/cross-axis; a small overshoot is fine
// (art can bleed past the edge) but an unbounded drag could break the
// region-mask and offset math elsewhere, so every edit gets clamped.
export function clampPercent(value: number, min = -5, max = 105): number {
    return Math.min(max, Math.max(min, value));
}

// Mirrors the axis mapping in LevelsView's `point()`: the "along the trail"
// axis uses tileLength, the "across the trail" axis uses crossSize, and
// which screen axis (x/y) plays which role flips with orientation.
export function pxDeltaToPercent(dxPx: number, dyPx: number, landscape: boolean, tileLength: number, crossSize: number): { dx: number; dy: number } {
    return landscape
        ? { dx: (dxPx / tileLength) * 100, dy: (dyPx / crossSize) * 100 }
        : { dx: (dxPx / crossSize) * 100, dy: (dyPx / tileLength) * 100 };
}

export function snapValue(value: number, size: number): number {
    return size > 0 ? Math.round(value / size) * size : value;
}

export function pathPointsForRegion(map: PathPointMap, regionId: string): PathPoint[] {
    return map[regionId] ?? [];
}

export function pathPointsAfterIndex(map: PathPointMap, regionId: string, afterIndex: number): PathPoint[] {
    return pathPointsForRegion(map, regionId)
        .filter(p => p.afterIndex === afterIndex)
        .sort((a, b) => a.order - b.order);
}

export function insertPathPoint(map: PathPointMap, regionId: string, afterIndex: number, x: number, y: number, id: string): PathPointMap {
    const existing = pathPointsForRegion(map, regionId);
    const siblings = pathPointsAfterIndex(map, regionId, afterIndex);
    const order = siblings.length ? Math.max(...siblings.map(p => p.order)) + 1 : 0;
    const point: PathPoint = { id, afterIndex, order, x: clampPercent(x), y: clampPercent(y) };
    return { ...map, [regionId]: [...existing, point] };
}

export function removePathPoint(map: PathPointMap, regionId: string, id: string): PathPointMap {
    return { ...map, [regionId]: pathPointsForRegion(map, regionId).filter(p => p.id !== id) };
}

export function movePathPoint(map: PathPointMap, regionId: string, id: string, x: number, y: number): PathPointMap {
    return {
        ...map,
        [regionId]: pathPointsForRegion(map, regionId).map(p => p.id === id ? { ...p, x: clampPercent(x), y: clampPercent(y) } : p),
    };
}

export function setPathPointHandle(map: PathPointMap, regionId: string, id: string, which: "in" | "out", value: TrailAnchor): PathPointMap {
    const field = which === "in" ? "handleIn" : "handleOut";
    return { ...map, [regionId]: pathPointsForRegion(map, regionId).map(p => p.id === id ? { ...p, [field]: value } : p) };
}

export function getStoneHandles(map: HandleMap, regionId: string, index: number): HandlePair {
    return map[regionId]?.[index] ?? {};
}

export function setStoneHandle(map: HandleMap, regionId: string, index: number, which: "in" | "out", value: TrailAnchor): HandleMap {
    const regionHandles = map[regionId] ?? {};
    const existing = regionHandles[index] ?? {};
    return { ...map, [regionId]: { ...regionHandles, [index]: { ...existing, [which]: value } } };
}

export function negateAnchor(v: TrailAnchor): TrailAnchor {
    return [-v[0], -v[1]];
}

// A point's tangent handles, expressed as [dx,dy] offsets from the point
// itself. `handleOut` (toward the next point) and `handleIn` (toward the
// previous point) are mirror images of each other for a "smooth" point --
// this is the shared formula the *unedited* curve already uses (see
// buildBezierPath below), reused here so a freshly-grabbed handle starts
// exactly where the curve currently sits instead of jumping.
export function autoTangentOffset(prev: { x: number; y: number }, next: { x: number; y: number }): TrailAnchor {
    return [(next.x - prev.x) / 6, (next.y - prev.y) / 6];
}

export type Waypoint = { x: number; y: number; handleIn?: TrailAnchor; handleOut?: TrailAnchor };

// Builds the same Catmull-Rom-derived cubic-bezier path LevelsView always
// drew, except each segment's control points defer to a point's explicit
// handleOut/handleIn when present. With no handles set anywhere this
// produces byte-identical output to the original formula.
export function buildBezierPath(points: Waypoint[]): string {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const prevOfCurrent = points[i - 1] ?? current;
        const nextOfNext = points[i + 2] ?? next;
        const autoOut = autoTangentOffset(prevOfCurrent, next);
        const autoIn = autoTangentOffset(nextOfNext, current);
        const c1 = current.handleOut
            ? { x: current.x + current.handleOut[0], y: current.y + current.handleOut[1] }
            : { x: current.x + autoOut[0], y: current.y + autoOut[1] };
        const c2 = next.handleIn
            ? { x: next.x + next.handleIn[0], y: next.y + next.handleIn[1] }
            : { x: next.x + autoIn[0], y: next.y + autoIn[1] };
        d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${next.x} ${next.y}`;
    }
    return d;
}

export const DEFAULT_TRANSITION_SPAN_MIN = 60;

// Mirrors the original fixed formula from LevelsView so switching into edit
// mode (or loading a transition with no override yet) doesn't visually jump
// the seam before anything's been dragged.
export function defaultTransitionSpan(hasPano: boolean, tileLength: number): number {
    return hasPano ? Math.min(tileLength * 1.05, 1300) : 240;
}

export function resolveTransitionSpan(baseSpan: number, tileLength: number, override?: TransitionOverride): number {
    if (override?.spanPercent === undefined) return baseSpan;
    return Math.max(DEFAULT_TRANSITION_SPAN_MIN, (override.spanPercent / 100) * tileLength);
}

export function resolveTransitionCenter(boundary: number, tileLength: number, override?: TransitionOverride): number {
    if (override?.centerOffsetPercent === undefined) return boundary;
    return boundary + (override.centerOffsetPercent / 100) * tileLength;
}
