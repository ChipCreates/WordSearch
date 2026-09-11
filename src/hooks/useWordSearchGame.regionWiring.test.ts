import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { DEFAULT_SAVE_DATA } from "../persistence";

// WSP-2.4 Part A1: initGame (the ONE call site that actually runs every real
// puzzle load) never passed regionId/difficultyOverride to
// getPuzzleWords/generatePuzzle, even though WSP-2.3 added both parameters
// specifically for this -- WSP-2.2 and WSP-2.3 were built in isolated
// worktrees and never actually got wired to the live game loop. Region
// tuning and category bias were fully implemented and fully unit-tested
// (regionTuning.test.ts, backend.test.ts) but silently never ran for a real
// player. This file re-tests the WIRING itself -- that the real hook, at a
// real level, actually calls the real backend/generator functions with the
// right region id and a real region-biased difficulty -- rather than
// re-testing the already-covered pure functions (applyRegionDifficultyBias,
// regionIdForLevel, buildBiasedCategorySequence) in isolation again.
const getPuzzleWordsSpy = vi.fn();
const generatePuzzleSpy = vi.fn();

vi.mock("../backend", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../backend")>();
    return {
        ...actual,
        getPuzzleWords: (request: Parameters<typeof actual.getPuzzleWords>[0]) => {
            getPuzzleWordsSpy(request);
            return actual.getPuzzleWords(request);
        },
        // Mirrors useWordSearchGame.test.ts's own mock -- the real dictionary
        // lookup isn't available in this test environment and isn't what
        // this file is testing.
        validateWord: vi.fn().mockResolvedValue(true),
    };
});

vi.mock("../puzzleGenerator", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../puzzleGenerator")>();
    return {
        ...actual,
        generatePuzzle: (request: Parameters<typeof actual.generatePuzzle>[0]) => {
            generatePuzzleSpy(request);
            return actual.generatePuzzle(request);
        },
    };
});

// vi.mock calls above are hoisted above these imports by Vitest, so
// useWordSearchGame picks up the spied versions of getPuzzleWords/
// generatePuzzle -- matching the existing pattern in useWordSearchGame.test.ts.
import { useWordSearchGame } from "./useWordSearchGame";
import { regionIdForLevel, getRegionPuzzleDifficulty } from "../regionTuning";
import { getPuzzleDifficulty } from "../puzzleGenerator";

describe("useWordSearchGame region wiring (WSP-2.4 Part A1)", () => {
    beforeEach(() => {
        localStorage.clear();
        getPuzzleWordsSpy.mockClear();
        generatePuzzleSpy.mockClear();
    });

    it("passes the level's region id to getPuzzleWords and a region-biased difficultyOverride to generatePuzzle (Crystal Conservatory)", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 35,
            level: 35,
        }));
        const { result } = renderHook(() => useWordSearchGame());
        await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));

        expect(regionIdForLevel(35)).toBe("crystal-conservatory");

        expect(getPuzzleWordsSpy).toHaveBeenCalled();
        const puzzleWordsArgs = getPuzzleWordsSpy.mock.calls[getPuzzleWordsSpy.mock.calls.length - 1][0];
        expect(puzzleWordsArgs.regionId).toBe("crystal-conservatory");
        expect(puzzleWordsArgs.level).toBe(35);

        expect(generatePuzzleSpy).toHaveBeenCalled();
        const generateArgs = generatePuzzleSpy.mock.calls[generatePuzzleSpy.mock.calls.length - 1][0];
        expect(generateArgs.difficultyOverride).toBeDefined();

        // This test's job is the wiring, not re-proving the bias math
        // (already covered by regionTuning.test.ts) -- so assert the actual
        // override the generator received matches exactly what
        // getRegionPuzzleDifficulty produces for this level/mode/region/
        // gridSize, rather than hand-deriving expected numbers here.
        const expectedDifficulty = getRegionPuzzleDifficulty(35, "standard", "crystal-conservatory", generateArgs.gridSize);
        expect(generateArgs.difficultyOverride).toEqual(expectedDifficulty);

        // And prove it's genuinely region-biased, not just "present": Crystal
        // Conservatory's own bias pushes both word-length bounds up relative
        // to the player's plain standard-mode difficulty at the same level.
        const plainBase = getPuzzleDifficulty(35, "standard", generateArgs.gridSize);
        expect(generateArgs.difficultyOverride.minWordLength).toBeGreaterThanOrEqual(plainBase.minWordLength);
        expect(generateArgs.difficultyOverride.maxWordLength).toBeGreaterThan(plainBase.maxWordLength);
    });

    it("uses Glowing Grove's region id and bias for a level 5 puzzle", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 5,
            level: 5,
        }));
        const { result } = renderHook(() => useWordSearchGame());
        await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));

        expect(regionIdForLevel(5)).toBe("glowing-grove");

        const puzzleWordsArgs = getPuzzleWordsSpy.mock.calls[getPuzzleWordsSpy.mock.calls.length - 1][0];
        expect(puzzleWordsArgs.regionId).toBe("glowing-grove");

        const generateArgs = generatePuzzleSpy.mock.calls[generatePuzzleSpy.mock.calls.length - 1][0];
        const expectedDifficulty = getRegionPuzzleDifficulty(5, "standard", "glowing-grove", generateArgs.gridSize);
        expect(generateArgs.difficultyOverride).toEqual(expectedDifficulty);
    });

    it("still passes regionId when playing with favorite categories, even though categoryName wins the actual category selection", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 12,
            level: 12,
            useFavorites: true,
            // MIN_FAVORITE_CATEGORIES (gameMechanics.ts) is 10 -- fewer than
            // that and favorites mode doesn't actually engage.
            favoriteCategories: ["Animals", "Colors", "Fruits", "Gardening", "Emotions", "Fantasy", "Birds", "Desserts", "Holidays", "Comedy"],
        }));
        const { result } = renderHook(() => useWordSearchGame());
        await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));

        const puzzleWordsArgs = getPuzzleWordsSpy.mock.calls[getPuzzleWordsSpy.mock.calls.length - 1][0];
        expect(puzzleWordsArgs.regionId).toBe("glowing-grove");
        expect(puzzleWordsArgs.categoryName).toBeDefined();
    });
});
