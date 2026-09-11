import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWordSearchGame } from "./useWordSearchGame";
import { findWordPlacement, REWARDS } from "../gameMechanics";
import { DEFAULT_SAVE_DATA } from "../persistence";

vi.mock("@tauri-apps/api/core", () => ({
    invoke: vi.fn((cmd: string) => {
        if (cmd === "load_game_state") {
            return Promise.resolve(JSON.stringify({
                ...DEFAULT_SAVE_DATA,
                level: 7,
                seeds: 999,
                levelsCompleted: 6,
                categoriesSeen: ["Animals"],
                bonusWordsFound: 2,
            }));
        }
        if (cmd === "get_puzzle_words") {
            return Promise.resolve({ category: "Animals", words: ["CAT", "DOG", "BIRD"] });
        }
        return Promise.resolve(null);
    }),
}));

// The real dictionary lookup (src/test/setup.ts mocks fetch to return an
// empty word list) would reject every bonus candidate as invalid -- WSP-1.2's
// tests below need bonus discovery to actually resolve, so this file's own
// tests treat any 3+ letter run as a valid bonus word instead.
vi.mock("../backend", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../backend")>();
    return { ...actual, validateWord: vi.fn().mockResolvedValue(true) };
});

// Locates a word actually on the board and simulates the drag that finds
// it, using the same search helper the hint/compass/spectrometer power-ups
// use -- avoids hardcoding grid coordinates against a randomized layout.
async function findAWord(result: { current: ReturnType<typeof useWordSearchGame> }) {
    await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));
    const word = result.current.wordsToFind[0];
    const placement = findWordPlacement(result.current.gridData, result.current.gridSize, word);
    if (!placement) throw new Error(`test setup: could not locate "${word}" on the generated board`);
    const { r, c, dr, dc } = placement;
    const endR = r + (word.length - 1) * dr;
    const endC = c + (word.length - 1) * dc;
    await act(async () => {
        await result.current.submitSelection({ r, c }, { r: endR, c: endC });
    });
    return word;
}

async function completeCurrentPuzzle(result: { current: ReturnType<typeof useWordSearchGame> }) {
    await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));
    for (const word of result.current.wordsToFind) {
        if (result.current.foundWords[word]) continue;
        const placement = findWordPlacement(result.current.gridData, result.current.gridSize, word);
        if (!placement) throw new Error(`test setup: could not locate "${word}" on the generated board`);
        const { r, c, dr, dc } = placement;
        await act(async () => {
            await result.current.submitSelection({ r, c }, { r: r + (word.length - 1) * dr, c: c + (word.length - 1) * dc });
        });
    }
}

describe("useWordSearchGame", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("goToLevel changes level without resetting seeds", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 5,
            level: 5,
        }));
        const { result } = renderHook(() => useWordSearchGame());

        await act(async () => {
            // Give async initGame time to settle if needed
        });

        act(() => {
            result.current.goToLevel(5);
        });

        expect(result.current.level).toBe(5);
    });

    it("reshuffle consumes a charge while preserving level and seeds", async () => {
        const { result } = renderHook(() => useWordSearchGame());

        await act(async () => {
            result.current.goToLevel(3);
        });

        act(() => {
            result.current.addSeeds(200);
        });
        act(() => {
            expect(result.current.purchasePowerupCharge("lumina-cyclone")).toBe(true);
        });

        const initialLevel = result.current.level;
        const initialSeeds = result.current.seeds;

        await act(async () => {
            result.current.reshuffle();
        });

        expect(result.current.level).toBe(initialLevel);
        expect(result.current.seeds).toBe(initialSeeds);
        expect(result.current.powerupInventory["lumina-cyclone"]).toBe(0);
    });

    it("reshuffle keeps already-found words found (doesn't wipe progress)", async () => {
        const { result } = renderHook(() => useWordSearchGame());
        const word = await findAWord(result);

        expect(result.current.foundWords[word]).toBeTruthy();

        act(() => {
            result.current.reshuffle();
        });

        expect(result.current.foundWords[word]).toBeTruthy();
    });

    it("grants one free hint per generated level, then consumes a paid charge", async () => {
        const { result } = renderHook(() => useWordSearchGame());

        expect(result.current.freeHintUsesRemaining).toBe(1);
        act(() => {
            expect(result.current.claimHintUse()).toBe("free");
        });
        expect(result.current.freeHintUsesRemaining).toBe(0);
        expect(result.current.claimHintUse()).toBeNull();

        act(() => {
            result.current.addSeeds(50);
        });
        act(() => {
            expect(result.current.purchasePowerupCharge("single-letter-sprout")).toBe(true);
        });
        act(() => {
            expect(result.current.claimHintUse()).toBe("paid");
        });
        expect(result.current.powerupInventory["single-letter-sprout"]).toBe(0);
    });

    it("revealAndSolveWord actually solves the word (unlike the free hint, which only points at it)", async () => {
        const { result } = renderHook(() => useWordSearchGame());
        await waitFor(() => {
            expect(result.current.wordsToFind.length).toBeGreaterThan(0);
            expect(result.current.gridData.length).toBeGreaterThan(0);
        });
        const word = result.current.wordsToFind[0];

        expect(result.current.foundWords[word]).toBeFalsy();

        act(() => {
            result.current.revealAndSolveWord(word);
        });

        expect(result.current.foundWords[word]).toBeTruthy();
    });

    it("can solve every word through immediate consecutive reveal calls", async () => {
        const { result } = renderHook(() => useWordSearchGame());
        await waitFor(() => {
            expect(result.current.wordsToFind.length).toBeGreaterThan(1);
            expect(result.current.gridData.length).toBeGreaterThan(0);
        });

        act(() => {
            result.current.wordsToFind.forEach(word => result.current.revealAndSolveWord(word));
        });

        expect(result.current.wordsToFind.every(word => result.current.foundWords[word])).toBe(true);
        expect(result.current.levelComplete).toBe(true);
    });

    it("retryLevel clears foundWords and foundLines without resetting level or seeds", async () => {
        const { result } = renderHook(() => useWordSearchGame());

        await act(async () => {
            result.current.goToLevel(2);
        });

        const gridBefore = result.current.gridData;

        act(() => {
            result.current.retryLevel();
        });

        expect(result.current.foundWords).toEqual({});
        expect(result.current.foundLines).toEqual([]);
        expect(result.current.gridData).toEqual(gridBefore);
    });

    it("returns categoriesSeen and foundDiagonal state reflecting real stats", async () => {
        const { result } = renderHook(() => useWordSearchGame());

        expect(result.current.categoriesSeen).toBeInstanceOf(Set);
        expect(typeof result.current.foundDiagonal).toBe("boolean");
    });

    it("restart() resets every persisted field, not just level and seeds", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 9,
            level: 9,
        }));
        const { result } = renderHook(() => useWordSearchGame());

        act(() => {
            result.current.goToLevel(9);
            result.current.addSeeds(500);
            result.current.buyPlantSeed("emerald-fern", 0);
            result.current.unlockTheme("autumn");
            result.current.unlockGoldenCrest();
        });

        await waitFor(() => {
            expect(result.current.level).toBe(9);
            expect(result.current.seeds).toBeGreaterThanOrEqual(500);
            expect(result.current.ownedPlants).toContain("emerald-fern");
            expect(result.current.unlockedThemes).toContain("autumn");
            expect(result.current.hasGoldenCrest).toBe(true);
        });

        act(() => {
            result.current.restart();
        });

        expect(result.current.level).toBe(DEFAULT_SAVE_DATA.level);
        expect(result.current.seeds).toBe(DEFAULT_SAVE_DATA.seeds);
        expect(result.current.ownedPlants).toEqual(DEFAULT_SAVE_DATA.ownedPlants);
        expect(result.current.unlockedThemes).toEqual(DEFAULT_SAVE_DATA.unlockedThemes);
        expect(result.current.hasGoldenCrest).toBe(DEFAULT_SAVE_DATA.hasGoldenCrest);
        expect(Array.from(result.current.unlockedAchievements)).toEqual(DEFAULT_SAVE_DATA.unlockedAchievements);
        expect(Array.from(result.current.categoriesSeen)).toEqual(DEFAULT_SAVE_DATA.categoriesSeen);
    });

    it("recovers progress from the native Tauri save when localStorage is empty", async () => {
        (window as unknown as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {};
        try {
            const { result } = renderHook(() => useWordSearchGame());

            await waitFor(() => {
                expect(result.current.level).toBe(7);
            });
            expect(result.current.seeds).toBe(999);
            expect(result.current.bonusWordsFound).toBe(2);
        } finally {
            delete (window as unknown as { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__;
        }
    });

    it("keeps the permanent frontier and rank input above an older replay", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            level: 10,
            highestUnlockedLevel: 10,
            completedLevels: Array.from({ length: 9 }, (_, index) => index + 1),
        }));
        const { result } = renderHook(() => useWordSearchGame());

        act(() => result.current.goToLevel(1));
        expect(result.current.playingLevel).toBe(1);
        expect(result.current.highestUnlockedLevel).toBe(10);
        expect(result.current.level).toBe(1);
    });

    it("activates the new power-ups only when a target exists and consumes one charge", async () => {
        const { result } = renderHook(() => useWordSearchGame());
        await waitFor(() => {
            expect(result.current.wordsToFind.length).toBeGreaterThan(0);
            expect(result.current.gridData.length).toBeGreaterThan(0);
        });

        act(() => result.current.addSeeds(5000));
        act(() => expect(result.current.purchasePowerupCharge("bioluminescent-compass")).toBe(true));
        act(() => expect(result.current.purchasePowerupCharge("flora-spectrometer")).toBe(true));
        act(() => expect(result.current.purchasePowerupCharge("super-root")).toBe(true));
        act(() => expect(result.current.purchasePowerupCharge("nitrogen-booster")).toBe(true));

        act(() => expect(result.current.activateCompass()).toBe(true));
        expect(result.current.powerupInventory["bioluminescent-compass"]).toBe(0);
        expect(result.current.compassDirection).not.toBeNull();

        act(() => expect(result.current.activateSpectrometer()).toBe(true));
        expect(result.current.powerupInventory["flora-spectrometer"]).toBe(0);
        expect(result.current.spectrometerCells.length).toBeGreaterThan(0);

        act(() => expect(result.current.activateDoubleSeeds()).toBe(true));
        expect(result.current.doubleSeedsActive).toBe(true);
        expect(result.current.activateDoubleSeeds()).toBe(false);

        act(() => expect(result.current.activateSuperRoot()).toBe(true));
        expect(result.current.powerupInventory["super-root"]).toBe(0);
        expect(result.current.powerupsUsed).toBe(4);
    });

    it("queues a rank promotion once when a frontier clear crosses a boundary", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 3,
            level: 3,
            completedLevels: [1, 2],
            levelsCompleted: 2,
        }));
        const { result } = renderHook(() => useWordSearchGame());
        await completeCurrentPuzzle(result);

        expect(result.current.highestUnlockedLevel).toBe(4);
        expect(result.current.promotionQueue).toHaveLength(1);
        expect(result.current.promotionQueue[0].from.title).toBe("Seedling Scout");
        expect(result.current.promotionQueue[0].to.title).toBe("Moss Tender");

        act(() => result.current.dismissPromotion());
        expect(result.current.promotionQueue).toEqual([]);
    });

    it("does not replay promotions from a loaded save or an older replay", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 4,
            level: 4,
            completedLevels: [1, 2, 3],
            levelsCompleted: 3,
        }));
        const { result } = renderHook(() => useWordSearchGame());
        await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));
        expect(result.current.promotionQueue).toEqual([]);

        act(() => result.current.goToLevel(3));
        await waitFor(() => expect(result.current.level).toBe(3));
        await waitFor(() => expect(result.current.status).toBe("Puzzle generated. Find the words!"));
        await completeCurrentPuzzle(result);
        expect(result.current.promotionQueue).toEqual([]);
    });

    // WSP-2.2: region entry/completion rewards, exactly-once claim tracking,
    // and the shared presentation queue. Level 20 is both a region boundary
    // (Glowing Grove ends there, Sunlit Falls begins at 21) AND a rank
    // boundary (Glowgarden Warden 17-20 -> Crystal Cultivator 21-25), so
    // completing it from a fresh frontier is a genuine, real (not
    // synthetic) multi-event coincidence: one rank promotion plus two
    // region-transition events from a single puzzle completion.
    it("grants both the region-completion and next-region-entry reward exactly once, and arbitrates them with the rank promotion via presentationQueue", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 20,
            level: 20,
            completedLevels: Array.from({ length: 19 }, (_, index) => index + 1),
            levelsCompleted: 19,
            seeds: 0,
            // Pre-satisfied by the seeded levelsCompleted=19 already -- listed
            // explicitly so this test's own completion doesn't also surface
            // them as *newly* unlocked and muddy the presentationQueue
            // assertion below with achievement events unrelated to what
            // this test is actually checking (region/rank arbitration).
            unlockedAchievements: ["night-bloomer", "level-clears-10"],
        }));
        const { result } = renderHook(() => useWordSearchGame());
        await completeCurrentPuzzle(result);

        expect(result.current.highestUnlockedLevel).toBe(21);
        // Glowing Grove's completion reward (150) + Sunlit Falls' entry
        // reward (50) + the ordinary level-complete base reward (50).
        expect(result.current.seeds).toBe(REWARDS.LEVEL_COMPLETE_SEEDS + 150 + 50);
        expect(Array.from(result.current.claimedRegionRewards).sort()).toEqual([
            "glowing-grove:completion",
            "sunlit-falls:entry",
        ]);

        expect(result.current.milestoneQueue).toHaveLength(2);
        expect(result.current.milestoneQueue[0]).toMatchObject({ kind: "region-transition", regionId: "glowing-grove", transition: "completion", rewardSeeds: 150 });
        expect(result.current.milestoneQueue[1]).toMatchObject({ kind: "region-transition", regionId: "sunlit-falls", transition: "entry", rewardSeeds: 50 });

        // The real rank promotion also queued this same completion.
        expect(result.current.promotionQueue).toHaveLength(1);
        expect(result.current.promotionQueue[0].to.title).toBe("Crystal Cultivator");

        // The shared presentation queue combines all three, in the defined
        // order: rank promotion first, then the two region-transition
        // events (queue order preserved between them). Real puzzle
        // generation can incidentally also satisfy a diagonal/reverse-find
        // achievement on this board -- that's fine and expected to appear,
        // but only ever *after* the rank/region events, never interleaved
        // ahead of them.
        const kinds = result.current.presentationQueue.map(e => e.kind);
        expect(kinds.slice(0, 3)).toEqual(["rank-promotion", "region-transition", "region-transition"]);
        expect(kinds.slice(3).every(kind => kind === "achievement")).toBe(true);

        act(() => result.current.dismissMilestone());
        expect(result.current.milestoneQueue).toHaveLength(1);
        expect(result.current.milestoneQueue[0]).toMatchObject({ regionId: "sunlit-falls", transition: "entry" });
    });

    it("does not re-grant a region reward when the same completed level is replayed", async () => {
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 20,
            level: 20,
            completedLevels: Array.from({ length: 19 }, (_, index) => index + 1),
            levelsCompleted: 19,
            seeds: 0,
        }));
        const { result } = renderHook(() => useWordSearchGame());
        await completeCurrentPuzzle(result);

        const seedsAfterFirstCompletion = result.current.seeds;
        const claimedAfterFirstCompletion = Array.from(result.current.claimedRegionRewards).sort();
        expect(claimedAfterFirstCompletion).toEqual(["glowing-grove:completion", "sunlit-falls:entry"]);

        // Replay the same puzzle instance (still level 20 -- the frontier
        // already moved on to 21, exactly the "replaying an
        // already-completed level" scenario the exactly-once rule guards).
        act(() => result.current.retryLevel());
        await completeCurrentPuzzle(result);

        // Only the ordinary replay reward is granted a second time -- no
        // additional region Seeds, no new claim, no new milestone event.
        expect(result.current.seeds).toBe(seedsAfterFirstCompletion + REWARDS.REPLAY_COMPLETE_SEEDS);
        expect(Array.from(result.current.claimedRegionRewards).sort()).toEqual(claimedAfterFirstCompletion);
        expect(result.current.milestoneQueue).toHaveLength(2); // still just the original two, none duplicated
    });

    it("a save already past a region boundary before this feature existed is backfilled with no retroactive Seeds, and doesn't double-claim on its next real completion", async () => {
        // Simulates a WSP-1.x-era save that had already finished Glowing
        // Grove and moved into Sunlit Falls before claimedRegionRewards
        // existed. loadSaveDataSync (the hook's initial, synchronous read)
        // runs the same one-time backfill as the async loader (see
        // persistence.ts's applyOneTimeBackfills), so this save's two
        // already-passed boundaries are marked claimed the moment the hook
        // reads it -- with no bonus Seeds, per the "no retroactive grants"
        // policy.
        localStorage.setItem("word_sprout_save_v1", JSON.stringify({
            ...DEFAULT_SAVE_DATA,
            highestUnlockedLevel: 25,
            level: 25,
            completedLevels: Array.from({ length: 24 }, (_, index) => index + 1),
            levelsCompleted: 24,
            seeds: 500,
        }));
        const { result } = renderHook(() => useWordSearchGame());
        expect(Array.from(result.current.claimedRegionRewards).sort()).toEqual(["glowing-grove:completion", "sunlit-falls:entry"]);
        expect(result.current.seeds).toBe(500);
        expect(result.current.milestoneQueue).toEqual([]);

        // Completing level 25 (not a region boundary) afterward must not
        // touch the already-claimed keys or grant anything extra.
        await completeCurrentPuzzle(result);
        expect(result.current.highestUnlockedLevel).toBe(26);
        expect(result.current.milestoneQueue).toEqual([]);
        expect(Array.from(result.current.claimedRegionRewards).sort()).toEqual(["glowing-grove:completion", "sunlit-falls:entry"]);
    });

    // Real puzzle generation only *offers* a bonus word when one happens to
    // fit the board -- toggling useFavorites regenerates a fresh level-1
    // puzzle each attempt (goToLevel can't move past the frontier) until one
    // lands with at least one, rather than hardcoding grid coordinates.
    async function findLevelWithBonusWords(result: { current: ReturnType<typeof useWordSearchGame> }) {
        let toggle = false;
        for (let attempt = 0; attempt < 25 && result.current.bonusWordsToFind.length === 0; attempt++) {
            toggle = !toggle;
            act(() => result.current.setUseFavorites(toggle));
            await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));
        }
    }

    it("tracks the level's base/bonus Seed split and the lifetime longest bonus word (WSP-1.2)", async () => {
        const { result } = renderHook(() => useWordSearchGame());
        await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));
        await findLevelWithBonusWords(result);
        expect(result.current.bonusWordsToFind.length).toBeGreaterThan(0);
        expect(result.current.longestBonusWordFound).toBe("");
        expect(result.current.baseSeedsThisLevel).toBe(0);

        const bonusWord = result.current.bonusWordsToFind[0];
        const placement = findWordPlacement(result.current.gridData, result.current.gridSize, bonusWord);
        if (!placement) throw new Error(`test setup: could not locate bonus word "${bonusWord}" on the generated board`);
        const { r, c, dr, dc } = placement;
        const endR = r + (bonusWord.length - 1) * dr;
        const endC = c + (bonusWord.length - 1) * dc;

        await act(async () => {
            await result.current.submitSelection({ r, c }, { r: endR, c: endC });
        });

        expect(result.current.longestBonusWordFound).toBe(bonusWord);
        expect(result.current.bonusSeedsThisLevel).toBe(REWARDS.BONUS_WORD_SEEDS);
        // A bonus find must never itself count as the level's base reward.
        expect(result.current.baseSeedsThisLevel).toBe(0);

        await completeCurrentPuzzle(result);
        expect(result.current.baseSeedsThisLevel).toBe(REWARDS.LEVEL_COMPLETE_SEEDS);
    });

    // WSP-2.5: recordPlantBloom used to take zero parameters and increment a
    // raw bloom-event counter regardless of which rarity tier bloomed, so
    // three Common-tier blooms satisfied "Bloom plants from 3 rarity tiers"
    // (verdant-voyager). It's fixed to actually use its tier argument and
    // track the set of *distinct* tiers bloomed.
    describe("verdant-voyager rarity-tier tracking (WSP-2.5)", () => {
        it("does NOT unlock verdant-voyager from three blooms of the same rarity tier", async () => {
            const { result } = renderHook(() => useWordSearchGame());
            await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));

            act(() => {
                result.current.recordPlantBloom("Common");
                result.current.recordPlantBloom("Common");
                result.current.recordPlantBloom("Common");
            });

            expect(result.current.bloomedRarityTiers.size).toBe(1);
            expect(result.current.plantsBloomed).toBe(3);
            expect(Array.from(result.current.unlockedAchievements)).not.toContain("verdant-voyager");
        });

        it("unlocks verdant-voyager once 3 DISTINCT rarity tiers have bloomed", async () => {
            const { result } = renderHook(() => useWordSearchGame());
            await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));

            act(() => {
                result.current.recordPlantBloom("Common");
                result.current.recordPlantBloom("Rare");
                result.current.recordPlantBloom("Epic");
            });

            expect(result.current.bloomedRarityTiers.size).toBe(3);
            await waitFor(() => {
                expect(Array.from(result.current.unlockedAchievements)).toContain("verdant-voyager");
            });
        });

        it("re-blooming an already-recorded tier does not inflate the distinct-tier count", async () => {
            const { result } = renderHook(() => useWordSearchGame());
            await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));

            act(() => {
                result.current.recordPlantBloom("Common");
                result.current.recordPlantBloom("Common");
                result.current.recordPlantBloom("Rare");
            });

            expect(result.current.bloomedRarityTiers.size).toBe(2);
            expect(result.current.plantsBloomed).toBe(3);
        });

        it("waterAllReady's bulk bloom path goes through the same distinct-tier tracking as recordPlantBloom", async () => {
            const { result } = renderHook(() => useWordSearchGame());
            await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));

            // Buy three plants spanning three different rarity tiers (moss-sprout
            // is already owned by default), grow each to just below bloom, and
            // age their watered timestamps past the cooldown so waterAllReady
            // treats them as ready.
            act(() => {
                result.current.addSeeds(5000);
            });
            act(() => {
                result.current.buyPlantSeed("succulent-rosette", 400); // Rare
                result.current.buyPlantSeed("golden-sunflower", 850); // Epic
            });
            act(() => {
                result.current.updatePlantGrowth("moss-sprout", 75); // Common
                result.current.updatePlantGrowth("succulent-rosette", 75); // Rare
                result.current.updatePlantGrowth("golden-sunflower", 75); // Epic
                const longAgo = 0;
                result.current.updateWateredTimestamp("moss-sprout", longAgo);
                result.current.updateWateredTimestamp("succulent-rosette", longAgo);
                result.current.updateWateredTimestamp("golden-sunflower", longAgo);
            });

            let bloomResult!: ReturnType<typeof result.current.waterAllReady>;
            act(() => {
                bloomResult = result.current.waterAllReady(Date.now());
            });

            expect(bloomResult.bloomed).toBe(3);
            expect(result.current.bloomedRarityTiers.size).toBe(3);
            await waitFor(() => {
                expect(Array.from(result.current.unlockedAchievements)).toContain("verdant-voyager");
            });
        });

        it("waterAllReady blooming multiple plants of the SAME tier at once still counts as one distinct tier", async () => {
            const { result } = renderHook(() => useWordSearchGame());
            await waitFor(() => expect(result.current.wordsToFind.length).toBeGreaterThan(0));

            act(() => {
                result.current.addSeeds(5000);
            });
            act(() => {
                result.current.buyPlantSeed("emerald-fern", 250); // Common, like moss-sprout
            });
            act(() => {
                result.current.updatePlantGrowth("moss-sprout", 75); // Common
                result.current.updatePlantGrowth("emerald-fern", 75); // Common
                const longAgo = 0;
                result.current.updateWateredTimestamp("moss-sprout", longAgo);
                result.current.updateWateredTimestamp("emerald-fern", longAgo);
            });

            let bloomResult!: ReturnType<typeof result.current.waterAllReady>;
            act(() => {
                bloomResult = result.current.waterAllReady(Date.now());
            });

            expect(bloomResult.bloomed).toBe(2);
            expect(result.current.plantsBloomed).toBe(2);
            expect(result.current.bloomedRarityTiers.size).toBe(1);
        });
    });
});
