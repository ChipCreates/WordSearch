import { useMemo, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Box, Typography,
    Button, Checkbox, FormControlLabel, useMediaQuery, TextField, InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { ALL_CATEGORIES, type Tier } from "../backend";
import { MIN_FAVORITE_CATEGORIES } from "../gameMechanics";

type Props = {
    open: boolean;
    onClose: () => void;
    selected: string[];
    onChange: (names: string[]) => void;
};

const TIER_LABELS: Record<Tier, string> = {
    easy: "Easy",
    standard: "Standard",
    challenging: "Challenging",
};

export default function CategoryPickerDialog({ open, onClose, selected, onChange }: Props) {
    const isMobile = useMediaQuery("(max-width: 767px)");
    const [search, setSearch] = useState("");
    const selectedSet = useMemo(() => new Set(selected), [selected]);

    const grouped = useMemo(() => {
        const q = search.trim().toLowerCase();
        const byTier: Record<Tier, { name: string }[]> = { easy: [], standard: [], challenging: [] };
        for (const c of ALL_CATEGORIES) {
            if (q && !c.name.toLowerCase().includes(q)) continue;
            byTier[c.tier].push(c);
        }
        return byTier;
    }, [search]);

    const toggle = (name: string) => {
        if (selectedSet.has(name)) {
            onChange(selected.filter(n => n !== name));
        } else {
            onChange([...selected, name]);
        }
    };

    const selectAll = () => {
        const visible = (["easy", "standard", "challenging"] as Tier[]).flatMap(t => grouped[t].map(c => c.name));
        onChange([...new Set([...selected, ...visible])]);
    };

    const clearAll = () => onChange([]);

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
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(16px)",
                    border: isMobile ? "none" : "1px solid var(--glass-border)",
                    boxShadow: "var(--glass-shadow)",
                    color: "var(--color-on-surface)",
                    height: isMobile ? undefined : "80vh",
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: "1.15rem", pb: 1,
                }}
            >
                🌿 Choose Categories
                <IconButton onClick={onClose} size="small" sx={{ color: "var(--color-on-surface)" }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 2 }}>
                <Typography variant="caption" sx={{ display: "block", mb: 1.5, color: "var(--color-on-surface-variant)" }}>
                    Pick at least {MIN_FAVORITE_CATEGORIES} categories, then turn on "Use only my favorites" back in Settings.
                    Selecting more keeps things feeling fresh for longer.
                </Typography>

                <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Search categories..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        slotProps={{ input: { startAdornment: (
                            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                        ) } }}
                    />
                    <Button size="small" onClick={selectAll} sx={{ whiteSpace: "nowrap" }}>Select all</Button>
                    <Button size="small" onClick={clearAll} sx={{ whiteSpace: "nowrap" }}>Clear</Button>
                </Box>

                {(["easy", "standard", "challenging"] as Tier[]).map(tier => (
                    grouped[tier].length > 0 && (
                        <Box key={tier} sx={{ mb: 2 }}>
                            <Typography
                                variant="overline"
                                sx={{ display: "block", color: "var(--color-primary)", fontWeight: 700, letterSpacing: "0.08em" }}
                            >
                                {TIER_LABELS[tier]} ({grouped[tier].length})
                            </Typography>
                            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 1 }}>
                                {grouped[tier].map(c => (
                                    <FormControlLabel
                                        key={c.name}
                                        control={
                                            <Checkbox
                                                size="small"
                                                checked={selectedSet.has(c.name)}
                                                onChange={() => toggle(c.name)}
                                            />
                                        }
                                        label={<Typography variant="body2">{c.name}</Typography>}
                                        sx={{ ml: 0 }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )
                ))}
            </DialogContent>

            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selected.length} selected
                    {selected.length < MIN_FAVORITE_CATEGORIES && ` (${MIN_FAVORITE_CATEGORIES} minimum to enable)`}
                </Typography>
                <Button variant="contained" onClick={onClose}>Done</Button>
            </DialogActions>
        </Dialog>
    );
}
