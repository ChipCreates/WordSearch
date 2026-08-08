import { useEffect, useRef, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";

import { sproutLightTheme, sproutDarkTheme } from "./theme";
import { useWordSearchGame } from "./hooks/useWordSearchGame";
import { useAudio } from "./hooks/useAudio";
import { CATEGORY_THEMES, DEFAULT_THEME } from "./categoryThemes";
import { DIRECTIONS } from "./constants";

import GameCanvas from "./components/GameCanvas";
import SuccessScreen from "./components/SuccessScreen";
import AchievementBanner from "./components/AchievementBanner";
import SettingsDialog from "./components/SettingsDialog";
import AboutDialog from "./components/AboutDialog";
import LevelsDialog from "./components/LevelsDialog";
import AchievementsView from "./components/AchievementsView";
import GardenView from "./components/GardenView";
import EcoLeaf from "./components/icons/EcoLeaf";
import {
    VideogameAssetOutlined,
    EmojiEventsOutlined,
    DarkModeOutlined,
    LightModeOutlined,
    SettingsOutlined,
    SpaOutlined,
    GridViewOutlined,
    AutoFixHighOutlined,
    ShuffleOutlined,
    RefreshOutlined,
    VolumeOffOutlined,
    VolumeUpOutlined,
    MusicOffOutlined,
    MusicNoteOutlined,
    HelpOutlineOutlined,
    CheckCircleOutlined,
    LockOutlined,
    FormatListBulletedOutlined,
} from "@mui/icons-material";

const THEME_STORAGE_KEY = "wordsearch.themeMode";

type ThemeMode = "sprout" | "midnight";
type ActiveTab = "play" | "levels" | "garden" | "achievements" | "settings";

export default function App() {
    const {
        level, stars, levelComplete, category,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, nextLevel, restart, goToLevel, reshuffle, retryLevel,
        unlockedAchievements, justUnlocked, dismissJustUnlocked,
        difficultyMode, setDifficultyMode,
        categoriesSeen, foundDiagonal,
    } = useWordSearchGame();

    const {
        musicMuted, toggleMusicMuted, musicVolume, setMusicVolume,
        sfxMuted, toggleSfxMuted, sfxVolume, setSfxVolume,
        playSfx,
    } = useAudio();

    // ── Theme mode (Sprout / Midnight) ────────────────────────────────────────
    const [themeMode, setThemeMode] = useState<ThemeMode>(
        () => (localStorage.getItem(THEME_STORAGE_KEY) === "sprout" ? "sprout" : "midnight")
    );

    const [activeTab, setActiveTab] = useState<ActiveTab>("play");

    const handleThemeModeChange = (mode: ThemeMode) => {
        setThemeMode(mode);
        localStorage.setItem(THEME_STORAGE_KEY, mode);
        document.documentElement.setAttribute("data-theme", mode === "midnight" ? "midnight" : "");
    };

    useEffect(() => {
        document.documentElement.setAttribute(
            "data-theme",
            themeMode === "midnight" ? "midnight" : ""
        );
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.setAttribute(
                "content",
                themeMode === "midnight" ? "#131313" : "#fefae8"
            );
        }
    }, [themeMode]);

    // ── Dialog & Celebration states ────────────────────────────────────────────
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [levelsOpen, setLevelsOpen] = useState(false);
    const [hintCell, setHintCell] = useState<{ r: number; c: number } | null>(null);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

    useEffect(() => {
        setHintCell(null);
    }, [gridData, level, foundLines]);

    useEffect(() => {
        if (levelComplete) {
            // Allow the pill-to-dot collapse animation to play on the canvas grid first (1450ms)
            const timer = setTimeout(() => {
                setShowSuccessOverlay(true);
            }, 1450);
            return () => clearTimeout(timer);
        } else {
            setShowSuccessOverlay(false);
        }
    }, [levelComplete]);

    const handleRevealHint = () => {
        const unfoundWord = wordsToFind.find(w => !foundWords[w]);
        if (!unfoundWord || !gridData.length) return;

        const targetWord = unfoundWord.toUpperCase();
        const wordLen = targetWord.length;

        // Search the board for the actual placement of targetWord
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                for (const [dc, dr] of DIRECTIONS) {
                    let matches = true;
                    for (let i = 0; i < wordLen; i++) {
                        const nr = r + i * dr;
                        const nc = c + i * dc;
                        if (
                            nr < 0 || nr >= gridSize ||
                            nc < 0 || nc >= gridSize ||
                            gridData[nr][nc].toUpperCase() !== targetWord[i]
                        ) {
                            matches = false;
                            break;
                        }
                    }
                    if (matches) {
                        setHintCell({ r, c });
                        return;
                    }
                }
            }
        }
    };

    // ── SFX edge-detection ────────────────────────────────────────────────────
    const prevStarsRef = useRef(stars);
    useEffect(() => {
        if (stars > prevStarsRef.current) playSfx("award");
        prevStarsRef.current = stars;
    }, [stars, playSfx]);

    const prevLevelCompleteRef = useRef(levelComplete);
    useEffect(() => {
        if (levelComplete && !prevLevelCompleteRef.current) playSfx("cheering");
        prevLevelCompleteRef.current = levelComplete;
    }, [levelComplete, playSfx]);

    const prevJustUnlockedLengthRef = useRef(justUnlocked.length);
    useEffect(() => {
        if (justUnlocked.length > prevJustUnlockedLengthRef.current) playSfx("achievement");
        prevJustUnlockedLengthRef.current = justUnlocked.length;
    }, [justUnlocked, playSfx]);

    // ── Derived values ────────────────────────────────────────────────────────
    const bgTheme = CATEGORY_THEMES[category] ?? DEFAULT_THEME;
    const currentToast = justUnlocked[0];
    const foundCount = wordsToFind.filter(w => foundWords[w]).length;
    const muiTheme = themeMode === "midnight" ? sproutDarkTheme : sproutLightTheme;

    const buildBackground = () => {
        const raw: string = (bgTheme as { background: string }).background ?? "";
        const urlPart = raw.includes("url(") ? raw.slice(raw.indexOf("url(")) : "";
        const scrim = "var(--scrim)";
        return urlPart ? `${scrim}, ${urlPart}` : "var(--color-surface)";
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
                    transition: "background-image 0.4s ease",
                }}
            >
                {/* ── Top Navigation Header (TopNavBar) ────────────────────────── */}
                <header className="ws-top-nav">
                    <div className="ws-top-nav__inner">
                        <div className="ws-top-nav__brand" onClick={() => setActiveTab("play")}>
                            <EcoLeaf style={{ fontSize: 32, color: "var(--color-primary)" }} />
                            <span className="ws-top-nav__logo-text">Word Sprout</span>
                        </div>

                        {/* Primary View Destinations */}
                        <nav className="ws-top-nav__menu">
                            <button
                                className={`ws-top-nav__link ${activeTab === "play" ? "ws-top-nav__link--active" : ""}`}
                                onClick={() => { playSfx("click"); setActiveTab("play"); }}
                            >
                                <VideogameAssetOutlined style={{ fontSize: 18, marginRight: 4, verticalAlign: "middle" }} />
                                Play
                            </button>
                            <button
                                className={`ws-top-nav__link ${activeTab === "garden" ? "ws-top-nav__link--active" : ""}`}
                                onClick={() => { playSfx("click"); setActiveTab("garden"); }}
                            >
                                <EcoLeaf style={{ fontSize: 18, marginRight: 4, verticalAlign: "middle" }} />
                                Garden
                            </button>
                            <button
                                className={`ws-top-nav__link ${activeTab === "achievements" ? "ws-top-nav__link--active" : ""}`}
                                onClick={() => { playSfx("click"); setActiveTab("achievements"); }}
                            >
                                <EmojiEventsOutlined style={{ fontSize: 18, marginRight: 4, verticalAlign: "middle" }} />
                                Achievements
                            </button>
                        </nav>

                        {/* Global Actions & Status Header */}
                        <div className="ws-top-nav__actions">
                            <div className="ws-top-nav__stat-pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 9999, background: "rgba(0, 228, 121, 0.12)", border: "1px solid rgba(0, 228, 121, 0.3)" }}>
                                <img src="/seed.png" alt="Seed" style={{ width: 22, height: 22, objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(0,228,121,0.5))" }} />
                                <span style={{ fontFamily: "var(--font-headline)", fontWeight: 800, color: "var(--color-primary)", fontSize: "0.9rem" }}>{stars * 100} SEEDS</span>
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
                                {themeMode === "sprout" ? <DarkModeOutlined /> : <LightModeOutlined />}
                            </button>

                            {/* Settings Modal Trigger */}
                            <button
                                className="ws-top-nav__icon-btn"
                                onClick={() => { playSfx("click"); setSettingsOpen(true); }}
                                aria-label="Settings"
                                title="Settings"
                            >
                                <SettingsOutlined />
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
                            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)" }}>Sprout Master</div>
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
                            onClick={() => { playSfx("click"); setLevelsOpen(true); }}
                            style={{ width: "100%", justifyContent: "center", marginTop: 4, padding: "6px 12px", fontSize: "0.8rem" }}
                        >
                            <GridViewOutlined style={{ fontSize: 16 }} />
                            Level Map & Categories
                        </button>
                    </div>

                    {/* Botanical Tactical Toolkit (Gameplay Tools) */}
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
                            onClick={() => setAboutOpen(true)}
                            style={{ background: "none", border: "none", color: "var(--color-on-surface-variant)", fontSize: "0.8rem", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px" }}
                        >
                            <HelpOutlineOutlined style={{ fontSize: 18, verticalAlign: "middle" }} /> About & How to Play
                        </button>
                    </div>
                </aside>

                {/* ── Main Content Container ───────────────────────────────────── */}
                <main className="ws-main-layout">
                    {activeTab === "achievements" ? (
                        <AchievementsView
                            unlockedAchievements={unlockedAchievements}
                            stats={{
                                levelsCompleted: level - 1,
                                stars,
                                categoriesSeen: categoriesSeen.size,
                                foundDiagonal,
                                totalCategories: Object.keys(CATEGORY_THEMES).length,
                            }}
                        />
                    ) : activeTab === "garden" ? (
                        <GardenView
                            stars={stars}
                            level={level}
                            unlockedAchievementsCount={unlockedAchievements.size}
                        />
                    ) : (
                        <>
                            {/* Daily Goal Header Toolbar */}
                            <div className="glass-panel ws-daily-goal-card">
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                                        <div>
                                            <h2 className="glow-text-emerald" style={{ margin: 0, fontFamily: "var(--font-headline)", fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)" }}>
                                                Daily Goal
                                            </h2>
                                            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-on-surface-variant)" }}>
                                                Harvest {wordsToFind.length} words to bloom your garden
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
                                            <img src="/seed.png" alt="Seed" style={{ width: 26, height: 26, objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(0,228,121,0.6))" }} />
                                            <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-secondary)" }}>{stars * 100}</span>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.05em" }}>SEEDS</div>
                                    </div>
                                    <div style={{ width: 1, height: 36, background: "var(--glass-border)" }} />
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-primary)" }}>#{level}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)", textTransform: "uppercase", letterSpacing: "0.05em" }}>STREAK</div>
                                    </div>
                                </div>
                            </div>

                            {/* Gameplay Grid & Found Words Side Panel */}
                            <div className="ws-gameplay-grid">
                                {/* Left: Canvas Word Grid Panel */}
                                <div className="glass-panel ws-game-board-panel">
                                    <GameCanvas
                                        gridSize={gridSize}
                                        gridData={gridData}
                                        foundLines={foundLines}
                                        hintCell={hintCell}
                                        onSelectionEnd={submitSelection}
                                        onSwipe={() => playSfx("swipe")}
                                        celebrate={levelComplete}
                                    />
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
                                                    className="ws-found-word-card"
                                                    style={{
                                                        opacity: isFound ? 1 : 0.6,
                                                        borderColor: isFound ? "var(--color-primary)" : "rgba(255, 255, 255, 0.1)",
                                                    }}
                                                >
                                                    <span>{word.toUpperCase()}</span>
                                                    {isFound ? (
                                                        <CheckCircleOutlined style={{ fontSize: 20, color: "var(--color-primary)" }} />
                                                    ) : (
                                                        <LockOutlined style={{ fontSize: 20, color: "var(--color-on-surface-variant)" }} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Card Footer Biome indicator */}
                                    <div style={{ padding: "12px 16px", background: "rgba(0, 0, 0, 0.2)", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "0 0 1.25rem 1.25rem" }}>
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-on-surface-variant)", fontWeight: 600 }}>
                                            Biome Category: <strong style={{ color: "var(--color-primary)" }}>{category || "Botanical"}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Footer ───────────────────────────────────────────────── */}
                    <footer className="ws-footer">
                        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 8 }}>
                            <a href="#" onClick={(e) => { e.preventDefault(); setAboutOpen(true); }} style={{ color: "var(--color-on-surface-variant)", textDecoration: "none" }}>Terms of Service</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); setAboutOpen(true); }} style={{ color: "var(--color-on-surface-variant)", textDecoration: "none" }}>Privacy Policy</a>
                            <a href="#" onClick={(e) => { e.preventDefault(); setAboutOpen(true); }} style={{ color: "var(--color-on-surface-variant)", textDecoration: "none" }}>Support</a>
                        </div>
                        <p>© 2024 Word Sprout Studio. v1.2.0-beta</p>
                    </footer>
                </main>

                {/* ── Mobile Bottom Navigation Bar (BottomNavBar) ────────────────── */}
                <nav className="ws-bottom-nav">
                    <button
                        className={`ws-bottom-nav__item ${activeTab === "play" ? "ws-bottom-nav__item--active" : ""}`}
                        onClick={() => { playSfx("click"); setActiveTab("play"); }}
                    >
                        <EcoLeaf />
                        <span>Play</span>
                    </button>

                    <button
                        className="ws-bottom-nav__item"
                        onClick={() => { playSfx("click"); setLevelsOpen(true); }}
                    >
                        <FormatListBulletedOutlined />
                        <span>Levels</span>
                    </button>

                    <button
                        className={`ws-bottom-nav__item ${activeTab === "garden" ? "ws-bottom-nav__item--active" : ""}`}
                        onClick={() => { playSfx("click"); setActiveTab("garden"); }}
                    >
                        <EcoLeaf />
                        <span>Garden</span>
                    </button>

                    <button
                        className={`ws-bottom-nav__item ${activeTab === "achievements" ? "ws-bottom-nav__item--active" : ""}`}
                        onClick={() => { playSfx("click"); setActiveTab("achievements"); }}
                    >
                        <EmojiEventsOutlined />
                        <span>Trophies</span>
                    </button>

                    <button
                        className="ws-bottom-nav__item"
                        onClick={() => { playSfx("click"); setSettingsOpen(true); }}
                    >
                        <SettingsOutlined />
                        <span>Settings</span>
                    </button>
                </nav>

                {/* ── Success Overlay ────────────────────────────────────────────── */}
                {showSuccessOverlay && (
                    <SuccessScreen
                        category={category}
                        level={level}
                        stars={stars}
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
            />

            <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

            <LevelsDialog
                open={levelsOpen}
                currentLevel={level}
                onClose={() => setLevelsOpen(false)}
                onSelectLevel={(lvl) => {
                    goToLevel(lvl);
                }}
            />

            <AchievementBanner achievement={currentToast ?? null} onDismiss={dismissJustUnlocked} />
        </ThemeProvider>
    );
}
