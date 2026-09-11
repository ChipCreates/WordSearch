import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { getPuzzleWords, MAX_TARGET_WORD_LENGTH, type Tier } from "./backend";
import { createSeededRng } from "./rng";
import type { RegionId } from "./regionTuning";

describe("category word limits", () => {
    it("tracks the longest target so the Found Words panel fits its content", () => {
        expect(MAX_TARGET_WORD_LENGTH).toBe(10);
    });
});

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

// WSP-2.3's required parity check for the web side: confirms getPuzzleWords'
// region bias produces the same category, for the same (region, tier,
// level) inputs, that src-tauri/src/lib.rs's own
// test_region_category_bias_parity independently asserts for the native
// path. Both sides compute their own "expected" weighted sequence directly
// from the same two JSON fixtures -- data/category_order.json (the
// unbiased tier-pool order) and data/region_category_bias.json (the
// favored-category lists and weights) -- rather than calling into
// src/regionTuning.ts's own buildBiasedCategorySequence, so this test would
// still catch that function itself drifting from the documented weighting
// rule, not just a stale fixture. Together with lib.rs's equivalent test,
// this is the "paired tests, one per platform's test infrastructure" WSP-2.3
// asks for -- there is no single test that can exercise both a TS module
// and a compiled Rust binary in one run.
describe("region category bias parity", () => {
    const orderFixturePath = path.resolve(process.cwd(), "data/category_order.json");
    const orderFixture: Record<Tier, string[]> = JSON.parse(fs.readFileSync(orderFixturePath, "utf-8"));

    const biasFixturePath = path.resolve(process.cwd(), "data/region_category_bias.json");
    const biasFixture: Record<RegionId, { favoredCategories: string[]; weight: number }> =
        JSON.parse(fs.readFileSync(biasFixturePath, "utf-8"));

    function expectedSequence(tier: Tier, regionId: RegionId): string[] {
        const pool = orderFixture[tier];
        const { favoredCategories, weight } = biasFixture[regionId];
        const favored = new Set(favoredCategories);
        const sequence: string[] = [];
        for (const name of pool) {
            const times = favored.has(name) ? Math.max(1, weight) : 1;
            for (let i = 0; i < times; i++) sequence.push(name);
        }
        return sequence;
    }

    (Object.keys(biasFixture) as RegionId[]).forEach(regionId => {
        (Object.keys(orderFixture) as Tier[]).forEach(tier => {
            const sequence = expectedSequence(tier, regionId);
            it(`region "${regionId}" / tier "${tier}" matches the fixture-derived weighted sequence across a full cycle`, async () => {
                for (let i = 0; i < sequence.length; i++) {
                    const level = i + 1;
                    const puzzle = await getPuzzleWords({ count: 5, maxLength: 10, level, tier, regionId });
                    expect(puzzle.category).toBe(sequence[i]);
                }
            });
        });
    });

    it("an unrecognized regionId falls back to the plain unbiased tier-pool cycle rather than throwing", async () => {
        const unbiased = await getPuzzleWords({ count: 5, maxLength: 10, level: 1, tier: "standard" });
        const withBogusRegion = await getPuzzleWords({
            count: 5, maxLength: 10, level: 1, tier: "standard", regionId: "not-a-real-region" as RegionId,
        });
        expect(withBogusRegion.category).toBe(unbiased.category);
    });
});

describe("backend custom category mode", () => {
    it("categoryName overrides the tier pool entirely", async () => {
        const puzzle = await getPuzzleWords({ count: 5, maxLength: 10, level: 1, tier: "standard", categoryName: "Mythology" });
        expect(puzzle.category).toBe("Mythology");
    });

    it("categoryName wins over regionId -- region bias never overrides an explicit favorite category", async () => {
        const puzzle = await getPuzzleWords({
            count: 5, maxLength: 10, level: 1, tier: "standard",
            categoryName: "Mythology", regionId: "glowing-grove",
        });
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

describe("backend seeded word selection", () => {
    // The puzzle audit script (scripts/audit-puzzles.ts) needs word
    // *selection* to be reproducible from a seed too, not just
    // generatePuzzle's own placement -- otherwise the same reported seed
    // could draw different words on every re-run.
    it("an explicit rng makes word selection reproducible", async () => {
        const request = { count: 5, maxLength: 10, level: 1, tier: "standard" as const, categoryName: "Mythology" };
        const first = await getPuzzleWords({ ...request, rng: createSeededRng(42) });
        const second = await getPuzzleWords({ ...request, rng: createSeededRng(42) });
        expect(second.words).toEqual(first.words);
    });

    it("omitting rng still returns a valid, unseeded selection", async () => {
        const puzzle = await getPuzzleWords({ count: 5, maxLength: 10, level: 1, tier: "standard", categoryName: "Mythology" });
        expect(puzzle.words).toHaveLength(5);
    });
});
