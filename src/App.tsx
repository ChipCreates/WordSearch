import { useEffect, useRef, useState } from "react";
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Box, Button, IconButton, Snackbar, Alert } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { darkTheme } from "./theme";
import { useWordSearchGame } from "./hooks/useWordSearchGame";
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

export default function App() {
  const {
    level, stars, status, levelComplete, category,
    gridSize, gridData, wordsToFind, foundWords, foundLines,
    submitSelection, nextLevel, restart,
    unlockedAchievements, justUnlocked, dismissJustUnlocked,
  } = useWordSearchGame();

  const [achievementsOpen, setAchievementsOpen] = useState(false);

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
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Word Sprout
            </Typography>
            <IconButton onClick={() => setAchievementsOpen(true)} sx={{ color: '#fbbc04', mr: 1 }}>
              <EmojiEventsIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: '#fbbc04', mr: 2 }}>
              ⭐ {stars}
            </Typography>
            <Typography variant="h6" color="secondary">
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
                  <Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={nextLevel}>
                      Next Level
                  </Button>
              )}
              <Button variant="outlined" color="primary" onClick={restart}>
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

      <Snackbar
        open={!!currentToast}
        autoHideDuration={3000}
        onClose={dismissJustUnlocked}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {currentToast ? (
          <Alert onClose={dismissJustUnlocked} severity="success" variant="filled" icon={currentToast.icon}>
            Achievement unlocked: {currentToast.name}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ThemeProvider>
  );
}
