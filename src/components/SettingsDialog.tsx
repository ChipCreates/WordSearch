import { useState } from "react";
import {
    Box, Typography, Slider, Switch, FormControlLabel,
    ToggleButtonGroup, ToggleButton, IconButton, useMediaQuery, Button,
    Dialog, DialogTitle, DialogContent,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
// Only used by the Appearance section, currently disabled below -- re-add when it's restored.
// import WbSunnyIcon from "@mui/icons-material/WbSunny";
// import NightlightIcon from "@mui/icons-material/Nightlight";
// import ParkOutlinedIcon from "@mui/icons-material/ParkOutlined";
// import WavesOutlinedIcon from "@mui/icons-material/WavesOutlined";
// import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import type { Tier } from "../backend";
import { MIN_FAVORITE_CATEGORIES } from "../gameMechanics";
import CategoryPickerDialog from "./CategoryPickerDialog";

type ThemeMode = "sprout" | "midnight" | "autumn" | "ocean";

export type SettingsProps = {
    open: boolean;
    onClose: () => void;
    difficultyMode: Tier;
    onDifficultyModeChange: (mode: Tier) => void;
    favoriteCategories: string[];
    onFavoriteCategoriesChange: (names: string[]) => void;
    useFavorites: boolean;
    onUseFavoritesChange: (value: boolean) => void;
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
    unlockedThemes: string[];
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
export function SettingsContent({
    difficultyMode, onDifficultyModeChange,
    favoriteCategories, onFavoriteCategoriesChange, useFavorites, onUseFavoritesChange,
    musicMuted, onToggleMusicMuted, musicVolume, onMusicVolumeChange,
    sfxMuted, onToggleSfxMuted, sfxVolume, onSfxVolumeChange,
    // themeMode, onThemeModeChange, unlockedThemes, -- re-add to destructure when the Appearance section below is restored
}: Omit<SettingsProps, "open" | "onClose">) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const canUseFavorites = favoriteCategories.length >= MIN_FAVORITE_CATEGORIES;
    // const autumnUnlocked = unlockedThemes.includes("autumn");
    // const oceanUnlocked = unlockedThemes.includes("ocean");

    return (
        <>
            {/* Theme toggle -- disabled for the time being, revisit later.
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
                    <ToggleButton value="autumn" id="settings-theme-autumn" disabled={!autumnUnlocked}>
                        {autumnUnlocked ? <ParkOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} /> : <LockOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />}
                        Autumn
                    </ToggleButton>
                    <ToggleButton value="ocean" id="settings-theme-ocean" disabled={!oceanUnlocked}>
                        {oceanUnlocked ? <WavesOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} /> : <LockOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />}
                        Ocean
                    </ToggleButton>
                </ToggleButtonGroup>
                {(!autumnUnlocked || !oceanUnlocked) && (
                    <Typography variant="caption" sx={{ display: "block", mt: 1, color: "var(--color-on-surface-variant)" }}>
                        Locked themes unlock from the Seed Store.
                    </Typography>
                )}
            </div>
            */}

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
                    <ToggleButton value="easy"        id="settings-diff-easy">Easy</ToggleButton>
                    <ToggleButton value="standard"    id="settings-diff-standard">Standard</ToggleButton>
                    <ToggleButton value="challenging" id="settings-diff-challenging">Challenging</ToggleButton>
                </ToggleButtonGroup>
            </div>

            {/* My Categories */}
            <div className="ws-settings-section">
                <div className="ws-settings-section__label">My Categories</div>
                <FormControlLabel
                    control={
                        <Switch
                            checked={useFavorites && canUseFavorites}
                            disabled={!canUseFavorites}
                            onChange={(_, checked) => onUseFavoritesChange(checked)}
                            size="small"
                        />
                    }
                    label={
                        <Typography variant="body2" sx={{ fontFamily: "var(--font-body)" }}>
                            Use only my favorite categories
                        </Typography>
                    }
                />
                <Typography variant="caption" sx={{ display: "block", mb: 1, color: "var(--color-on-surface-variant)" }}>
                    {favoriteCategories.length} selected
                    {!canUseFavorites && ` -- pick at least ${MIN_FAVORITE_CATEGORIES} to enable`}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setPickerOpen(true)} fullWidth>
                    Choose Categories
                </Button>
                <CategoryPickerDialog
                    open={pickerOpen}
                    onClose={() => setPickerOpen(false)}
                    selected={favoriteCategories}
                    onChange={onFavoriteCategoriesChange}
                />
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

// ── Main component — fullScreen dialog on mobile, modal on desktop ───────────
export default function SettingsDialog(props: SettingsProps) {
    const { open, onClose } = props;
    const isMobile = useMediaQuery("(max-width: 767px)");

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={isMobile}
            maxWidth="xs"
            fullWidth
            sx={{
                "& .MuiDialog-paper": {
                    borderRadius: isMobile ? 0 : "1.25rem",
                    background: "var(--glass-bg)",
                    backdropFilter: "var(--glass-blur, blur(12px))",
                    border: isMobile ? "none" : "1px solid var(--glass-border)",
                    boxShadow: "var(--glass-shadow)",
                    color: "var(--color-on-surface)",
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontFamily: "var(--font-headline)",
                    fontWeight: 700,
                    fontSize: "1.25rem",
                    pb: 1,
                }}
            >
                ⚙️ Settings
                <IconButton onClick={onClose} size="small" id="settings-close-btn" sx={{ color: "var(--color-on-surface)" }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3 } }}>
                <SettingsContent {...props} />
            </DialogContent>
        </Dialog>
    );
}
