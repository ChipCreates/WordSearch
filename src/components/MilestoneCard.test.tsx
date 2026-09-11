import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MilestoneCard from "./MilestoneCard";
import type { MilestoneQueueEvent } from "../presentationQueue";

// This file has multiple render() calls -- there is no global auto-cleanup
// configured (see src/test/setup.ts), so without this each test's DOM tree
// accumulates into the next test's document, which has caused real
// cross-test failures in this project before.
afterEach(() => cleanup());

const originalMatchMedia = window.matchMedia;

function mockReducedMotion(matches: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({
        matches,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: () => {},
        removeEventListener: () => {},
    }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
    mockReducedMotion(false);
});

afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.useRealTimers();
});

describe("MilestoneCard (WSP-2.4)", () => {
    it("renders nothing when there is no queued event", () => {
        const { container } = render(<MilestoneCard event={null} onDismiss={vi.fn()} />);
        expect(container.childElementCount).toBe(0);
    });

    it("renders level 100's milestone with real weight and explicit 'play continues' copy", () => {
        const event: MilestoneQueueEvent = { kind: "milestone", level: 100 };
        render(<MilestoneCard event={event} onDismiss={vi.fn()} />);
        expect(screen.getByText("The Verdant Beyond Blooms")).toBeTruthy();
        expect(screen.getByText(/isn't the end of the trail/i)).toBeTruthy();
        expect(document.querySelector(".ws-milestone-card--exceptional")).toBeTruthy();
    });

    it("renders an earlier milestone (level 10) at a visibly lower intensity than level 100", () => {
        const event: MilestoneQueueEvent = { kind: "milestone", level: 10 };
        render(<MilestoneCard event={event} onDismiss={vi.fn()} />);
        expect(screen.getByText("Ten Levels In")).toBeTruthy();
        expect(document.querySelector(".ws-milestone-card--small")).toBeTruthy();
        expect(document.querySelector(".ws-milestone-card--exceptional")).toBeNull();
    });

    it("renders a region-transition entry card with the region's name and reward", () => {
        const event: MilestoneQueueEvent = { kind: "region-transition", regionId: "sunlit-falls", transition: "entry", rewardSeeds: 50, level: 20 };
        render(<MilestoneCard event={event} onDismiss={vi.fn()} />);
        expect(screen.getByText("Entering Sunlit Falls")).toBeTruthy();
        expect(screen.getByText(/\+50 Seeds/)).toBeTruthy();
        expect(document.querySelector(".ws-milestone-card--theme-sunlit-falls")).toBeTruthy();
    });

    it("renders a region-transition completion card distinctly from an entry card", () => {
        const event: MilestoneQueueEvent = { kind: "region-transition", regionId: "glowing-grove", transition: "completion", rewardSeeds: 150, level: 20 };
        render(<MilestoneCard event={event} onDismiss={vi.fn()} />);
        expect(screen.getByText("The Glowing Grove Complete")).toBeTruthy();
        expect(screen.getByText(/\+150 Seeds/)).toBeTruthy();
    });

    it("dismisses when clicked", () => {
        const onDismiss = vi.fn();
        const event: MilestoneQueueEvent = { kind: "milestone", level: 20 };
        render(<MilestoneCard event={event} onDismiss={onDismiss} />);
        fireEvent.click(screen.getByRole("dialog"));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("auto-dismisses after its intensity's desktop duration", () => {
        vi.useFakeTimers();
        const onDismiss = vi.fn();
        // Level 10 -> "small" intensity -> 3500ms desktop duration
        // (src/rewardIntensity.ts's REWARD_PRESENTATION).
        const event: MilestoneQueueEvent = { kind: "milestone", level: 10 };
        render(<MilestoneCard event={event} onDismiss={onDismiss} />);
        vi.advanceTimersByTime(3499);
        expect(onDismiss).not.toHaveBeenCalled();
        vi.advanceTimersByTime(2);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("uses the shorter mobile duration when isMobile is set", () => {
        vi.useFakeTimers();
        const onDismiss = vi.fn();
        const event: MilestoneQueueEvent = { kind: "milestone", level: 10 };
        render(<MilestoneCard event={event} onDismiss={onDismiss} isMobile />);
        // Mobile duration for "small" is 2200ms -- well under the 3500ms
        // desktop duration exercised above.
        vi.advanceTimersByTime(2199);
        expect(onDismiss).not.toHaveBeenCalled();
        vi.advanceTimersByTime(2);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("prefers-reduced-motion still renders and still auto-dismisses on the same schedule -- no exception, just no animation", () => {
        mockReducedMotion(true);
        vi.useFakeTimers();
        const onDismiss = vi.fn();
        const event: MilestoneQueueEvent = { kind: "milestone", level: 100 };
        render(<MilestoneCard event={event} onDismiss={onDismiss} />);
        expect(screen.getByText("The Verdant Beyond Blooms")).toBeTruthy();
        // "exceptional" is 9000ms desktop.
        vi.advanceTimersByTime(9000);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("swaps to a new event's content and duration when the queue advances", () => {
        vi.useFakeTimers();
        const onDismiss = vi.fn();
        const { rerender } = render(<MilestoneCard event={{ kind: "milestone", level: 10 }} onDismiss={onDismiss} />);
        expect(screen.getByText("Ten Levels In")).toBeTruthy();

        rerender(<MilestoneCard event={{ kind: "milestone", level: 20 }} onDismiss={onDismiss} />);
        expect(screen.getByText("The Glowing Grove Blooms")).toBeTruthy();
        expect(screen.queryByText("Ten Levels In")).toBeNull();
    });
});
