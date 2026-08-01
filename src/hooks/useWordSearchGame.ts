import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DIRECTIONS, HIGHLIGHT_COLORS, type Cell, type FoundLine } from "../constants";

const LEVEL_STORAGE_KEY = "wordsearch.level";
const STARS_STORAGE_KEY = "wordsearch.stars";

function canPlaceWord(grid: string[][], size: number, word: string, row: number, col: number, dir: number[]) {
    for (let i = 0; i < word.length; i++) {
        const r = row + (i * dir[1]);
        const c = col + (i * dir[0]);
        if (r < 0 || r >= size || c < 0 || c >= size) return false;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
    }
    return true;
}

// array.sort(() => Math.random() - 0.5) is a well-known-biased shuffle (sort
// comparator ordering isn't a uniform permutation) -- Fisher-Yates is the
// correct way to get every ordering with equal probability.
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function placeWord(grid: string[][], size: number, word: string) {
    // Sampling (direction, row, col) uniformly at random -- the previous
    // approach -- silently favors horizontal/vertical: when a word's length
    // is close to the grid size (typical on small 4x4/5x5 boards, since
    // maxLength == size), a diagonal has far fewer valid starting cells than
    // a horizontal/vertical does (e.g. a 4-letter word on a 4x4 grid has 1
    // valid start per diagonal direction but 4 per horizontal/vertical), so
    // random sampling lands on the roomier directions far more often. Picking
    // the direction uniformly first, then a random valid position within it,
    // gives every direction an equal shot regardless of how cramped it is.
    const shuffledDirs = shuffle(DIRECTIONS);
    for (const dir of shuffledDirs) {
        const validStarts: [number, number][] = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (canPlaceWord(grid, size, word, row, col, dir)) {
                    validStarts.push([row, col]);
                }
            }
        }
        if (validStarts.length > 0) {
            const [row, col] = validStarts[Math.floor(Math.random() * validStarts.length)];
            for (let i = 0; i < word.length; i++) {
                const r = row + (i * dir[1]);
                const c = col + (i * dir[0]);
                grid[r][c] = word[i];
            }
            return true;
        }
    }
    return false;
}

export function useWordSearchGame() {
    const [level, setLevel] = useState(() => Number(localStorage.getItem(LEVEL_STORAGE_KEY)) || 1);
    const [stars, setStars] = useState(() => Number(localStorage.getItem(STARS_STORAGE_KEY)) || 0);
    const [status, setStatus] = useState("Loading...");
    const [levelComplete, setLevelComplete] = useState(false);
    const [category, setCategory] = useState("");

    const [gridSize, setGridSize] = useState(12);
    const [gridData, setGridData] = useState<string[][]>([]);
    const [wordsToFind, setWordsToFind] = useState<string[]>([]);
    const [foundWords, setFoundWords] = useState<Record<string, string>>({});
    const [foundLines, setFoundLines] = useState<FoundLine[]>([]);

    // Mirrors state for use inside submitSelection without stale closures.
    const stateRef = useRef({ gridData, wordsToFind, foundWords });
    useEffect(() => {
        stateRef.current = { gridData, wordsToFind, foundWords };
    }, [gridData, wordsToFind, foundWords]);

    useEffect(() => {
        localStorage.setItem(LEVEL_STORAGE_KEY, String(level));
    }, [level]);
    useEffect(() => {
        localStorage.setItem(STARS_STORAGE_KEY, String(stars));
    }, [stars]);

    const initGame = async () => {
        setStatus("Generating puzzle...");
        setLevelComplete(false);
        // Grid size caps at 10x10: real word-search games (Vita Word Search's
        // 4->5->6->8 progression; the imoark/WordSoup/Android-Word-Search open
        // source projects, capping at 10-12) all keep the grid small and let
        // cell size float, rather than shrinking cells to fit a bigger grid.
        const size = Math.min(4 + Math.ceil((level - 1) / 2), 10);
        // Vita's own level 4 (6x6 grid) ships exactly 5 words -> count = size - 1.
        const count = Math.max(3, size - 1);

        const puzzle: { category: string; words: string[] } = await invoke("get_puzzle_words", {
            count: count + Math.min(count, 8),
            maxLength: size,
            level,
        });
        setCategory(puzzle.category);
        const words = puzzle.words;
        const mainWords = words.slice(0, count);
        const bonusWords = words.slice(count);

        const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));

        // Longer words are harder to fit; placing them first while the grid
        // is emptiest avoids leaving words unplaced (and therefore unfindable).
        const byLengthDesc = [...mainWords, ...bonusWords].sort((a, b) => b.length - a.length);
        const placed = new Set<string>();
        byLengthDesc.forEach(word => {
            if (placeWord(grid, size, word)) placed.add(word);
        });

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (grid[r][c] === '') {
                    grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                }
            }
        }

        // Only ever show words that actually made it into the grid.
        setWordsToFind(mainWords.filter(w => placed.has(w)));
        setFoundWords({});
        setFoundLines([]);
        // gridSize and gridData must land in the same render -- setting
        // gridSize earlier (before the await) let GameCanvas see a new,
        // larger gridSize paired with the previous, smaller gridData for one
        // render, reading out of bounds and crashing to a blank screen.
        setGridSize(size);
        setGridData(grid);
        setStatus("Puzzle generated. Find the words!");
    };

    useEffect(() => { initGame(); }, [level]);

    const submitSelection = async (startCell: Cell, endCell: Cell) => {
        const { gridData, wordsToFind, foundWords } = stateRef.current;
        const dr = endCell.r - startCell.r;
        const dc = endCell.c - startCell.c;
        const steps = Math.max(Math.abs(dr), Math.abs(dc));
        if (steps < 2) return;

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

        let matchedWord: string | null = null;
        let isBonus = false;

        if (wordsToFind.includes(currentWord)) {
            matchedWord = currentWord;
        } else if (wordsToFind.includes(reversedWord)) {
            matchedWord = reversedWord;
        } else {
            const isDictForward: boolean = await invoke("validate_word", { word: currentWord });
            if (isDictForward && !foundWords[currentWord]) {
                matchedWord = currentWord;
                isBonus = true;
            } else if (reversedWord !== currentWord) {
                const isDictReverse: boolean = await invoke("validate_word", { word: reversedWord });
                if (isDictReverse && !foundWords[reversedWord]) {
                    matchedWord = reversedWord;
                    isBonus = true;
                }
            }
        }

        if (matchedWord && !foundWords[matchedWord]) {
            const randomColor = HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)];
            const newLine: FoundLine = { startR: startCell.r, startC: startCell.c, endR: endCell.r, endC: endCell.c, color: randomColor };
            const nextFoundWords = { ...foundWords, [matchedWord]: randomColor };

            setFoundLines(prev => [...prev, newLine]);
            setFoundWords(nextFoundWords);

            if (isBonus) {
                setStars(s => s + 1);
            } else {
                const foundMainCount = wordsToFind.filter(w => nextFoundWords[w]).length;
                if (foundMainCount === wordsToFind.length) {
                    setStatus("Triumph! Level complete.");
                    setLevelComplete(true);
                }
            }
        }
    };

    const nextLevel = () => setLevel(l => l + 1);
    const restart = () => {
        setLevel(1);
        setStars(0);
    };

    return {
        level, stars, status, levelComplete, category,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, nextLevel, restart,
    };
}
