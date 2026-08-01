import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box, Chip, Button, Grid, Paper } from "@mui/material";

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#bb86fc',
    },
    secondary: {
      main: '#03dac6',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

const HIGHLIGHT_COLORS = [
    "#f28b82", "#fbbc04", "#fff475", "#ccff90", 
    "#a7ffeb", "#cbf0f8", "#aecbfa", "#d7aefb", 
    "#fdcfe8", "#e6c9a8", "#03dac6", "#bb86fc", 
    "#cf6679", "#ff8a65", "#ba68c8", "#4fc3f7",
    "#81c784", "#fff176", "#ffb74d", "#f06292"
];

const DIRECTIONS = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, -1], [1, -1], [-1, 1]
];

export default function App() {
  const [level, setLevel] = useState(1);
  const [stars, setStars] = useState(0);
  const [status, setStatus] = useState("Loading...");
  
  const [gridSize, setGridSize] = useState(12);
  const [gridData, setGridData] = useState<string[][]>([]);
  const [wordsToFind, setWordsToFind] = useState<string[]>([]);
  const [bonusWords, setBonusWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<Record<string, string>>({});
  const [foundLines, setFoundLines] = useState<any[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game State Refs for Canvas
  const stateRef = useRef({
    isDragging: false,
    startCell: null as any,
    currentTarget: null as any,
    gridData: [] as string[][],
    gridSize: 12,
    wordsToFind: [] as string[],
    foundWords: {} as Record<string, string>,
    foundLines: [] as any[],
  });
  
  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      gridData, gridSize, wordsToFind, foundWords, foundLines
    };
  }, [gridData, gridSize, wordsToFind, foundWords, foundLines]);

  useEffect(() => {
    initGame();
  }, [level]);
  
  const initGame = async () => {
    setStatus("Generating puzzle...");
    const size = Math.min(12 + Math.floor(level / 2), 20);
    const count = Math.min(5 + level * 2, 25);
    setGridSize(size);
    
    // Fetch words from Rust backend
    const words: string[] = await invoke("get_puzzle_words", { count: count + 10, maxLength: size });
    const toFind = words.slice(0, count);
    const bonuses = words.slice(count);
    
    setWordsToFind(toFind);
    setBonusWords(bonuses);
    setFoundWords({});
    setFoundLines([]);
    
    // Generate Grid
    let newGrid = Array(size).fill(null).map(() => Array(size).fill(''));
    const allWords = [...toFind, ...bonuses];
    
    const canPlaceWord = (word: string, row: number, col: number, dir: number[]) => {
        for (let i = 0; i < word.length; i++) {
            const r = row + (i * dir[1]);
            const c = col + (i * dir[0]);
            if (r < 0 || r >= size || c < 0 || c >= size) return false;
            if (newGrid[r][c] !== '' && newGrid[r][c] !== word[i]) return false;
        }
        return true;
    };
    
    allWords.forEach(word => {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 500) {
            const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
            const row = Math.floor(Math.random() * size);
            const col = Math.floor(Math.random() * size);
            
            if (canPlaceWord(word, row, col, dir)) {
                for (let i = 0; i < word.length; i++) {
                    const r = row + (i * dir[1]);
                    const c = col + (i * dir[0]);
                    newGrid[r][c] = word[i];
                }
                placed = true;
            }
            attempts++;
        }
    });
    
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (newGrid[r][c] === '') {
                newGrid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }
        }
    }
    
    setGridData(newGrid);
    setStatus("Puzzle generated. Find the words!");
    draw();
  };
  
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { gridSize, gridData, foundLines, isDragging, startCell, currentTarget } = stateRef.current;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (!gridData.length) return;
    
    const cellSize = rect.width / gridSize;
    
    const drawLine = (startR: number, startC: number, endR: number, endC: number, color: string) => {
        ctx.beginPath();
        ctx.moveTo(startC * cellSize + cellSize / 2, startR * cellSize + cellSize / 2);
        ctx.lineTo(endC * cellSize + cellSize / 2, endR * cellSize + cellSize / 2);
        ctx.lineWidth = cellSize * 0.75;
        ctx.lineCap = "round";
        ctx.strokeStyle = color;
        ctx.stroke();
    };
    
    foundLines.forEach(line => drawLine(line.startR, line.startC, line.endR, line.endC, line.color));
    
    if (isDragging && startCell && currentTarget) {
        drawLine(startCell.r, startCell.c, currentTarget.r, currentTarget.c, "rgba(187, 134, 252, 0.6)");
    }
    
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${cellSize * 0.65}px 'Segoe UI', sans-serif`;
    
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            let isHighlighted = false; // Add intersection logic later if needed for text color
            ctx.fillStyle = isHighlighted ? "#121212" : "#e0e0e0";
            ctx.fillText(gridData[r][c], c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
        }
    }
  };
  
  useEffect(() => { draw(); }, [gridData]);
  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const getCellFromEvent = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    if (x < 0 || x >= rect.width || y < 0 || y >= rect.height) return null;
    
    const cellSize = rect.width / stateRef.current.gridSize;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    return { r, c };
  };

  const handlePointerDown = (e: any) => {
    if (e.type === 'touchstart') e.preventDefault();
    const cell = getCellFromEvent(e);
    if (cell) {
        stateRef.current.isDragging = true;
        stateRef.current.startCell = cell;
        stateRef.current.currentTarget = cell;
        draw();
    }
  };
  
  const handlePointerMove = (e: any) => {
    if (!stateRef.current.isDragging) return;
    if (e.type === 'touchmove') e.preventDefault();
    
    let cell = getCellFromEvent(e);
    if (cell) {
        // Snap logic
        const dr = cell.r - stateRef.current.startCell.r;
        const dc = cell.c - stateRef.current.startCell.c;
        const angle = Math.atan2(dr, dc) * 180 / Math.PI;
        const snapped = Math.round(angle / 45) * 45;
        const rad = snapped * Math.PI / 180;
        
        const dist = Math.max(Math.abs(dr), Math.abs(dc));
        cell = {
            r: stateRef.current.startCell.r + Math.round(Math.sin(rad) * dist),
            c: stateRef.current.startCell.c + Math.round(Math.cos(rad) * dist)
        };
        
        stateRef.current.currentTarget = cell;
        draw();
    }
  };
  
  const handlePointerUp = async (e: any) => {
    if (!stateRef.current.isDragging) return;
    stateRef.current.isDragging = false;
    
    const { startCell, currentTarget, gridData, wordsToFind, foundWords, foundLines } = stateRef.current;
    
    if (startCell && currentTarget) {
        const dr = currentTarget.r - startCell.r;
        const dc = currentTarget.c - startCell.c;
        const steps = Math.max(Math.abs(dr), Math.abs(dc));
        
        if (steps >= 2) {
            const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
            const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
            
            let currentWord = "";
            for (let i = 0; i <= steps; i++) {
                const r = startCell.r + i * stepR;
                const c = startCell.c + i * stepC;
                if (gridData[r] && gridData[r][c]) {
                    currentWord += gridData[r][c];
                }
            }
            
            const reversedWord = currentWord.split('').reverse().join('');
            
            let matchedWord = null;
            let isBonus = false;
            
            if (wordsToFind.includes(currentWord)) matchedWord = currentWord;
            else if (wordsToFind.includes(reversedWord)) matchedWord = reversedWord;
            else {
                // Check dictionary backend
                const isDictForward: boolean = await invoke("validate_word", { word: currentWord });
                const isDictReverse: boolean = await invoke("validate_word", { word: reversedWord });
                
                if (isDictForward && !foundWords[currentWord]) {
                    matchedWord = currentWord;
                    isBonus = true;
                } else if (isDictReverse && !foundWords[reversedWord]) {
                    matchedWord = reversedWord;
                    isBonus = true;
                }
            }
            
            if (matchedWord && !foundWords[matchedWord]) {
                const randomColor = HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)];
                
                setFoundWords(prev => ({ ...prev, [matchedWord!]: randomColor }));
                setFoundLines(prev => [...prev, { startR: startCell.r, startC: startCell.c, endR: currentTarget.r, endC: currentTarget.c, color: randomColor }]);
                
                if (isBonus) {
                    setStars(s => s + 1);
                } else {
                    const newFound = { ...foundWords, [matchedWord!]: randomColor };
                    const foundMainCount = wordsToFind.filter(w => newFound[w]).length;
                    if (foundMainCount === wordsToFind.length) {
                        setStatus("Triumph! Level complete.");
                    }
                }
            }
        }
    }
    
    stateRef.current.startCell = null;
    stateRef.current.currentTarget = null;
    draw();
  };

  // Bind touch events with passive: false properly
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        canvas.addEventListener("touchstart", handlePointerDown, {passive: false});
        window.addEventListener("touchmove", handlePointerMove, {passive: false});
        window.addEventListener("touchend", handlePointerUp);
        return () => {
            canvas.removeEventListener("touchstart", handlePointerDown);
            window.removeEventListener("touchmove", handlePointerMove);
            window.removeEventListener("touchend", handlePointerUp);
        };
    }
  }, []);

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
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1, mb: 3, maxWidth: 600, mx: 'auto' }}>
            {wordsToFind.map(word => (
                <Chip 
                    key={word} 
                    label={word} 
                    sx={{ 
                        fontWeight: 'bold',
                        backgroundColor: foundWords[word] || 'default',
                        color: foundWords[word] ? '#121212' : 'inherit',
                        textDecoration: foundWords[word] ? 'line-through' : 'none',
                        opacity: foundWords[word] ? 0.8 : 1
                    }} 
                />
            ))}
        </Box>
        
        <Paper elevation={4} sx={{ maxWidth: 540, mx: 'auto', p: 1, borderRadius: 2 }}>
            <canvas 
                ref={canvasRef}
                style={{ width: '100%', display: 'block', touchAction: 'none', borderRadius: '4px' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            />
        </Paper>
        
        {status.includes("Triumph") && (
            <Button variant="contained" color="primary" sx={{ mt: 3, mr: 2 }} onClick={() => setLevel(l => l + 1)}>
                Next Level
            </Button>
        )}
        <Button variant="outlined" color="primary" sx={{ mt: 3 }} onClick={() => { setLevel(1); setStars(0); }}>
            Restart Game
        </Button>
      </Box>
    </ThemeProvider>
  );
}
