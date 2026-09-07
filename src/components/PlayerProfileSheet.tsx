import { useEffect, type CSSProperties } from "react";
import { assetUrl } from "../categoryThemes";

type Props = {
    open: boolean;
    onClose: () => void;
    onOpenAchievements: () => void;
    onOpenSettings: () => void;
    botanistTitle: string;
    level: number;
    seeds: number;
    levelsCompleted: number;
    categoriesSeen: number;
    bonusWordsFound: number;
    plantsBloomed: number;
    achievementsUnlocked: number;
    achievementsTotal: number;
    avatarBackgroundPosition: string;
    hasGoldenCrest: boolean;
};

export default function PlayerProfileSheet({
    open,
    onClose,
    onOpenAchievements,
    onOpenSettings,
    botanistTitle,
    level,
    seeds,
    levelsCompleted,
    categoriesSeen,
    bonusWordsFound,
    plantsBloomed,
    achievementsUnlocked,
    achievementsTotal,
    avatarBackgroundPosition,
    hasGoldenCrest,
}: Props) {
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="ws-profile-sheet" role="dialog" aria-modal="true" aria-labelledby="ws-profile-sheet-title">
            <button className="ws-profile-sheet__scrim" onClick={onClose} aria-label="Close player profile" />
            <section className="ws-profile-sheet__panel">
                <div className="ws-profile-sheet__handle" aria-hidden="true" />
                <header className="ws-profile-sheet__header">
                    <div>
                        <span className="ws-profile-sheet__eyebrow">YOUR BOTANIST PROFILE</span>
                        <h2 id="ws-profile-sheet-title">Player information</h2>
                    </div>
                    <button className="ws-profile-sheet__close" onClick={onClose} aria-label="Close player profile">×</button>
                </header>

                <div className="ws-profile-sheet__identity">
                    <div
                        className="ws-profile-sheet__avatar ws-botanist-avatar"
                        style={{ "--avatar-position": avatarBackgroundPosition } as CSSProperties}
                        role="img"
                        aria-label={`${botanistTitle} avatar`}
                    />
                    <div className="ws-profile-sheet__identity-copy">
                        <div className="ws-profile-sheet__title-row">
                            <h3>{botanistTitle}</h3>
                            {hasGoldenCrest && <span className="ws-profile-sheet__crest" title="Golden Sprout Crest">🏆</span>}
                        </div>
                        <p>Level {level} · Woodland journey</p>
                        <div className="ws-profile-sheet__seed-total">
                            <img src={assetUrl("seed.png")} alt="" />
                            <strong>{seeds.toLocaleString()}</strong>
                            <span>Seeds</span>
                        </div>
                    </div>
                </div>

                <div className="ws-profile-sheet__section-heading">Your journey</div>
                <div className="ws-profile-sheet__stats" aria-label="Player statistics">
                    <div><strong>{levelsCompleted}</strong><span>Completed levels</span></div>
                    <div><strong>{categoriesSeen}</strong><span>Categories explored</span></div>
                    <div><strong>{bonusWordsFound}</strong><span>Bonus words found</span></div>
                    <div><strong>{plantsBloomed}</strong><span>Plants bloomed</span></div>
                </div>

                <div className="ws-profile-sheet__progress">
                    <div className="ws-profile-sheet__section-heading">Achievement progress</div>
                    <div className="ws-profile-sheet__progress-heading">
                        <span>Trophy case</span>
                        <strong>{achievementsUnlocked}/{achievementsTotal} unlocked</strong>
                    </div>
                    <div className="ws-profile-sheet__progress-track" aria-hidden="true">
                        <span style={{ width: `${Math.min(100, (achievementsUnlocked / Math.max(1, achievementsTotal)) * 100)}%` }} />
                    </div>
                </div>

                <div className="ws-profile-sheet__actions">
                    <button onClick={onOpenAchievements}>🏆 <span>Open trophy case</span><b>›</b></button>
                    <button onClick={onOpenSettings}>⚙️ <span>Settings</span><b>›</b></button>
                </div>
            </section>
        </div>
    );
}
