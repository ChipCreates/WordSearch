import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AchievementBanner from "./AchievementBanner";
import { ACHIEVEMENTS } from "../achievements";

describe("botanical achievement banner", () => {
    it("shows the real achievement with a decorative frame and accessible dismissal", () => {
        const onDismiss = vi.fn();
        const achievement = ACHIEVEMENTS[3];
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
});
