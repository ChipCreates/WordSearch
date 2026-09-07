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
});
