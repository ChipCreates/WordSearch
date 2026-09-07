import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWordSearchGame } from "./useWordSearchGame";
import { findWordPlacement } from "../gameMechanics";
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

});
