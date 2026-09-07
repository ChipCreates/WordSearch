import { useEffect, useRef, useState } from "react";
import { ThemeProvider, CssBaseline, Snackbar, Alert } from "@mui/material";

import { sproutLightTheme, sproutDarkTheme, sproutAutumnTheme, sproutOceanTheme } from "./theme";
import { useWordSearchGame } from "./hooks/useWordSearchGame";
import { useAudio } from "./hooks/useAudio";
import { CATEGORY_THEMES, DEFAULT_THEME, assetUrl } from "./categoryThemes";
import { CATEGORY_NAMES } from "./backend";
import { CELEBRATE_FADE_DELAY_MS } from "./constants";
import { findWordPlacement } from "./gameMechanics";

import GameCanvas from "./components/GameCanvas";
import SuccessScreen from "./components/SuccessScreen";
import AchievementBanner from "./components/AchievementBanner";
import SettingsDialog from "./components/SettingsDialog";
import AboutDialog from "./components/AboutDialog";
import LevelsView from "./components/LevelsView";
import GreenhouseFloorplanPanel from "./components/GreenhouseFloorplanPanel";
import SeedStoreDialog from "./components/SeedStoreDialog";
import AchievementsView from "./components/AchievementsView";
import GardenView from "./components/GardenView";
import EcoLeaf from "./components/icons/EcoLeaf";
import NavigationArt from "./components/NavigationArt";
import {
    SpaOutlined,
    AutoFixHighOutlined,
    ShuffleOutlined,
    RefreshOutlined,
    VolumeOffOutlined,
    VolumeUpOutlined,
    MusicOffOutlined,
    MusicNoteOutlined,
    CheckCircleOutlined,
    LockOutlined,
} from "@mui/icons-material";

const THEME_STORAGE_KEY = "wordsearch.themeMode";

type ThemeMode = "sprout" | "midnight" | "autumn" | "ocean";
type ActiveTab = "play" | "levels" | "garden" | "achievements" | "settings";

export default function App() {
    const {
        level, seeds, levelComplete, category,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, revealAndSolveWord, nextLevel, restart, goToLevel, reshuffle, retryLevel, spendSeeds, addSeeds,
        unlockedAchievements, justUnlocked, dismissJustUnlocked,
        difficultyMode, setDifficultyMode,
        favoriteCategories, setFavoriteCategories, useFavorites, setUseFavorites,
        categoriesSeen, foundDiagonal, bonusWordsFound,
        ownedPlants, wateredTimestamps, growthByPlant,
        buyPlantSeed, updateWateredTimestamp, updatePlantGrowth,
        doubleSeedsActive, activateDoubleSeeds,
        unlockedThemes, unlockTheme,
        hasGoldenCrest, unlockGoldenCrest,
    } = useWordSearchGame();

    const {
        musicMuted, toggleMusicMuted, musicVolume, setMusicVolume,
        sfxMuted, toggleSfxMuted, sfxVolume, setSfxVolume,
        playSfx, playCelebration,
    } = useAudio();

    // ── Theme mode (Sprout / Midnight, plus store-unlockable Autumn / Ocean) ──
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return stored === "sprout" || stored === "autumn" || stored === "ocean" ? stored : "midnight";
    });

    const [activeTab, setActiveTab] = useState<ActiveTab>("play");

    const handleThemeModeChange = (mode: ThemeMode) => {
        setThemeMode(mode);
        localStorage.setItem(THEME_STORAGE_KEY, mode);
        document.documentElement.setAttribute("data-theme", mode === "sprout" ? "" : mode);
    };

    const THEME_META_COLOR: Record<ThemeMode, string> = {
        sprout: "#fefae8",
        midnight: "#131313",
        autumn: "#fdf1e3",
        ocean: "#071a22",
    };

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", themeMode === "sprout" ? "" : themeMode);
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute("content", THEME_META_COLOR[themeMode]);
        }
    }, [themeMode]);

    // ── Dialog & Celebration states ────────────────────────────────────────────
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [seedStoreOpen, setSeedStoreOpen] = useState(false);
    // Shared toast, replacing alert() across the Garden and Seed Store --
    // one Snackbar mounted here, fed by a callback threaded down the same
    // way spendSeeds/addSeeds already are.
    const [toast, setToast] = useState<string | null>(null);
    const showToast = (message: string) => setToast(message);
    const [hintCell, setHintCell] = useState<{ r: number; c: number } | null>(null);
    const [compassDirection, setCompassDirection] = useState<{ dr: number; dc: number } | null>(null);
    const [spectrometerCells, setSpectrometerCells] = useState<{ r: number; c: number }[]>([]);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

    const compassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const spectrometerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // A word being found (foundLines changing) or a fresh puzzle both make
    // any active hint/compass/spectrometer stale -- clear all three together.
    useEffect(() => {
        setHintCell(null);
        setCompassDirection(null);
        setSpectrometerCells([]);
    }, [gridData, level, foundLines]);

    useEffect(() => {
        return () => {
            if (compassTimerRef.current) clearTimeout(compassTimerRef.current);
            if (spectrometerTimerRef.current) clearTimeout(spectrometerTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (levelComplete) {
            // Wait for collapse, the dot-to-dot light trail, and the final glow.
            const timer = setTimeout(() => {
                setShowSuccessOverlay(true);
            }, CELEBRATE_FADE_DELAY_MS);
            return () => clearTimeout(timer);
        } else {
            setShowSuccessOverlay(false);
        }
    }, [levelComplete]);

    // Free sidebar hint + 50-seed "Single Letter Sprout": points at the
    // word's start cell, player still has to swipe it themselves.
    const handleRevealHint = () => {
        const unfoundWord = wordsToFind.find(w => !foundWords[w]);
        if (!unfoundWord || !gridData.length) return;
        const placement = findWordPlacement(gridData, gridSize, unfoundWord);
        if (placement) setHintCell({ r: placement.r, c: placement.c });
    };

    // 250-seed "Super Root Hint": actually solves the word, via the hook
    // (which owns foundWords/foundLines/level-complete bookkeeping).
    const handleRevealEntireWord = () => {
        const unfoundWord = wordsToFind.find(w => !foundWords[w]);
        if (unfoundWord) revealAndSolveWord(unfoundWord);
    };

    // 350-seed "Bioluminescent Compass": a direction, not a cell -- points
    // toward the nearest unfound word without revealing where exactly it is.
    const handleActivateCompass = () => {
        const unfoundWord = wordsToFind.find(w => !foundWords[w]);
        if (!unfoundWord || !gridData.length) return;
        const placement = findWordPlacement(gridData, gridSize, unfoundWord);
        if (!placement) return;
        const center = (gridSize - 1) / 2;
        const dr = Math.sign(placement.r - center) || placement.dr;
        const dc = Math.sign(placement.c - center) || placement.dc || 1;
        setCompassDirection({ dr, dc });
        if (compassTimerRef.current) clearTimeout(compassTimerRef.current);
        compassTimerRef.current = setTimeout(() => setCompassDirection(null), 10_000);
    };

    // 500-seed "Flora Spectrometer": every unfound word's start cell glows
    // at once, briefly -- broader but shallower than a single hint.
    const handleActivateSpectrometer = () => {
        if (!gridData.length) return;
        const cells = wordsToFind
            .filter(w => !foundWords[w])
            .map(w => findWordPlacement(gridData, gridSize, w))
            .filter((p): p is NonNullable<typeof p> => p !== null)
            .map(p => ({ r: p.r, c: p.c }));
        setSpectrometerCells(cells);
        if (spectrometerTimerRef.current) clearTimeout(spectrometerTimerRef.current);
        spectrometerTimerRef.current = setTimeout(() => setSpectrometerCells([]), 8_000);
    };

    // ── SFX edge-detection ────────────────────────────────────────────────────
    const prevSeedsRef = useRef(seeds);
    useEffect(() => {
        if (seeds > prevSeedsRef.current) playSfx("award");
        prevSeedsRef.current = seeds;
    }, [seeds, playSfx]);

    useEffect(() => {
        if (levelComplete) return playCelebration();
    }, [levelComplete, playCelebration]);

    const prevJustUnlockedLengthRef = useRef(justUnlocked.length);
    useEffect(() => {
        if (justUnlocked.length > prevJustUnlockedLengthRef.current) playSfx("achievement");
        prevJustUnlockedLengthRef.current = justUnlocked.length;
    }, [justUnlocked, playSfx]);

    // ── Derived values ────────────────────────────────────────────────────────
    const bgTheme = CATEGORY_THEMES[category] ?? DEFAULT_THEME;
    const currentToast = justUnlocked[0];
    const foundCount = wordsToFind.filter(w => foundWords[w]).length;
    const muiTheme = themeMode === "midnight" ? sproutDarkTheme
        : themeMode === "autumn" ? sproutAutumnTheme
        : themeMode === "ocean" ? sproutOceanTheme
        : sproutLightTheme;

    const buildBackground = () => {
        const bgField = themeMode === "midnight" && (bgTheme as any).backgroundDark ? (bgTheme as any).backgroundDark : (bgTheme as any).background;
        const raw: string = bgField ?? "";
        return raw || "var(--color-surface)";
    };

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />

            <div
                style={{
                    minHeight: "100vh",
                    background: buildBackground(),
                    backgroundSize: (bgTheme as { backgroundSize?: string }).backgroundSize ?? "cover",
                    backgroundPosition: (bgTheme as { backgroundPosition?: string }).backgroundPosition ?? "center",
                    backgroundRepeat: (bgTheme as { backgroundRepeat?: string }).backgroundRepeat ?? "no-repeat",
                    backgroundAttachment: "fixed",
                    transition: "background-image 0.4s ease",
                }}
            >
                {activeTab === "play" && <div className="ws-playing-backdrop" aria-hidden="true"><picture>
                    <source media="(orientation: landscape)" srcSet={assetUrl("backgrounds/playing-landscape.webp")} />
                    <img src={assetUrl("backgrounds/playing-portrait.webp")} alt="" />
                </picture></div>}
                {/* ── Top Navigation Header (TopNavBar) ────────────────────────── */}
                <header className="ws-top-nav">
                    <div className="ws-top-nav__inner">
                        <div className="ws-top-nav__brand" onClick={() => setActiveTab("play")}>
                            <EcoLeaf style={{ fontSize: 58, color: "var(--color-primary)" }} />
                            <span className="ws-top-nav__logo-text">Word Sprout</span>
                        </div>

                        {/* Primary View Destinations */}
                        <nav className="ws-top-nav__menu">
                            <button
                                className={`ws-top-nav__link ${activeTab === "play" ? "ws-top-nav__link--active" : ""}`}
                                onClick={() => { playSfx("click"); setActiveTab("play"); }}
                            >
                                <NavigationArt name="play" />
                                Play
                            </button>
                            <button
                                className={`ws-top-nav__link ${activeTab === "levels" ? "ws-top-nav__link--active" : ""}`}
                                onClick={() => { playSfx("click"); setActiveTab("levels"); }}
                            >
                                <NavigationArt name="levels" />
                                Levels
                            </button>
                            <button
                                className={`ws-top-nav__link ${activeTab === "garden" ? "ws-top-nav__link--active" : ""}`}
                                onClick={() => { playSfx("click"); setActiveTab("garden"); }}
                            >
                                <NavigationArt name="garden" />
                                Garden
                            </button>
                            <button
                                className={`ws-top-nav__link ${activeTab === "achievements" ? "ws-top-nav__link--active" : ""}`}
                                onClick={() => { playSfx("click"); setActiveTab("achievements"); }}
                            >
                                <NavigationArt name="trophies" />
                                Trophies
                            </button>
                        </nav>

                        {/* Global Actions & Status Header */}
                        <div className="ws-top-nav__actions">
                            <div
                                className="ws-top-nav__stat-pill"
                                onClick={() => { playSfx("click"); setSeedStoreOpen(true); }}
                                title="Click to open Seed Redemption Store"
                                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 9999, background: "rgba(0, 228, 121, 0.12)", border: "1px solid rgba(0, 228, 121, 0.3)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                            >
                                <img src={assetUrl("seed.png")} alt="Seed" style={{ width: 26, height: 26, objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 0 6px rgba(0,228,121,0.5))" }} />
                                <span style={{ fontFamily: "var(--font-headline)", fontWeight: 800, color: "var(--color-primary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                                    {seeds} <span className="ws-seeds-label">SEEDS</span>
                                </span>
                            </div>

                            {/* Theme Switcher Quick Toggle */}
                            <button
                                className="ws-top-nav__icon-btn"
                                onClick={() => {
                                    playSfx("click");
                                    handleThemeModeChange(themeMode === "sprout" ? "midnight" : "sprout");
                                }}
                                aria-label="Toggle Theme Mode"
                                title={`Switch to ${themeMode === "sprout" ? "Midnight Dark" : "Sprout Light"} Theme`}
                            >
                                <NavigationArt name="theme" />
                            </button>

                            {/* Settings Quick Toggle */}
                            <button
                                className="ws-top-nav__icon-btn ws-desktop-only"
                                onClick={() => { playSfx("click"); setSettingsOpen(true); }}
                                aria-label="Settings"
                                title="Settings"
                            >
                                <NavigationArt name="settings" />
                            </button>

                            {/* Help & About Quick Toggle */}
                            <button
                                className="ws-top-nav__icon-btn"
                                onClick={() => { playSfx("click"); setAboutOpen(true); }}
                                aria-label="About & How to Play"
                                title="About & How to Play"
                            >
                                <NavigationArt name="help" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* ── Side Navigation Sidebar (SideNavBar - Desktop XL) ─────────── */}
                <aside className="ws-side-nav">
                    {/* User profile section */}
                    <div className="ws-side-nav__profile">
                        <div className="ws-side-nav__avatar-box">
                            <EcoLeaf style={{ fontSize: 28, color: "var(--color-primary)" }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                Sprout Master
                                {hasGoldenCrest && (
                                    <span title="Golden Sprout Crest" style={{ fontSize: "0.9rem", filter: "drop-shadow(0 0 6px rgba(244, 201, 93, 0.8))" }}>🏆</span>
                                )}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)" }}>Level {level} Botanist</div>
                        </div>
                    </div>

                    {/* Biome Category Quick Selector */}
                    <div className="glass-panel" style={{ padding: 14, borderRadius: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--color-on-surface-variant)" }}>
                            Active Biome Category
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                            <SpaOutlined style={{ fontSize: 20, color: "var(--color-secondary)" }} />
                            {category || "Botanical"}
                        </div>
                        <button
                            className="ws-control-btn"
                            onClick={() => { playSfx("click"); setActiveTab("levels"); }}
                            style={{ width: "100%", justifyContent: "center", marginTop: 4, padding: "6px 12px", fontSize: "0.8rem" }}
                        >
                            <NavigationArt name="levels" />
                            Level Map & Categories
                        </button>
                    </div>

                    {/* Tactical Toolkit or Greenhouse Floorplan */}
                    {activeTab === "play" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                            <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--color-on-surface-variant)", paddingLeft: 4 }}>
                                Tactical Toolkit
                            </div>
                            {levelComplete ? (
                                <button
                                    className="ws-primary-action-btn"
                                    onClick={() => { playSfx("click"); nextLevel(); }}
                                    style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: "0.95rem" }}
                                >
                                    <EcoLeaf />
                                    <span>Next Level 🌱</span>
                                </button>
                            ) : (
                                <button
                                    className="ws-primary-action-btn"
                                    onClick={() => { playSfx("click"); handleRevealHint(); }}
                                    style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: "0.95rem" }}
                                >
                                    <AutoFixHighOutlined />
                                    <span>Reveal Root</span>
                                </button>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <button className="ws-control-btn" onClick={() => { playSfx("click"); reshuffle(); }} style={{ justifyContent: "center", padding: "8px 10px", fontSize: "0.8rem" }}>
                                    <ShuffleOutlined style={{ fontSize: 16 }} />
                                    <span>Shuffle</span>
                                </button>
                                <button className="ws-control-btn" onClick={() => { playSfx("click"); retryLevel(); }} style={{ justifyContent: "center", padding: "8px 10px", fontSize: "0.8rem" }}>
                                    <RefreshOutlined style={{ fontSize: 16 }} />
                                    <span>Restart</span>
                                </button>
                            </div>
                        </div>
                    ) : activeTab === "levels" ? (
                        <GreenhouseFloorplanPanel level={level} ownedPlants={ownedPlants} growthByPlant={growthByPlant} />
                    ) : null}

                    {/* Bottom Quick Audio & Info Dock */}
                    <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--color-on-surface-variant)", fontWeight: 600 }}>Audio Controls</span>
                            <div style={{ display: "flex", gap: 6 }}>
                                <button
                                    onClick={toggleSfxMuted}
                                    title={sfxMuted ? "Unmute SFX" : "Mute SFX"}
                                    style={{
                                        background: sfxMuted ? "rgba(255, 100, 100, 0.2)" : "rgba(0, 228, 121, 0.15)",
                                        border: "1px solid var(--glass-border)",
                                        color: sfxMuted ? "#ff6b6b" : "var(--color-primary)",
                                        borderRadius: "50%",
                                        width: 32,
                                        height: 32,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer"
                                    }}
                                >
                                    {sfxMuted ? <VolumeOffOutlined style={{ fontSize: 18 }} /> : <VolumeUpOutlined style={{ fontSize: 18 }} />}
                                </button>
                                <button
                                    onClick={toggleMusicMuted}
                                    title={musicMuted ? "Unmute Music" : "Mute Music"}
                                    style={{
                                        background: musicMuted ? "rgba(255, 100, 100, 0.2)" : "rgba(0, 228, 121, 0.15)",
                                        border: "1px solid var(--glass-border)",
                                        color: musicMuted ? "#ff6b6b" : "var(--color-primary)",
                                        borderRadius: "50%",
                                        width: 32,
                                        height: 32,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer"
                                    }}
                                >
                                    {musicMuted ? <MusicOffOutlined style={{ fontSize: 18 }} /> : <MusicNoteOutlined style={{ fontSize: 18 }} />}
                                </button>
                            </div>
                        </div>
                        <button
                            className="ws-about-art-btn"
                            onClick={() => setAboutOpen(true)}
                            style={{ background: "none", border: "none", color: "var(--color-on-surface-variant)", fontSize: "0.8rem", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px" }}
                        >
                            <NavigationArt name="help" /> About & How to Play
                        </button>
                    </div>
                </aside>

                {/* ── Main Content Container ───────────────────────────────────── */}
                <main className={`ws-main-layout${activeTab === "levels" ? " ws-main-layout--levels" : ""}`}>
                    {activeTab === "levels" ? (
                        <LevelsView
                            currentLevel={level}
                            onSelectLevel={(lvl) => {
                                goToLevel(lvl);
                                setActiveTab("play");
                            }}
                        />
                    ) : activeTab === "achievements" ? (
                        <AchievementsView
                            unlockedAchievements={unlockedAchievements}
                            stats={{
                                levelsCompleted: level - 1,
                                seeds,
                                categoriesSeen: categoriesSeen.size,
                                foundDiagonal,
                                totalCategories: CATEGORY_NAMES.length,
                                bonusWordsFound,
                            }}
                        />
                    ) : activeTab === "garden" ? (
                        <GardenView
                            seeds={seeds}
                            ownedPlants={ownedPlants}
                            wateredTimestamps={wateredTimestamps}
                            growthByPlant={growthByPlant}
                            onOpenStore={() => setSeedStoreOpen(true)}
                            addSeeds={addSeeds}
                            spendSeeds={spendSeeds}
                            updateWateredTimestamp={updateWateredTimestamp}
                            updatePlantGrowth={updatePlantGrowth}
                            showToast={showToast}
                        />
                    ) : (
                        <>
                            {/* Mobile Compact Header Bar (shown on mobile screens < 768px) */}
                            <div className="ws-mobile-header-bar">
                                <div className="ws-mobile-header-bar__left">
                                    <span className="ws-mobile-header-bar__level">Lvl {level}</span>
                                    <span className="ws-mobile-header-bar__cat">{category || "Botanical"}</span>
                                </div>
                                <div className="ws-mobile-header-bar__right">
                                    <span className="ws-mobile-header-bar__progress">{foundCount}/{wordsToFind.length}</span>
                                </div>
                            </div>

                            {/* Level Goal Header Toolbar */}
                            <div className="glass-panel ws-level-goal-card">
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                                        <div>
                                            <h2 className="glow-text-emerald" style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)" }}>
                                                Level Goal
                                            </h2>
                                            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-on-surface-variant)" }}>
                                                Find all {wordsToFind.length} target words
                                            </p>
                                        </div>
                                        <span style={{ fontFamily: "var(--font-headline)", fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)" }}>
                                            {foundCount}/{wordsToFind.length}
                                        </span>
                                    </div>
                                    <div style={{ height: 14, width: "100%", background: "var(--color-surface-container-high)", borderRadius: 7, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
                                        <div className="bioluminescent-line" style={{ height: "100%", width: `${Math.min(100, (foundCount / (wordsToFind.length || 1)) * 100)}%`, borderRadius: 7, transition: "width 0.4s ease" }} />
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: 20, alignItems: "center", borderLeft: "1px solid var(--glass-border)", paddingLeft: 20 }}>
                                    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <img src={assetUrl("seed.png")} alt="Seed" style={{ width: 34, height: 34, objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(0,228,121,0.6))" }} />
                                            <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-secondary)" }}>{seeds}</span>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.05em" }}>SEEDS</div>
                                    </div>
                                    <div style={{ width: 1, height: 36, background: "var(--glass-border)" }} />
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-primary)" }}>#{level}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.05em" }}>LEVEL</div>
                                    </div>
                                </div>
                            </div>

                            {/* Gameplay Grid & Found Words Side Panel */}
                            <div className="ws-gameplay-grid">
                                {/* Left: Canvas Word Grid Panel */}
                                <div className="glass-panel ws-game-board-panel" style={{ flexDirection: "column" }}>
                                    <GameCanvas
                                        gridSize={gridSize}
                                        gridData={gridData}
                                        foundLines={foundLines}
                                        hintCell={hintCell}
                                        spectrometerCells={spectrometerCells}
                                        compassDirection={compassDirection}
                                        onSelectionEnd={submitSelection}
                                        onSwipe={() => playSfx("swipe")}
                                        celebrate={levelComplete}
                                    />
                                </div>

                                {/* Mobile Tactical Toolbar */}
                                <div className="ws-mobile-tactical-bar">
                                    <button className="ws-mobile-tool-btn" onClick={() => { playSfx("click"); handleRevealHint(); }}>
                                        <AutoFixHighOutlined style={{ fontSize: 16 }} /> Hint
                                    </button>
                                    <button className="ws-mobile-tool-btn" onClick={() => { playSfx("click"); reshuffle(); }}>
                                        <ShuffleOutlined style={{ fontSize: 16 }} /> Shuffle
                                    </button>
                                    <button className="ws-mobile-tool-btn" onClick={() => { playSfx("click"); retryLevel(); }}>
                                        <RefreshOutlined style={{ fontSize: 16 }} /> Restart
                                    </button>
                                </div>

                                {/* Right: Found Words List Panel */}
                                <div className="glass-panel ws-found-words-panel">
                                    <div className="ws-found-words-header">
                                        <h3 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.25rem", fontWeight: 700, color: "var(--color-primary)" }}>
                                            Found Words
                                        </h3>
                                        <span style={{ padding: "4px 12px", borderRadius: 4, background: "rgba(236, 177, 255, 0.2)", color: "var(--color-secondary)", border: "1px solid rgba(236, 177, 255, 0.3)", fontSize: "0.85rem", fontWeight: 600 }}>
                                            {foundCount} / {wordsToFind.length}
                                        </span>
                                    </div>

                                    <div className="ws-found-words-list">
                                        {wordsToFind.map(word => {
                                            const isFound = foundWords[word];
                                            return (
                                                <div
                                                    key={word}
                                                    className={`ws-found-word-card ${isFound ? "ws-found-word-card--found" : "ws-found-word-card--pending"}`}
                                                >
                                                    <span className="ws-found-word-card__word">{word.toUpperCase()}</span>
                                                    {isFound ? (
                                                        <CheckCircleOutlined className="ws-found-word-card__icon ws-found-word-card__icon--found" style={{ fontSize: 20 }} />
                                                    ) : (
                                                        <LockOutlined className="ws-found-word-card__icon ws-found-word-card__icon--pending" style={{ fontSize: 20 }} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Footer ───────────────────────────────────────────────── */}
                    <footer className="ws-footer">
                        <p>© {new Date().getFullYear()} Word Sprout Studio. v{typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.1.0"}</p>
                    </footer>
                </main>

                {/* ── Mobile Bottom Navigation Bar (BottomNavBar) ────────────────── */}
                <nav className="ws-bottom-nav">
                    <button
                        className={`ws-bottom-nav__item ${activeTab === "play" ? "ws-bottom-nav__item--active" : ""}`}
                        onClick={() => { playSfx("click"); setActiveTab("play"); }}
                    >
                        <NavigationArt name="play" />
                        <span>Play</span>
                    </button>

                    <button
                        className={`ws-bottom-nav__item ${activeTab === "levels" ? "ws-bottom-nav__item--active" : ""}`}
                        onClick={() => { playSfx("click"); setActiveTab("levels"); }}
                    >
                        <NavigationArt name="levels" />
                        <span>Levels</span>
                    </button>

                    <button
                        className={`ws-bottom-nav__item ${activeTab === "garden" ? "ws-bottom-nav__item--active" : ""}`}
                        onClick={() => { playSfx("click"); setActiveTab("garden"); }}
                    >
                        <NavigationArt name="garden" />
                        <span>Garden</span>
                    </button>

                    <button
                        className={`ws-bottom-nav__item ${activeTab === "achievements" ? "ws-bottom-nav__item--active" : ""}`}
                        onClick={() => { playSfx("click"); setActiveTab("achievements"); }}
                    >
                        <NavigationArt name="trophies" />
                        <span>Trophies</span>
                    </button>

                    <button
                        className="ws-bottom-nav__item"
                        onClick={() => { playSfx("click"); setSettingsOpen(true); }}
                    >
                        <NavigationArt name="settings" />
                        <span>Settings</span>
                    </button>
                </nav>

                {/* ── Success Overlay ────────────────────────────────────────────── */}
                {showSuccessOverlay && (
                    <SuccessScreen
                        category={category}
                        level={level}
                        seeds={seeds}
                        onNextLevel={() => { playSfx("click"); nextLevel(); }}
                        onRestart={() => { playSfx("click"); restart(); }}
                    />
                )}
            </div>

            {/* ── Dialogs ───────────────────────────────────────────────────── */}
            <SettingsDialog
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                difficultyMode={difficultyMode}
                onDifficultyModeChange={setDifficultyMode}
                favoriteCategories={favoriteCategories}
                onFavoriteCategoriesChange={setFavoriteCategories}
                useFavorites={useFavorites}
                onUseFavoritesChange={setUseFavorites}
                musicMuted={musicMuted}
                onToggleMusicMuted={toggleMusicMuted}
                musicVolume={musicVolume}
                onMusicVolumeChange={setMusicVolume}
                sfxMuted={sfxMuted}
                onToggleSfxMuted={toggleSfxMuted}
                sfxVolume={sfxVolume}
                onSfxVolumeChange={setSfxVolume}
                themeMode={themeMode}
                onThemeModeChange={handleThemeModeChange}
                unlockedThemes={unlockedThemes}
            />

            <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

            <SeedStoreDialog
                open={seedStoreOpen}
                onClose={() => setSeedStoreOpen(false)}
                seeds={seeds}
                ownedPlants={ownedPlants}
                onBuyPlantSeed={buyPlantSeed}
                onRedeemHint={handleRevealHint}
                onRedeemEntireWord={handleRevealEntireWord}
                onRedeemReshuffle={reshuffle}
                onSpendSeeds={spendSeeds}
                onRedeemCompass={handleActivateCompass}
                onRedeemSpectrometer={handleActivateSpectrometer}
                onRedeemNitrogenBooster={activateDoubleSeeds}
                doubleSeedsActive={doubleSeedsActive}
                unlockedThemes={unlockedThemes}
                onUnlockTheme={unlockTheme}
                hasGoldenCrest={hasGoldenCrest}
                onUnlockGoldenCrest={unlockGoldenCrest}
                showToast={showToast}
            />

            <AchievementBanner achievement={currentToast ?? null} onDismiss={dismissJustUnlocked} />

            <Snackbar
                open={!!toast}
                autoHideDuration={3200}
                onClose={() => setToast(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert onClose={() => setToast(null)} severity="info" variant="filled" sx={{ fontFamily: "var(--font-body)" }}>
                    {toast}
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
}
