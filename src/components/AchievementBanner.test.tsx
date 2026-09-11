import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AchievementBanner from "./AchievementBanner";
import { ACHIEVEMENTS } from "../achievements";

// This file has multiple render() calls -- there is no global auto-cleanup
// configured (see src/test/setup.ts), so without this each test's DOM tree
// accumulates in the next test's document, which has caused real
// cross-test failures in this project before.
afterEach(() => cleanup());

describe("botanical achievement banner", () => {
    it("shows the real achievement with a decorative frame and accessible dismissal", () => {
        const onDismiss = vi.fn();
        // Look up by id, not array position -- WSP-2.5 changed ACHIEVEMENTS'
        // length and ordering (folded zenith-climber into level-clears,
        // renamed daily-dew), so a positional index here is fragile against
        // any future edit to that array too.
        const achievement = ACHIEVEMENTS.find(a => a.id === "midnight-sun")!;
        const { container } = render(<AchievementBanner achievement={achievement} onDismiss={onDismiss} />);
        expect(screen.getByRole("status")).toBeTruthy();
        expect(screen.getByText(achievement.name)).toBeTruthy();
        expect(container.querySelector(".ws-achievement-banner__frame")?.getAttribute("src")).toContain("botanical-banner-frame-circle.png");
        fireEvent.click(screen.getByRole("button", { name: /Achievement unlocked: Diagonal Detective/ }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
    it("renders nothing without an achievement", () => {
        const { container } = render(<AchievementBanner achievement={null} onDismiss={() => {}} />);
        expect(container.childElementCount).toBe(0);
    });

    it("does not auto-dismiss when persist is set, for debug-panel screenshots", () => {
        vi.useFakeTimers();
        const onDismiss = vi.fn();
        render(<AchievementBanner achievement={ACHIEVEMENTS[0]} onDismiss={onDismiss} persist />);
        vi.advanceTimersByTime(10000);
        expect(onDismiss).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});
