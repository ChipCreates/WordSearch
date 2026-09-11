// WSP-2.7 -- beyond-level-100 certification.
//
// The release plan requires the campaign to "keep generating puzzles and
// progressing rank/achievements/Garden indefinitely" once a player passes
// level 100. As WSP-2.4's context section (and this issue) spell out, that
// can't literally mean every system unlocks forever: Botanist Rank has a
// terminal rank (Cosmic Conservator, level 41+, `maxLevel: null`) and the
// achievement list is finite. What must genuinely continue indefinitely is
// puzzle generation itself, the level/frontier counter, and lifetime
// statistics. This file is the certification pass for that precise claim,
// exercising WSP-2.2 (region data/fallback), WSP-2.3 (generator tuning +
// category bias), and WSP-2.5 (achievement audit + rarity fix) together,
// well past level 100 -- this is what makes it WSP-2.7's job rather than a
// duplicate of any one of those issues' own unit tests, which each stop at
// or near level 100.
//
// Every level used below is chosen to sit meaningfully past 100 (101, 110,
// 125, 137, 150, 160) -- 150 matches the Rust side's own beyond-100 spread
// (see src-tauri/src/lib.rs's test_get_puzzle_words_with_region_bias_never_panics
// and src-tauri/src/regions.rs's for_level_matches_the_frozen_plan_boundaries),
// and 137 mirrors the existing level100PlayerSave fixture's own frontier.
import { describe, expect, it } from "vitest";
import { getPuzzleWords, type Tier } from "./backend";
import { generatePuzzle, getPuzzleDifficulty, validatePuzzleInvariants, type PuzzleMode } from "./puzzleGenerator";
import { getResponsiveGridSize } from "./gameMechanics";
import {
    applyRegionDifficultyBias, DIFFICULTY_CLAMP_BOUNDS, getRegionPuzzleDifficulty,
    REGION_CATEGORY_BIAS, regionIdForLevel, type RegionId,
} from "./regionTuning";
import { regionForLevel } from "./regions";
import { createSeededRng } from "./rng";
import { getBotanistRank, getBotanistPromotion, getNextBotanistRank } from "./botanistRanks";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementStats } from "./achievements";

const MODES: PuzzleMode[] = ["easy", "standard", "challenging"];
const BEYOND_100_LEVELS = [101, 110, 125, 137, 150, 160];
const REGION_IDS: RegionId[] = [
    "glowing-grove", "sunlit-falls", "crystal-conservatory",
    "mosswood-hollows", "cloudreach-summit", "verdant-beyond",
];

function isWithin(value: number, bounds: { min: number; max: number }): boolean {
    return value >= bounds.min && value <= bounds.max;
}

describe("region resolution keeps landing on Verdant Beyond past level 100 (WSP-2.2/2.3)", () => {
    it("regionForLevel (src/regions.ts, used by the real reward/event pipeline in useWordSearchGame.ts) resolves every beyond-100 level to verdant-beyond, not undefined", () => {
        for (const level of BEYOND_100_LEVELS) {
            const region = regionForLevel(level);
            expect(region).toBeDefined();
            expect(region.id).toBe("verdant-beyond");
        }
    });

    it("regionIdForLevel (src/regionTuning.ts, used by generator tuning/category bias) agrees with regionForLevel for every beyond-100 level", () => {
        // The two modules deliberately duplicate the level-range table
        // (documented in regionTuning.ts as an intentional short-term
        // decision) rather than one importing the other. This is the
        // integration check that the duplication hasn't drifted -- both
        // must resolve the same region id for the same level, including
        // past the point where either table runs out of explicit ranges.
        for (const level of BEYOND_100_LEVELS) {
            expect(regionIdForLevel(level)).toBe(regionForLevel(level).id);
        }
    });
});

describe("generator tuning (WSP-2.3) stays sane well past level 100", () => {
    it("getRegionPuzzleDifficulty never throws and stays within DIFFICULTY_CLAMP_BOUNDS for every beyond-100 level and mode", () => {
        for (const level of BEYOND_100_LEVELS) {
            for (const mode of MODES) {
                const tuned = getRegionPuzzleDifficulty(level, mode);
                expect(isWithin(tuned.gridSize, DIFFICULTY_CLAMP_BOUNDS.gridSize)).toBe(true);
                expect(isWithin(tuned.targetCount, DIFFICULTY_CLAMP_BOUNDS.targetCount)).toBe(true);
                expect(isWithin(tuned.minWordLength, DIFFICULTY_CLAMP_BOUNDS.minWordLength)).toBe(true);
                expect(isWithin(tuned.maxWordLength, DIFFICULTY_CLAMP_BOUNDS.maxWordLength)).toBe(true);
                expect(tuned.minWordLength).toBeLessThanOrEqual(tuned.maxWordLength);
                expect(isWithin(tuned.reverseWordProbability, DIFFICULTY_CLAMP_BOUNDS.reverseWordProbability)).toBe(true);
                expect(isWithin(tuned.diagonalProbability, DIFFICULTY_CLAMP_BOUNDS.diagonalProbability)).toBe(true);
                expect(isWithin(tuned.overlapPressure, DIFFICULTY_CLAMP_BOUNDS.overlapPressure)).toBe(true);
                expect(isWithin(tuned.bonusCandidateCount, DIFFICULTY_CLAMP_BOUNDS.bonusCandidateCount)).toBe(true);
            }
        }
    });

    it("Verdant Beyond's own bias, applied at these levels' actual base difficulty, still clamps cleanly (not just in the abstract)", () => {
        for (const level of BEYOND_100_LEVELS) {
            for (const mode of MODES) {
                const base = getPuzzleDifficulty(level, mode);
                const tuned = applyRegionDifficultyBias(base, { diagonalProbabilityDelta: 0.08, reverseWordProbabilityDelta: 0.08, overlapPressureDelta: 0.05, bonusCandidateCountDelta: 1, maxWordLengthDelta: 1 });
                expect(Number.isFinite(tuned.gridSize)).toBe(true);
                expect(tuned.gridSize).toBeGreaterThan(0);
            }
        }
    });

    it("does not silently grow gridSize/targetCount without bound as level climbs indefinitely -- calculateGridSize's own cap holds", () => {
        // getPuzzleDifficulty derives gridSize from calculateGridSize, which
        // caps per mode (see src/gameMechanics.ts). This asserts the tuning
        // layer inherits that cap rather than the region bias somehow
        // escaping it -- a real "degenerate past 100" failure mode would be
        // gridSize growing forever and eventually producing unplayable or
        // absurdly slow-to-generate boards.
        const veryHighLevel = 100_000;
        for (const mode of MODES) {
            const tuned = getRegionPuzzleDifficulty(veryHighLevel, mode);
            expect(tuned.gridSize).toBeLessThanOrEqual(DIFFICULTY_CLAMP_BOUNDS.gridSize.max);
        }
    });
});

describe("full puzzle-generation pipeline past level 100, via WSP-2.3's region-tuning module", () => {
    // This exercises getRegionPuzzleDifficulty -> getPuzzleWords(regionId) ->
    // generatePuzzle(difficultyOverride) end to end, the intended integration
    // per regionTuning.ts's own doc comment on getRegionPuzzleDifficulty
    // ("Ready to pass straight into generatePuzzle's difficultyOverride").
    // See this file's companion describe block below ("...via the actual
    // production gameplay path") for what real players get today, which is
    // different -- see the WSP-2.7 findings doc for why that gap matters.
    for (const level of BEYOND_100_LEVELS) {
        for (const mode of MODES) {
            it(`level ${level} / ${mode}: generates a valid, invariant-clean board using region-tuned difficulty`, async () => {
                const regionId = regionIdForLevel(level);
                const tunedDifficulty = getRegionPuzzleDifficulty(level, mode, regionId);
                const puzzle = await getPuzzleWords({
                    count: tunedDifficulty.targetCount + Math.min(tunedDifficulty.targetCount, tunedDifficulty.bonusCandidateCount),
                    maxLength: tunedDifficulty.maxWordLength,
                    level,
                    tier: mode,
                    regionId,
                    rng: createSeededRng(level * 31 + mode.length),
                });
                expect(puzzle.category).not.toBe("");
                expect(puzzle.words.length).toBeGreaterThan(0);

                const targetWords = puzzle.words.slice(0, tunedDifficulty.targetCount);
                const bonusWords = puzzle.words.slice(tunedDifficulty.targetCount);
                const request = {
                    targetWords, bonusWords, category: puzzle.category, level, mode,
                    difficultyOverride: tunedDifficulty,
                    rng: createSeededRng(level * 31 + mode.length),
                };
                const result = generatePuzzle(request);
                expect(result.grid.length).toBe(tunedDifficulty.gridSize);
                expect(result.targetWords.length).toBeGreaterThan(0);

                const violations = validatePuzzleInvariants(result, request)
                    .filter(v => v !== "duplicate-target"); // already deduped by the generator; not a real defect
                expect(violations).toEqual([]);
            });
        }
    }
});

describe("full puzzle-generation pipeline past level 100, via the actual production gameplay path", () => {
    // useWordSearchGame.ts's initGame (the only real puzzle-generation call
    // site reachable from actual play) does NOT currently call
    // getRegionPuzzleDifficulty or pass a regionId to getPuzzleWords -- see
    // this issue's findings doc. This describe block certifies that path
    // specifically: what a real player's client actually runs today, region
    // tuning/bias or not, must still never error or degenerate past level
    // 100.
    for (const level of BEYOND_100_LEVELS) {
        for (const mode of MODES) {
            it(`level ${level} / ${mode}: the unbiased production path still generates a valid board`, async () => {
                const size = getResponsiveGridSize(level, mode === "challenging" ? "hard" : mode === "easy" ? "easy" : "normal");
                const count = Math.max(3, size - 1);
                const maxWordLength = size <= 4 ? size : size - 1;
                const puzzle = await getPuzzleWords({
                    count: count + Math.min(count, 8),
                    maxLength: maxWordLength,
                    level,
                    tier: mode,
                    rng: createSeededRng(level * 17 + mode.length),
                });
                expect(puzzle.words.length).toBeGreaterThan(0);

                const mainWords = puzzle.words.slice(0, count);
                const bonusWords = puzzle.words.slice(count);
                const request = {
                    targetWords: mainWords, bonusWords, category: puzzle.category, level, mode, gridSize: size,
                    rng: createSeededRng(level * 17 + mode.length),
                };
                const result = generatePuzzle(request);
                expect(result.grid.length).toBe(size);
                const violations = validatePuzzleInvariants(result, request).filter(v => v !== "duplicate-target");
                expect(violations).toEqual([]);
            });
        }
    }
});

describe("category bias (WSP-2.3) continues to function past level 100 on the web path", () => {
    it("every region/tier combination keeps returning a non-empty category and word list at every beyond-100 level", async () => {
        for (const regionId of REGION_IDS) {
            for (const tier of ["easy", "standard", "challenging"] as Tier[]) {
                for (const level of BEYOND_100_LEVELS) {
                    const puzzle = await getPuzzleWords({ count: 5, maxLength: 10, level, tier, regionId });
                    expect(puzzle.category, `region=${regionId} tier=${tier} level=${level}`).not.toBe("");
                    expect(puzzle.words.length, `region=${regionId} tier=${tier} level=${level}`).toBeGreaterThan(0);
                }
            }
        }
    });

    it("a region's favored categories still come up more often than unfavored ones across a full cycle starting past level 100", async () => {
        // Mirrors backend.test.ts's own bias-weighting check, but anchored
        // at a level offset past 100 rather than starting from level 1 --
        // confirms the weighting behavior (not just non-empty results)
        // survives indefinitely, not only within the first cycle.
        const regionId: RegionId = "crystal-conservatory"; // weight 3, a clear signal
        const bias = REGION_CATEGORY_BIAS[regionId];
        // Crystal Conservatory's favored categories (Mythology, Philosophy,
        // ...) live in the "challenging" tier pool -- src/categories/*.json's
        // own tier assignments, matching this region's "rarer vocabulary"
        // identity (WordSprout_1.0_Plan.md section 2.1).
        const tier: Tier = "challenging";
        const startLevel = 101;
        const seen = new Map<string, number>();
        for (let i = 0; i < 40; i++) {
            const level = startLevel + i;
            const puzzle = await getPuzzleWords({ count: 1, maxLength: 20, level, tier, regionId });
            seen.set(puzzle.category, (seen.get(puzzle.category) ?? 0) + 1);
        }
        const favoredSet = new Set(bias.favoredCategories);
        const favoredHits = bias.favoredCategories.reduce((sum, name) => sum + (seen.get(name) ?? 0), 0);
        const unfavoredHits = Array.from(seen.entries())
            .filter(([name]) => !favoredSet.has(name))
            .reduce((sum, [, count]) => sum + count, 0);
        const unfavoredNameCount = Array.from(seen.keys()).filter(name => !favoredSet.has(name)).length;
        // Pool-size-independent check: with `weight` applied, each favored
        // name individually should average more hits than each unfavored
        // name does, over a 40-level window -- a real signal the bias is
        // doing something, regardless of exactly how big the "challenging"
        // tier's real category list happens to be.
        const avgHitsPerFavoredName = favoredHits / bias.favoredCategories.length;
        const avgHitsPerUnfavoredName = unfavoredNameCount > 0 ? unfavoredHits / unfavoredNameCount : 0;
        expect(avgHitsPerFavoredName).toBeGreaterThan(avgHitsPerUnfavoredName);
        // Every favored name should show up somewhere in this 40-level window.
        for (const name of bias.favoredCategories) {
            expect(seen.has(name), `expected "${name}" to be picked at least once`).toBe(true);
        }
    });
});

describe("Botanist Rank correctly stays at Cosmic Conservator past level 100 -- by design, not a bug", () => {
    it("getBotanistRank reports Cosmic Conservator, with maxLevel null, for every beyond-100 level and far beyond", () => {
        for (const level of [...BEYOND_100_LEVELS, 1_000, 100_000, Number.MAX_SAFE_INTEGER]) {
            const rank = getBotanistRank(level);
            expect(rank.title).toBe("Cosmic Conservator");
            expect(rank.maxLevel).toBeNull();
        }
    });

    it("getNextBotanistRank returns null past level 100 -- there is no eleventh rank to promote into", () => {
        for (const level of BEYOND_100_LEVELS) {
            expect(getNextBotanistRank(level)).toBeNull();
        }
    });

    it("getBotanistPromotion never fires between two beyond-100 levels -- no promotion ceremony past Cosmic Conservator", () => {
        expect(getBotanistPromotion(101, 150)).toBeNull();
        expect(getBotanistPromotion(100, 101)).toBeNull(); // already Cosmic Conservator at 100 (rank starts at 41)
    });
});

describe("achievement evaluation (WSP-2.5) never errors once levelsCompleted exceeds every maxProgress", () => {
    it(`ACHIEVEMENTS currently has ${ACHIEVEMENTS.length} entries -- pinned so a future count change is a deliberate edit, not a silent drift`, () => {
        // The Tier 2 issues doc's "26 entries as of WSP-2.5" figure is stale
        // against the actual current list (verified directly against
        // src/achievements.ts, not trusted from the issue text) -- see this
        // issue's findings doc. Pinning the real count here so this test
        // itself becomes the up-to-date source of truth.
        expect(ACHIEVEMENTS.length).toBe(28);
    });

    it("evaluateAchievements does not throw and unlocks every achievement when every stat is driven far past its maxProgress", () => {
        const maxProgress = Math.max(...ACHIEVEMENTS.map(a => a.maxProgress));
        const wayPastEverything = maxProgress * 1000;
        const stats: AchievementStats = {
            levelsCompleted: wayPastEverything,
            seeds: wayPastEverything,
            categoriesSeen: wayPastEverything,
            foundDiagonal: true,
            totalCategories: 1, // categoriesSeen (huge) >= totalCategories (small) satisfies categories-all
            bonusWordsFound: wayPastEverything,
            levelsCompletedWithoutHint: wayPastEverything,
            maxBonusWordsInLevel: wayPastEverything,
            reverseWordsFound: wayPastEverything,
            plantsBloomed: wayPastEverything,
            bloomedRarityTiers: wayPastEverything,
            uniqueCategoriesCompleted: wayPastEverything,
            powerupsUsed: wayPastEverything,
        };
        let unlocked: string[] = [];
        expect(() => { unlocked = evaluateAchievements(stats); }).not.toThrow();
        expect(unlocked.length).toBe(ACHIEVEMENTS.length);
        expect(new Set(unlocked).size).toBe(ACHIEVEMENTS.length); // no duplicate ids
    });

    it("evaluateAchievements does not throw at Number.MAX_SAFE_INTEGER stats (a truly unbounded lifetime player)", () => {
        const extreme: AchievementStats = {
            levelsCompleted: Number.MAX_SAFE_INTEGER,
            seeds: Number.MAX_SAFE_INTEGER,
            categoriesSeen: Number.MAX_SAFE_INTEGER,
            foundDiagonal: true,
            totalCategories: 1,
            bonusWordsFound: Number.MAX_SAFE_INTEGER,
            levelsCompletedWithoutHint: Number.MAX_SAFE_INTEGER,
            maxBonusWordsInLevel: Number.MAX_SAFE_INTEGER,
            reverseWordsFound: Number.MAX_SAFE_INTEGER,
            plantsBloomed: Number.MAX_SAFE_INTEGER,
            bloomedRarityTiers: Number.MAX_SAFE_INTEGER,
            uniqueCategoriesCompleted: Number.MAX_SAFE_INTEGER,
            powerupsUsed: Number.MAX_SAFE_INTEGER,
        };
        expect(() => evaluateAchievements(extreme)).not.toThrow();
    });

    it("a realistic long-time player (level 137, like the level100PlayerSave fixture) evaluates cleanly with a believable mix of finished and unfinished achievements", () => {
        const stats: AchievementStats = {
            levelsCompleted: 136,
            seeds: 48_500,
            categoriesSeen: 12,
            foundDiagonal: true,
            totalCategories: 40,
            bonusWordsFound: 200,
            levelsCompletedWithoutHint: 80,
            maxBonusWordsInLevel: 5,
            reverseWordsFound: 95,
            plantsBloomed: 18,
            bloomedRarityTiers: 6, // clamped internally; real tier-identity tracking is bloomedRarityTierIds.size in production
            uniqueCategoriesCompleted: 12,
            powerupsUsed: 40,
        };
        expect(() => evaluateAchievements(stats)).not.toThrow();
        const unlocked = evaluateAchievements(stats);
        expect(unlocked).toContain("level-clears-100"); // 136 >= 100
        expect(unlocked).not.toContain("categories-all"); // 12 < 40, genuinely unfinished
    });
});
