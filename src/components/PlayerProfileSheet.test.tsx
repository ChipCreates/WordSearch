import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PlayerProfileSheet from "./PlayerProfileSheet";

describe("player profile", () => {
    it("shows recorded totals independently of current level and closes with Escape", () => {
        const onClose = vi.fn();
        render(<PlayerProfileSheet open onClose={onClose} onOpenAchievements={vi.fn()} onOpenSettings={vi.fn()}
            botanistTitle="Moonlit Keeper" level={12} seeds={730} levelsCompleted={19}
            categoriesSeen={8} bonusWordsFound={17} plantsBloomed={2} achievementsUnlocked={4}
            achievementsTotal={13} avatarBackgroundPosition="74.3% 0%" hasGoldenCrest={false}
            levelsCompletedWithoutHint={6} reverseWordsFound={10} maxBonusWordsInLevel={3} powerupsUsed={5} />);
        expect(screen.getByRole("dialog", {name: "Player information"})).toBeTruthy();
        expect(screen.getByText("Completed levels").previousElementSibling?.textContent).toBe("19");
        expect(screen.getByText("4/13 unlocked")).toBeTruthy();
        fireEvent.keyDown(screen.getByRole("dialog"), {key: "Escape"});
        expect(onClose).toHaveBeenCalledOnce();
    });
});
