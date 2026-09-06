// Game mechanics constants, economic balance, and letter generation helpers

import { DIRECTIONS } from "./constants";

export const GARDEN_WATERING_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

export const REWARDS = {
    BONUS_WORD_SEEDS: 10,
    LEVEL_COMPLETE_SEEDS: 50,
    GARDEN_HARVEST_SEEDS: 150,
} as const;

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
export function getRandomFillLetter(placedWords?: string[]): string {
    if (placedWords && placedWords.length > 0 && Math.random() < 0.4) {
        // 40% chance to sample from letters in target words
        const allLetters = placedWords.join("").toUpperCase();
        if (allLetters.length > 0) {
            return allLetters[Math.floor(Math.random() * allLetters.length)];
        }
    }
    return ENGLISH_LETTER_POOL[Math.floor(Math.random() * ENGLISH_LETTER_POOL.length)];
}

/**
 * Computes grid size for a given level. "hard" (Challenging mode) starts
 * one cell bigger than "normal" (Standard) and caps two cells higher, so
 * the difficulty toggle changes board size, not just word category --
 * "normal" is unchanged from the pre-existing curve so nobody's puzzles
 * silently resize.
 */
export function calculateGridSize(level: number, mode: "normal" | "hard" = "normal"): number {
    const baseSize = mode === "hard" ? 5 : 4;
    const cap = mode === "hard" ? 12 : 10;
    return Math.min(cap, baseSize + Math.floor((level - 1) / 5));
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
