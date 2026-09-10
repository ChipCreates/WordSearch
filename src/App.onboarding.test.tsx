import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import { DEFAULT_SAVE_DATA } from "./persistence";

const PRIMARY_KEY = "word_sprout_save_v1";

function seedSave(highestUnlockedLevel: number, levelsCompleted = Math.max(0, highestUnlockedLevel - 1)) {
    localStorage.setItem(PRIMARY_KEY, JSON.stringify({
        ...DEFAULT_SAVE_DATA,
        highestUnlockedLevel,
        level: highestUnlockedLevel,
        levelsCompleted,
        // Already-seen onboarding so a coachmark never blocks these
        // navigation-focused assertions -- gating is tested independently
        // of the coachmark sequence.
        onboardingSeen: { version: 1, dismissed: { "play-basics": true, seeds: true, bonus: true, garden: true, store: true } },
    }));
}

describe("WSP-1.1 real navigation gating", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => cleanup());

    it("keeps the Garden and Trophies unreachable at level 1, with a locked label and an explanatory toast", () => {
        seedSave(1);
        render(<App />);

        const gardenButtons = screen.getAllByRole("button", { name: /garden \(unlocks at level 3\)/i });
        expect(gardenButtons.length).toBeGreaterThan(0);
        fireEvent.click(gardenButtons[0]);
        // Still on Play -- the puzzle grid, not the Garden view, is present.
        expect(screen.getByRole("application", { name: /word search puzzle/i })).toBeTruthy();
        expect(screen.getByText(/garden unlocks at level 3/i)).toBeTruthy();

        const trophyButtons = screen.getAllByRole("button", { name: /trophies \(unlocks at level 5\)/i });
        fireEvent.click(trophyButtons[0]);
        expect(screen.getByRole("application", { name: /word search puzzle/i })).toBeTruthy();
    });

    it("unlocks the Garden at level 3 while Trophies/Store stay locked", async () => {
        seedSave(3);
        render(<App />);

        expect(screen.queryAllByRole("button", { name: /garden \(unlocks/i })).toHaveLength(0);
        const gardenButtons = screen.getAllByRole("button", { name: "Garden" });
        fireEvent.click(gardenButtons[0]);
        expect(await screen.findByRole("heading", { name: /the garden/i })).toBeTruthy();

        expect(screen.getAllByRole("button", { name: /trophies \(unlocks at level 5\)/i }).length).toBeGreaterThan(0);
    });

    it("unlocks Trophies and the Store at level 5", async () => {
        seedSave(5);
        render(<App />);

        expect(screen.queryAllByRole("button", { name: /garden \(unlocks/i })).toHaveLength(0);
        expect(screen.queryAllByRole("button", { name: /trophies \(unlocks/i })).toHaveLength(0);

        const trophyButtons = screen.getAllByRole("button", { name: "Trophies" });
        fireEvent.click(trophyButtons[0]);
        expect(await screen.findByRole("heading", { name: /achievements/i })).toBeTruthy();
    });

    it("never blocks Play or Levels, only the gated destinations", async () => {
        seedSave(1);
        render(<App />);
        expect(screen.getAllByRole("button", { name: "Play" }).length).toBeGreaterThan(0);
        const levelsButtons = screen.getAllByRole("button", { name: "Levels" });
        fireEvent.click(levelsButtons[0]);
        expect(await screen.findByText(/your woodland journey/i)).toBeTruthy();
    });
});
