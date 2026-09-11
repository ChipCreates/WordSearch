import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type Listener = () => void;

function mockMatchMedia(initialMatches: boolean) {
    let matches = initialMatches;
    const listeners: Listener[] = [];
    const mql = {
        get matches() { return matches; },
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: (_event: string, cb: Listener) => listeners.push(cb),
        removeEventListener: (_event: string, cb: Listener) => {
            const index = listeners.indexOf(cb);
            if (index >= 0) listeners.splice(index, 1);
        },
    };
    window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
    return {
        setMatches: (next: boolean) => {
            matches = next;
            listeners.forEach(cb => cb());
        },
    };
}

const originalMatchMedia = window.matchMedia;

afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
});

describe("usePrefersReducedMotion (WSP-2.4)", () => {
    it("reflects the current matchMedia state on first render", () => {
        mockMatchMedia(true);
        const { result } = renderHook(() => usePrefersReducedMotion());
        expect(result.current).toBe(true);
    });

    it("returns false when the media query doesn't match", () => {
        mockMatchMedia(false);
        const { result } = renderHook(() => usePrefersReducedMotion());
        expect(result.current).toBe(false);
    });

    it("updates when the OS-level preference changes mid-session", () => {
        const { setMatches } = mockMatchMedia(false);
        const { result } = renderHook(() => usePrefersReducedMotion());
        expect(result.current).toBe(false);

        act(() => setMatches(true));
        expect(result.current).toBe(true);

        act(() => setMatches(false));
        expect(result.current).toBe(false);
    });

    it("degrades to false when matchMedia isn't available at all", () => {
        // @ts-expect-error -- simulating an environment without matchMedia
        window.matchMedia = undefined;
        const { result } = renderHook(() => usePrefersReducedMotion());
        expect(result.current).toBe(false);
    });
});
