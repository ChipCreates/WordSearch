import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, ToggleButtonGroup, ToggleButton, Switch, FormControlLabel, Slider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import type { Tier } from "../backend";

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
};

function SoundRow({
    label, muted, onToggleMuted, volume, onVolumeChange,
}: {
    label: string;
    muted: boolean;
    onToggleMuted: () => void;
    volume: number;
    onVolumeChange: (volume: number) => void;
}) {
    return (
        <Box sx={{ mb: 2 }}>
            <FormControlLabel
                control={<Switch checked={!muted} onChange={onToggleMuted} />}
                label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
                        <Typography variant="body2">{label}</Typography>
                    </Box>
                }
            />
            <Slider
                value={Math.round(volume * 100)}
                onChange={(_, value) => onVolumeChange((value as number) / 100)}
                disabled={muted}
                valueLabelDisplay="auto"
                valueLabelFormat={v => `${v}%`}
                size="small"
                sx={{ ml: 1, width: 'calc(100% - 16px)' }}
            />
        </Box>
    );
}

export default function SettingsDialog({
    open, onClose, difficultyMode, onDifficultyModeChange,
    musicMuted, onToggleMusicMuted, musicVolume, onMusicVolumeChange,
    sfxMuted, onToggleSfxMuted, sfxVolume, onSfxVolumeChange,
}: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Settings
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Difficulty
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        Switching takes effect on the puzzle you're currently playing.
                    </Typography>
                    <ToggleButtonGroup
                        value={difficultyMode}
                        exclusive
                        fullWidth
                        onChange={(_, value: Tier | null) => value && onDifficultyModeChange(value)}
                    >
                        <ToggleButton value="standard">Standard</ToggleButton>
                        <ToggleButton value="challenging">Challenging</ToggleButton>
                    </ToggleButtonGroup>
                </Box>
                <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Sound
                    </Typography>
                    <SoundRow
                        label="Music"
                        muted={musicMuted}
                        onToggleMuted={onToggleMusicMuted}
                        volume={musicVolume}
                        onVolumeChange={onMusicVolumeChange}
                    />
                    <SoundRow
                        label="Sound effects"
                        muted={sfxMuted}
                        onToggleMuted={onToggleSfxMuted}
                        volume={sfxVolume}
                        onVolumeChange={onSfxVolumeChange}
                    />
                </Box>
            </DialogContent>
        </Dialog>
    );
}
