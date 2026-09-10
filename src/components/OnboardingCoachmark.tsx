import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { OnboardingStep, OnboardingStepId } from "../onboarding";

type Props = { steps: OnboardingStep[]; onDismiss: (stepId: OnboardingStepId) => void };

type AnchorRect = { top: number; left: number; width: number; height: number };
type ActiveStep = { step: OnboardingStep; anchor: AnchorRect };

function rectOf(el: Element): AnchorRect {
    const rect = el.getBoundingClientRect();
    return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

// jsdom has no layout engine and reports an all-zero rect for literally
// every element regardless of real visibility -- vs. a real browser, where
// zero-size only ever means genuinely hidden (display:none, not mounted
// yet). jsdom sets this marker in its default user agent string, which is
// the standard way to tell the two apart from within page code. Evaluated
// fresh on every call (not cached at module load) so it reflects whatever
// navigator is live right now rather than whatever it was when this module
// first happened to be imported.
function isJsdomEnvironment(): boolean {
    return typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
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
    // Every candidate reported zero size. In a real browser this means
    // every match is genuinely hidden right now (e.g. the mobile layout's
    // ".ws-level-goal-card { display: none }" swallowing "bonus"'s anchor
    // entirely) -- null here is what lets the caller move on to the next
    // candidate step instead of rendering a coachmark pinned to nowhere.
    // Only jsdom's tests get the old "pretend the first match is fine"
    // fallback, since jsdom can never report a real, positive-size rect at all.
    return isJsdomEnvironment() ? rectOf(candidates[0]) : null;
}

// Tries each pending step in order and settles on the first whose anchor
// actually resolves right now, re-checking on resize/scroll/poll like the
// single-step version this replaced. Steps earlier in the queue whose
// anchor never appears (e.g. "bonus" on a puzzle with no bonus goal at all)
// no longer block later ones from ever being shown -- see onboarding.ts's
// eligibleOnboardingSteps for why the caller hands over a list instead of
// a single pre-picked step.
function useActiveStep(steps: OnboardingStep[]): ActiveStep | null {
    const [active, setActive] = useState<ActiveStep | null>(null);
    const stepsKey = steps.map(step => step.id).join(",");

    useLayoutEffect(() => {
        if (steps.length === 0) { setActive(null); return; }
        const measure = () => {
            for (const step of steps) {
                const anchor = resolveVisibleAnchor(step.anchorSelector);
                if (anchor) { setActive({ step, anchor }); return; }
            }
            setActive(null);
        };
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepsKey]);

    return active;
}

const BUBBLE_MARGIN = 12;
const BUBBLE_WIDTH = 280;

export default function OnboardingCoachmark({ steps, onDismiss }: Props) {
    const active = useActiveStep(steps);

    useEffect(() => {
        if (!active) return;
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(active.step.id); };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [active, onDismiss]);

    if (!active) return null;
    const { step, anchor } = active;

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
                <button type="button" className="ws-coachmark__dismiss" onClick={() => onDismiss(step.id)} autoFocus>
                    Got it
                </button>
            </div>
        </div>,
        document.body,
    );
}
