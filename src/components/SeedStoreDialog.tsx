import {
    Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
    Button, Card, CardContent, useMediaQuery, Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import PaletteIcon from "@mui/icons-material/Palette";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

type Props = {
    open: boolean;
    onClose: () => void;
    seeds: number;
    onRedeemHint?: () => void;
    onSpendSeeds?: (cost: number) => boolean;
};

export default function SeedStoreDialog({ open, onClose, seeds, onRedeemHint, onSpendSeeds }: Props) {
    const isMobile = useMediaQuery("(max-width: 767px)");

    const handleRedeem = (cost: number, onSuccess: () => void) => {
        if (onSpendSeeds) {
            const success = onSpendSeeds(cost);
            if (success) {
                onSuccess();
            } else {
                alert("Not enough seeds harvested yet! Keep finding words to earn seeds. 🌱");
            }
        } else {
            onSuccess();
        }
    };

    const storeItems = [
        {
            id: "hint-bundle",
            title: "Super Root Hint",
            description: "Instant reveal of a hidden target word",
            cost: 100,
            icon: <AutoFixHighIcon sx={{ fontSize: 32, color: "#00e479" }} />,
            action: () => {
                handleRedeem(100, () => {
                    if (onRedeemHint) onRedeemHint();
                    onClose();
                });
            },
        },
        {
            id: "garden-fertilizer",
            title: "Botanical Fertilizer",
            description: "Boost your garden plant growth and star multiplier",
            cost: 300,
            icon: <LocalFloristIcon sx={{ fontSize: 32, color: "#f4c95d" }} />,
            action: () => {
                handleRedeem(300, () => {
                    alert("Botanical Fertilizer redeemed! Your garden plants are blooming 🌺");
                });
            },
        },
        {
            id: "bioluminescent-theme",
            title: "Bioluminescent Aura",
            description: "Unlock glowing neon emerald board traces",
            cost: 500,
            icon: <PaletteIcon sx={{ fontSize: 32, color: "#00f0ff" }} />,
            action: () => {
                handleRedeem(500, () => {
                    alert("Bioluminescent Aura activated! ✨");
                });
            },
        },
        {
            id: "sprout-trophy",
            title: "Golden Sprout Crest",
            description: "Exclusive Sprout Master profile badge",
            cost: 1000,
            icon: <EmojiEventsIcon sx={{ fontSize: 32, color: "#ecb1ff" }} />,
            action: () => {
                handleRedeem(1000, () => {
                    alert("Golden Sprout Crest equipped to your profile 🏆");
                });
            },
        },
    ];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={isMobile}
            maxWidth="sm"
            fullWidth
            sx={{
                "& .MuiDialog-paper": {
                    borderRadius: isMobile ? 0 : "1.25rem",
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
                    <img src="/seed.png" alt="Seed" style={{ width: 24, height: 24, objectFit: "contain" }} />
                    Seed Redemption Store
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: "var(--color-on-surface)" }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
                {/* Seed balance banner */}
                <Box
                    sx={{
                        p: 2,
                        mb: 2.5,
                        borderRadius: "1rem",
                        background: "rgba(0, 228, 121, 0.1)",
                        border: "1px solid rgba(0, 228, 121, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "var(--color-on-surface-variant)" }}>
                        Available Harvest Balance
                    </Typography>
                    <Chip
                        icon={<img src="/seed.png" alt="Seed" style={{ width: 16, height: 16 }} />}
                        label={`${seeds} SEEDS`}
                        sx={{
                            fontFamily: "var(--font-headline)",
                            fontWeight: 800,
                            color: "var(--color-primary)",
                            backgroundColor: "rgba(0, 228, 121, 0.2)",
                            border: "1px solid var(--color-primary)",
                        }}
                    />
                </Box>

                {/* Store Items Grid */}
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                    {storeItems.map(item => {
                        const canAfford = seeds >= item.cost;
                        return (
                            <Box key={item.id}>
                                <Card
                                    sx={{
                                        borderRadius: "1rem",
                                        background: "rgba(255, 255, 255, 0.04)",
                                        border: "1px solid var(--glass-border)",
                                        boxShadow: "none",
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                                            {item.icon}
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: "var(--font-headline)" }}>
                                                    {item.title}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: "var(--color-on-surface-variant)", display: "block" }}>
                                                    {item.description}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 800, color: "var(--color-secondary)" }}>
                                                🌱 {item.cost} Seeds
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                disabled={!canAfford}
                                                onClick={item.action}
                                                sx={{
                                                    borderRadius: "9999px",
                                                    fontWeight: 700,
                                                    fontFamily: "var(--font-headline)",
                                                    textTransform: "none",
                                                    backgroundColor: "var(--color-primary)",
                                                    color: "var(--color-on-primary)",
                                                }}
                                            >
                                                Redeem
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>
                        );
                    })}
                </Box>
            </DialogContent>
        </Dialog>
    );
}
