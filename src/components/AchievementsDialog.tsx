import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ACHIEVEMENTS } from "../achievements";

type Props = {
    open: boolean;
    unlockedAchievements: Set<string>;
    onClose: () => void;
};

export default function AchievementsDialog({ open, unlockedAchievements, onClose }: Props) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                Achievements
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    {ACHIEVEMENTS.map(achievement => {
                        const unlocked = unlockedAchievements.has(achievement.id);
                        return (
                            <Box
                                key={achievement.id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    borderRadius: 2,
                                    backgroundColor: unlocked ? 'rgba(187,134,252,0.12)' : 'rgba(255,255,255,0.03)',
                                    border: '1px solid',
                                    borderColor: unlocked ? 'rgba(187,134,252,0.4)' : 'rgba(255,255,255,0.08)',
                                    opacity: unlocked ? 1 : 0.5,
                                }}
                            >
                                <Typography sx={{ fontSize: '1.8rem', lineHeight: 1, filter: unlocked ? 'none' : 'grayscale(1)' }}>
                                    {unlocked ? achievement.icon : '🔒'}
                                </Typography>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                        {achievement.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {achievement.description}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
