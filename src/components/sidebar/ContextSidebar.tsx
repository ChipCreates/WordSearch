import type { CSSProperties } from "react";
import { AutoFixHighOutlined, ShuffleOutlined, RefreshOutlined, VolumeOffOutlined, VolumeUpOutlined, MusicOffOutlined, MusicNoteOutlined } from "@mui/icons-material";
import NavigationArt from "../NavigationArt";
import EcoLeaf from "../icons/EcoLeaf";
import { getSidebarProfileModel } from "./sidebarModels";
import { POWERUP_DEFINITIONS, type PowerupInventory } from "../../powerups";

type ActiveTab = "play" | "levels" | "garden" | "achievements" | "settings";
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
};

const compactButtonStyle: CSSProperties = { justifyContent: "center", padding: "8px 10px", fontSize: "0.8rem" };

function ToolButton({ disabled, title, onClick, children }: { disabled?: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
    return <button className="ws-control-btn" disabled={disabled} title={title} onClick={onClick} style={compactButtonStyle}>{children}</button>;
}

export default function ContextSidebar(props: Props) {
    const model = getSidebarProfileModel(props.highestUnlockedLevel);
    const inv = props.powerupInventory;
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
                {props.levelComplete ? <button className="ws-primary-action-btn" onClick={props.onNextLevel} style={{ width: "100%", justifyContent: "center", padding: "10px 16px" }}><EcoLeaf /><span>Next Level 🌱</span></button> : <button className="ws-primary-action-btn" disabled={!props.hintAvailable} title={props.hintAvailable ? "Reveal a target start" : "Buy a hint charge in the Seed Store"} onClick={props.onRevealHint} style={{ width: "100%", justifyContent: "center", padding: "10px 16px" }}><AutoFixHighOutlined /><span>Hint · {props.freeHintUsesRemaining ? "Free" : `x${inv["single-letter-sprout"]}`}</span></button>}
                <div className="ws-sidebar-tool-grid">
                    <ToolButton disabled={!inv["lumina-cyclone"]} title={missing("lumina-cyclone", "Shuffle the unfound words")} onClick={props.onShuffle}><ShuffleOutlined style={{ fontSize: 16 }} /> Shuffle · x{inv["lumina-cyclone"]}</ToolButton>
                    <ToolButton title="Retry this board without repaying bonus words" onClick={props.onRetry}><RefreshOutlined style={{ fontSize: 16 }} /> Restart</ToolButton>
                    <ToolButton disabled={!inv["super-root"]} title={missing("super-root", "Solve one unfound target")} onClick={props.onSuperRoot}>🌱 Root · x{inv["super-root"]}</ToolButton>
                    <ToolButton disabled={!inv["bioluminescent-compass"]} title={missing("bioluminescent-compass", "Point toward an unfound word")} onClick={props.onCompass}>🧭 Compass · x{inv["bioluminescent-compass"]}</ToolButton>
                    <ToolButton disabled={!inv["flora-spectrometer"]} title={missing("flora-spectrometer", "Highlight unfound word starts")} onClick={props.onSpectrometer}>🔬 Spectro · x{inv["flora-spectrometer"]}</ToolButton>
                    <ToolButton disabled={!inv["nitrogen-booster"] || props.doubleSeedsActive} title={props.doubleSeedsActive ? "2× Seeds active for this puzzle" : missing("nitrogen-booster", "Double completion and bonus rewards")} onClick={props.onDoubleSeeds}>⚡ {props.doubleSeedsActive ? "2× Active" : `2× Seeds · x${inv["nitrogen-booster"]}`}</ToolButton>
                </div>
                {props.doubleSeedsActive && <div role="status" className="ws-sidebar-booster-status">⚡ 2× Seeds active for this puzzle</div>}
            </>}
            {props.activeTab === "levels" && <div className="ws-sidebar-summary"><strong>Journey Progress</strong><span>Level {props.playingLevel} selected</span><span>Frontier: Level {props.highestUnlockedLevel}</span><button className="ws-control-btn" onClick={props.onNextLevel}>Return to current level</button></div>}
            {props.activeTab === "garden" && <div className="ws-sidebar-summary"><strong>Garden Care</strong><span>Keep tending your plants to grow the conservatory.</span></div>}
            {props.activeTab === "achievements" && <div className="ws-sidebar-summary"><strong>Closest Milestones</strong><span>Complete puzzles, discover bonus words, and bloom plants to advance.</span></div>}
        </div>

        <div className="ws-sidebar-utilities">
            <div className="ws-sidebar-audio-label">Audio Controls</div>
            <div className="ws-sidebar-audio-row">
                <button onClick={props.onToggleSfx} aria-label={props.sfxMuted ? "Unmute sound effects" : "Mute sound effects"} title={props.sfxMuted ? "Unmute SFX" : "Mute SFX"}>{props.sfxMuted ? <VolumeOffOutlined /> : <VolumeUpOutlined />}</button>
                <button onClick={props.onToggleMusic} aria-label={props.musicMuted ? "Unmute music" : "Mute music"} title={props.musicMuted ? "Unmute Music" : "Mute Music"}>{props.musicMuted ? <MusicOffOutlined /> : <MusicNoteOutlined />}</button>
            </div>
            <button className="ws-about-art-btn" onClick={props.onHelp}><NavigationArt name="help" /> About & How to Play</button>
        </div>
    </aside>;
}
