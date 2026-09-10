import { describe, expect, it } from "vitest";
import { findAccidentalDeniedStrings, findDeniedWords, isDeniedWord, sanitizeAccidentalDeniedStrings } from "./contentSafety";
import { createSeededRng } from "./rng";

describe("contentSafety", () => {
    it("flags a deny-listed word regardless of case", () => {
        expect(isDeniedWord("SHIT")).toBe(true);
        expect(isDeniedWord("shit")).toBe(true);
        expect(isDeniedWord("SPROUT")).toBe(false);
    });

    it("never flags a legitimate word just because it contains a denied one as a substring", () => {
        // The classic profanity-filter false positive (the "Scunthorpe
        // problem") -- DRAPERY contains RAPE, PEACOCK contains COCK, both
        // are ordinary words that must never get censored.
        expect(isDeniedWord("DRAPERY")).toBe(false);
        expect(isDeniedWord("PEACOCK")).toBe(false);
        expect(isDeniedWord("ASSHOLE")).toBe(true);
        expect(isDeniedWord("CLASSHOLE")).toBe(false);
    });

    it("filters a word list down to only the exact deny-listed entries", () => {
        expect(findDeniedWords(["APPLE", "SHIT", "GARDEN", "bitch"])).toEqual(["SHIT", "bitch"]);
        expect(findDeniedWords(["APPLE", "GARDEN", "SPROUT", "DRAPERY", "PEACOCK"])).toEqual([]);
    });

    it("finds an accidental deny-listed run in board filler that was never a placed word", () => {
        const grid = [
            ["S", "H", "I", "T"],
            ["X", "X", "X", "X"],
            ["X", "X", "X", "X"],
            ["X", "X", "X", "X"],
        ];
        expect(findAccidentalDeniedStrings(grid, {})).toContain("SHIT");
    });

    it("finds a deny-listed run written backwards on the board", () => {
        const grid = [
            ["T", "I", "H", "S"],
            ["X", "X", "X", "X"],
            ["X", "X", "X", "X"],
            ["X", "X", "X", "X"],
        ];
        expect(findAccidentalDeniedStrings(grid, {})).toContain("SHIT");
    });

    it("finds a deny-listed run along a diagonal", () => {
        const grid = [
            ["S", "X", "X", "X"],
            ["X", "H", "X", "X"],
            ["X", "X", "I", "X"],
            ["X", "X", "X", "T"],
        ];
        expect(findAccidentalDeniedStrings(grid, {})).toContain("SHIT");
    });

    it("does not flag a run that sits entirely inside a single legitimately placed word", () => {
        // DRAPERY placed left-to-right on row 0 -- its own letters spell
        // RAPE internally, but that's the dictionary word being itself,
        // not a board defect, so it must not be reported.
        const grid = [
            ["D", "R", "A", "P", "E", "R", "Y", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
        ];
        const placements = { DRAPERY: { row: 0, col: 0, dc: 1, dr: 0 } };
        expect(findAccidentalDeniedStrings(grid, placements)).toEqual([]);
    });

    it("still flags the same letters when they span filler instead of one placed word", () => {
        // Same RAPE-shaped run as above, but this time nothing was placed
        // there -- it's genuinely incidental filler, so it should be flagged.
        const grid = [
            ["R", "A", "P", "E", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
            ["X", "X", "X", "X", "X", "X", "X", "X"],
        ];
        expect(findAccidentalDeniedStrings(grid, {})).toContain("RAPE");
    });

    it("reports nothing for a clean board", () => {
        const grid = [
            ["G", "A", "R", "D"],
            ["E", "N", "S", "P"],
            ["R", "O", "U", "T"],
            ["L", "E", "A", "F"],
        ];
        expect(findAccidentalDeniedStrings(grid, {})).toEqual([]);
    });

    describe("sanitizeAccidentalDeniedStrings", () => {
        it("mutates a denied filler run in place until the board is clean", () => {
            const grid = [
                ["S", "H", "I", "T"],
                ["X", "X", "X", "X"],
                ["X", "X", "X", "X"],
                ["X", "X", "X", "X"],
            ];
            sanitizeAccidentalDeniedStrings(grid, {}, () => false, createSeededRng(1));
            expect(findAccidentalDeniedStrings(grid, {})).toEqual([]);
        });

        it("never mutates a cell that belongs to a placed word", () => {
            // DRAPERY spells RAPE internally -- sanitizing must leave every
            // one of its letters untouched even though isWordCell here
            // marks nothing (worst case: the caller's bookkeeping is wrong),
            // because the window sits entirely inside DRAPERY's own cells.
            const grid = [
                ["D", "R", "A", "P", "E", "R", "Y", "X"],
                ["X", "X", "X", "X", "X", "X", "X", "X"],
                ["X", "X", "X", "X", "X", "X", "X", "X"],
                ["X", "X", "X", "X", "X", "X", "X", "X"],
                ["X", "X", "X", "X", "X", "X", "X", "X"],
                ["X", "X", "X", "X", "X", "X", "X", "X"],
                ["X", "X", "X", "X", "X", "X", "X", "X"],
                ["X", "X", "X", "X", "X", "X", "X", "X"],
            ];
            const placements = { DRAPERY: { row: 0, col: 0, dc: 1, dr: 0 } };
            const before = grid.map(row => [...row]);
            sanitizeAccidentalDeniedStrings(grid, placements, () => false, createSeededRng(1));
            expect(grid).toEqual(before);
        });

        it("fixes a genuinely large/sparse board deterministically, not just probabilistically", () => {
            // A 20x20 grid that's almost entirely filler is exactly the
            // shape that made a bounded number of full re-rolls merely
            // probabilistic (see the generator's emergency fallback) --
            // seed a guaranteed hit and confirm sanitize always clears it.
            const size = 20;
            const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => "X"));
            grid[10][10] = "F"; grid[10][11] = "U"; grid[10][12] = "C"; grid[10][13] = "K";
            for (let seed = 1; seed <= 20; seed++) {
                const attempt = grid.map(row => [...row]);
                sanitizeAccidentalDeniedStrings(attempt, {}, () => false, createSeededRng(seed));
                expect(findAccidentalDeniedStrings(attempt, {})).toEqual([]);
            }
        });
    });
});
