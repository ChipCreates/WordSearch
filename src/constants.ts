export const HIGHLIGHT_COLORS = [
    // Sprout greens (secondary family)
    "#74c365", "#a4f792", "#4a9b3e", "#89da79",
    // Lavender (tertiary — "Bloom" palette)
    "#9b5de5", "#c49dff", "#dab9ff", "#b185e0",
    // Sage & earth tones
    "#95d4b3", "#b1f0ce", "#2d6a4f", "#61dac1",
    // Warm accents (sunflower / amber)
    "#f4c95d", "#ffe099", "#f2a65a",
    // Soft neutrals
    "#bfc9c1", "#89da79", "#a8e7c5",
    // Terracotta / muted rose
    "#d4906a", "#e8b4a0",
];

export const DIRECTIONS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1]
];

export type Cell = { r: number; c: number };

export type FoundLine = { startR: number; startC: number; endR: number; endC: number; color: string };

// Shared by GameCanvas (the board card + its pill-to-dot animation) and
// App.tsx (the status/word-list panel, which fades in sync with the board
// so the whole "this puzzle is done" cluster dissolves together instead of
// leaving stray UI floating over the revealed background). Three phases,
// sequenced rather than simultaneous: if the card's opacity faded over the
// same span as the pill-to-dot collapse, both would reach completion at the
// same instant and the dots would never get a beat where they're clearly,
// unmistakably visible before the fade starts. CELEBRATE_FADE_DELAY_MS is
// measured from celebrate:true itself (same zero point as the dots-forming
// clock), so it covers both the forming time and the hold, not just the
// hold on its own.
export const CORNER_RADIUS_PX = 12;
export const CELEBRATE_DOTS_FORM_MS = 550;
export const CELEBRATE_HOLD_MS = 900;
export const CELEBRATE_FADE_DELAY_MS = CELEBRATE_DOTS_FORM_MS + CELEBRATE_HOLD_MS;
export const CELEBRATE_FADE_DURATION_MS = 600;
// Fourth phase, once the board+word-list fade above has finished: the button
// block glides from its sidebar spot to the center of the window, as the
// closing beat of the celebration.
export const CELEBRATE_BUTTONS_MOVE_DELAY_MS = CELEBRATE_FADE_DELAY_MS + CELEBRATE_FADE_DURATION_MS;
export const CELEBRATE_BUTTONS_MOVE_DURATION_MS = 650;
