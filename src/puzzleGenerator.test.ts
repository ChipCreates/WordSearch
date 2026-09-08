import { describe, expect, it } from "vitest";
import { findWordPlacement } from "./gameMechanics";
import { MAX_GENERATION_ATTEMPTS, generatePuzzle, getBonusGoalCount, getPuzzleDifficulty } from "./puzzleGenerator";

const WORDS = ["ALPHA", "BETA", "GAMMA", "DELTA", "OMEGA", "SIGMA", "THETA", "ZETA", "IOTA", "KAPPA"];

function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

describe("puzzleGenerator", () => {
    it("scales the guaranteed bonus offering by difficulty, board size, and open space", () => {
        expect(getBonusGoalCount("easy", 8, 32, 8)).toBe(2);
        expect(getBonusGoalCount("standard", 8, 32, 8)).toBe(3);
        expect(getBonusGoalCount("challenging", 8, 32, 8)).toBe(4);
        expect(getBonusGoalCount("challenging", 8, 5, 8)).toBe(0);
        expect(getBonusGoalCount("challenging", 8, 32, 2)).toBe(2);
    });

    it("places every word promised by the optional bonus goal", () => {
        const result = generatePuzzle({
            targetWords: ["ALPHA", "BETA", "GAMMA", "DELTA", "OMEGA", "SIGMA", "THETA"],
            bonusWords: ["APPLE", "PEAR", "PLUM", "MELON", "LIME", "KIWI", "FIG", "DATE"],
            category: "Guarantee",
            level: 12,
            mode: "challenging",
            gridSize: 8,
            rng: seeded(17),
        });

        expect(result.bonusWords.length).toBeGreaterThan(0);
        for (const word of result.bonusWords) {
            expect(findWordPlacement(result.grid, result.gridSize, word)).not.toBeNull();
        }
    });

    it("keeps the configured target count and places every target legally", () => {
        for (const mode of ["easy", "standard", "challenging"] as const) {
            for (const level of [1, 5, 12, 25]) {
                const difficulty = getPuzzleDifficulty(level, mode);
                const words = WORDS.filter(word => word.length <= difficulty.maxWordLength).slice(0, difficulty.targetCount);
                const result = generatePuzzle({ targetWords: words, bonusWords: ["SPROUT", "LEAF"], category: "Test", level, mode });

                expect(result.targetWords).toHaveLength(words.length);
                expect(result.attemptCount).toBeLessThanOrEqual(MAX_GENERATION_ATTEMPTS);
                for (const word of result.targetWords) {
                    expect(findWordPlacement(result.grid, result.gridSize, word)).not.toBeNull();
                }
            }
        }
    });

    it("terminates within the retry bound across 500 representative puzzles", () => {
        for (let index = 0; index < 500; index++) {
            const mode = index % 3 === 0 ? "easy" : index % 3 === 1 ? "standard" : "challenging";
            const level = (index % 30) + 1;
            const difficulty = getPuzzleDifficulty(level, mode);
            const words = WORDS.filter(word => word.length <= difficulty.maxWordLength).slice(0, difficulty.targetCount);
            const result = generatePuzzle({ targetWords: words, category: "Test", level, mode });
            expect(result.targetWords).toHaveLength(words.length);
            expect(result.attemptCount).toBeLessThanOrEqual(MAX_GENERATION_ATTEMPTS);
        }
    });

    it("uses a safe fallback board when randomized placement cannot fit the configured board", () => {
        const result = generatePuzzle({
            targetWords: ["ALPHABET", "GARDEN", "SPROUT"],
            category: "Fallback",
            level: 1,
            mode: "easy",
            rng: () => 0,
        });

        expect(result.fallbackReason).toBeDefined();
        expect(result.attemptCount).toBe(MAX_GENERATION_ATTEMPTS);
        expect(result.targetWords).toEqual(["ALPHABET", "GARDEN", "SPROUT"]);
        expect(result.gridSize).toBeGreaterThanOrEqual("ALPHABET".length);
        for (const word of result.targetWords) {
            expect(findWordPlacement(result.grid, result.gridSize, word)).not.toBeNull();
        }
    });

    it("makes challenging boards materially more diagonal and reverse than easy boards", () => {
        const diagonalShare = (mode: "easy" | "challenging") => {
            let diagonal = 0;
            let reverse = 0;
            let overlapCells = 0;
            let placedCells = 0;
            let total = 0;
            for (let seed = 1; seed <= 120; seed++) {
                const difficulty = getPuzzleDifficulty(10, mode);
                const words = WORDS.filter(word => word.length <= difficulty.maxWordLength).slice(0, difficulty.targetCount);
                const result = generatePuzzle({ targetWords: words, category: "Stats", level: 10, mode, rng: seeded(seed) });
                const occupied = new Map<string, number>();
                Object.values(result.placements).forEach(({ dc, dr }) => {
                    if (dc !== 0 && dr !== 0) diagonal++;
                    if (dc < 0 || (dc === 0 && dr < 0)) reverse++;
                    total++;
                });
                Object.entries(result.placements).forEach(([word, placement]) => {
                    for (let index = 0; index < word.length; index++) {
                        const key = `${placement.row + index * placement.dr},${placement.col + index * placement.dc}`;
                        occupied.set(key, (occupied.get(key) ?? 0) + 1);
                        placedCells++;
                    }
                });
                overlapCells += [...occupied.values()].filter(count => count > 1).reduce((sum, count) => sum + count - 1, 0);
            }
            return { diagonal: diagonal / total, reverse: reverse / total, overlap: overlapCells / placedCells };
        };

        const easy = diagonalShare("easy");
        const challenging = diagonalShare("challenging");
        expect(challenging.diagonal).toBeGreaterThan(easy.diagonal + 0.2);
        expect(challenging.reverse).toBeGreaterThan(easy.reverse + 0.15);
        expect(challenging.overlap).toBeGreaterThan(easy.overlap + 0.02);
    });

    it("uses the supplied RNG for every generated cell and remains reproducible", () => {
        const request = { targetWords: WORDS, category: "Determinism", level: 8, mode: "standard" as const };
        const first = generatePuzzle({ ...request, rng: seeded(42) });
        const second = generatePuzzle({ ...request, rng: seeded(42) });
        expect(second).toEqual(first);
    });
});
