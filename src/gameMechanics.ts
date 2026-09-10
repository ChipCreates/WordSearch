// Game mechanics constants, economic balance, and letter generation helpers

import { DIRECTIONS } from "./constants";

export const GARDEN_WATERING_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

export const REWARDS = {
    BONUS_WORD_SEEDS: 10,
    LEVEL_COMPLETE_SEEDS: 50,
    REPLAY_COMPLETE_SEEDS: 10,
} as const;

export const MIN_BONUS_WORD_LENGTH = 3;

export type WordSelectionResult =
    | { kind: "target-found"; word: string }
    | { kind: "bonus-found"; word: string }
    | { kind: "already-found"; word: string }
    | { kind: "invalid"; word: string };

export function classifyWordSelection(
    candidate: string,
    reversedCandidate: string,
    targetWords: string[],
    foundWords: Record<string, string>,
    validBonusCandidates: Set<string>,
): WordSelectionResult {
    const word = candidate.toUpperCase();
    const reversed = reversedCandidate.toUpperCase();

    // The direction actually dragged takes priority over its reverse. Two
    // different real words can share the same cells in opposite directions
    // (LOOP / POOL) -- if the dragged direction itself is a target, or a
    // distinct word eligible as a bonus, that's the result regardless of
    // what the reverse happens to spell. Only once neither is true for the
    // dragged direction do we fall back to the reverse -- the case where a
    // target's own letters were simply dragged backwards (e.g. CAT found by
    // dragging TAC, where "TAC" isn't a word in its own right).
    if (targetWords.includes(word)) {
        return foundWords[word] ? { kind: "already-found", word } : { kind: "target-found", word };
    }
    if (validBonusCandidates.has(word) && word.length >= MIN_BONUS_WORD_LENGTH) {
        return foundWords[word] ? { kind: "already-found", word } : { kind: "bonus-found", word };
    }
    if (targetWords.includes(reversed)) {
        return foundWords[reversed] ? { kind: "already-found", word: reversed } : { kind: "target-found", word: reversed };
    }
    if (reversed !== word && validBonusCandidates.has(reversed) && reversed.length >= MIN_BONUS_WORD_LENGTH) {
        return foundWords[reversed] ? { kind: "already-found", word: reversed } : { kind: "bonus-found", word: reversed };
    }
    return { kind: "invalid", word };
}

// Below this many favorited categories, custom mode would cycle through too
// small a pool to feel different from just playing one or two categories on
// repeat -- so the toggle stays disabled until the player clears this bar.
export const MIN_FAVORITE_CATEGORIES = 10;

// Deterministic pseudo-random reorder of `categories`, reshuffled once per
// full pass through the list (keyed by `cycle`) instead of once ever -- a
// small favorites list would otherwise show categories in the exact same
// fixed order every N levels, which is far more noticeable with 10 categories
// than it is cycling through a full 28-54 category tier.
function seededShuffle<T>(arr: T[], seed: number): T[] {
    let s = seed || 1;
    const rand = () => {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        s |= 0;
        return ((s >>> 0) % 100000) / 100000;
    };
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Picks which favorite category to show at a given level. Cycles through
 * every favorite once (in a per-cycle shuffled order) before repeating.
 */
export function favoriteCategoryForLevel(favorites: string[], level: number): string {
    const n = favorites.length;
    const cycle = Math.floor((level - 1) / n);
    const posInCycle = (level - 1) % n;
    return seededShuffle(favorites, cycle + 1)[posInCycle];
}

/**
 * Standard English relative letter frequencies for realistic board fill.
 */
const ENGLISH_LETTER_POOL = [
    ..."E".repeat(12),
    ..."T".repeat(9),
    ..."A".repeat(8),
    ..."O".repeat(8),
    ..."I".repeat(7),
    ..."N".repeat(7),
    ..."S".repeat(6),
    ..."H".repeat(6),
    ..."R".repeat(6),
    ..."D".repeat(4),
    ..."L".repeat(4),
    ..."C".repeat(3),
    ..."U".repeat(3),
    ..."M".repeat(3),
    ..."W".repeat(2),
    ..."F".repeat(2),
    ..."G".repeat(2),
    ..."Y".repeat(2),
    ..."P".repeat(2),
    ..."B".repeat(2),
    ..."V".repeat(1),
    ..."K".repeat(1),
    ..."J".repeat(1),
    ..."X".repeat(1),
    ..."Q".repeat(1),
    ..."Z".repeat(1),
];

/**
 * Returns a random letter weighted by English frequency or target words.
 */
export function getRandomFillLetter(placedWords?: string[], rng: () => number = Math.random): string {
    if (placedWords && placedWords.length > 0 && rng() < 0.4) {
        // 40% chance to sample from letters in target words
        const allLetters = placedWords.join("").toUpperCase();
        if (allLetters.length > 0) {
            return allLetters[Math.floor(rng() * allLetters.length)];
        }
    }
    return ENGLISH_LETTER_POOL[Math.floor(rng() * ENGLISH_LETTER_POOL.length)];
}

/**
 * Computes grid size for a given level. "hard" (Challenging mode) starts
 * one cell bigger than "normal" (Standard) and caps two cells higher, so
 * the difficulty toggle changes board size, not just word category --
 * "normal" is unchanged from the pre-existing curve so nobody's puzzles
 * silently resize. "easy" starts smaller, caps lower, and grows slower
 * still, for players who want a gentler curve than Standard.
 */
export function calculateGridSize(level: number, mode: "easy" | "normal" | "hard" = "normal"): number {
    const baseSize = mode === "hard" ? 5 : mode === "easy" ? 3 : 4;
    const cap = mode === "hard" ? 12 : mode === "easy" ? 8 : 10;
    const growthEvery = mode === "easy" ? 6 : 5;
    return Math.min(cap, baseSize + Math.floor((level - 1) / growthEvery));
}

/**
 * Keeps dense boards comfortable on narrow touch screens. The cap is based on
 * the CSS viewport rather than a device name so it also works in responsive
 * previews and split-screen layouts.
 */
export function getResponsiveGridSize(
    level: number,
    mode: "easy" | "normal" | "hard" = "normal",
    viewportWidth = typeof window === "undefined" ? Number.POSITIVE_INFINITY : window.innerWidth,
): number {
    const touchFriendlyCap = viewportWidth < 390 ? 8 : viewportWidth < 480 ? 9 : Number.POSITIVE_INFINITY;
    return Math.min(calculateGridSize(level, mode), touchFriendlyCap);
}

export type WordPlacement = { r: number; c: number; dr: number; dc: number };

/**
 * Locates where `word` sits on the grid (start cell + direction vector),
 * scanning every cell/direction pair. Shared by every feature that needs to
 * point at a word without also needing to place it -- the single-letter
 * hint, the instant-solve hint, the compass, and the spectrometer all call
 * this instead of each carrying their own copy of the same search loop.
 */
export function findWordPlacement(gridData: string[][], gridSize: number, word: string): WordPlacement | null {
    const targetWord = word.toUpperCase();
    const wordLen = targetWord.length;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            for (const [dc, dr] of DIRECTIONS) {
                let matches = true;
                for (let i = 0; i < wordLen; i++) {
                    const nr = r + i * dr;
                    const nc = c + i * dc;
                    if (
                        nr < 0 || nr >= gridSize ||
                        nc < 0 || nc >= gridSize ||
                        !gridData[nr] || gridData[nr][nc]?.toUpperCase() !== targetWord[i]
                    ) {
                        matches = false;
                        break;
                    }
                }
                if (matches) return { r, c, dr, dc };
            }
        }
    }
    return null;
}
