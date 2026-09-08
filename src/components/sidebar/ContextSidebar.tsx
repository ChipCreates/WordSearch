import { useEffect, useState, type CSSProperties } from "react";
import { RefreshOutlined, VolumeOffOutlined, VolumeUpOutlined, MusicOffOutlined, MusicNoteOutlined } from "@mui/icons-material";
import NavigationArt from "../NavigationArt";
import EcoLeaf from "../icons/EcoLeaf";
import { getSidebarProfileModel } from "./sidebarModels";
import { POWERUP_DEFINITIONS, type PowerupId, type PowerupInventory } from "../../powerups";
import { assetUrl } from "../../categoryThemes";
import { getGardenCareModel, formatCareCountdown } from "./gardenModels";
import { getClosestMilestones } from "./achievementModels";
import type { AchievementStats } from "../../achievements";
import FieldNotesPanel from "../FieldNotesPanel";
import type { FieldNoteId, FieldNotesState } from "../../fieldNotes";

type ActiveTab = "play" | "levels" | "garden" | "achievements" | "settings" | "about";
type Props = {
    activeTab: ActiveTab;
    highestUnlockedLevel: number;
    playingLevel: number;
    levelComplete: boolean;
    hasGoldenCrest: boolean;
    avatarBackgroundPosition: string;
    profileRankTitle: string;
    onOpenProfile: () => void;
    onNextLevel: () => void;
    onRevealHint: () => void;
    onShuffle: () => void;
    onRetry: () => void;
    onSuperRoot: () => void;
    onCompass: () => void;
    onSpectrometer: () => void;
    onDoubleSeeds: () => void;
    hintAvailable: boolean;
    freeHintUsesRemaining: number;
    powerupInventory: PowerupInventory;
    doubleSeedsActive: boolean;
    sfxMuted: boolean;
    musicMuted: boolean;
    onToggleSfx: () => void;
    onToggleMusic: () => void;
    onHelp: () => void;
    ownedPlants: string[];
    wateredTimestamps: Record<string, number>;
    growthByPlant: Record<string, number>;
    onWaterAllReady: () => void;
    achievementStats: AchievementStats;
    unlockedAchievements: Set<string>;
    fieldNotes: FieldNotesState;
    onCollectFieldNote: (noteId: FieldNoteId) => boolean;
};

function PowerupButton({ id, countLabel, disabled, title, onClick }: { id: PowerupId; countLabel: string; disabled?: boolean; title: string; onClick: () => void }) {
    const item = POWERUP_DEFINITIONS[id];
    return <button className="ws-sidebar-powerup" disabled={disabled} title={title} onClick={onClick}>
        <img src={assetUrl(item.image.replace(/^\//, ""))} alt="" />
        <span>{item.shortLabel}</span>
        <small>{countLabel}</small>
    </button>;
}

export default function ContextSidebar(props: Props) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);
    const model = getSidebarProfileModel(props.highestUnlockedLevel);
    const inv = props.powerupInventory;
    const care = getGardenCareModel(props.ownedPlants, props.wateredTimestamps, props.growthByPlant, now);
    const milestones = getClosestMilestones(props.achievementStats, props.unlockedAchievements);
    const missing = (id: keyof PowerupInventory, action: string) => inv[id] ? action : `Buy ${POWERUP_DEFINITIONS[id].title} in the Seed Store`;

    return <aside className="ws-side-nav" aria-label="Context sidebar">
        <div className="ws-side-nav__profile">
            <button className="ws-side-nav__avatar-box ws-botanist-avatar" style={{ "--avatar-position": props.avatarBackgroundPosition } as CSSProperties} onClick={props.onOpenProfile} aria-label={`Open player information: ${props.profileRankTitle}`} title="Player information" />
            <div className="ws-side-nav__profile-copy">
                <div className="ws-side-nav__rank-title">{model.rankTitle} {props.hasGoldenCrest && <span title="Golden Sprout Crest">🏆</span>}</div>
                <div className="ws-side-nav__rank-level">Level {model.level}</div>
                <div className="ws-sidebar-rank-progress" aria-label={`${Math.round(model.progress * 100)}% through current Botanist rank`}><span style={{ width: `${model.progress * 100}%` }} /></div>
                <small>{model.isMaxRank ? "Max rank · Cosmic Conservator" : `${model.levelsToNextRank} levels to ${model.nextRankTitle}`}</small>
            </div>
        </div>

        <div className="ws-sidebar-context">
            {props.activeTab === "play" && <>
                <div className="ws-sidebar-section-label">Tactical Toolkit</div>
                {props.levelComplete && <button className="ws-primary-action-btn" onClick={props.onNextLevel} style={{ width: "100%", justifyContent: "center", padding: "10px 16px" }}><EcoLeaf /><span>Next Level 🌱</span></button>}
                <div className="ws-sidebar-tool-grid">
                    <PowerupButton id="single-letter-sprout" countLabel={props.freeHintUsesRemaining ? "Free" : `×${inv["single-letter-sprout"]}`} disabled={!props.hintAvailable} title={props.hintAvailable ? "Reveal a target start" : "Buy a hint charge in the Seed Store"} onClick={props.onRevealHint} />
                    <PowerupButton id="lumina-cyclone" countLabel={`×${inv["lumina-cyclone"]}`} disabled={!inv["lumina-cyclone"]} title={missing("lumina-cyclone", "Shuffle the unfound words")} onClick={props.onShuffle} />
                    <PowerupButton id="super-root" countLabel={`×${inv["super-root"]}`} disabled={!inv["super-root"]} title={missing("super-root", "Solve one unfound target")} onClick={props.onSuperRoot} />
                    <PowerupButton id="bioluminescent-compass" countLabel={`×${inv["bioluminescent-compass"]}`} disabled={!inv["bioluminescent-compass"]} title={missing("bioluminescent-compass", "Point toward an unfound word")} onClick={props.onCompass} />
                    <PowerupButton id="flora-spectrometer" countLabel={`×${inv["flora-spectrometer"]}`} disabled={!inv["flora-spectrometer"]} title={missing("flora-spectrometer", "Highlight unfound word starts")} onClick={props.onSpectrometer} />
                    <PowerupButton id="nitrogen-booster" countLabel={props.doubleSeedsActive ? "Active" : `×${inv["nitrogen-booster"]}`} disabled={!inv["nitrogen-booster"] || props.doubleSeedsActive} title={props.doubleSeedsActive ? "2× Seeds active for this puzzle" : missing("nitrogen-booster", "Double completion and bonus rewards")} onClick={props.onDoubleSeeds} />
                </div>
                <button className="ws-sidebar-restart" title="Retry this board without repaying bonus words" onClick={props.onRetry}><RefreshOutlined /> Restart this board</button>
                {props.doubleSeedsActive && <div role="status" className="ws-sidebar-booster-status">⚡ 2× Seeds active for this puzzle</div>}
            </>}
            {props.activeTab === "levels" && <div className="ws-sidebar-summary"><strong>Journey Progress</strong><span>Level {props.playingLevel} selected</span><span>Frontier: Level {props.highestUnlockedLevel}</span><button className="ws-control-btn" onClick={props.onNextLevel}>Return to current level</button></div>}
            {props.activeTab === "garden" && <div className="ws-sidebar-summary"><strong>Garden Care</strong><span>{care.readyCount ? `${care.readyCount} plant${care.readyCount === 1 ? " is" : "s are"} ready to water.` : `Next watering in ${formatCareCountdown(care.nextReadyAt, now)}.`}</span>{care.closestPlant && <span>Closest bloom: {care.closestPlant.name} ({care.closestPlant.growth}%).</span>}<span>{care.bloomCount} bloomed · {care.collectionCount} collected</span><button className="ws-primary-action-btn" disabled={!care.readyCount} onClick={props.onWaterAllReady}>{care.readyCount ? `Water all ready (${care.readyCount})` : "Nothing ready to water"}</button></div>}
            {props.activeTab === "achievements" && <div className="ws-sidebar-summary"><strong>Closest Milestones</strong>{milestones.map(item => <span key={item.achievement.id}>{item.achievement.icon} {item.achievement.description} · {item.remaining} to go</span>)}</div>}
        </div>

        <FieldNotesPanel state={props.fieldNotes} onCollect={props.onCollectFieldNote} />

        <div className="ws-sidebar-utilities">
            <div className="ws-sidebar-audio-controls">
                <div className="ws-sidebar-audio-label">Audio Controls</div>
                <div className="ws-sidebar-audio-row">
                    <button onClick={props.onToggleSfx} aria-label={props.sfxMuted ? "Unmute sound effects" : "Mute sound effects"} title={props.sfxMuted ? "Unmute SFX" : "Mute SFX"}>{props.sfxMuted ? <VolumeOffOutlined /> : <VolumeUpOutlined />}</button>
                    <button onClick={props.onToggleMusic} aria-label={props.musicMuted ? "Unmute music" : "Mute music"} title={props.musicMuted ? "Unmute Music" : "Mute Music"}>{props.musicMuted ? <MusicOffOutlined /> : <MusicNoteOutlined />}</button>
                </div>
            </div>
            <button className="ws-about-art-btn" onClick={props.onHelp}><NavigationArt name="help" /> About & How to Play</button>
        </div>
    </aside>;
}
