import { type CSSProperties } from "react";
import type { BotanistPromotion } from "../botanistRanks";

type Props = {
    promotion: BotanistPromotion;
    avatarBackgroundPosition: string;
    onContinue: () => void;
};

export default function BotanistPromotionCeremony({ promotion, avatarBackgroundPosition, onContinue }: Props) {
    return (
        <section className="ws-promotion-ceremony" role="dialog" aria-labelledby="ws-promotion-title" aria-describedby="ws-promotion-message">
            <div className="ws-promotion-ceremony__eyebrow">Botanist promotion</div>
            <div
                className="ws-promotion-ceremony__avatar ws-botanist-avatar"
                style={{ "--avatar-position": avatarBackgroundPosition } as CSSProperties}
                role="img"
                aria-label={`${promotion.to.title} avatar`}
            />
            <h3 id="ws-promotion-title">You are now a {promotion.to.title}</h3>
            <p id="ws-promotion-message">
                Level {promotion.level} opens a new chapter in your garden journey. Your new rank is ready to grow with you.
            </p>
            <div className="ws-promotion-ceremony__rank-change" aria-label={`Promoted from ${promotion.from.title} to ${promotion.to.title}`}>
                <span>{promotion.from.title}</span>
                <span aria-hidden="true">→</span>
                <strong>{promotion.to.title}</strong>
            </div>
            <button type="button" className="ws-primary-action-btn ws-promotion-ceremony__continue" onClick={onContinue}>
                Continue growing
            </button>
        </section>
    );
}
