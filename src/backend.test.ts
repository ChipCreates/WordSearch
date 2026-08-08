import { describe, it, expect } from "vitest";
import { getPuzzleWords } from "./backend";

describe("backend category parity", () => {
    it("selects category using level index formula", async () => {
        const p1 = await getPuzzleWords(5, 10, 1, "standard");
        expect(p1.category).toBe("Animals");

        const p2 = await getPuzzleWords(5, 10, 2, "standard");
        expect(p2.category).toBe("Card Games");
    });
});
