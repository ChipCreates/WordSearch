export const HIGHLIGHT_COLORS = [
    "#f28b82", "#fbbc04", "#fff475", "#ccff90",
    "#a7ffeb", "#cbf0f8", "#aecbfa", "#d7aefb",
    "#fdcfe8", "#e6c9a8", "#03dac6", "#bb86fc",
    "#cf6679", "#ff8a65", "#ba68c8", "#4fc3f7",
    "#81c784", "#fff176", "#ffb74d", "#f06292"
];

export const DIRECTIONS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1]
];

export type Cell = { r: number; c: number };

export type FoundLine = { startR: number; startC: number; endR: number; endC: number; color: string };
