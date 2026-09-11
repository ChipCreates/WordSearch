import { useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { BloomEvent } from "../bloomEvents";
import { bloomIntensity } from "../bloomEvents";
import { REWARD_PRESENTATION, type ParticleIntensity } from "../rewardIntensity";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

type Props = {
    /** The shared bloom-presentation queue (WSP-2.6) -- fed by all three
     *  bloom-triggering sites (individual water/fertilize in GardenView,
     *  bulk waterAllReady in useWordSearchGame). Only `events[0]` is ever
     *  shown; everything after it waits its turn. */
    events: BloomEvent[];
    /** Pops the currently-shown event (index 0) off the queue -- called on
     *  its own timer expiring or the player dismissing it early. */
    onDismiss: () => void;
    isMobile?: boolean;
};

const PARTICLE_COUNTS: Record<ParticleIntensity, number> = {
    none: 0,
    subtle: 3,
    moderate: 5,
    full: 8,
    maximal: 12,
};

/**
 * Non-blocking, non-modal bloom celebration (WSP-2.6): brighten, animate,
 * reveal, soft particles, and a reward readout for whichever plant just
 * bloomed, scaled by WSP-2.1's reward-intensity scale for that plant's
 * rarity tier. Multiple simultaneous blooms (bulk "water all ready") are
 * deliberately presented ONE AT A TIME, in bloom order -- see the queue
 * documentation on `events` -- rather than combined into a single summary,
 * so a rare bloom buried in a big bulk-water action still gets its own
 * full-weight moment instead of being flattened into an average. The queue
 * itself never drops or reorders entries; mashing "water all ready" or a
 * plant's Water button just appends more entries behind whatever is
 * currently showing.
 *
 * Mounted globally in App.tsx (so a bulk bloom triggered from outside the
 * Garden tab still presents) AND inside GardenView itself (so the two
 * individual-action sources get a first-class, directly-testable render
 * without waiting on App.tsx wiring) -- App.tsx only mounts its own copy
 * while the Garden tab is NOT active, so the two never double-render the
 * same queue at once.
 */
export default function BloomCelebration({ events, onDismiss, isMobile }: Props) {
    const current = events[0] ?? null;
    const reducedMotion = usePrefersReducedMotion();
    const intensity = current ? bloomIntensity(current.tier) : null;
    const spec = intensity ? REWARD_PRESENTATION[intensity] : null;
    const duration = spec ? (isMobile ? spec.mobileDurationMs : spec.desktopDurationMs) : 0;

    // Matches AchievementBanner's own auto-dismiss pattern exactly: one
    // timer per currently-shown item, cleared and restarted whenever the
    // current event's identity changes (including the very next queued
    // bloom taking its place).
    useEffect(() => {
        if (!current) return;
        const timer = setTimeout(onDismiss, duration);
        return () => clearTimeout(timer);
    }, [current, onDismiss, duration]);

    if (!current || !spec || !intensity) return null;

    const showScrim = isMobile ? spec.scrim.mobile : spec.scrim.desktop;
    const particleCount = PARTICLE_COUNTS[spec.particleIntensity];

    return createPortal(
        <>
            {showScrim && (
                <div
                    key={`${current.id}-scrim`}
                    aria-hidden="true"
                    // pointerEvents: none, deliberately -- matches
                    // AchievementBanner's mobile scrim precedent, so even
                    // the "major"/"exceptional" full-screen dim never blocks
                    // continued interaction with the Garden underneath it.
                    className={`ws-bloom-scrim${reducedMotion ? " ws-bloom-scrim--reduced" : ""}`}
                    style={{ pointerEvents: "none" }}
                />
            )}
            <div
                key={current.id}
                className={`ws-bloom-celebration ws-bloom-celebration--${intensity}${reducedMotion ? " ws-bloom-celebration--reduced" : ""}`}
                role="status"
                aria-live="polite"
                data-testid="bloom-celebration"
                data-intensity={intensity}
            >
                <span className="ws-bloom-celebration__glow" aria-hidden="true" />
                {particleCount > 0 && (
                    <span className="ws-bloom-celebration__particles" aria-hidden="true">
                        {Array.from({ length: particleCount }, (_, i) => (
                            <span key={i} className="ws-bloom-celebration__particle" style={{ "--ws-particle-i": i } as CSSProperties} />
                        ))}
                    </span>
                )}
                <span className="ws-bloom-celebration__art" aria-hidden="true">🌸</span>
                <div className="ws-bloom-celebration__copy">
                    <div className="ws-bloom-celebration__eyebrow">{current.tier} bloom!</div>
                    <div className="ws-bloom-celebration__name">{current.plantName}</div>
                    <div className="ws-bloom-celebration__bounty">+{current.bounty} Seeds</div>
                </div>
                <button
                    type="button"
                    className="ws-bloom-celebration__dismiss"
                    onClick={onDismiss}
                    aria-label="Dismiss bloom celebration"
                >
                    ✕
                </button>
            </div>
        </>,
        document.body,
    );
}
