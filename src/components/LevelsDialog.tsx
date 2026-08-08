import { Dialog, DialogTitle, DialogContent, IconButton, Box, Button, useMediaQuery } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockIcon from "@mui/icons-material/Lock";

type Props = {
    open: boolean;
    currentLevel: number;
    onClose: () => void;
    onSelectLevel: (lvl: number) => void;
};

export default function LevelsDialog({ open, currentLevel, onClose, onSelectLevel }: Props) {
    const totalLevels = 20;
    const levels = Array.from({ length: totalLevels }, (_, i) => i + 1);
    const isMobile = useMediaQuery("(max-width: 767px)");

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={isMobile}
            maxWidth="sm"
            fullWidth
            sx={{
                "& .MuiDialog-paper": {
                    borderRadius: isMobile ? 0 : "1rem",
                    background: "var(--color-surface-container)",
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
                🌿 Select Level
                <IconButton onClick={onClose} size="small" id="levels-close-btn" sx={{ color: "var(--color-on-surface)" }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 2,
                    }}
                >
                    {levels.map(lvl => {
                        const isCurrent = lvl === currentLevel;
                        const isUnlocked = lvl <= currentLevel;
                        return (
                            <Button
                                key={lvl}
                                variant={isCurrent ? "contained" : "outlined"}
                                disabled={!isUnlocked}
                                onClick={() => {
                                    onSelectLevel(lvl);
                                    onClose();
                                }}
                                sx={{
                                    height: 64,
                                    borderRadius: "1rem",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "1.1rem",
                                    fontFamily: "var(--font-headline)",
                                    position: "relative",
                                    backgroundColor: isCurrent ? "var(--color-primary)" : "transparent",
                                    borderColor: isUnlocked ? "var(--color-primary)" : "var(--color-outline-variant)",
                                    color: isCurrent ? "var(--color-on-primary)" : "var(--color-primary)",
                                    "&:hover": {
                                        backgroundColor: isCurrent ? "var(--color-primary)" : "rgba(0, 228, 121, 0.1)",
                                    },
                                }}
                            >
                                Level {lvl}
                                {lvl < currentLevel && (
                                    <CheckCircleIcon sx={{ fontSize: 14, color: "var(--color-secondary)", mt: 0.5 }} />
                                )}
                                {!isUnlocked && (
                                    <LockIcon sx={{ fontSize: 14, opacity: 0.5, mt: 0.5 }} />
                                )}
                            </Button>
                        );
                    })}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
