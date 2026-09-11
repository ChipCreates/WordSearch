import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function readPreference(): boolean {
    return typeof window !== "undefined" ? (window.matchMedia?.(QUERY).matches ?? false) : false;
}

/**
 * True when the OS/browser's prefers-reduced-motion setting is active.
 * Falls back to false wherever matchMedia isn't available (jsdom in tests
 * that don't stub it, older WebViews) instead of throwing -- the same
 * defensive `window.matchMedia?.(...)` pattern GameCanvas already uses for
 * its own celebration animation. Used by the Garden's watering beat and
 * bloom celebration (WSP-2.6) to switch to an instant/static presentation;
 * CSS `@media (prefers-reduced-motion: reduce)` rules in App.css handle the
 * purely-visual (animation-only) side of the same requirement.
 */
export function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(readPreference);

    useEffect(() => {
        const media = window.matchMedia?.(QUERY);
        if (!media) return;
        const update = () => setReduced(media.matches);
        update();
        media.addEventListener?.("change", update);
        return () => media.removeEventListener?.("change", update);
    }, []);

    return reduced;
}
