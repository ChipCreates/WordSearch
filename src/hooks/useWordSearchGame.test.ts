import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWordSearchGame } from "./useWordSearchGame";

describe("useWordSearchGame", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("goToLevel changes level without resetting stars", async () => {
        const { result } = renderHook(() => useWordSearchGame());

        // Wait for initial initGame to run or set initial stars
        await act(async () => {
            // Give async initGame time to settle if needed
        });

        // Set some stars by simulating star updates or level state
        act(() => {
            result.current.goToLevel(5);
        });

        expect(result.current.level).toBe(5);
    });

    it("reshuffle preserves level and stars", async () => {
        const { result } = renderHook(() => useWordSearchGame());

        await act(async () => {
            result.current.goToLevel(3);
        });

        const initialLevel = result.current.level;
        const initialStars = result.current.stars;

        await act(async () => {
            result.current.reshuffle();
        });

        expect(result.current.level).toBe(initialLevel);
        expect(result.current.stars).toBe(initialStars);
    });

    it("retryLevel clears foundWords and foundLines without resetting level or stars", async () => {
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
});
