import { describe, expect, it } from "vitest";
import { classifyWordSelection } from "./gameMechanics";

describe("word selection classification", () => {
    it("recognizes targets before bonus words", () => {
        expect(classifyWordSelection("MARE", "ERAM", ["MARE"], {}, new Set(["MARE"]))).toEqual({ kind: "target-found", word: "MARE" });
    });

    it("normalizes reverse bonus words and pays only once", () => {
        const first = classifyWordSelection("ERAM", "MARE", [], {}, new Set(["MARE"]));
        const duplicate = classifyWordSelection("MARE", "ERAM", [], { MARE: "green" }, new Set(["MARE"]));

        expect(first).toEqual({ kind: "bonus-found", word: "MARE" });
        expect(duplicate).toEqual({ kind: "already-found", word: "MARE" });
    });

    it("rejects invalid and too-short bonus candidates", () => {
        expect(classifyWordSelection("XY", "YX", [], {}, new Set(["XY"]))).toEqual({ kind: "invalid", word: "XY" });
        expect(classifyWordSelection("NO", "ON", [], {}, new Set())).toEqual({ kind: "invalid", word: "NO" });
    });

    it("credits a genuinely different word sharing a target's cells in reverse as its own bonus (LOOP/POOL)", () => {
        // Dragging LOOP forward still finds the target, same as always.
        expect(classifyWordSelection("LOOP", "POOL", ["LOOP"], {}, new Set(["POOL"])))
            .toEqual({ kind: "target-found", word: "LOOP" });
        // Dragging the same cells backwards spells POOL -- a different real
        // word, not "LOOP found backwards" -- so it's its own bonus, not
        // swallowed by the target match.
        expect(classifyWordSelection("POOL", "LOOP", ["LOOP"], {}, new Set(["POOL"])))
            .toEqual({ kind: "bonus-found", word: "POOL" });
    });

    it("still finds a target dragged backwards when the reverse spelling isn't a real word itself", () => {
        // "TAC" was never added as a bonus candidate (not a real word), so
        // this falls through to "the reverse is the target" -- CAT found
        // backwards, not rejected as invalid.
        expect(classifyWordSelection("TAC", "CAT", ["CAT"], {}, new Set()))
            .toEqual({ kind: "target-found", word: "CAT" });
    });

    it("never lets a target's own spelling be credited as a bonus even if it's in the candidate set", () => {
        // Defense in depth: even if a caller mistakenly included the target
        // itself among the bonus candidates, the target match still wins.
        expect(classifyWordSelection("LOOP", "POOL", ["LOOP"], {}, new Set(["LOOP", "POOL"])))
            .toEqual({ kind: "target-found", word: "LOOP" });
    });
});
