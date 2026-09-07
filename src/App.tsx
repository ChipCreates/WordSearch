import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
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
const SettingsDialog = lazy(() => import("./components/SettingsDialog"));
const AboutDialog = lazy(() => import("./components/AboutDialog"));
const LevelsView = lazy(() => import("./components/LevelsView"));
const GreenhouseFloorplanPanel = lazy(() => import("./components/GreenhouseFloorplanPanel"));
const SeedStoreDialog = lazy(() => import("./components/SeedStoreDialog"));
const AchievementsView = lazy(() => import("./components/AchievementsView"));
const GardenView = lazy(() => import("./components/GardenView"));
import OnboardingCoachmark from "./components/OnboardingCoachmark";
import { nextOnboardingStep } from "./onboarding";
import EcoLeaf from "./components/icons/EcoLeaf";
import NavigationArt from "./components/NavigationArt";
import { getBotanistRank } from "./botanistRanks";
import {
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
        level, seeds, status, levelComplete, category, levelsCompleted,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, nextLevel, restart, goToLevel, reshuffle, retryLevel, spendSeeds, addSeeds,
        unlockedAchievements, justUnlocked, dismissJustUnlocked,
        difficultyMode, setDifficultyMode,
        favoriteCategories, setFavoriteCategories, useFavorites, setUseFavorites,
        categoriesSeen, foundDiagonal, bonusWordsFound, bonusWordsThisLevel, bonusSeedsThisLevel, bonusDiscovery,
        levelsCompletedWithoutHint, maxBonusWordsInLevel, reverseWordsFound, plantsBloomed, bloomedRarityTiers, uniqueCategoriesCompleted, powerupsUsed,
        onboardingSeen, dismissOnboardingStep, replayOnboarding,
        ownedPlants, wateredTimestamps, growthByPlant,
        buyPlantSeed, updateWateredTimestamp, updatePlantGrowth, recordPlantBloom,
        doubleSeedsActive,
        unlockedThemes, unlockTheme,
        hasGoldenCrest, unlockGoldenCrest,
        powerupInventory, freeHintUsesRemaining, purchasePowerupCharge, claimHintUse,
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
    const onboardingStep = nextOnboardingStep(levelsCompleted, onboardingSeen);
    const botanistRank = getBotanistRank(level);
    const avatarColumnPositions = ["0%", "24.8%", "49.5%", "74.3%", "99%"];
    const avatarBackgroundPosition = `${avatarColumnPositions[botanistRank.avatarIndex % 5]} ${Math.floor(botanistRank.avatarIndex / 5) * 100}%`;

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
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);


    // A word being found or a fresh puzzle clears the active hint.
    useEffect(() => {
        setHintCell(null);
    }, [gridData, level, foundLines]);

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

    const hintAvailable = freeHintUsesRemaining > 0 || powerupInventory["single-letter-sprout"] > 0;

    // The first hint each level is free; later hints consume a purchased
    // Single Letter Sprout charge.
    const handleRevealHint = () => {
        const unfoundWord = wordsToFind.find(w => !foundWords[w]);
        if (!unfoundWord || !gridData.length) return;
        const placement = findWordPlacement(gridData, gridSize, unfoundWord);
        if (!placement) return;
        if (!claimHintUse()) {
            showToast("No hint charges available. Buy one in the Seed Store. 🌱");
            return;
        }
        setHintCell({ r: placement.r, c: placement.c });
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
        <Suspense fallback={<div className="ws-loading-screen" role="status">Loading your conservatory…</div>}>
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />

            <div
                style={{
                    minHeight: "100vh",
                    backgroundImage: buildBackground(),
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
                        <div
                            className="ws-side-nav__avatar-box ws-botanist-avatar"
                            style={{ "--avatar-position": avatarBackgroundPosition } as CSSProperties}
                            role="img"
                            aria-label={`${botanistRank.title} avatar`}
                        >
                        </div>
                        <div className="ws-side-nav__profile-copy">
                            <div className="ws-side-nav__rank-title">
                                {botanistRank.title}
                                {hasGoldenCrest && (
                                    <span title="Golden Sprout Crest" style={{ fontSize: "0.9rem", filter: "drop-shadow(0 0 6px rgba(244, 201, 93, 0.8))" }}>🏆</span>
                                )}
                            </div>
                            <div className="ws-side-nav__rank-level">Level {level}</div>
                        </div>
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
                                    disabled={!hintAvailable}
                                    title={!hintAvailable ? "Buy a hint charge in the Seed Store" : undefined}
                                    onClick={() => { playSfx("click"); handleRevealHint(); }}
                                    style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: "0.95rem" }}
                                >
                                    <AutoFixHighOutlined />
                                    <span>Hint · {freeHintUsesRemaining > 0 ? "Free" : `x${powerupInventory["single-letter-sprout"]}`}</span>
                                </button>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                <button className="ws-control-btn" disabled={powerupInventory["lumina-cyclone"] === 0} title={powerupInventory["lumina-cyclone"] === 0 ? "Buy a Shuffle charge in the Seed Store" : "Shuffle the unfound words"} onClick={() => { playSfx("click"); reshuffle(); }} style={{ justifyContent: "center", padding: "8px 10px", fontSize: "0.8rem" }}>
                                    <ShuffleOutlined style={{ fontSize: 16 }} />
                                    <span>Shuffle · x{powerupInventory["lumina-cyclone"]}</span>
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
                                levelsCompletedWithoutHint,
                                maxBonusWordsInLevel,
                                reverseWordsFound,
                                plantsBloomed,
                                bloomedRarityTiers,
                                uniqueCategoriesCompleted,
                                powerupsUsed,
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
                            recordPlantBloom={recordPlantBloom}
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
                            <div className={`glass-panel ws-level-goal-card${levelComplete ? " ws-level-goal-card--complete" : ""}`}>
                                <div className="ws-level-goal-card__main">
                                    <div className="ws-level-goal-card__heading-row">
                                        <h2 className="ws-level-goal-card__level glow-text-emerald">{category || "Botanical"}</h2>
                                        {levelComplete && <span className="ws-level-goal-card__complete-badge" role="status">✓ Goal complete</span>}
                                    </div>
                                    <div className="ws-level-goal-card__goal-row">
                                        <div className="ws-level-goal-card__goal-copy">
                                            <span className="ws-level-goal-card__goal-label">Level Goal</span>
                                            <strong>Find all {wordsToFind.length} target words</strong>
                                        </div>
                                        <span className="ws-level-goal-card__count">{foundCount}/{wordsToFind.length}</span>
                                    </div>
                                    <div className="ws-level-goal-card__progress">
                                        <div className="bioluminescent-line" style={{ width: `${Math.min(100, (foundCount / (wordsToFind.length || 1)) * 100)}%` }} />
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
                                        status={status}
                                        onSelectionEnd={submitSelection}
                                        onSwipe={() => playSfx("swipe")}
                                        celebrate={levelComplete}
                                    />
                                    {bonusDiscovery && (
                                        <div role="status" style={{ margin: "8px 12px 0", padding: "8px 12px", borderRadius: 12, background: "rgba(236, 177, 255, 0.18)", border: "1px solid rgba(236, 177, 255, 0.55)", color: "var(--color-secondary)", fontWeight: 800, textAlign: "center" }}>
                                            ✨ Bonus sprout! {bonusDiscovery.word} +{bonusDiscovery.seeds} Seeds
                                        </div>
                                    )}
                                </div>

                                {/* Mobile Tactical Toolbar */}
                                <div className="ws-mobile-tactical-bar">
                                    <button className="ws-mobile-tool-btn" disabled={!hintAvailable} title={!hintAvailable ? "Buy a hint charge in the Seed Store" : undefined} onClick={() => { playSfx("click"); handleRevealHint(); }}>
                                        <AutoFixHighOutlined style={{ fontSize: 16 }} /> Hint · {freeHintUsesRemaining > 0 ? "Free" : `x${powerupInventory["single-letter-sprout"]}`}
                                    </button>
                                    <button className="ws-mobile-tool-btn" disabled={powerupInventory["lumina-cyclone"] === 0} title={powerupInventory["lumina-cyclone"] === 0 ? "Buy a Shuffle charge in the Seed Store" : undefined} onClick={() => { playSfx("click"); reshuffle(); }}>
                                        <ShuffleOutlined style={{ fontSize: 16 }} /> Shuffle · x{powerupInventory["lumina-cyclone"]}
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
                                    <div aria-label={`${bonusWordsThisLevel.length} bonus words found`} style={{ marginTop: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(236, 177, 255, 0.1)", color: "var(--color-secondary)", fontSize: "0.8rem", fontWeight: 700 }}>
                                        ✨ Bonus sprouts: {bonusWordsThisLevel.length ? bonusWordsThisLevel.join(", ") : "Find extra words for Seeds"}
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
                        bonusWords={bonusWordsThisLevel}
                        bonusSeeds={bonusSeedsThisLevel}
                        onNextLevel={() => { playSfx("click"); nextLevel(); }}
                        onRestart={() => { playSfx("click"); restart(); }}
                    />
                )}
            </div>

            {/* ── Dialogs ───────────────────────────────────────────────────── */}
            {settingsOpen && <SettingsDialog
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
            />}

                {aboutOpen && <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} onReplayOnboarding={replayOnboarding} />}

            {seedStoreOpen && <SeedStoreDialog
                open={seedStoreOpen}
                onClose={() => setSeedStoreOpen(false)}
                seeds={seeds}
                ownedPlants={ownedPlants}
                onBuyPlantSeed={buyPlantSeed}
                onSpendSeeds={spendSeeds}
                doubleSeedsActive={doubleSeedsActive}
                powerupInventory={powerupInventory}
                onPurchasePowerupCharge={purchasePowerupCharge}
                unlockedThemes={unlockedThemes}
                onUnlockTheme={unlockTheme}
                hasGoldenCrest={hasGoldenCrest}
                onUnlockGoldenCrest={unlockGoldenCrest}
                showToast={showToast}
            />}

            <AchievementBanner achievement={currentToast ?? null} onDismiss={dismissJustUnlocked} />

            <OnboardingCoachmark step={onboardingStep} onDismiss={() => onboardingStep && dismissOnboardingStep(onboardingStep.id)} />

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
        </Suspense>
    );
}
