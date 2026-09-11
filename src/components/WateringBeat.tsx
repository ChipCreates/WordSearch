import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

export type CareAction = "water" | "fertilize";

type Props = {
    /** Which action just fired for this card, or null if none is playing.
     *  Kept as a discriminated value (not a bare boolean) so the droplet vs.
     *  fertilizer flourish can differ without a second prop. */
    action: CareAction | null;
};

/**
 * The Garden's sub-1.5s watering/fertilizing beat (WSP-2.6, Part 1): a
 * purely decorative, non-blocking overlay layered on top of a plant card's
 * hero art. GardenView owns the actual timing (see BEAT_DURATION_MS there)
 * and passes `action` down for the ~1.4s the beat should be visible; this
 * component only decides how to render that window, including the
 * prefers-reduced-motion fallback (an instant, static droplet/spark glyph
 * instead of the falling/rippling animation).
 *
 * `pointer-events: none` throughout (see App.css's `.ws-watering-beat`
 * rule) -- the beat sits visually on top of the plant art but never
 * intercepts clicks, so the Water/Fertilize/Treat/Compost buttons directly
 * beneath it stay fully interactive for the entirety of its short life.
 */
export default function WateringBeat({ action }: Props) {
    if (!action) return null;
    const reducedMotion = usePrefersReducedMotion();

    return (
        <div
            aria-hidden="true"
            className={`ws-watering-beat ws-watering-beat--${action}${reducedMotion ? " ws-watering-beat--reduced" : ""}`}
            data-testid="watering-beat"
            data-action={action}
        >
            <span className="ws-watering-beat__droplet">{action === "water" ? "💧" : "🧪"}</span>
            <span className="ws-watering-beat__ripple" />
            <span className="ws-watering-beat__glow" />
        </div>
    );
}
