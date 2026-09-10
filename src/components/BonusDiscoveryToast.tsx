import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { assetUrl } from "../categoryThemes";

type Props = { word: string; seeds: number };

type Point = { x: number; y: number };

function centerOf(el: Element | null): Point | null {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// The live Seed balance pill in the header -- shared with the "store"
// onboarding coachmark's own anchor, since it's the same element players
// watch their balance tick up in.
const SEED_BALANCE_SELECTOR = '[data-onboarding-anchor~="seeds"]';
const BOARD_SELECTOR = ".ws-game-board-panel";
const PARTICLE_COUNT = 3;

/**
 * Non-blocking, non-modal bonus-word discovery feedback (WSP-1.2): a
 * localized leaf/glow burst over the board plus Seed particles animating
 * toward the real Seed balance. Positions are computed once on mount --
 * the toast's whole lifetime is under 2s, far shorter than a realistic
 * resize, so it isn't worth tracking live like the longer-lived coachmark.
 */
export default function BonusDiscoveryToast({ word, seeds }: Props) {
    const [origin] = useState<Point | null>(() => centerOf(document.querySelector(BOARD_SELECTOR)));
    const [target] = useState<Point | null>(() => centerOf(document.querySelector(SEED_BALANCE_SELECTOR)));

    if (!origin) return null;

    const dx = target ? target.x - origin.x : 0;
    const dy = target ? target.y - origin.y : -60;

    return createPortal(
        <div className="ws-bonus-toast-layer">
            <div className="ws-bonus-toast" role="status" aria-live="polite" style={{ top: origin.y, left: origin.x }}>
                <span className="ws-bonus-toast__glow" />
                <span className="ws-bonus-toast__burst">🌿✨</span>
                <div className="ws-bonus-toast__copy">
                    <strong>Bonus Sprout!</strong> {word} +{seeds} Seeds
                </div>
            </div>
            {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
                <img
                    key={i}
                    src={assetUrl("seed.png")}
                    alt=""
                    className="ws-bonus-toast__particle"
                    style={{
                        top: origin.y,
                        left: origin.x,
                        animationDelay: `${160 + i * 90}ms`,
                        "--bonus-particle-dx": `${dx}px`,
                        "--bonus-particle-dy": `${dy}px`,
                    } as CSSProperties}
                />
            ))}
        </div>,
        document.body,
    );
}
