import { describe, expect, it } from "vitest";
import { findAccidentalDeniedStrings } from "./contentSafety";
import { findWordPlacement } from "./gameMechanics";
import {
    MAX_GENERATION_ATTEMPTS, QUALITY_THRESHOLD,
    generatePuzzle, getBonusGoalCount, getPuzzleDifficulty, isPlaceableWord,
    scorePuzzleQuality, validatePuzzleInvariants,
} from "./puzzleGenerator";
import { createSeededRng as seeded } from "./rng";

const WORDS = ["ALPHA", "BETA", "GAMMA", "DELTA", "OMEGA", "SIGMA", "THETA", "ZETA", "IOTA", "KAPPA"];

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

    it("never returns a board containing an accidental denied string (WSP-0.2 Part 5)", () => {
        for (let seed = 1; seed <= 300; seed++) {
            const difficulty = getPuzzleDifficulty(30, "challenging");
            const words = WORDS.filter(word => word.length <= difficulty.maxWordLength).slice(0, difficulty.targetCount);
            const result = generatePuzzle({
                targetWords: words, bonusWords: ["SPROUT", "LEAF", "GARDEN", "BLOOM"],
                category: "Safety", level: 30, mode: "challenging", rng: seeded(seed),
            });
            expect(findAccidentalDeniedStrings(result.grid, result.placements)).toEqual([]);
        }

        // The emergency fallback path is checked separately -- it's the one
        // place a residual (extremely rare, documented) risk remains: two
        // adjacent placed words whose own letters coincidentally spell a
        // denied term, which sanitize correctly refuses to fix by
        // corrupting either word. This board is dense enough to exercise
        // sanitize without actually forcing the fallback path.
        const denseResult = generatePuzzle({
            targetWords: WORDS, bonusWords: ["SPROUT", "LEAF", "GARDEN", "BLOOM", "VINE", "MOSS"],
            category: "Safety", level: 30, mode: "challenging", rng: seeded(7),
        });
        expect(findAccidentalDeniedStrings(denseResult.grid, denseResult.placements)).toEqual([]);
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

describe("puzzleGenerator certification invariants (WSP-0.2)", () => {
    it("drops a duplicate target instead of placing the same word twice", () => {
        const result = generatePuzzle({
            targetWords: ["ALPHA", "alpha", "BETA", "GAMMA"],
            category: "Dedupe",
            level: 5,
            mode: "standard",
            rng: seeded(3),
        });
        expect(result.targetWords).toEqual(["ALPHA", "BETA", "GAMMA"]);
        expect(validatePuzzleInvariants(result, { targetWords: [], category: "Dedupe", level: 5, mode: "standard" })).not.toContain("duplicate-target");
    });

    it("never places a target word containing a non-letter character", () => {
        expect(isPlaceableWord("HELLO")).toBe(true);
        expect(isPlaceableWord("hello")).toBe(true);
        expect(isPlaceableWord("DON'T")).toBe(false);
        expect(isPlaceableWord("TWO WORDS")).toBe(false);
        expect(isPlaceableWord("123")).toBe(false);

        const result = generatePuzzle({
            targetWords: ["ALPHA", "DON'T", "BETA", "12", "GAMMA"],
            category: "Illegal",
            level: 5,
            mode: "standard",
            rng: seeded(9),
        });
        expect(result.targetWords).toEqual(["ALPHA", "BETA", "GAMMA"]);
    });

    it("never lets a bonus word double as a target word", () => {
        const result = generatePuzzle({
            targetWords: ["ALPHA", "BETA", "GAMMA"],
            bonusWords: ["ALPHA", "DELTA"],
            category: "NoOverlap",
            level: 5,
            mode: "standard",
            rng: seeded(11),
        });
        expect(result.bonusWords).not.toContain("ALPHA");
    });

    it("finds zero invariant violations across a spread of real generation requests", () => {
        for (const mode of ["easy", "standard", "challenging"] as const) {
            for (const level of [1, 5, 12, 25, 60]) {
                const difficulty = getPuzzleDifficulty(level, mode);
                const words = WORDS.filter(word => word.length <= difficulty.maxWordLength).slice(0, difficulty.targetCount);
                const request = { targetWords: words, bonusWords: ["SPROUT", "LEAF", "GARDEN"], category: "Certify", level, mode };
                const result = generatePuzzle(request);
                expect(validatePuzzleInvariants(result, request)).toEqual([]);
            }
        }
    });
});

describe("puzzle quality scoring (WSP-0.2)", () => {
    it("scores an empty placement set at zero", () => {
        const difficulty = getPuzzleDifficulty(10, "standard");
        expect(scorePuzzleQuality({}, 0, 0, difficulty).total).toBe(0);
    });

    it("scores a board that hits every difficulty target ratio near the top of the range", () => {
        const difficulty = getPuzzleDifficulty(10, "standard");
        // Two words: one placed exactly on-target for diagonal+reverse+overlap
        // given this difficulty's probabilities, the other its complement --
        // the average should land close to 1 for direction/reverse scoring.
        const placements = {
            ALPHA: { row: 0, col: 0, dc: 1, dr: 1 }, // diagonal, forward
            BETA: { row: 4, col: 4, dc: -1, dr: 0 }, // straight, reverse
        };
        const score = scorePuzzleQuality(placements, 2, 2, difficulty);
        expect(score.directionScore).toBeGreaterThan(0.4);
        expect(score.reverseScore).toBeGreaterThan(0.4);
        expect(score.bonusDensity).toBe(1);
        expect(score.total).toBeGreaterThan(0);
    });

    it("generatePuzzle always reports a quality score and stays within the attempt bound", () => {
        for (let seed = 1; seed <= 40; seed++) {
            const difficulty = getPuzzleDifficulty(15, "challenging");
            const words = WORDS.filter(word => word.length <= difficulty.maxWordLength).slice(0, difficulty.targetCount);
            const result = generatePuzzle({ targetWords: words, bonusWords: ["SPROUT", "LEAF"], category: "Quality", level: 15, mode: "challenging", rng: seeded(seed) });
            expect(typeof result.qualityScore).toBe("number");
            expect(result.attemptCount).toBeLessThanOrEqual(MAX_GENERATION_ATTEMPTS);
            // A board under threshold must say so via fallbackReason -- callers
            // (and the audit script) should never have to infer a quality miss
            // from the number alone.
            if (result.qualityScore < QUALITY_THRESHOLD) {
                expect(result.fallbackReason).toBeDefined();
            }
        }
    });
});
