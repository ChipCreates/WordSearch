import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, LinearProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";

type Props = {
    open: boolean;
    stars: number;
    level: number;
    unlockedCount: number;
    onClose: () => void;
};

export default function GardenDialog({ open, stars, level, unlockedCount, onClose }: Props) {
    const plants = [
        { name: "Deep Moss Sprout", icon: "🌱", reqLevel: 1, unlocked: level >= 1 },
        { name: "Emerald Fern", icon: "🌿", reqLevel: 3, unlocked: level >= 3 },
        { name: "Bioluminescent Orchid", icon: "🌸", reqLevel: 5, unlocked: level >= 5 },
        { name: "Midnight Lotus", icon: "🪷", reqLevel: 8, unlocked: level >= 8 },
        { name: "Golden Sunflower", icon: "🌻", reqLevel: 10, unlocked: level >= 10 },
        { name: "Bonsai Bloom", icon: "🪴", reqLevel: 15, unlocked: level >= 15 },
    ];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            sx={{
                "& .MuiDialog-paper": {
                    borderRadius: "1rem",
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocalFloristIcon sx={{ color: "var(--color-primary)" }} />
                    Botanical Garden
                </Box>
                <IconButton onClick={onClose} size="small" id="garden-close-btn" sx={{ color: "var(--color-on-surface)" }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ mb: 3, p: 2, borderRadius: "0.75rem", background: "rgba(0, 228, 121, 0.08)", border: "1px solid rgba(0, 228, 121, 0.2)" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, alignItems: "center" }}>
                        <Typography sx={{ fontWeight: 600, fontFamily: "var(--font-headline)" }}>Garden Vitality</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <img src="/seed.png" alt="Seed" style={{ width: 22, height: 22, objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(0,228,121,0.5))" }} />
                            <Typography sx={{ fontWeight: 700, color: "var(--color-primary)" }}>{stars * 100} SEEDS</Typography>
                        </Box>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (level / 15) * 100)}
                        sx={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: "rgba(255,255,255,0.1)",
                            "& .MuiLinearProgress-bar": {
                                background: "linear-gradient(90deg, #ecb1ff 0%, #00e479 100%)",
                                borderRadius: 5,
                            },
                        }}
                    />
                    <Typography sx={{ fontSize: "0.8rem", color: "var(--color-on-surface-variant)", mt: 1 }}>
                        Harvest words to bloom rare flora in your greenhouse! (Achievements: {unlockedCount})
                    </Typography>
                </Box>

                <Typography sx={{ fontWeight: 700, fontFamily: "var(--font-headline)", mb: 2, fontSize: "1rem" }}>
                    Garden Flora ({plants.filter(p => p.unlocked).length} / {plants.length})
                </Typography>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                    {plants.map((plant, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                p: 2,
                                borderRadius: "0.75rem",
                                border: "1px solid",
                                borderColor: plant.unlocked ? "rgba(0, 228, 121, 0.3)" : "var(--color-outline-variant)",
                                background: plant.unlocked ? "rgba(0, 228, 121, 0.05)" : "transparent",
                                opacity: plant.unlocked ? 1 : 0.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                            }}
                        >
                            <Typography sx={{ fontSize: "2rem" }}>{plant.unlocked ? plant.icon : "🔒"}</Typography>
                            <Box>
                                <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-on-surface)" }}>
                                    {plant.name}
                                </Typography>
                                <Typography sx={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)" }}>
                                    {plant.unlocked ? "Bloomed" : `Unlocks at Lvl ${plant.reqLevel}`}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
