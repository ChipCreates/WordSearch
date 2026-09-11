import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { ThemeProvider, CssBaseline, Snackbar, Alert, useMediaQuery } from "@mui/material";

import { sproutLightTheme, sproutDarkTheme, sproutAutumnTheme, sproutOceanTheme } from "./theme";
import { useWordSearchGame } from "./hooks/useWordSearchGame";
import { useAudio } from "./hooks/useAudio";
import { CATEGORY_THEMES, DEFAULT_THEME, assetUrl } from "./categoryThemes";
import { CATEGORY_NAMES, MAX_TARGET_WORD_LENGTH } from "./backend";
import { CELEBRATE_FADE_DELAY_MS, GARDEN_CARE_CHECK_INTERVAL_MS } from "./constants";
import { gardenNeedsTending } from "./gardenCare";
import { findWordPlacement } from "./gameMechanics";

import { getLoadIssue, resetSaveAfterLoadIssue } from "./persistence";
import SaveIssueDialog from "./components/SaveIssueDialog";
import GameCanvas from "./components/GameCanvas";
import SuccessScreen from "./components/SuccessScreen";
import BonusDiscoveryToast from "./components/BonusDiscoveryToast";
import AchievementBanner from "./components/AchievementBanner";
import PlayerProfileSheet from "./components/PlayerProfileSheet";
import ContextSidebar from "./components/sidebar/ContextSidebar";
import ResponsiveContextStrip from "./components/sidebar/ResponsiveContextStrip";
import DestinationSkeleton from "./components/DestinationSkeleton";
const SettingsDialog = lazy(() => import("./components/SettingsDialog"));
const SettingsView = lazy(() => import("./components/SettingsView"));
const FieldKitView = lazy(() => import("./components/FieldKitView"));
const AboutView = lazy(() => import("./components/AboutView"));
const LevelsView = lazy(() => import("./components/LevelsView"));
const SeedStoreView = lazy(() => import("./components/SeedStoreDialog"));
const AchievementsView = lazy(() => import("./components/AchievementsView"));
const GardenView = lazy(() => import("./components/GardenView"));
const DebugPanel = import.meta.env.DEV ? lazy(() => import("./components/DebugPanel")) : null;
import OnboardingCoachmark from "./components/OnboardingCoachmark";
import { GARDEN_UNLOCK_LEVEL, ONBOARDING_STEPS, STORE_AND_TROPHIES_UNLOCK_LEVEL, eligibleOnboardingSteps, type OnboardingStepId } from "./onboarding";
import EcoLeaf from "./components/icons/EcoLeaf";
import NavigationArt from "./components/NavigationArt";
import { getBotanistRank } from "./botanistRanks";
import { ACHIEVEMENTS } from "./achievements";
import { isDebugModeRequested, isTrailEditorRequested } from "./debug/debugMode";
import { loadScreenshotHotkey, comboMatches } from "./debug/screenshotMode";
import {
    CheckCircleOutlined,
    LockOutlined,
    CheckRounded,
} from "@mui/icons-material";

const THEME_STORAGE_KEY = "wordsearch.themeMode";

// `?debug=true` is only ever true in a dev build (see debugMode.ts) -- this
// constant, and every branch it gates below, is dead code in production.
const debugRequested = isDebugModeRequested();
const trailEditorRequested = isTrailEditorRequested();

type ThemeMode = "sprout" | "midnight" | "autumn" | "ocean";
type ActiveTab = "play" | "levels" | "garden" | "achievements" | "field-kit" | "settings" | "about" | "store";

export default function App() {
    const {
        level, highestUnlockedLevel, seeds, status, levelComplete, category, levelsCompleted,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, revealAndSolveWord, nextLevel, restart, goToLevel, reshuffle, retryLevel, spendSeeds, addSeeds,
        unlockedAchievements, justUnlocked, dismissJustUnlocked, promotionQueue, dismissPromotion,
        difficultyMode, setDifficultyMode,
        favoriteCategories, setFavoriteCategories, useFavorites, setUseFavorites,
        categoriesSeen, foundDiagonal, bonusWordsFound, bonusWordsToFind, bonusWordsThisLevel, bonusSeedsThisLevel, baseSeedsThisLevel, bonusDiscovery,
        fieldNotes, claimFieldNote,
        levelsCompletedWithoutHint, maxBonusWordsInLevel, reverseWordsFound, plantsBloomed, bloomedRarityTiers, uniqueCategoriesCompleted, powerupsUsed,
        onboardingSeen, dismissOnboardingStep, replayOnboarding,
        ownedPlants, wateredTimestamps, growthByPlant,
        buyPlantSeed, updateWateredTimestamp, updatePlantGrowth, recordPlantBloom, waterAllReady,
        afflictions, remedyCharges, treatPlant, compostAfflictedPlant,
        doubleSeedsActive,
        unlockedThemes, unlockTheme,
        hasGoldenCrest, unlockGoldenCrest,
        powerupInventory, freeHintUsesRemaining, purchasePowerupCharge, claimHintUse,
        activateSuperRoot, activateCompass, activateSpectrometer, activateDoubleSeeds,
        spectrometerCells, compassDirection,
        debugApi,
    } = useWordSearchGame();

    // Captured once, synchronously, right after the hook above has already
    // run its own loadSaveDataSync() -- getLoadIssue() reflects whatever
    // that call just found. A plain useState (not derived on every render)
    // so the dialog doesn't flicker or re-derive if something else calls
    // getLoadIssue() later in the session.
    const [saveIssue, setSaveIssue] = useState(() => getLoadIssue());

    const {
        musicMuted, toggleMusicMuted, musicVolume, setMusicVolume,
        sfxMuted, toggleSfxMuted, sfxVolume, setSfxVolume,
        playSfx, playCelebration, playBonusChime,
    } = useAudio();

    // WSP-1.2: the single place a bonus-word find's audio/haptic feedback
    // fires, independent of whether the toast itself renders/animates --
    // presentation (BonusDiscoveryToast) can never independently trigger
    // these, matching the "one resolution point" guarantee for the Seed
    // reward itself (see submitSelection in useWordSearchGame).
    useEffect(() => {
        if (!bonusDiscovery) return;
        playBonusChime();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([35, 60, 35]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bonusDiscovery]);

    // ── Theme mode (Sprout / Midnight, plus store-unlockable Autumn / Ocean) ──
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return stored === "sprout" || stored === "autumn" || stored === "ocean" ? stored : "midnight";
    });

    const [activeTab, setActiveTab] = useState<ActiveTab>(trailEditorRequested ? "levels" : "play");
    const [, setViewStack] = useState<ActiveTab[]>([]);
    const isMobile = useMediaQuery("(max-width: 767px)");
    // Real gating (WSP-1.1): a locked destination is a no-op with an
    // explanatory toast, not just a visually-disabled button -- this is the
    // single choke point every navigation entry point (top nav, bottom nav,
    // the player profile sheet, GardenView's own "open store" button, etc.)
    // goes through, so a future new entry point can't accidentally bypass
    // it. Debug-mode's own "Jump to ..." buttons call setActiveTab directly
    // and intentionally skip this -- debug tooling needs unrestricted nav.
    const lockedViewMessage = (view: ActiveTab): string | null => {
        if (view === "garden" && highestUnlockedLevel < GARDEN_UNLOCK_LEVEL) {
            return `The Garden unlocks at Level ${GARDEN_UNLOCK_LEVEL}.`;
        }
        if ((view === "achievements" || view === "store") && highestUnlockedLevel < STORE_AND_TROPHIES_UNLOCK_LEVEL) {
            return `${view === "store" ? "The Seed Store" : "Trophies"} unlocks at Level ${STORE_AND_TROPHIES_UNLOCK_LEVEL}.`;
        }
        return null;
    };
    const selectPrimaryView = (view: ActiveTab) => {
        const lockedMessage = lockedViewMessage(view);
        if (lockedMessage) { showToast(lockedMessage); return; }
        setViewStack([]);
        setActiveTab(view);
    };
    const openUtilityView = (view: ActiveTab) => {
        const lockedMessage = lockedViewMessage(view);
        if (lockedMessage) { showToast(lockedMessage); return; }
        setViewStack(stack => [...stack, activeTab]);
        setActiveTab(view);
    };
    const closeUtilityView = () => {
        setViewStack(stack => {
            const destination = stack[stack.length - 1] ?? "play";
            setActiveTab(destination);
            return stack.slice(0, -1);
        });
    };

    // ── Debug panel (dev only -- see debugMode.ts) ──────────────────────────
    const [debugPanelOpen, setDebugPanelOpen] = useState(debugRequested);
    const [screenshotMode, setScreenshotMode] = useState(false);
    // Freezes GameCanvas's celebration at its fully-formed end state (see
    // GameCanvas's `celebrateStatic` prop) instead of the real completion
    // timeline -- suppresses the SuccessScreen popup below accordingly.
    const [debugStaticCelebration, setDebugStaticCelebration] = useState(false);
    const [debugPersistAchievementBanner, setDebugPersistAchievementBanner] = useState(false);
    // Transient, never-persisted override for previewing any onboarding
    // coachmark on demand (see DebugPanel's "Onboarding" section) --
    // mirrors queueAchievementPreview/queuePromotionPreview's pattern of
    // overlaying a preview without touching real save data.
    const [debugOnboardingPreview, setDebugOnboardingPreview] = useState<OnboardingStepId | null>(null);
    useEffect(() => {
        if (!debugRequested) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (!comboMatches(loadScreenshotHotkey(), e)) return;
            e.preventDefault();
            setScreenshotMode(value => !value);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
    // levelsCompleted increments the instant a level finishes -- well before
    // the celebration animation and SuccessScreen overlay actually show
    // (both are gated behind their own delayed timers). Without this guard,
    // a newly-eligible coachmark would render immediately on top of that
    // whole sequence: its spotlight, positioned at a real anchor like the
    // Seed pill, would cut out a blank box wherever that anchor sits behind
    // the success overlay's backdrop. Debug preview intentionally bypasses
    // this -- it's meant to show on demand regardless of game state.
    //
    // Hands OnboardingCoachmark every pending step (not just the first) so
    // it can skip past one whose anchor isn't live on this puzzle (e.g.
    // "bonus" before this puzzle has a bonus goal at all) instead of
    // getting permanently wedged there -- see eligibleOnboardingSteps.
    const coachmarkSteps = debugOnboardingPreview
        ? ONBOARDING_STEPS.filter(step => step.id === debugOnboardingPreview)
        : (levelComplete ? [] : eligibleOnboardingSteps(levelsCompleted, onboardingSeen));
    // Real navigation gating (WSP-1.1), not just coachmark sequencing --
    // enforced centrally in selectPrimaryView/openUtilityView below so
    // every entry point (top nav, bottom nav, the player profile sheet's
    // "Trophies" shortcut, etc.) is covered by one check.
    const isGardenLocked = highestUnlockedLevel < GARDEN_UNLOCK_LEVEL;
    const isStoreOrTrophiesLocked = highestUnlockedLevel < STORE_AND_TROPHIES_UNLOCK_LEVEL;
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
    const [profileOpen, setProfileOpen] = useState(false);
    // Shared toast, replacing alert() across the Garden and Seed Store --
    // one Snackbar mounted here, fed by a callback threaded down the same
    // way spendSeeds/addSeeds already are.
    const [toast, setToast] = useState<string | null>(null);
    const showToast = (message: string) => setToast(message);

    // Passive, generic "your garden needs tending" nudge -- purely
    // informational, never names a plant or navigates anywhere; the player
    // decides entirely on their own whether and where to act. Checked on a
    // fixed real-time cadence (not tied to level completions or garden
    // size) so it can never fire more often, or say more, just because the
    // player owns a lot of plants -- see gardenCare.ts. The ref keeps the
    // interval itself stable across re-renders (so play doesn't keep
    // resetting its own 15-minute clock) while still reading fresh state
    // each time it fires.
    const gardenCareStateRef = useRef({ ownedPlants, growthByPlant, wateredTimestamps, afflictions, seeds });
    useEffect(() => {
        gardenCareStateRef.current = { ownedPlants, growthByPlant, wateredTimestamps, afflictions, seeds };
    }, [ownedPlants, growthByPlant, wateredTimestamps, afflictions, seeds]);
    useEffect(() => {
        const check = () => {
            if (gardenNeedsTending({ ...gardenCareStateRef.current, now: Date.now() })) {
                showToast("🌱 Your garden needs tending.");
            }
        };
        const interval = window.setInterval(check, GARDEN_CARE_CHECK_INTERVAL_MS);
        return () => window.clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    // Achievement evaluation reacts to stats (seeds, levelsCompleted, ...)
    // that update the instant a level finishes -- well before the
    // board-collapse celebration animation has actually played out (that's
    // gated behind its own delayed timer, see showSuccessOverlay above).
    // Without this guard the banner -- a full-screen dimmed overlay on
    // mobile -- could pop up mid-celebration instead of once it's done.
    // Nothing is lost by waiting: the entry stays queued in justUnlocked and
    // simply renders once the gate clears. Debug mode bypasses this
    // entirely so the "Preview banner" tool always shows immediately.
    const currentToast = (!debugRequested && levelComplete && !showSuccessOverlay) ? undefined : justUnlocked[0];
    const foundCount = wordsToFind.filter(w => foundWords[w]).length;
    // The generator's own placed candidates -- not a hard ceiling. Any real
    // dictionary word not on the target list counts as a bonus find, so a
    // player can (and regularly does) find more bonus words than this
    // number suggests; the counters below must show the true total found,
    // not clamp to this "goal" as if it were a cap.
    const bonusGoalCount = bonusWordsToFind.length;
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

            {saveIssue && (
                <SaveIssueDialog
                    issue={saveIssue}
                    onReset={() => {
                        resetSaveAfterLoadIssue().then(() => {
                            restart();
                            setSaveIssue(null);
                        });
                    }}
                />
            )}

            <div
                className={`ws-app-surface ws-app-surface--${activeTab}`}
                style={{
                    "--garden-landscape": `url("${assetUrl("backgrounds/garden-landscape.webp")}")`,
                    "--garden-portrait": `url("${assetUrl("backgrounds/garden-portrait.webp")}")`,
                    minHeight: "100vh",
                    backgroundImage: buildBackground(),
                    backgroundSize: (bgTheme as { backgroundSize?: string }).backgroundSize ?? "cover",
                    backgroundPosition: (bgTheme as { backgroundPosition?: string }).backgroundPosition ?? "center",
                    backgroundRepeat: (bgTheme as { backgroundRepeat?: string }).backgroundRepeat ?? "no-repeat",
                    backgroundAttachment: "fixed",
                    transition: "background-image 0.4s ease",
                } as CSSProperties}
            >
                {activeTab === "play" && <div className="ws-playing-backdrop" aria-hidden="true"><picture>
                    <source media="(orientation: landscape)" srcSet={assetUrl("backgrounds/playing-landscape.webp")} />
                    <img src={assetUrl("backgrounds/playing-portrait.webp")} alt="" />
                </picture></div>}
                {/* ── Top Navigation Header (TopNavBar) ────────────────────────── */}
                <header className="ws-top-nav">
                    <div className="ws-top-nav__inner">
                        <div className="ws-top-nav__brand" onClick={() => selectPrimaryView("play")}>
                            <button
                                className="ws-mobile-brand-avatar ws-botanist-avatar"
                                style={{ "--avatar-position": avatarBackgroundPosition } as CSSProperties}
                                onClick={(event) => { event.stopPropagation(); playSfx("click"); setProfileOpen(true); }}
                                aria-label="Open player information"
                                title="Player information"
                            />
                            <EcoLeaf className="ws-desktop-brand-leaf" style={{ fontSize: 58, color: "var(--color-primary)" }} />
                            <div className="ws-top-nav__brand-copy">
                                <span className="ws-top-nav__logo-text">Word Sprout</span>
                                {activeTab === "play" && <span className="ws-mobile-header-progress"><span>Level {level}</span><span>Frontier {highestUnlockedLevel}</span></span>}
                            </div>
                        </div>

                        {/* Primary View Destinations */}
                        <nav className="ws-top-nav__menu">
                            <button
                                className={`ws-top-nav__link ${activeTab === "play" ? "ws-top-nav__link--active" : ""}`}
                                onClick={() => { playSfx("click"); selectPrimaryView("play"); }}
                            >
                                <NavigationArt name="play" />
                                Play
                            </button>
                            <button
                                className={`ws-top-nav__link ${activeTab === "levels" ? "ws-top-nav__link--active" : ""}`}
                                onClick={() => { playSfx("click"); selectPrimaryView("levels"); }}
                            >
                                <NavigationArt name="levels" />
                                Levels
                            </button>
                            <button
                                className={`ws-top-nav__link ${activeTab === "garden" ? "ws-top-nav__link--active" : ""}${isGardenLocked ? " ws-top-nav__link--locked" : ""}`}
                                onClick={() => { playSfx("click"); selectPrimaryView("garden"); }}
                                data-onboarding-anchor="garden"
                                aria-label={isGardenLocked ? `Garden (unlocks at Level ${GARDEN_UNLOCK_LEVEL})` : "Garden"}
                            >
                                <NavigationArt name="garden" />
                                Garden
                                {isGardenLocked && <LockOutlined style={{ fontSize: 14 }} />}
                            </button>
                            <button
                                className={`ws-top-nav__link ${activeTab === "achievements" ? "ws-top-nav__link--active" : ""}${isStoreOrTrophiesLocked ? " ws-top-nav__link--locked" : ""}`}
                                onClick={() => { playSfx("click"); selectPrimaryView("achievements"); }}
                                aria-label={isStoreOrTrophiesLocked ? `Trophies (unlocks at Level ${STORE_AND_TROPHIES_UNLOCK_LEVEL})` : "Trophies"}
                            >
                                <NavigationArt name="trophies" />
                                Trophies
                                {isStoreOrTrophiesLocked && <LockOutlined style={{ fontSize: 14 }} />}
                            </button>
                        </nav>

                        {/* Global Actions & Status Header */}
                        <div className="ws-top-nav__actions">
                            <div
                                className="ws-top-nav__stat-pill"
                                onClick={() => { playSfx("click"); openUtilityView("store"); }}
                                title="Click to open Seed Redemption Store"
                                data-onboarding-anchor="seeds store"
                                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 9999, background: "rgba(0, 228, 121, 0.12)", border: "1px solid rgba(0, 228, 121, 0.3)", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                            >
                                <img src={assetUrl("seed.png")} alt="Seed" style={{ width: 26, height: 26, objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 0 6px rgba(0,228,121,0.5))" }} />
                                <span style={{ fontFamily: "var(--font-headline)", fontWeight: 800, color: "var(--color-primary)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                                    {seeds} <span className="ws-seeds-label">SEEDS</span>
                                </span>
                            </div>

                            {/* Help — reachable from the header on both mobile and desktop, in addition to the desktop sidebar's own entry. */}
                            <button
                                className="ws-top-nav__icon-btn"
                                onClick={() => { playSfx("click"); openUtilityView("about"); }}
                                aria-label="About & How to Play"
                                title="About & How to Play"
                            >
                                <NavigationArt name="help" />
                            </button>

                            {/* Settings Quick Toggle — theme lives in its own dedicated surface. */}
                            <button
                                className="ws-top-nav__icon-btn"
                                onClick={() => { playSfx("click"); isMobile ? openUtilityView("settings") : setSettingsOpen(true); }}
                                aria-label="Settings"
                                title="Settings"
                            >
                                <NavigationArt name="settings" />
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
                    onHelp={() => openUtilityView("about")}
                    ownedPlants={ownedPlants}
                    wateredTimestamps={wateredTimestamps}
                    growthByPlant={growthByPlant}
                    afflictions={afflictions}
                    onWaterAllReady={() => {
                        const result = waterAllReady();
                        if (result.watered) showToast(`💧 Watered ${result.watered} plants${result.bloomed ? ` · ${result.bloomed} bloomed · +${result.seeds} Seeds` : ""}.`);
                    }}
                    achievementStats={{ levelsCompleted, seeds, categoriesSeen: categoriesSeen.size, foundDiagonal, totalCategories: CATEGORY_NAMES.length, bonusWordsFound, levelsCompletedWithoutHint, maxBonusWordsInLevel, reverseWordsFound, plantsBloomed, bloomedRarityTiers: bloomedRarityTiers.size, uniqueCategoriesCompleted, powerupsUsed }}
                    unlockedAchievements={unlockedAchievements}
                    fieldNotes={fieldNotes}
                    onCollectFieldNote={claimFieldNote}
                />

                {/* ── Main Content Container ───────────────────────────────────── */}
                <main
                    className={`ws-main-layout${activeTab === "levels" ? " ws-main-layout--levels" : ""}${activeTab === "about" ? " ws-main-layout--about" : ""}${activeTab === "settings" || activeTab === "field-kit" || activeTab === "store" ? " ws-main-layout--utility" : ""}`}
                    style={{ "--found-words-width": `${192 + MAX_TARGET_WORD_LENGTH * 10}px` } as CSSProperties}
                >
                    <ResponsiveContextStrip
                        activeTab={activeTab}
                        highestUnlockedLevel={highestUnlockedLevel}
                        playingLevel={level}
                        ownedPlants={ownedPlants}
                        wateredTimestamps={wateredTimestamps}
                        growthByPlant={growthByPlant}
                        afflictions={afflictions}
                        onWaterAllReady={() => {
                            const result = waterAllReady();
                            if (result.watered) showToast(`💧 Watered ${result.watered} plants${result.bloomed ? ` · ${result.bloomed} bloomed · +${result.seeds} Seeds` : ""}.`);
                        }}
                        achievementStats={{ levelsCompleted, seeds, categoriesSeen: categoriesSeen.size, foundDiagonal, totalCategories: CATEGORY_NAMES.length, bonusWordsFound, levelsCompletedWithoutHint, maxBonusWordsInLevel, reverseWordsFound, plantsBloomed, bloomedRarityTiers: bloomedRarityTiers.size, uniqueCategoriesCompleted, powerupsUsed }}
                        unlockedAchievements={unlockedAchievements}
                        fieldNotes={fieldNotes}
                        onCollectFieldNote={claimFieldNote}
                    />
                    {activeTab === "store" ? (
                        <Suspense fallback={<DestinationSkeleton destination="store" />}>
                            <SeedStoreView
                                onBack={closeUtilityView}
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
                    ) : activeTab === "settings" ? (
                        <Suspense fallback={<DestinationSkeleton destination="settings" />}>
                            <SettingsView
                                onBack={closeUtilityView}
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
                    ) : activeTab === "field-kit" ? (
                        <Suspense fallback={<DestinationSkeleton destination="field-kit" />}>
                            <FieldKitView
                                onBack={closeUtilityView}
                                hintAvailable={hintAvailable}
                                freeHintUsesRemaining={freeHintUsesRemaining}
                                powerupInventory={powerupInventory}
                                doubleSeedsActive={doubleSeedsActive}
                                onRevealHint={() => { handleRevealHint(); selectPrimaryView("play"); }}
                                onShuffle={() => { reshuffle(); selectPrimaryView("play"); }}
                                onRetry={() => { retryLevel(); selectPrimaryView("play"); }}
                                onSuperRoot={() => { activateSuperRoot(); selectPrimaryView("play"); }}
                                onCompass={() => { activateCompass(); selectPrimaryView("play"); }}
                                onSpectrometer={() => { activateSpectrometer(); selectPrimaryView("play"); }}
                                onDoubleSeeds={() => { activateDoubleSeeds(); selectPrimaryView("play"); }}
                                fieldNotes={fieldNotes}
                                onCollectFieldNote={claimFieldNote}
                            />
                        </Suspense>
                    ) : activeTab === "about" ? (
                        <Suspense fallback={<DestinationSkeleton destination="about" />}>
                            <AboutView onBack={isMobile ? closeUtilityView : undefined} onReplayOnboarding={() => { replayOnboarding(); selectPrimaryView("play"); }} />
                        </Suspense>
                    ) : activeTab === "levels" ? (
                        <Suspense fallback={<DestinationSkeleton destination="levels" />}>
                            <LevelsView
                            currentLevel={level}
                            onSelectLevel={(lvl) => {
                                goToLevel(lvl);
                                selectPrimaryView("play");
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
                                bloomedRarityTiers: bloomedRarityTiers.size,
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
                            afflictions={afflictions}
                            remedyCharges={remedyCharges}
                            onOpenStore={() => openUtilityView("store")}
                            addSeeds={addSeeds}
                            spendSeeds={spendSeeds}
                            updateWateredTimestamp={updateWateredTimestamp}
                            updatePlantGrowth={updatePlantGrowth}
                            recordPlantBloom={recordPlantBloom}
                            onTreatPlant={treatPlant}
                            onCompostPlant={compostAfflictedPlant}
                            showToast={showToast}
                            />
                        </Suspense>
                    ) : (
                        <>
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
                                                    All target words found{bonusGoalCount ? ` · ${bonusWordsThisLevel.length}/${bonusGoalCount} bonus sprouts` : ""}. Well done, Botanist!
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
                                        <div className="ws-level-goal-card__bonus-goal" data-onboarding-anchor="bonus">
                                            <div className="ws-level-goal-card__bonus-copy">
                                                <span aria-hidden="true">✨</span>
                                                <span className="ws-level-goal-card__goal-label">Bonus Goal</span>
                                                <strong>
                                                    {bonusGoalCount > 0
                                                        ? `Plus, try to find the ${bonusGoalCount} hidden bonus ${bonusGoalCount === 1 ? "word" : "words"}, if you can.`
                                                        : "No bonus words this level."}
                                                </strong>
                                            </div>
                                            {bonusGoalCount > 0 && <span className="ws-level-goal-card__bonus-count">{bonusWordsThisLevel.length}/{bonusGoalCount}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Gameplay Grid & Found Words Side Panel */}
                            <div className="ws-gameplay-grid">
                                {/* Left: Canvas Word Grid Panel */}
                                <div
                                    className={`glass-panel ws-game-board-panel ws-game-board-panel--grid-${gridSize}${gridSize <= 4 ? " ws-game-board-panel--compact" : ""}`}
                                    style={{ flexDirection: "column" }}
                                    data-onboarding-anchor="play-basics"
                                >
                                    <div className="ws-mobile-board-header">
                                        <strong>{category || "Botanical"}</strong>
                                        <div className="ws-mobile-board-header__counts">
                                            <span className="ws-mobile-board-header__count">Found {foundCount}/{wordsToFind.length}</span>
                                            <span className="ws-mobile-board-header__count ws-mobile-board-header__count--bonus" data-onboarding-anchor="bonus">
                                                {bonusGoalCount > 0 ? `Bonus ${bonusWordsThisLevel.length}/${bonusGoalCount}` : "No bonus this level"}
                                            </span>
                                        </div>
                                    </div>
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
                                        celebrateStatic={debugStaticCelebration}
                                    />
                                    {bonusDiscovery && (
                                        <BonusDiscoveryToast key={`${bonusDiscovery.word}-${bonusDiscovery.seeds}`} word={bonusDiscovery.word} seeds={bonusDiscovery.seeds} earnedRemedy={bonusDiscovery.earnedRemedy} />
                                    )}
                                </div>

                                {/* Right: Found Words List Panel */}
                                <div className="glass-panel ws-found-words-panel">
                                    <div className="ws-found-words-header">
                                        <h3 style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.25rem", fontWeight: 700, color: "var(--color-primary)" }}>
                                            Found Words
                                        </h3>
                                    </div>
                                    <div className="ws-bonus-sprouts ws-bonus-sprouts--summary" aria-label={`${bonusWordsThisLevel.length} bonus words found`}>
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

                </main>

                <PlayerProfileSheet
                    open={profileOpen}
                    onClose={() => setProfileOpen(false)}
                    onOpenAchievements={() => { setProfileOpen(false); selectPrimaryView("achievements"); }}
                    onOpenSettings={() => { setProfileOpen(false); isMobile ? openUtilityView("settings") : setSettingsOpen(true); }}
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
                        onClick={() => { playSfx("click"); selectPrimaryView("play"); }}
                    >
                        <NavigationArt name="play" />
                        <span>Play</span>
                    </button>

                    <button
                        className={`ws-bottom-nav__item ${activeTab === "levels" ? "ws-bottom-nav__item--active" : ""}`}
                        onClick={() => { playSfx("click"); selectPrimaryView("levels"); }}
                    >
                        <NavigationArt name="levels" />
                        <span>Levels</span>
                    </button>

                    <button
                        className={`ws-bottom-nav__item ${activeTab === "garden" ? "ws-bottom-nav__item--active" : ""}${isGardenLocked ? " ws-bottom-nav__item--locked" : ""}`}
                        onClick={() => { playSfx("click"); selectPrimaryView("garden"); }}
                        data-onboarding-anchor="garden"
                        aria-label={isGardenLocked ? `Garden (unlocks at Level ${GARDEN_UNLOCK_LEVEL})` : "Garden"}
                    >
                        <NavigationArt name="garden" />
                        <span>Garden{isGardenLocked && <LockOutlined style={{ fontSize: 12, marginLeft: 4, verticalAlign: "text-bottom" }} />}</span>
                    </button>

                    <button
                        className={`ws-bottom-nav__item ${activeTab === "achievements" ? "ws-bottom-nav__item--active" : ""}${isStoreOrTrophiesLocked ? " ws-bottom-nav__item--locked" : ""}`}
                        onClick={() => { playSfx("click"); selectPrimaryView("achievements"); }}
                        aria-label={isStoreOrTrophiesLocked ? `Trophies (unlocks at Level ${STORE_AND_TROPHIES_UNLOCK_LEVEL})` : "Trophies"}
                    >
                        <NavigationArt name="trophies" />
                        <span>Trophies{isStoreOrTrophiesLocked && <LockOutlined style={{ fontSize: 12, marginLeft: 4, verticalAlign: "text-bottom" }} />}</span>
                    </button>
                    <button
                        className={`ws-bottom-nav__item ${activeTab === "field-kit" ? "ws-bottom-nav__item--active" : ""}`}
                        onClick={() => { playSfx("click"); openUtilityView("field-kit"); }}
                    >
                        <NavigationArt name="field-kit" />
                        <span>Field Kit</span>
                    </button>

                </nav>

                {/* ── Success Overlay ────────────────────────────────────────────── */}
                {showSuccessOverlay && !debugStaticCelebration && (
                    <SuccessScreen
                        category={category}
                        level={level}
                        seeds={seeds}
                        targetWordCount={wordsToFind.length}
                        baseSeeds={baseSeedsThisLevel}
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
                <Suspense fallback={<div className="ws-lazy-dialog-fallback"><DestinationSkeleton destination="settings" dialog /></div>}>
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

            <AchievementBanner
                achievement={currentToast ?? null}
                onDismiss={dismissJustUnlocked}
                persist={debugRequested && debugPersistAchievementBanner}
                isMobile={isMobile}
            />

            <OnboardingCoachmark
                steps={coachmarkSteps}
                onDismiss={(stepId) => {
                    if (debugOnboardingPreview) { setDebugOnboardingPreview(null); return; }
                    dismissOnboardingStep(stepId);
                }}
            />

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

            {debugRequested && debugApi && !screenshotMode && (
                <>
                    <button
                        type="button"
                        onClick={() => setDebugPanelOpen(open => !open)}
                        aria-label="Toggle debug panel"
                        title="Debug panel"
                        style={{
                            position: "fixed", bottom: 16, right: 16, zIndex: 2000,
                            width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.3)",
                            background: "#1a1a1a", color: "#fff", fontSize: 20, cursor: "pointer",
                        }}
                    >
                        🐛
                    </button>
                    {debugPanelOpen && DebugPanel && (
                        <Suspense fallback={null}>
                            <DebugPanel
                                onClose={() => setDebugPanelOpen(false)}
                                onNavigate={setActiveTab}
                                debugApi={debugApi}
                                unlockedAchievements={unlockedAchievements}
                                ownedPlants={ownedPlants}
                                growthByPlant={growthByPlant}
                                afflictions={afflictions}
                                remedyCharges={remedyCharges}
                                powerupInventory={powerupInventory}
                                unlockedThemes={unlockedThemes}
                                hasGoldenCrest={hasGoldenCrest}
                                highestUnlockedLevel={highestUnlockedLevel}
                                gridSize={gridSize}
                                wordsToFind={wordsToFind}
                                foundWords={foundWords}
                                revealAndSolveWord={revealAndSolveWord}
                                reshuffle={reshuffle}
                                activateSuperRoot={activateSuperRoot}
                                activateCompass={activateCompass}
                                activateSpectrometer={activateSpectrometer}
                                activateDoubleSeeds={activateDoubleSeeds}
                                staticPreviewActive={debugStaticCelebration}
                                onSetStaticPreview={setDebugStaticCelebration}
                                persistAchievementBanner={debugPersistAchievementBanner}
                                onSetPersistAchievementBanner={setDebugPersistAchievementBanner}
                                onboardingPreview={debugOnboardingPreview}
                                onSetOnboardingPreview={setDebugOnboardingPreview}
                            />
                        </Suspense>
                    )}
                </>
            )}
        </ThemeProvider>
    );
}
