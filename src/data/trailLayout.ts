import raw from "./trailLayout.json";

export type TrailAnchor = [number, number];
export type StoneMap = Record<string, TrailAnchor[]>;

// Bezier tangent handles, stored as [dx, dy] offsets from the anchor they
// belong to (same percent units as the anchor's own x/y) so they scale with
// it under toScreen() the same way a dragged anchor does. Absent = the curve
// falls back to the auto Catmull-Rom-derived tangent, so nothing visually
// changes until a handle is actually dragged.
export type HandlePair = { in?: TrailAnchor; out?: TrailAnchor };
// regionId -> stone array index -> handles for that stone
export type HandleMap = Record<string, Record<number, HandlePair>>;

// A path-only waypoint: shapes the curve between two stones without being a
// level of its own. `afterIndex` is the 0-based index into that region's
// (tile-expanded) stone array -- the point is drawn in the same tile as the
// stone it follows. `order` breaks ties when more than one path point sits
// between the same two stones.
export type PathPoint = {
    id: string;
    afterIndex: number;
    order: number;
    x: number;
    y: number;
    handleIn?: TrailAnchor;
    handleOut?: TrailAnchor;
};
export type PathPointMap = Record<string, PathPoint[]>;

// centerOffset/span are pixel deltas layered on top of the geometric seam
// midpoint LevelsView computes from region layout -- absolute pixel values
// would drift out of registration as that layout reflows with window size
// and unlocked-level count, so overrides always stay relative.
export type TransitionOverride = { centerOffset: number; span: number };
export type BiomeTransitionLayout = {
    id: string;
    imageLandscape?: string;
    imagePortrait?: string;
    mistColor: string;
    landscape?: TransitionOverride;
    portrait?: TransitionOverride;
};

export type TrailLayout = {
    stones: { portrait: StoneMap; landscape: StoneMap };
    stoneHandles: { portrait: HandleMap; landscape: HandleMap };
    pathPoints: { portrait: PathPointMap; landscape: PathPointMap };
    transitions: BiomeTransitionLayout[];
};

export const TRAIL_LAYOUT = raw as unknown as TrailLayout;
