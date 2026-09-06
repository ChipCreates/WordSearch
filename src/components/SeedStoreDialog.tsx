import { useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
    Button, Card, CardContent, useMediaQuery, Chip, Tab, Tabs,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PLANTS_CATALOG } from "../plantsCatalog";
import { assetUrl } from "../categoryThemes";

type Props = {
    open: boolean;
    onClose: () => void;
    seeds: number;
    ownedPlants: string[];
    onBuyPlantSeed: (plantId: string, cost: number) => boolean;
    onRedeemHint?: () => void;
    onRedeemEntireWord?: () => void;
    onRedeemReshuffle?: () => void;
    onSpendSeeds?: (cost: number) => boolean;
    onRedeemCompass?: () => void;
    onRedeemSpectrometer?: () => void;
    onRedeemNitrogenBooster?: () => void;
    doubleSeedsActive?: boolean;
    unlockedThemes: string[];
    onUnlockTheme: (themeId: string) => void;
    hasGoldenCrest: boolean;
    onUnlockGoldenCrest: () => void;
    showToast: (message: string) => void;
};

export default function SeedStoreDialog({
    open,
    onClose,
    seeds,
    ownedPlants,
    onBuyPlantSeed,
    onRedeemHint,
    onRedeemEntireWord,
    onRedeemReshuffle,
    onSpendSeeds,
    onRedeemCompass,
    onRedeemSpectrometer,
    onRedeemNitrogenBooster,
    doubleSeedsActive = false,
    unlockedThemes,
    onUnlockTheme,
    hasGoldenCrest,
    onUnlockGoldenCrest,
    showToast,
}: Props) {
    const isMobile = useMediaQuery("(max-width: 767px)");
    const [tabIndex, setTabIndex] = useState(0);

    const handleRedeem = (cost: number, onSuccess: () => void) => {
        if (onSpendSeeds) {
            const success = onSpendSeeds(cost);
            if (success) {
                onSuccess();
            } else {
                showToast("Not enough seeds harvested yet! Keep finding words to earn seeds. 🌱");
            }
        } else {
            onSuccess();
        }
    };

    const autumnUnlocked = unlockedThemes.includes("autumn");
    const oceanUnlocked = unlockedThemes.includes("ocean");

    type StoreItem = {
        id: string;
        title: string;
        description: string;
        cost: number;
        image?: string;
        badge?: string;
        disabled?: boolean;
        ownedLabel?: string;
        owned?: boolean;
        action: () => void;
    };

    const storeItems: StoreItem[] = [
        {
            id: "sprout-radar",
            title: "Single Letter Sprout",
            description: "Highlights the starting letter of a target word",
            cost: 50,
            image: "/powerups/sprout_radar.png",
            action: () => {
                handleRedeem(50, () => {
                    if (onRedeemHint) onRedeemHint();
                    onClose();
                });
            },
        },
        {
            id: "lumina-cyclone",
            title: "Lumina Cyclone",
            description: "Scrambles the board while keeping your progress",
            cost: 100,
            image: "/powerups/lumina_cyclone.png",
            action: () => {
                handleRedeem(100, () => {
                    if (onRedeemReshuffle) onRedeemReshuffle();
                    onClose();
                });
            },
        },
        {
            id: "super-root",
            title: "Super Root Hint",
            description: "Instantly reveals and solves an entire target word",
            cost: 250,
            image: "/powerups/root_tunneler.png",
            action: () => {
                handleRedeem(250, () => {
                    if (onRedeemEntireWord) onRedeemEntireWord();
                    onClose();
                });
            },
        },
        {
            id: "bioluminescent-compass",
            title: "Bioluminescent Compass",
            description: "Shows a directional guide towards the next word",
            cost: 350,
            image: "/powerups/bioluminescent_compass.png",
            action: () => {
                handleRedeem(350, () => {
                    onRedeemCompass?.();
                    onClose();
                    showToast("Compass activated! A guiding light points toward your next word. 🧭");
                });
            },
        },
        {
            id: "flora-spectrometer",
            title: "Flora Spectrometer",
            description: "Temporarily highlights every unfound word's starting cell",
            cost: 500,
            image: "/powerups/flora_spectrometer.png",
            action: () => {
                handleRedeem(500, () => {
                    onRedeemSpectrometer?.();
                    onClose();
                    showToast("Spectrometer active! Every unfound word is glowing. 🔬");
                });
            },
        },
        {
            id: "nitrogen-booster",
            title: "Nitrogen Booster",
            description: "Doubles seed rewards for the rest of this level",
            cost: 600,
            image: "/powerups/nitrogen_booster.png",
            disabled: doubleSeedsActive,
            ownedLabel: doubleSeedsActive ? "Active this level" : undefined,
            action: () => {
                handleRedeem(600, () => {
                    onRedeemNitrogenBooster?.();
                    onClose();
                    showToast("Nitrogen Booster applied! Seed rewards are doubled for this level. 🧪");
                });
            },
        },
        {
            id: "autumn-theme",
            title: "Autumn Canopy Theme",
            description: "Unlock a cozy, amber-colored forest canopy theme",
            cost: 800,
            badge: "🍁",
            owned: autumnUnlocked,
            action: () => {
                handleRedeem(800, () => {
                    onUnlockTheme("autumn");
                    showToast("Autumn Canopy Theme unlocked! Apply it from Settings. 🍂");
                });
            },
        },
        {
            id: "ocean-theme",
            title: "Ocean Trench Theme",
            description: "Unlock a mysterious deep-sea ocean trench theme",
            cost: 800,
            badge: "🌊",
            owned: oceanUnlocked,
            action: () => {
                handleRedeem(800, () => {
                    onUnlockTheme("ocean");
                    showToast("Ocean Trench Theme unlocked! Apply it from Settings. 🐳");
                });
            },
        },
        {
            id: "sprout-badge",
            title: "Golden Sprout Crest",
            description: "Exclusive glowing Sprout Master profile badge",
            cost: 1500,
            badge: "🏆",
            owned: hasGoldenCrest,
            action: () => {
                handleRedeem(1500, () => {
                    onUnlockGoldenCrest();
                    showToast("Golden Sprout Crest unlocked! Equipped to your botanist profile. 🎖️");
                });
            },
        },
    ];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen={isMobile}
            maxWidth="md"
            fullWidth
            sx={{
                "& .MuiDialog-paper": {
                    borderRadius: isMobile ? 0 : "1.25rem",
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(16px)",
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <img src={assetUrl("seed.png")} alt="Seed" style={{ width: 24, height: 24, objectFit: "contain" }} />
                    Botanical & Seed Store
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
                        mb: 2,
                        borderRadius: "1rem",
                        background: "rgba(0, 228, 121, 0.15)",
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
                        icon={<img src={assetUrl("seed.png")} alt="Seed" style={{ width: 16, height: 16 }} />}
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

                {/* Tabs */}
                <Tabs
                    value={tabIndex}
                    onChange={(_, val) => setTabIndex(val)}
                    sx={{
                        mb: 2.5,
                        "& .MuiTab-root": {
                            fontFamily: "var(--font-headline)",
                            fontWeight: 700,
                            textTransform: "none",
                            color: "var(--color-on-surface-variant)",
                            "&.Mui-selected": { color: "var(--color-primary)" },
                        },
                        "& .MuiTabs-indicator": { backgroundColor: "var(--color-primary)" },
                    }}
                >
                    <Tab label="Botanical Seeds (20 Species)" />
                    <Tab label="Power-Ups & Relics" />
                </Tabs>

                {/* Tab 0: Botanical Plant Seeds Catalog */}
                {tabIndex === 0 && (
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                        {PLANTS_CATALOG.map(plant => {
                            const isOwned = ownedPlants.includes(plant.id);
                            const canAfford = seeds >= plant.seedCost;
                            const imagePath = assetUrl(plant.bloomImage.startsWith("/") ? plant.bloomImage.slice(1) : plant.bloomImage);

                            return (
                                <Box key={plant.id}>
                                    <Card
                                        sx={{
                                            borderRadius: "1rem",
                                            background: "rgba(255, 255, 255, 0.04)",
                                            border: `1px solid ${isOwned ? "rgba(0, 228, 121, 0.4)" : "var(--glass-border)"}`,
                                            boxShadow: "none",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                            <Box sx={{ display: "flex", gap: 1.5, mb: 1 }}>
                                                {/* Fully Bloomed Plant Image Preview */}
                                                <Box
                                                    sx={{
                                                        width: 72,
                                                        height: 72,
                                                        borderRadius: "12px",
                                                        background: "radial-gradient(circle at 50% 60%, rgba(0, 228, 121, 0.2) 0%, rgba(0,0,0,0.5) 100%)",
                                                        border: "1px solid rgba(0, 228, 121, 0.3)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        p: 0.5,
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    <img
                                                        src={imagePath}
                                                        alt={plant.name}
                                                        style={{
                                                            maxHeight: "100%",
                                                            maxWidth: "100%",
                                                            objectFit: "contain",
                                                            filter: "drop-shadow(0 0 8px rgba(0,228,121,0.5))",
                                                        }}
                                                    />
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: "var(--font-headline)" }}>
                                                            {plant.name}
                                                        </Typography>
                                                        <Chip
                                                            label={plant.tier}
                                                            size="small"
                                                            sx={{
                                                                fontSize: "0.65rem",
                                                                height: 20,
                                                                fontWeight: 800,
                                                                background: "rgba(0, 228, 121, 0.15)",
                                                                color: "var(--color-primary)",
                                                                border: "1px solid rgba(0,228,121,0.3)",
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography variant="caption" sx={{ fontStyle: "italic", color: "var(--color-primary)", display: "block", mb: 0.5 }}>
                                                        {plant.species}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: "var(--color-on-surface-variant)", display: "block", lineHeight: 1.3 }}>
                                                        {plant.description}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2 }}>
                                                <Box>
                                                    <Typography variant="body2" sx={{ fontWeight: 800, color: "var(--color-primary)" }}>
                                                        🌱 {plant.seedCost} Seeds
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: "var(--color-on-surface-variant)", fontSize: "0.7rem" }}>
                                                        Bloom Bounty: +{plant.bloomBounty} Seeds
                                                    </Typography>
                                                </Box>

                                                {isOwned ? (
                                                    <Chip
                                                        label="IN CONSERVATORY 🌱"
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 800,
                                                            fontFamily: "var(--font-headline)",
                                                            background: "rgba(0, 228, 121, 0.2)",
                                                            color: "var(--color-primary)",
                                                            border: "1px solid var(--color-primary)",
                                                        }}
                                                    />
                                                ) : (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        disabled={!canAfford}
                                                        onClick={() => {
                                                            const success = onBuyPlantSeed(plant.id, plant.seedCost);
                                                            if (success) {
                                                                showToast(`🎉 Plant Seed Acquired! ${plant.name} is now planted in your Conservatory!`);
                                                            } else {
                                                                showToast("Not enough seeds to purchase this plant seed!");
                                                            }
                                                        }}
                                                        sx={{
                                                            borderRadius: "9999px",
                                                            fontWeight: 700,
                                                            fontFamily: "var(--font-headline)",
                                                            textTransform: "none",
                                                            backgroundColor: "var(--color-primary)",
                                                            color: "var(--color-on-primary)",
                                                        }}
                                                    >
                                                        Buy Seed
                                                    </Button>
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {/* Tab 1: Power-Ups Grid */}
                {tabIndex === 1 && (
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
                                                {item.image ? (
                                                    <img src={assetUrl(item.image.startsWith("/") ? item.image.slice(1) : item.image)} alt={item.title} style={{ width: 56, height: 56, borderRadius: "8px", objectFit: "cover", border: "1px solid rgba(0, 228, 121, 0.2)" }} />
                                                ) : (
                                                    <Box sx={{ width: 56, height: 56, borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                                                        {item.badge}
                                                    </Box>
                                                )}
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: "var(--font-headline)" }}>
                                                        {item.title}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: "var(--color-on-surface-variant)", display: "block" }}>
                                                        {item.description}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 800, color: "var(--color-primary)" }}>
                                                    🌱 {item.cost} Seeds
                                                </Typography>
                                                {item.owned ? (
                                                    <Chip
                                                        label="UNLOCKED 🌱"
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 800,
                                                            fontFamily: "var(--font-headline)",
                                                            background: "rgba(0, 228, 121, 0.2)",
                                                            color: "var(--color-primary)",
                                                            border: "1px solid var(--color-primary)",
                                                        }}
                                                    />
                                                ) : (
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        disabled={!canAfford || item.disabled}
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
                                                        {item.ownedLabel ?? "Redeem"}
                                                    </Button>
                                                )}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
