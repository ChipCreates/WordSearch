import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { OnboardingStep } from "../onboarding";

type Props = { step: OnboardingStep | null; onDismiss: () => void };

type AnchorRect = { top: number; left: number; width: number; height: number };

function rectOf(el: Element): AnchorRect {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function resolveVisibleAnchor(selector: string): AnchorRect | null {
    if (typeof document === "undefined") return null;
    // Desktop and mobile each render their own copy of the primary nav
    // (top bar vs. bottom bar) and CSS hides whichever doesn't apply at the
    // current viewport -- a real, nonzero bounding rect is what picks the
    // one actually on screen, regardless of which breakpoint rules are in
    // play or how they change later. A genuinely hidden (display:none)
    // element reports an all-zero rect in every real browser, which is
    // exactly what this loop skips past.
    const candidates = Array.from(document.querySelectorAll(selector));
    if (candidates.length === 0) return null;
    for (const candidate of candidates) {
        const rect = rectOf(candidate);
        if (rect.width > 0 && rect.height > 0) return rect;
    }
    // Every candidate reported zero size. In a real browser this can only
    // mean every match is hidden right now (nothing to anchor to yet).
    // jsdom has no layout engine at all, though, so it reports an all-zero
    // rect for *everything* regardless of real visibility -- falling back
    // to the first match keeps the coachmark's presence/dismissal testable
    // there instead of silently vanishing in every test that renders it.
    return rectOf(candidates[0]);
}

/**
 * Tracks the live position of `selector`'s first visible match, re-checking
 * on resize/scroll and whenever the anchor's own size changes. Returns null
 * both when the step has no anchor yet (e.g. this puzzle has no bonus goal)
 * and after the anchor genuinely disappears mid-display -- the coachmark
 * itself is what decides those two cases mean the same thing: don't show.
 */
function useAnchorRect(selector: string | null): AnchorRect | null {
    const [rect, setRect] = useState<AnchorRect | null>(null);

    useLayoutEffect(() => {
        if (!selector) { setRect(null); return; }
        const measure = () => setRect(resolveVisibleAnchor(selector));
        measure();

        window.addEventListener("resize", measure);
        window.addEventListener("scroll", measure, true);

        // Anchors can appear, move, or resize from ordinary state changes
        // (a puzzle loading in with a bonus goal, a level-up unlocking a
        // nav item) that aren't resize/scroll events -- a lightweight
        // polling fallback catches those without needing a bespoke event
        // for every possible cause.
        const interval = window.setInterval(measure, 500);

        return () => {
            window.removeEventListener("resize", measure);
            window.removeEventListener("scroll", measure, true);
            window.clearInterval(interval);
        };
    }, [selector]);

    return rect;
}

const BUBBLE_MARGIN = 12;
const BUBBLE_WIDTH = 280;

export default function OnboardingCoachmark({ step, onDismiss }: Props) {
    const anchor = useAnchorRect(step?.anchorSelector ?? null);

    useEffect(() => {
        if (!step || !anchor) return;
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [step, anchor, onDismiss]);

    if (!step || !anchor) return null;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - (anchor.top + anchor.height);
    const placeAbove = spaceBelow < 160 && anchor.top > 160;

    const bubbleTop = placeAbove
        ? Math.max(BUBBLE_MARGIN, anchor.top - BUBBLE_MARGIN)
        : Math.min(viewportHeight - BUBBLE_MARGIN, anchor.top + anchor.height + BUBBLE_MARGIN);
    const anchorCenterX = anchor.left + anchor.width / 2;
    const bubbleLeft = Math.min(
        Math.max(BUBBLE_MARGIN, anchorCenterX - BUBBLE_WIDTH / 2),
        viewportWidth - BUBBLE_WIDTH - BUBBLE_MARGIN,
    );
    const arrowLeft = Math.min(Math.max(16, anchorCenterX - bubbleLeft), BUBBLE_WIDTH - 16);

    return createPortal(
        <div className="ws-coachmark-layer" role="presentation">
            <div
                className="ws-coachmark-spotlight"
                style={{ top: anchor.top - 6, left: anchor.left - 6, width: anchor.width + 12, height: anchor.height + 12 }}
                aria-hidden="true"
            />
            <div
                className={`ws-coachmark ${placeAbove ? "ws-coachmark--above" : "ws-coachmark--below"}`}
                style={{ top: bubbleTop, left: bubbleLeft, width: BUBBLE_WIDTH, transform: placeAbove ? "translateY(-100%)" : undefined }}
                role="status"
                aria-live="polite"
                aria-label={`${step.title}. ${step.body}`}
            >
                <div className="ws-coachmark__arrow" style={{ left: arrowLeft }} aria-hidden="true" />
                <h3 className="ws-coachmark__title">{step.title}</h3>
                <p className="ws-coachmark__body">{step.body}</p>
                <button type="button" className="ws-coachmark__dismiss" onClick={onDismiss} autoFocus>
                    Got it
                </button>
            </div>
        </div>,
        document.body,
    );
}
