import { describe, expect, it } from "vitest";
import {
    advanceAfflictionsOnPuzzleComplete,
    clearAffliction,
    createAfflictionState,
    isGardenVocabulary,
    isNeglected,
    normalizeAfflictionState,
    type AfflictionState,
} from "./plantAffliction";

describe("plant affliction state", () => {
    it("recognizes real Gardening-category vocabulary and rejects unrelated words", () => {
        expect(isGardenVocabulary("aphid")).toBe(true);
        expect(isGardenVocabulary("BLIGHT")).toBe(true);
        expect(isGardenVocabulary("ladybug")).toBe(true);
        expect(isGardenVocabulary("astronaut")).toBe(false);
    });

    it("rolls onset only for eligible plants and never for already-sick ones", () => {
        let state: AfflictionState = { rose: { type: "blight", severity: 1, puzzlesSinceOnset: 0 } };
        const alwaysRolls = () => 0; // < ONSET_CHANCE always
        state = advanceAfflictionsOnPuzzleComplete(state, ["rose", "fern"], alwaysRolls);
        expect(state.rose.type).toBe("blight"); // untouched by onset, only escalation
        expect(state.fern).toBeDefined();
    });

    it("never rolls onset when the rng exceeds the chance threshold", () => {
        const state = advanceAfflictionsOnPuzzleComplete(createAfflictionState(), ["fern"], () => 0.99);
        expect(state.fern).toBeUndefined();
    });

    it("escalates severity at the configured thresholds and caps at 3", () => {
        let state: AfflictionState = { rose: { type: "mildew", severity: 1, puzzlesSinceOnset: 0 } };
        const neverOnsets = () => 1;
        for (let i = 0; i < 2; i++) state = advanceAfflictionsOnPuzzleComplete(state, [], neverOnsets);
        expect(state.rose.severity).toBe(1);
        state = advanceAfflictionsOnPuzzleComplete(state, [], neverOnsets); // puzzlesSinceOnset now 3
        expect(state.rose.severity).toBe(2);
        for (let i = 0; i < 2; i++) state = advanceAfflictionsOnPuzzleComplete(state, [], neverOnsets);
        expect(state.rose.severity).toBe(2);
        state = advanceAfflictionsOnPuzzleComplete(state, [], neverOnsets); // puzzlesSinceOnset now 6
        expect(state.rose.severity).toBe(3);
        // Hard cap: further completions never advance past 3 or reintroduce decay.
        for (let i = 0; i < 10; i++) state = advanceAfflictionsOnPuzzleComplete(state, [], neverOnsets);
        expect(state.rose.severity).toBe(3);
    });

    it("clears an affliction and leaves others untouched", () => {
        const state: AfflictionState = {
            rose: { type: "blight", severity: 2, puzzlesSinceOnset: 4 },
            fern: { type: "slugs", severity: 1, puzzlesSinceOnset: 0 },
        };
        const next = clearAffliction(state, "rose");
        expect(next.rose).toBeUndefined();
        expect(next.fern).toEqual(state.fern);
        // No-op when the plant isn't afflicted.
        expect(clearAffliction(next, "rose")).toBe(next);
    });

    it("normalizes malformed or legacy-shaped save data defensively", () => {
        expect(normalizeAfflictionState(undefined)).toEqual({});
        expect(normalizeAfflictionState(null)).toEqual({});
        expect(normalizeAfflictionState({
            rose: { type: "blight", severity: 2, puzzlesSinceOnset: 4 },
            fern: { type: "not-a-real-type", severity: 1, puzzlesSinceOnset: 0 },
            weed: { type: "aphids", severity: 99, puzzlesSinceOnset: -5 },
        })).toEqual({
            rose: { type: "blight", severity: 2, puzzlesSinceOnset: 4 },
            weed: { type: "aphids", severity: 1, puzzlesSinceOnset: 0 },
        });
    });

    it("treats a plant as neglected only past the multiplier threshold", () => {
        const cooldown = 1000;
        expect(isNeglected(0, 2999, cooldown)).toBe(false);
        expect(isNeglected(0, 3000, cooldown)).toBe(true);
    });
});
