import {
    Box, Typography, Slider, Switch, FormControlLabel,
    ToggleButtonGroup, ToggleButton, IconButton, useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import NightlightIcon from "@mui/icons-material/Nightlight";
import type { Tier } from "../backend";

type ThemeMode = "sprout" | "midnight";

type Props = {
    open: boolean;
    onClose: () => void;
    difficultyMode: Tier;
    onDifficultyModeChange: (mode: Tier) => void;
    musicMuted: boolean;
    onToggleMusicMuted: () => void;
    musicVolume: number;
    onMusicVolumeChange: (volume: number) => void;
    sfxMuted: boolean;
    onToggleSfxMuted: () => void;
    sfxVolume: number;
    onSfxVolumeChange: (volume: number) => void;
    themeMode: ThemeMode;
    onThemeModeChange: (mode: ThemeMode) => void;
};

function SoundRow({
    label, muted, onToggleMuted, volume, onVolumeChange,
}: {
    label: string;
    muted: boolean;
    onToggleMuted: () => void;
    volume: number;
    onVolumeChange: (v: number) => void;
}) {
    return (
        <Box sx={{ mb: 2 }}>
            <FormControlLabel
                control={<Switch checked={!muted} onChange={onToggleMuted} size="small" />}
                label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {muted
                            ? <VolumeOffIcon fontSize="small" />
                            : <VolumeUpIcon  fontSize="small" />}
                        <Typography variant="body2" sx={{ fontFamily: "var(--font-body)" }}>
                            {label}
                        </Typography>
                    </Box>
                }
            />
            <Slider
                value={Math.round(volume * 100)}
                onChange={(_, v) => onVolumeChange((v as number) / 100)}
                disabled={muted}
                valueLabelDisplay="auto"
                valueLabelFormat={v => `${v}%`}
                size="small"
                sx={{ ml: 1, width: "calc(100% - 16px)" }}
            />
        </Box>
    );
}

// ── Shared inner content ──────────────────────────────────────────────────────
function SettingsContent({
    difficultyMode, onDifficultyModeChange,
    musicMuted, onToggleMusicMuted, musicVolume, onMusicVolumeChange,
    sfxMuted, onToggleSfxMuted, sfxVolume, onSfxVolumeChange,
    themeMode, onThemeModeChange,
}: Omit<Props, "open" | "onClose">) {
    return (
        <>
            {/* Theme toggle */}
            <div className="ws-settings-section">
                <div className="ws-settings-section__label">Appearance</div>
                <ToggleButtonGroup
                    value={themeMode}
                    exclusive
                    fullWidth
                    size="small"
                    onChange={(_, v: ThemeMode | null) => v && onThemeModeChange(v)}
                >
                    <ToggleButton value="sprout" id="settings-theme-sprout">
                        <WbSunnyIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Sprout
                    </ToggleButton>
                    <ToggleButton value="midnight" id="settings-theme-midnight">
                        <NightlightIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Midnight
                    </ToggleButton>
                </ToggleButtonGroup>
            </div>

            {/* Difficulty */}
            <div className="ws-settings-section">
                <div className="ws-settings-section__label">Difficulty</div>
                <Typography variant="caption" sx={{ display: "block", mb: 1, color: "var(--color-on-surface-variant)" }}>
                    Switching takes effect on your current puzzle.
                </Typography>
                <ToggleButtonGroup
                    value={difficultyMode}
                    exclusive
                    fullWidth
                    size="small"
                    onChange={(_, v: Tier | null) => v && onDifficultyModeChange(v)}
                >
                    <ToggleButton value="standard"    id="settings-diff-standard">Standard</ToggleButton>
                    <ToggleButton value="challenging" id="settings-diff-challenging">Challenging</ToggleButton>
                </ToggleButtonGroup>
            </div>

            {/* Sound */}
            <div className="ws-settings-section">
                <div className="ws-settings-section__label">Sound</div>
                <SoundRow
                    label="Music"
                    muted={musicMuted} onToggleMuted={onToggleMusicMuted}
                    volume={musicVolume} onVolumeChange={onMusicVolumeChange}
                />
                <SoundRow
                    label="Sound effects"
                    muted={sfxMuted} onToggleMuted={onToggleSfxMuted}
                    volume={sfxVolume} onVolumeChange={onSfxVolumeChange}
                />
            </div>
        </>
    );
}

// ── Main component — bottom sheet on mobile, dialog on desktop ────────────────
export default function SettingsDialog(props: Props) {
    const { open, onClose } = props;
    const isMobile = useMediaQuery("(max-width: 639px)");

    if (!open) return null;

    // Mobile — bottom sheet
    if (isMobile) {
        return (
            <>
                <div
                    className="ws-bottom-sheet-backdrop"
                    onClick={onClose}
                    aria-hidden="true"
                />
                <div className="ws-bottom-sheet" role="dialog" aria-label="Settings">
                    <div className="ws-bottom-sheet__handle" />
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
                        <div className="ws-bottom-sheet__title" style={{ flex: 1 }}>Settings</div>
                        <IconButton size="small" onClick={onClose} id="settings-close-btn">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </div>
                    <SettingsContent {...props} />
                </div>
            </>
        );
    }

    // Desktop — centred MUI-styled sheet (using the same bottom-sheet CSS,
    // but rendered inside a fixed centred container)
    return (
        <>
            <div
                className="ws-bottom-sheet-backdrop"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                role="dialog"
                aria-label="Settings"
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 1201,
                    width: "100%",
                    maxWidth: 440,
                    background: "var(--color-surface-container)",
                    borderRadius: "var(--radius-xl)",
                    padding: "24px 28px 28px",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                    <div className="ws-bottom-sheet__title" style={{ flex: 1, textAlign: "left" }}>Settings</div>
                    <IconButton size="small" onClick={onClose} id="settings-close-btn-desktop">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </div>
                <SettingsContent {...props} />
            </div>
        </>
    );
}
