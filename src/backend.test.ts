import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { getPuzzleWords, type Tier } from "./backend";

// Asserts every (tier, level) pair against data/category_order.json -- the
// same fixture scripts/gen_categories.py emits from its own DISPLAY_NAMES
// source of truth, and that lib.rs's test_category_selection_parity asserts
// independently on the Rust side. Replaces a version of this test that only
// ever spot-checked levels 1 and 2 of "standard".
describe("backend category parity", () => {
    const fixturePath = path.resolve(process.cwd(), "data/category_order.json");
    const fixture: Record<Tier, string[]> = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    (Object.keys(fixture) as Tier[]).forEach(tier => {
        fixture[tier].forEach((expectedName, i) => {
            const level = i + 1;
            it(`level ${level} (${tier}) selects "${expectedName}"`, async () => {
                const puzzle = await getPuzzleWords({ count: 5, maxLength: 10, level, tier });
                expect(puzzle.category).toBe(expectedName);
            });
        });
    });
});

describe("backend custom category mode", () => {
    it("categoryName overrides the tier pool entirely", async () => {
        const puzzle = await getPuzzleWords({ count: 5, maxLength: 10, level: 1, tier: "standard", categoryName: "Mythology" });
        expect(puzzle.category).toBe("Mythology");
    });

    it("excludeWords are avoided when enough non-excluded words remain", async () => {
        const first = await getPuzzleWords({ count: 10, maxLength: 10, level: 1, tier: "standard", categoryName: "Mythology" });
        const second = await getPuzzleWords({
            count: 5, maxLength: 10, level: 1, tier: "standard",
            categoryName: "Mythology", excludeWords: first.words,
        });
        for (const w of second.words) {
            expect(first.words).not.toContain(w);
        }
    });
});
