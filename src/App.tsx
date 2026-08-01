import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { darkTheme } from "./theme";
import { useWordSearchGame } from "./hooks/useWordSearchGame";
import GameCanvas from "./components/GameCanvas";
import WordList from "./components/WordList";

export default function App() {
  const {
    level, stars, status, levelComplete,
    gridSize, gridData, wordsToFind, foundWords, foundLines,
    submitSelection, nextLevel, restart,
  } = useWordSearchGame();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Word Search
          </Typography>
          <Typography variant="h6" sx={{ color: '#fbbc04', mr: 2 }}>
            ⭐ {stars}
          </Typography>
          <Typography variant="h6" color="secondary">
            Level {level}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ mb: 2 }}>{status}</Typography>

        <WordList wordsToFind={wordsToFind} foundWords={foundWords} />

        <GameCanvas
          gridSize={gridSize}
          gridData={gridData}
          foundLines={foundLines}
          onSelectionEnd={submitSelection}
        />

        {levelComplete && (
            <Button variant="contained" color="primary" sx={{ mt: 3, mr: 2 }} onClick={nextLevel}>
                Next Level
            </Button>
        )}
        <Button variant="outlined" color="primary" sx={{ mt: 3 }} onClick={restart}>
            Restart Game
        </Button>
      </Box>
    </ThemeProvider>
  );
}
