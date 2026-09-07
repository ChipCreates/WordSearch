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
import PlayerProfileSheet from "./components/PlayerProfileSheet";
import ContextSidebar from "./components/sidebar/ContextSidebar";
import ResponsiveContextStrip from "./components/sidebar/ResponsiveContextStrip";
import MobilePowerupDrawer from "./components/sidebar/MobilePowerupDrawer";
import DestinationSkeleton from "./components/DestinationSkeleton";
const SettingsDialog = lazy(() => import("./components/SettingsDialog"));
const AboutDialog = lazy(() => import("./components/AboutDialog"));
const LevelsView = lazy(() => import("./components/LevelsView"));
const SeedStoreDialog = lazy(() => import("./components/SeedStoreDialog"));
const AchievementsView = lazy(() => import("./components/AchievementsView"));
const GardenView = lazy(() => import("./components/GardenView"));
import OnboardingCoachmark from "./components/OnboardingCoachmark";
import { nextOnboardingStep } from "./onboarding";
import EcoLeaf from "./components/icons/EcoLeaf";
import NavigationArt from "./components/NavigationArt";
import { getBotanistRank } from "./botanistRanks";
import { ACHIEVEMENTS } from "./achievements";
import {
    CheckCircleOutlined,
    LockOutlined,
    CheckRounded,
} from "@mui/icons-material";

const THEME_STORAGE_KEY = "wordsearch.themeMode";

type ThemeMode = "sprout" | "midnight" | "autumn" | "ocean";
type ActiveTab = "play" | "levels" | "garden" | "achievements" | "settings";

export default function App() {
    const {
        level, highestUnlockedLevel, seeds, status, levelComplete, category, levelsCompleted,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, nextLevel, restart, goToLevel, reshuffle, retryLevel, spendSeeds, addSeeds,
        unlockedAchievements, justUnlocked, dismissJustUnlocked, promotionQueue, dismissPromotion,
        difficultyMode, setDifficultyMode,
        favoriteCategories, setFavoriteCategories, useFavorites, setUseFavorites,
        categoriesSeen, foundDiagonal, bonusWordsFound, bonusWordsThisLevel, bonusSeedsThisLevel, bonusDiscovery,
        fieldNotes, claimFieldNote,
        levelsCompletedWithoutHint, maxBonusWordsInLevel, reverseWordsFound, plantsBloomed, bloomedRarityTiers, uniqueCategoriesCompleted, powerupsUsed,
        onboardingSeen, dismissOnboardingStep, replayOnboarding,
        ownedPlants, wateredTimestamps, growthByPlant,
        buyPlantSeed, updateWateredTimestamp, updatePlantGrowth, recordPlantBloom, waterAllReady,
        doubleSeedsActive,
        unlockedThemes, unlockTheme,
        hasGoldenCrest, unlockGoldenCrest,
        powerupInventory, freeHintUsesRemaining, purchasePowerupCharge, claimHintUse,
        activateSuperRoot, activateCompass, activateSpectrometer, activateDoubleSeeds,
        spectrometerCells, compassDirection,
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
    const [fieldKitOpen, setFieldKitOpen] = useState(false);
    const fieldKitButtonRef = useRef<HTMLButtonElement>(null);
    const onboardingStep = nextOnboardingStep(levelsCompleted, onboardingSeen);
    const botanistRank = getBotanistRank(highestUnlockedLevel);
    const avatarColumnPositions = ["0%", "24.8%", "49.5%", "74.3%", "99%"];
    const getAvatarBackgroundPosition = (avatarIndex: number) => `${avatarColumnPositions[avatarIndex % 5]} ${Math.floor(avatarIndex / 5) * 100}%`;
    const avatarBackgroundPosition = getAvatarBackgroundPosition(botanistRank.avatarIndex);

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
    const [profileOpen, setProfileOpen] = useState(false);
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
                            <button
                                className="ws-mobile-brand-avatar ws-botanist-avatar"
                                style={{ "--avatar-position": avatarBackgroundPosition } as CSSProperties}
                                onClick={(event) => { event.stopPropagation(); playSfx("click"); setProfileOpen(true); }}
                                aria-label="Open player information"
                                title="Player information"
                            />
                            <EcoLeaf className="ws-desktop-brand-leaf" style={{ fontSize: 58, color: "var(--color-primary)" }} />
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

                {/* ── Context-sensitive sidebar ──────────────────────────────── */}
                <ContextSidebar
                    activeTab={activeTab}
                    highestUnlockedLevel={highestUnlockedLevel}
                    playingLevel={level}
                    levelComplete={levelComplete}
                    hasGoldenCrest={hasGoldenCrest}
                    avatarBackgroundPosition={avatarBackgroundPosition}
                    profileRankTitle={botanistRank.title}
                    onOpenProfile={() => { playSfx("click"); setProfileOpen(true); }}
                    onNextLevel={() => { playSfx("click"); nextLevel(); }}
                    onRevealHint={() => { playSfx("click"); handleRevealHint(); }}
                    onShuffle={() => { playSfx("click"); reshuffle(); }}
                    onRetry={() => { playSfx("click"); retryLevel(); }}
                    onSuperRoot={() => { playSfx("click"); activateSuperRoot(); }}
                    onCompass={() => { playSfx("click"); activateCompass(); }}
                    onSpectrometer={() => { playSfx("click"); activateSpectrometer(); }}
                    onDoubleSeeds={() => { playSfx("click"); activateDoubleSeeds(); }}
                    hintAvailable={hintAvailable}
                    freeHintUsesRemaining={freeHintUsesRemaining}
                    powerupInventory={powerupInventory}
                    doubleSeedsActive={doubleSeedsActive}
                    sfxMuted={sfxMuted}
                    musicMuted={musicMuted}
                    onToggleSfx={toggleSfxMuted}
                    onToggleMusic={toggleMusicMuted}
                    onHelp={() => setAboutOpen(true)}
                    ownedPlants={ownedPlants}
                    wateredTimestamps={wateredTimestamps}
                    growthByPlant={growthByPlant}
                    onWaterAllReady={() => {
                        const result = waterAllReady();
                        if (result.watered) showToast(`💧 Watered ${result.watered} plants${result.bloomed ? ` · ${result.bloomed} bloomed · +${result.seeds} Seeds` : ""}.`);
                    }}
                    achievementStats={{ levelsCompleted, seeds, categoriesSeen: categoriesSeen.size, foundDiagonal, totalCategories: CATEGORY_NAMES.length, bonusWordsFound, levelsCompletedWithoutHint, maxBonusWordsInLevel, reverseWordsFound, plantsBloomed, bloomedRarityTiers, uniqueCategoriesCompleted, powerupsUsed }}
                    unlockedAchievements={unlockedAchievements}
                    fieldNotes={fieldNotes}
                    onCollectFieldNote={claimFieldNote}
                />

                {/* ── Main Content Container ───────────────────────────────────── */}
                <main className={`ws-main-layout${activeTab === "levels" ? " ws-main-layout--levels" : ""}`}>
                    <ResponsiveContextStrip
                        activeTab={activeTab}
                        highestUnlockedLevel={highestUnlockedLevel}
                        playingLevel={level}
                        ownedPlants={ownedPlants}
                        wateredTimestamps={wateredTimestamps}
                        growthByPlant={growthByPlant}
                        onWaterAllReady={() => {
                            const result = waterAllReady();
                            if (result.watered) showToast(`💧 Watered ${result.watered} plants${result.bloomed ? ` · ${result.bloomed} bloomed · +${result.seeds} Seeds` : ""}.`);
                        }}
                        achievementStats={{ levelsCompleted, seeds, categoriesSeen: categoriesSeen.size, foundDiagonal, totalCategories: CATEGORY_NAMES.length, bonusWordsFound, levelsCompletedWithoutHint, maxBonusWordsInLevel, reverseWordsFound, plantsBloomed, bloomedRarityTiers, uniqueCategoriesCompleted, powerupsUsed }}
                        unlockedAchievements={unlockedAchievements}
                        fieldNotes={fieldNotes}
                        onCollectFieldNote={claimFieldNote}
                    />
                    {activeTab === "levels" ? (
                        <Suspense fallback={<DestinationSkeleton destination="levels" />}>
                            <LevelsView
                            currentLevel={level}
                            onSelectLevel={(lvl) => {
                                goToLevel(lvl);
                                setActiveTab("play");
                            }}
                            />
                        </Suspense>
                    ) : activeTab === "achievements" ? (
                        <Suspense fallback={<DestinationSkeleton destination="achievements" />}>
                            <AchievementsView
                            unlockedAchievements={unlockedAchievements}
                            stats={{
                                levelsCompleted,
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
                        </Suspense>
                    ) : activeTab === "garden" ? (
                        <Suspense fallback={<DestinationSkeleton destination="garden" />}>
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
                        </Suspense>
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
                                {levelComplete ? (
                                    <div className="ws-level-goal-card__complete-layout">
                                        <div className="ws-level-goal-card__complete-left">
                                            <div className="ws-level-goal-card__cat-title">
                                                <EcoLeaf className="ws-level-goal-card__leaf-icon" />
                                                <h2 className="ws-level-goal-card__level glow-text-emerald">{category || "Botanical"}</h2>
                                            </div>
                                            <div className="ws-level-goal-card__goal-detail">
                                                <div className="ws-level-goal-card__goal-badge" aria-hidden="true">
                                                    <EcoLeaf className="ws-level-goal-card__goal-badge-icon" />
                                                </div>
                                                <div className="ws-level-goal-card__goal-copy-block">
                                                    <span className="ws-level-goal-card__goal-label">Level Goal</span>
                                                    <div className="ws-level-goal-card__goal-desc">
                                                        Harvest {wordsToFind.length} words hidden in the {category ? (category.toLowerCase().includes("grove") ? "grove" : category.toLowerCase()) : "grove"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ws-level-goal-card__celebration" role="status">
                                            <div className="ws-level-goal-card__complete-check" aria-hidden="true">
                                                <CheckRounded className="ws-level-goal-card__check-icon" />
                                            </div>
                                            <div className="ws-level-goal-card__celebration-text">
                                                <div className="ws-level-goal-card__complete-heading">
                                                    <span>GOAL COMPLETE!</span>
                                                    <svg className="ws-level-goal-card__sprig" viewBox="0 0 32 32" width="26" height="26" fill="currentColor" aria-hidden="true">
                                                        <path d="M6 26 C12 22 18 16 26 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                                                        <path d="M26 6 C24 3 21 4 21 6 C21 8 24 8 26 6 Z" fill="currentColor" />
                                                        <path d="M21 11 C18 9 15 10 16 12 C17 14 20 13 21 11 Z" fill="currentColor" />
                                                        <path d="M23 13 C25 11 27 12 26 14 C25 16 23 15 23 13 Z" fill="currentColor" />
                                                        <path d="M16 16 C13 15 11 17 12 19 C13 20 16 19 16 16 Z" fill="currentColor" />
                                                        <path d="M18 18 C20 16 22 18 21 20 C20 21 18 20 18 18 Z" fill="currentColor" />
                                                        <path d="M12 21 C9 21 8 23 9 24 C11 25 13 23 12 21 Z" fill="currentColor" />
                                                    </svg>
                                                </div>
                                                <div className="ws-level-goal-card__complete-sub">
                                                    All words found. Well done, Botanist!
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="ws-level-goal-card__main">
                                        <div className="ws-level-goal-card__heading-row">
                                            <h2 className="ws-level-goal-card__level glow-text-emerald">{category || "Botanical"}</h2>
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
                                )}
                            </div>

                            {/* Gameplay Grid & Found Words Side Panel */}
                            <div className="ws-gameplay-grid">
                                {/* Left: Canvas Word Grid Panel */}
                                <div className={`glass-panel ws-game-board-panel${gridSize <= 4 ? " ws-game-board-panel--compact" : ""}`} style={{ flexDirection: "column" }}>
                                    <GameCanvas
                                        gridSize={gridSize}
                                        gridData={gridData}
                                        foundLines={foundLines}
                                        hintCell={hintCell}
                                        spectrometerCells={spectrometerCells}
                                        compassDirection={compassDirection}
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

                                <MobilePowerupDrawer
                                    open={fieldKitOpen}
                                    onClose={() => setFieldKitOpen(false)}
                                    returnFocusRef={fieldKitButtonRef}
                                    hintAvailable={hintAvailable}
                                    freeHintUsesRemaining={freeHintUsesRemaining}
                                    powerupInventory={powerupInventory}
                                    doubleSeedsActive={doubleSeedsActive}
                                    onRevealHint={() => { playSfx("click"); handleRevealHint(); }}
                                    onShuffle={() => { playSfx("click"); reshuffle(); }}
                                    onRetry={() => { playSfx("click"); retryLevel(); }}
                                    onSuperRoot={() => { playSfx("click"); activateSuperRoot(); }}
                                    onCompass={() => { playSfx("click"); activateCompass(); }}
                                    onSpectrometer={() => { playSfx("click"); activateSpectrometer(); }}
                                    onDoubleSeeds={() => { playSfx("click"); activateDoubleSeeds(); }}
                                    fieldNotes={fieldNotes}
                                    onCollectFieldNote={claimFieldNote}
                                />

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

                <PlayerProfileSheet
                    open={profileOpen}
                    onClose={() => setProfileOpen(false)}
                    onOpenAchievements={() => { setProfileOpen(false); setActiveTab("achievements"); }}
                    onOpenSettings={() => { setProfileOpen(false); setSettingsOpen(true); }}
                    botanistTitle={botanistRank.title}
                    level={highestUnlockedLevel}
                    seeds={seeds}
                    levelsCompleted={levelsCompleted}
                    categoriesSeen={categoriesSeen.size}
                    bonusWordsFound={bonusWordsFound}
                    plantsBloomed={plantsBloomed}
                    achievementsUnlocked={unlockedAchievements.size}
                    achievementsTotal={ACHIEVEMENTS.length}
                    avatarBackgroundPosition={avatarBackgroundPosition}
                    hasGoldenCrest={hasGoldenCrest}
                    levelsCompletedWithoutHint={levelsCompletedWithoutHint}
                    reverseWordsFound={reverseWordsFound}
                    maxBonusWordsInLevel={maxBonusWordsInLevel}
                    powerupsUsed={powerupsUsed}
                    fieldNotes={fieldNotes}
                    onCollectFieldNote={claimFieldNote}
                />

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
                        ref={fieldKitButtonRef}
                        className={`ws-bottom-nav__item ${fieldKitOpen ? "ws-bottom-nav__item--active" : ""}`}
                        aria-expanded={fieldKitOpen}
                        aria-controls="mobile-field-kit"
                        onClick={() => { playSfx("click"); setFieldKitOpen(open => !open); }}
                    >
                        <NavigationArt name="field-kit" />
                        <span>Field Kit</span>
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
                        promotion={promotionQueue[0]}
                        promotionAvatarBackgroundPosition={promotionQueue[0] ? getAvatarBackgroundPosition(promotionQueue[0].to.avatarIndex) : "0% 0%"}
                        onDismissPromotion={dismissPromotion}
                        onNextLevel={() => { playSfx("click"); nextLevel(); }}
                        onRestart={() => { playSfx("click"); restart(); }}
                    />
                )}
            </div>

            {/* ── Dialogs ───────────────────────────────────────────────────── */}
            {settingsOpen && (
                <Suspense fallback={<div className="ws-lazy-dialog-fallback"><DestinationSkeleton destination="settings" /></div>}>
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
                </Suspense>
            )}

            {aboutOpen && (
                <Suspense fallback={<div className="ws-lazy-dialog-fallback"><DestinationSkeleton destination="about" /></div>}>
                    <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} onReplayOnboarding={replayOnboarding} />
                </Suspense>
            )}

            {seedStoreOpen && (
                <Suspense fallback={<div className="ws-lazy-dialog-fallback"><DestinationSkeleton destination="store" /></div>}>
                    <SeedStoreDialog
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
                    />
                </Suspense>
            )}

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
    );
}
