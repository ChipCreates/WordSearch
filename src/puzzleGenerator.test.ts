import { describe, expect, it } from "vitest";
import { findWordPlacement } from "./gameMechanics";
import { MAX_GENERATION_ATTEMPTS, generatePuzzle, getPuzzleDifficulty } from "./puzzleGenerator";

const WORDS = ["ALPHA", "BETA", "GAMMA", "DELTA", "OMEGA", "SIGMA", "THETA", "ZETA", "IOTA", "KAPPA"];

describe("puzzleGenerator", () => {
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
});
