import { useEffect, useRef, useState } from "react";
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Box, Button, IconButton } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import { darkTheme } from "./theme";
import { useWordSearchGame } from "./hooks/useWordSearchGame";
import { useAudio } from "./hooks/useAudio";
import { CATEGORY_THEMES, DEFAULT_THEME } from "./categoryThemes";
import {
  CELEBRATE_FADE_DELAY_MS,
  CELEBRATE_FADE_DURATION_MS,
  CELEBRATE_BUTTONS_MOVE_DELAY_MS,
  CELEBRATE_BUTTONS_MOVE_DURATION_MS,
} from "./constants";
import GameCanvas from "./components/GameCanvas";
import WordList from "./components/WordList";
import AchievementsDialog from "./components/AchievementsDialog";
import AchievementBanner from "./components/AchievementBanner";
import SettingsDialog from "./components/SettingsDialog";
import AboutDialog from "./components/AboutDialog";

export default function App() {
  const {
    level, stars, status, levelComplete, category,
    gridSize, gridData, wordsToFind, foundWords, foundLines,
    submitSelection, nextLevel, restart,
    unlockedAchievements, justUnlocked, dismissJustUnlocked,
    difficultyMode, setDifficultyMode,
  } = useWordSearchGame();
  const {
    musicMuted, toggleMusicMuted, musicVolume, setMusicVolume,
    sfxMuted, toggleSfxMuted, sfxVolume, setSfxVolume,
    playSfx,
  } = useAudio();

  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // SFX tied to state *transitions* (a level completing, a star being
  // added, an achievement unlocking) rather than threaded into
  // useWordSearchGame itself -- keeps that hook audio-agnostic. Refs (not
  // state) hold the previous value purely for edge detection.
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

  // Closing beat of the celebration: once the board+word-list fade has
  // finished, the button block glides from its sidebar spot to the center
  // of the window. translate (not a layout/position change) so it animates
  // smoothly and the element never leaves its normal flow slot -- the offset
  // is measured once, right before the glide starts, from wherever the
  // block actually is at that moment.
  const buttonBoxRef = useRef<HTMLDivElement>(null);
  const [centerOffset, setCenterOffset] = useState<{ dx: number; dy: number } | null>(null);
  useEffect(() => {
    if (!levelComplete) {
      setCenterOffset(null);
      return;
    }
    const timer = setTimeout(() => {
      const el = buttonBoxRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCenterOffset({
        dx: window.innerWidth / 2 - (rect.left + rect.width / 2),
        dy: window.innerHeight / 2 - (rect.top + rect.height / 2),
      });
    }, CELEBRATE_BUTTONS_MOVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [levelComplete]);

  const theme = CATEGORY_THEMES[category] ?? DEFAULT_THEME;
  const currentToast = justUnlocked[0];

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          ...theme,
          transition: 'background-image 0.4s ease',
        }}
      >
        <AppBar position="static" elevation={0} sx={{ backgroundColor: 'rgba(18,18,18,0.35)' }}>
          {/* flexWrap lets the whole category/level block drop to its own row
              as one clean unit on narrow phones, instead of each Typography
              individually word-wrapping mid-text (e.g. "Word" / "Sprout"
              splitting) when there isn't room for everything on one line. */}
          <Toolbar sx={{ flexWrap: 'wrap', rowGap: 0.5, py: 1 }}>
            <Typography variant="h6" sx={{ flexGrow: 1, whiteSpace: 'nowrap' }}>
              Word Sprout
            </Typography>
            <IconButton onClick={() => { playSfx('click'); setAboutOpen(true); }} sx={{ mr: 0.5 }}>
              <HelpOutlineIcon />
            </IconButton>
            <IconButton onClick={() => { playSfx('click'); setSettingsOpen(true); }} sx={{ mr: 0.5 }}>
              <SettingsIcon />
            </IconButton>
            <IconButton onClick={() => { playSfx('click'); setAchievementsOpen(true); }} sx={{ color: '#fbbc04', mr: 1 }}>
              <EmojiEventsIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: '#fbbc04', whiteSpace: 'nowrap' }}>
              ⭐ {stars}
            </Typography>
            <Typography
              variant="h6"
              color="secondary"
              sx={{
                whiteSpace: 'nowrap',
                width: { xs: '100%', sm: 'auto' },
                textAlign: { xs: 'center', sm: 'right' },
                ml: { sm: 2 },
              }}
            >
              {category ? `${category} · ` : ''}Level {level}
            </Typography>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            flexWrap: 'wrap',
            justifyContent: 'center',
            // 'stretch' (the default) lets GameCanvas's own maxWidth+mx:auto
            // center it in the column layout, same as before this was a flex
            // container -- 'center' here would shrink it to the <canvas>'s
            // intrinsic 300x300 default instead of the full column width.
            alignItems: 'stretch',
            gap: 3,
            p: 2,
            maxWidth: 980,
            mx: 'auto',
          }}
        >
          <GameCanvas
            gridSize={gridSize}
            gridData={gridData}
            foundLines={foundLines}
            onSelectionEnd={submitSelection}
            onSwipe={() => playSfx('swipe')}
            celebrate={levelComplete}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: { xs: '100%', sm: 320 } }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                textAlign: 'center',
                backgroundColor: 'rgba(15,15,20,0.62)',
                // The status text and word list only matter while a puzzle
                // is live -- once it's complete they fade out in lockstep
                // with the board itself (same delay/duration) rather than
                // sitting there stranded next to a dissolved-away board.
                opacity: levelComplete ? 0 : 1,
                transition: levelComplete
                  ? `opacity ${CELEBRATE_FADE_DURATION_MS}ms ease ${CELEBRATE_FADE_DELAY_MS}ms`
                  : 'none',
              }}
            >
              <Typography variant="body1" sx={{ mb: 2 }}>{status}</Typography>
              <WordList wordsToFind={wordsToFind} foundWords={foundWords} />
            </Box>

            <Box
              ref={buttonBoxRef}
              sx={{
                p: 2,
                borderRadius: 3,
                textAlign: 'center',
                backgroundColor: 'rgba(15,15,20,0.62)',
                position: 'relative',
                zIndex: centerOffset ? 20 : 'auto',
                transform: centerOffset ? `translate(${centerOffset.dx}px, ${centerOffset.dy}px)` : 'none',
                transition: centerOffset ? `transform ${CELEBRATE_BUTTONS_MOVE_DURATION_MS}ms ease` : 'none',
              }}
            >
              {levelComplete && (
                  <Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={() => { playSfx('click'); nextLevel(); }}>
                      Next Level
                  </Button>
              )}
              <Button variant="outlined" color="primary" onClick={() => { playSfx('click'); restart(); }}>
                  Restart Game
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <AchievementsDialog
        open={achievementsOpen}
        unlockedAchievements={unlockedAchievements}
        onClose={() => setAchievementsOpen(false)}
      />

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
      />

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <AchievementBanner achievement={currentToast ?? null} onDismiss={dismissJustUnlocked} />
    </ThemeProvider>
  );
}
