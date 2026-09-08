import { useEffect, useRef, useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Button, Chip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ACHIEVEMENTS } from "../achievements";
import { PLANTS_CATALOG } from "../plantsCatalog";
import { BOTANIST_RANKS } from "../botanistRanks";
import { POWERUP_DEFINITIONS, type PowerupId, type PowerupInventory } from "../powerups";
import type { DebugApi } from "../hooks/useWordSearchGame";
import {
    describeCombo, loadScreenshotHotkey, saveScreenshotHotkey,
    comboFromEvent, type HotkeyCombo,
} from "../debug/screenshotMode";

// Anchor string for the CI build-output check (scripts/check-build-budget.mjs)
// that greps dist-web for this file's presence. It must survive minification
// unchanged (string literals aren't renamed) -- do not remove or rename it
// without updating that script.
export const WS_DEBUG_PANEL_MARKER = "ws-debug-panel-root";

const BOARD_SIZES = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const GROWTH_STEPS = [0, 25, 50, 75, 100];
type NavigableTab = "play" | "levels" | "garden" | "achievements";

type Props = {
    onClose: () => void;
    onNavigate: (tab: NavigableTab) => void;
    debugApi: DebugApi;
    unlockedAchievements: Set<string>;
    ownedPlants: string[];
    growthByPlant: Record<string, number>;
    powerupInventory: PowerupInventory;
    unlockedThemes: string[];
    hasGoldenCrest: boolean;
    highestUnlockedLevel: number;
    gridSize: number;
    wordsToFind: string[];
    foundWords: Record<string, string>;
    revealAndSolveWord: (word: string) => boolean;
    reshuffle: () => boolean;
    activateSuperRoot: () => boolean;
    activateCompass: () => boolean;
    activateSpectrometer: () => boolean;
    activateDoubleSeeds: () => boolean;
    staticPreviewActive: boolean;
    onSetStaticPreview: (active: boolean) => void;
};

function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
    return (
        <details open={defaultOpen} style={{ marginBottom: 12, border: "1px solid var(--glass-border, #444)", borderRadius: 8, padding: "6px 10px" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700, fontFamily: "var(--font-headline)", padding: "4px 0" }}>{title}</summary>
            <div style={{ paddingTop: 8 }}>{children}</div>
        </details>
    );
}

export default function DebugPanel(props: Props) {
    const { debugApi } = props;
    const [hotkey, setHotkey] = useState<HotkeyCombo>(() => loadScreenshotHotkey());
    const [rebinding, setRebinding] = useState(false);
    const rebindingRef = useRef(false);
    rebindingRef.current = rebinding;

    useEffect(() => {
        if (!rebinding) return;
        const onKeyDown = (e: KeyboardEvent) => {
            const combo = comboFromEvent(e);
            if (!combo) return;
            e.preventDefault();
            saveScreenshotHotkey(combo);
            setHotkey(combo);
            setRebinding(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [rebinding]);

    const instantlyCompleteLevel = () => {
        props.wordsToFind.filter(w => !props.foundWords[w]).forEach(w => props.revealAndSolveWord(w));
    };

    // Any action that changes what the board shows should also drop out of
    // the frozen static-preview frame -- otherwise it keeps blocking board
    // input (celebrateActive in GameCanvas) on a puzzle nobody actually completed.
    const loadBoardSize = (size: number) => {
        props.onSetStaticPreview(false);
        debugApi.loadGrid(size);
        props.onNavigate("play");
    };

    return (
        <Dialog
            open
            onClose={props.onClose}
            maxWidth="sm"
            fullWidth
            data-testid={WS_DEBUG_PANEL_MARKER}
            sx={{ "& .MuiDialog-paper": { maxHeight: "85vh" } }}
        >
            <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                🐛 Debug Panel
                <IconButton size="small" aria-label="Close debug panel" onClick={props.onClose}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Chip
                    size="small"
                    color="warning"
                    label="Debug mode — autosave is disabled. Your real save is untouched."
                    sx={{ mb: 2, width: "100%", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 1 } }}
                />

                <Section title="Board" defaultOpen>
                    <p style={{ fontSize: 12, opacity: 0.7, marginTop: 0 }}>
                        Loads a real, solvable board at the exact size you pick — this selector only
                        exists here; there's nothing like it in the normal game UI.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {BOARD_SIZES.map(size => (
                            <Button key={size} size="small" variant={props.gridSize === size ? "contained" : "outlined"} onClick={() => loadBoardSize(size)}>
                                {size}×{size}
                            </Button>
                        ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <Button size="small" variant="outlined" onClick={() => { props.onSetStaticPreview(false); instantlyCompleteLevel(); props.onNavigate("play"); }}>
                            Instantly complete level
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => { props.onSetStaticPreview(false); props.reshuffle(); }}>Reshuffle</Button>
                        <Button size="small" variant="outlined" onClick={() => props.onNavigate("play")}>Jump to Play</Button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        <Button
                            size="small"
                            variant={props.staticPreviewActive ? "contained" : "outlined"}
                            onClick={() => {
                                if (props.staticPreviewActive) {
                                    props.onSetStaticPreview(false);
                                } else {
                                    instantlyCompleteLevel();
                                    props.onSetStaticPreview(true);
                                    props.onNavigate("play");
                                }
                            }}
                        >
                            {props.staticPreviewActive ? "Exit static end screen" : "Preview end screen (static)"}
                        </Button>
                    </div>
                    {props.staticPreviewActive && (
                        <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 0 }}>
                            Showing the celebration's fully-formed frame — every word collapsed to a
                            dot, every constellation link drawn — frozen, not animating. The real
                            end-screen popup is suppressed while this is on.
                        </p>
                    )}
                </Section>

                <Section title={`Achievements (${props.unlockedAchievements.size}/${ACHIEVEMENTS.length})`}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <Button size="small" variant="outlined" onClick={() => debugApi.setUnlockedAchievements(ACHIEVEMENTS.map(a => a.id))}>Unlock all</Button>
                        <Button size="small" variant="outlined" onClick={() => debugApi.setUnlockedAchievements([])}>Lock all</Button>
                        <Button size="small" variant="outlined" onClick={() => props.onNavigate("achievements")}>Jump to Trophies</Button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                        {ACHIEVEMENTS.map(a => {
                            const unlocked = props.unlockedAchievements.has(a.id);
                            return (
                                <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        checked={unlocked}
                                        onChange={() => {
                                            const next = new Set(props.unlockedAchievements);
                                            if (unlocked) next.delete(a.id); else next.add(a.id);
                                            debugApi.setUnlockedAchievements(Array.from(next));
                                        }}
                                    />
                                    <span>{a.icon} {a.name}</span>
                                </label>
                            );
                        })}
                    </div>
                </Section>

                <Section title="Botanist rank">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {BOTANIST_RANKS.map(rank => (
                            <Button
                                key={rank.title}
                                size="small"
                                variant={props.highestUnlockedLevel >= rank.minLevel && (rank.maxLevel === null || props.highestUnlockedLevel <= rank.maxLevel) ? "contained" : "outlined"}
                                onClick={() => debugApi.setHighestUnlockedLevel(rank.minLevel)}
                            >
                                {rank.title}
                            </Button>
                        ))}
                        <Button size="small" variant="outlined" onClick={() => debugApi.queuePromotionPreview(props.highestUnlockedLevel)}>Preview promotion ceremony</Button>
                    </div>
                </Section>

                <Section title={`Garden (${props.ownedPlants.length}/${PLANTS_CATALOG.length} plants)`}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <Button size="small" variant="outlined" onClick={() => debugApi.setOwnedPlants(PLANTS_CATALOG.map(p => p.id))}>Own all</Button>
                        <Button size="small" variant="outlined" onClick={() => PLANTS_CATALOG.forEach(p => debugApi.setGrowthByPlant(p.id, 100))}>Bloom all</Button>
                        <Button size="small" variant="outlined" onClick={() => props.onNavigate("garden")}>Jump to Garden</Button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                        {PLANTS_CATALOG.map(plant => {
                            const owned = props.ownedPlants.includes(plant.id);
                            const growth = props.growthByPlant[plant.id] ?? 0;
                            return (
                                <div key={plant.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 170 }}>
                                        <input
                                            type="checkbox"
                                            checked={owned}
                                            onChange={() => debugApi.setOwnedPlants(owned ? props.ownedPlants.filter(id => id !== plant.id) : [...props.ownedPlants, plant.id])}
                                        />
                                        <span>{plant.icon} {plant.name} <em style={{ opacity: 0.6 }}>({plant.tier})</em></span>
                                    </label>
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {GROWTH_STEPS.map(step => (
                                            <Button
                                                key={step}
                                                size="small"
                                                variant={owned && growth === step ? "contained" : "outlined"}
                                                disabled={!owned}
                                                sx={{ minWidth: 36, px: 0.5 }}
                                                onClick={() => debugApi.setGrowthByPlant(plant.id, step)}
                                            >
                                                {step}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Section>

                <Section title="Power-ups">
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(Object.keys(POWERUP_DEFINITIONS) as PowerupId[]).map(id => {
                            const def = POWERUP_DEFINITIONS[id];
                            const count = props.powerupInventory[id];
                            const activate = id === "single-letter-sprout" ? undefined
                                : id === "lumina-cyclone" ? props.reshuffle
                                : id === "super-root" ? props.activateSuperRoot
                                : id === "bioluminescent-compass" ? props.activateCompass
                                : id === "flora-spectrometer" ? props.activateSpectrometer
                                : props.activateDoubleSeeds;
                            return (
                                <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                    <span style={{ minWidth: 190 }}>{def.title}</span>
                                    <Button size="small" variant="outlined" onClick={() => debugApi.setPowerupInventory(id, Math.max(0, count - 1))}>-</Button>
                                    <span style={{ minWidth: 24, textAlign: "center" }}>{count}</span>
                                    <Button size="small" variant="outlined" onClick={() => debugApi.setPowerupInventory(id, count + 1)}>+</Button>
                                    <Button size="small" variant="outlined" onClick={() => debugApi.setPowerupInventory(id, 10)}>Set 10</Button>
                                    {activate && <Button size="small" variant="contained" onClick={() => activate()}>Activate now</Button>}
                                </div>
                            );
                        })}
                        <Button size="small" variant="outlined" onClick={() => (Object.keys(POWERUP_DEFINITIONS) as PowerupId[]).forEach(id => debugApi.setPowerupInventory(id, 10))}>
                            Grant 10 of each
                        </Button>
                    </div>
                </Section>

                <Section title="Cosmetics">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {["autumn", "ocean"].map(themeId => {
                            const unlocked = props.unlockedThemes.includes(themeId);
                            return (
                                <label key={themeId} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                                    <input
                                        type="checkbox"
                                        checked={unlocked}
                                        onChange={() => debugApi.setUnlockedThemes(unlocked ? props.unlockedThemes.filter(id => id !== themeId) : [...props.unlockedThemes, themeId])}
                                    />
                                    {themeId === "autumn" ? "Autumn Canopy theme" : "Ocean Trench theme"}
                                </label>
                            );
                        })}
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <input type="checkbox" checked={props.hasGoldenCrest} onChange={() => debugApi.setHasGoldenCrest(!props.hasGoldenCrest)} />
                            Golden Sprout Crest
                        </label>
                    </div>
                </Section>

                <Section title="Screenshot mode">
                    <p style={{ fontSize: 13, marginTop: 0 }}>
                        Press <strong>{describeCombo(hotkey)}</strong> to hide this panel, its banner, and the
                        floating debug toggle — game state is left exactly as it is. Press it again to bring
                        the debug UI back.
                    </p>
                    <Button size="small" variant="outlined" onClick={() => setRebinding(true)}>
                        {rebinding ? "Press any key combo…" : "Rebind hotkey"}
                    </Button>
                </Section>
            </DialogContent>
        </Dialog>
    );
}
