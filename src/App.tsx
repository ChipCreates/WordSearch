import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { darkTheme } from "./theme";
import { useWordSearchGame } from "./hooks/useWordSearchGame";
import { CATEGORY_THEMES, DEFAULT_THEME } from "./categoryThemes";
import GameCanvas from "./components/GameCanvas";
import WordList from "./components/WordList";

export default function App() {
  const {
    level, stars, status, levelComplete, category,
    gridSize, gridData, wordsToFind, foundWords, foundLines,
    submitSelection, nextLevel, restart,
  } = useWordSearchGame();

  const theme = CATEGORY_THEMES[category] ?? DEFAULT_THEME;

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
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: { xs: '100%', sm: 320 } }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                textAlign: 'center',
                backgroundColor: 'rgba(15,15,20,0.62)',
              }}
            >
              <Typography variant="body1" sx={{ mb: 2 }}>{status}</Typography>
              <WordList wordsToFind={wordsToFind} foundWords={foundWords} />
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                textAlign: 'center',
                backgroundColor: 'rgba(15,15,20,0.62)',
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
    </ThemeProvider>
  );
}
