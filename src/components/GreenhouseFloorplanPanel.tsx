import { Box, Typography } from "@mui/material";
import StarRateRoundedIcon from "@mui/icons-material/StarRateRounded";
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded";
import { PLANTS_CATALOG } from "../plantsCatalog";

type Props = {
    level: number;
    ownedPlants: string[];
    growthByPlant: Record<string, number>;
};

export default function GreenhouseFloorplanPanel({ level, ownedPlants, growthByPlant }: Props) {
    const bloomedCount = ownedPlants.filter(id => (growthByPlant[id] ?? 0) >= 100).length;
    const restorationPct = ownedPlants.length > 0 ? Math.round((bloomedCount / ownedPlants.length) * 100) : 0;

    return (
        <Box className="glass-panel" sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            borderRadius: "1rem",
            mt: 3,
        }}>
            <Typography sx={{ color: "var(--color-primary)", fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: "1.1rem", mb: 2, lineHeight: 1.2 }}>
                Greenhouse Floorplan
            </Typography>

            <Typography sx={{ color: "var(--color-outline)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: 1, mb: 0.5, mt: 1 }}>CURRENT PROGRESS</Typography>
            <Typography sx={{ color: "var(--color-on-surface)", fontSize: "1rem", fontWeight: 600, mb: 3 }}>Level {level}</Typography>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography sx={{ color: "var(--color-on-surface-variant)", fontSize: "0.75rem", fontWeight: 700, letterSpacing: 0.5 }}>Bloom Progress</Typography>
                <Typography sx={{ color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: 800 }}>{restorationPct}%</Typography>
            </Box>
            <Box sx={{ width: "100%", height: 6, background: "var(--color-surface-container)", borderRadius: 3, mb: 3, overflow: "hidden" }}>
                <Box sx={{ width: `${restorationPct}%`, height: "100%", background: "var(--color-primary)", borderRadius: 3, boxShadow: `0 0 8px var(--color-primary)` }} />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ flex: 1, background: "var(--color-surface-container)", borderRadius: "0.75rem", p: 1.5, display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid var(--glass-border)" }}>
                    <StarRateRoundedIcon sx={{ color: "var(--color-tertiary)", mb: 0.5 }} />
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-on-surface)" }}>{ownedPlants.length}/{PLANTS_CATALOG.length}</Typography>
                    <Typography sx={{ fontSize: "0.65rem", color: "var(--color-on-surface-variant)" }}>Collected</Typography>
                </Box>
                <Box sx={{ flex: 1, background: "var(--color-surface-container)", borderRadius: "0.75rem", p: 1.5, display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid var(--glass-border)" }}>
                    <LocalFloristRoundedIcon sx={{ color: "var(--color-primary)", mb: 0.5 }} />
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-on-surface)" }}>{bloomedCount}/{ownedPlants.length}</Typography>
                    <Typography sx={{ fontSize: "0.65rem", color: "var(--color-on-surface-variant)" }}>Bloomed</Typography>
                </Box>
            </Box>
        </Box>
    );
}
