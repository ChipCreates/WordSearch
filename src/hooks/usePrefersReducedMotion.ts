import { useEffect, useState } from "react";

// Shared, component-level (state, not ref) prefers-reduced-motion detector.
// GameCanvas.tsx already has its own ref-based version of this same
// matchMedia subscription -- a ref there because it's read from inside an
// imperative rAF loop, not a render. WSP-2.4's milestone/region-transition
// presentation needs the same signal to *conditionally render* (skip the
// entrance animation and particle burst entirely, not just freeze them),
// so a plain useState-backed hook is what's needed here instead of
// duplicating GameCanvas's ref pattern a second time.
export function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState<boolean>(() =>
        typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
            : false,
    );

    useEffect(() => {
        const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (!media) return;
        const update = () => setReduced(media.matches);
        update();
        media.addEventListener?.("change", update);
        return () => media.removeEventListener?.("change", update);
    }, []);

    return reduced;
}
