import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BloomCelebration from "./BloomCelebration";
import type { BloomEvent } from "../bloomEvents";
import { REWARD_PRESENTATION } from "../rewardIntensity";

// WSP-2.6: BloomCelebration is the ONE presentation component all three
// bloom-triggering sources (individual water/fertilize in GardenView, bulk
// waterAllReady in useWordSearchGame) ultimately render through -- these
// tests exercise it directly against the bloomEvents queue shape, so they
// apply equally regardless of which source produced a given entry.

function event(overrides: Partial<BloomEvent> = {}): BloomEvent {
    return { id: "bloom-1", plantId: "moss-sprout", plantName: "Deep Moss Sprout", tier: "Common", bounty: 50, ...overrides };
}

describe("BloomCelebration", () => {
    afterEach(() => cleanup());

    it("renders nothing when the queue is empty", () => {
        const { container } = render(<BloomCelebration events={[]} onDismiss={vi.fn()} />);
        expect(container.innerHTML).toBe("");
    });

    it("shows only the first (index 0) queued event, never later ones", () => {
        render(<BloomCelebration events={[event({ id: "a", plantName: "First" }), event({ id: "b", plantName: "Second" })]} onDismiss={vi.fn()} />);

        const status = screen.getByRole("status");
        expect(status.textContent).toContain("First");
        expect(status.textContent).not.toContain("Second");
    });

    it("clicking the dismiss button calls onDismiss", () => {
        const onDismiss = vi.fn();
        render(<BloomCelebration events={[event()]} onDismiss={onDismiss} />);

        fireEvent.click(screen.getByRole("button", { name: /dismiss bloom celebration/i }));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("auto-dismisses after its tier's intensity-scaled desktop duration", () => {
        vi.useFakeTimers();
        try {
            const onDismiss = vi.fn();
            // "Common" maps to "small" intensity (see bloomIntensity in
            // bloomEvents.ts) -- REWARD_PRESENTATION.small.desktopDurationMs
            // is the exact window this should wait before calling onDismiss.
            render(<BloomCelebration events={[event({ tier: "Common" })]} onDismiss={onDismiss} isMobile={false} />);

            act(() => { vi.advanceTimersByTime(REWARD_PRESENTATION.small.desktopDurationMs - 50); });
            expect(onDismiss).not.toHaveBeenCalled();

            act(() => { vi.advanceTimersByTime(100); });
            expect(onDismiss).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it("uses the shorter mobile duration when isMobile is true", () => {
        vi.useFakeTimers();
        try {
            const onDismiss = vi.fn();
            render(<BloomCelebration events={[event({ tier: "Common" })]} onDismiss={onDismiss} isMobile />);

            act(() => { vi.advanceTimersByTime(REWARD_PRESENTATION.small.mobileDurationMs + 50); });
            expect(onDismiss).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it("a Legendary-tier bloom (exceptional intensity) shows a scrim on both platforms, with pointer-events:none so it never blocks other interaction", () => {
        render(<BloomCelebration events={[event({ tier: "Legendary" })]} onDismiss={vi.fn()} isMobile={false} />);

        const scrim = document.querySelector(".ws-bloom-scrim") as HTMLElement | null;
        expect(scrim).not.toBeNull();
        expect(scrim?.style.pointerEvents).toBe("none");
    });

    it("a Common-tier bloom (small intensity) shows no scrim", () => {
        render(<BloomCelebration events={[event({ tier: "Common" })]} onDismiss={vi.fn()} isMobile={false} />);
        expect(document.querySelector(".ws-bloom-scrim")).toBeNull();
    });

    it("respects prefers-reduced-motion by adding the reduced-motion class instead of skipping render", () => {
        vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        try {
            render(<BloomCelebration events={[event()]} onDismiss={vi.fn()} />);
            expect(screen.getByRole("status").className).toContain("ws-bloom-celebration--reduced");
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("does not add the reduced-motion class when the preference is off", () => {
        vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
        try {
            render(<BloomCelebration events={[event()]} onDismiss={vi.fn()} />);
            expect(screen.getByRole("status").className).not.toContain("ws-bloom-celebration--reduced");
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("advancing the queue (as if a bulk bloom queued behind the current one) presents the next entry without losing it", () => {
        const onDismiss = vi.fn();
        const events = [event({ id: "a", plantName: "First" }), event({ id: "b", plantName: "Second" }), event({ id: "c", plantName: "Third" })];
        const { rerender } = render(<BloomCelebration events={events} onDismiss={onDismiss} />);
        expect(screen.getByRole("status").textContent).toContain("First");

        // Simulate the hook's dismissBloomEvent (slice(1)) popping the head.
        rerender(<BloomCelebration events={events.slice(1)} onDismiss={onDismiss} />);
        expect(screen.getByRole("status").textContent).toContain("Second");

        rerender(<BloomCelebration events={events.slice(2)} onDismiss={onDismiss} />);
        expect(screen.getByRole("status").textContent).toContain("Third");

        rerender(<BloomCelebration events={[]} onDismiss={onDismiss} />);
        expect(screen.queryByRole("status")).toBeNull();
    });

    it("mashing dismiss (rapid repeated input) only ever calls onDismiss once per click -- no double-fire from a single click", () => {
        const onDismiss = vi.fn();
        render(<BloomCelebration events={[event()]} onDismiss={onDismiss} />);

        const button = screen.getByRole("button", { name: /dismiss bloom celebration/i });
        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);

        // The component itself doesn't debounce repeated dismiss clicks --
        // each one is a legitimate, independent request to advance the
        // queue -- but it also never fires MORE than one onDismiss per
        // click (no double-registration of the handler).
        expect(onDismiss).toHaveBeenCalledTimes(3);
    });
});
