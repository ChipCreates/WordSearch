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
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={typeof window !== "undefined" && window.innerWidth < 640}
            sx={{
                "& .MuiDialog-paper": {
                    m: { xs: 0, sm: 2 },
                    maxHeight: { xs: "100%", sm: "90vh" },
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
                🏆 Achievements
                <IconButton onClick={onClose} size="small" id="achievements-close-btn">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        gap: 1.5,
                    }}
                >
                    {ACHIEVEMENTS.map(achievement => {
                        const unlocked = unlockedAchievements.has(achievement.id);
                        return (
                            <div
                                key={achievement.id}
                                className={`ws-achievement-card${
                                    unlocked ? " ws-achievement-card--unlocked" : " ws-achievement-card--locked"
                                }`}
                            >
                                {unlocked && (
                                    <span className="ws-achievement-card__leaf" aria-hidden="true">
                                        🍃
                                    </span>
                                )}
                                <Typography
                                    className="ws-achievement-card__icon"
                                    sx={{ fontSize: "2rem", lineHeight: 1, flexShrink: 0 }}
                                >
                                    {unlocked ? achievement.icon : "🔒"}
                                </Typography>
                                <Box>
                                    <div className="ws-achievement-card__name">
                                        {achievement.name}
                                    </div>
                                    <div className="ws-achievement-card__desc">
                                        {achievement.description}
                                    </div>
                                </Box>
                            </div>
                        );
                    })}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
