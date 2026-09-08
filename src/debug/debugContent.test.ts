import { describe, expect, it } from "vitest";
import { DEBUG_WORDS_BY_SIZE, DEBUG_CATEGORY, maxWordLengthForSize, targetCountForSize } from "./debugContent";
import { generatePuzzle } from "../puzzleGenerator";

describe("debugContent", () => {
    it("covers every board size the debug panel offers (4x4 through 12x12)", () => {
        for (let size = 4; size <= 12; size++) {
            expect(DEBUG_WORDS_BY_SIZE[size]).toBeDefined();
        }
    });

    it("keeps every dummy word within that board's own placement bounds", () => {
        for (const [sizeKey, words] of Object.entries(DEBUG_WORDS_BY_SIZE)) {
            const maxLength = maxWordLengthForSize(Number(sizeKey));
            for (const word of words) {
                expect(word.length).toBeGreaterThanOrEqual(3);
                expect(word.length).toBeLessThanOrEqual(maxLength);
            }
        }
    });

    it("supplies enough words to fill every board's target-word count", () => {
        for (const [sizeKey, words] of Object.entries(DEBUG_WORDS_BY_SIZE)) {
            expect(words.length).toBeGreaterThanOrEqual(targetCountForSize(Number(sizeKey)));
        }
    });

    it("actually places on a real, exact-sized board via generatePuzzle for every size", () => {
        for (let size = 4; size <= 12; size++) {
            const result = generatePuzzle({
                targetWords: DEBUG_WORDS_BY_SIZE[size],
                category: DEBUG_CATEGORY,
                level: 1,
                mode: "standard",
                gridSize: size,
            });
            expect(result.gridSize).toBe(size);
            expect(result.fallbackReason).toBeUndefined();
        }
    });
});
