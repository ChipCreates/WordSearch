import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, ToggleButtonGroup, ToggleButton, Switch, FormControlLabel } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import type { Tier } from "../backend";

type Props = {
    open: boolean;
    onClose: () => void;
    difficultyMode: Tier;
    onDifficultyModeChange: (mode: Tier) => void;
    muted: boolean;
    onToggleMuted: () => void;
};

export default function SettingsDialog({ open, onClose, difficultyMode, onDifficultyModeChange, muted, onToggleMuted }: Props) {
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
                    <FormControlLabel
                        control={<Switch checked={!muted} onChange={onToggleMuted} />}
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
                                <Typography variant="body2">Music & sound effects</Typography>
                            </Box>
                        }
                    />
                </Box>
            </DialogContent>
        </Dialog>
    );
}
