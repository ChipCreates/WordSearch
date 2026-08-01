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

function placeWord(grid: string[][], size: number, word: string) {
    let attempts = 0;
    while (attempts < 500) {
        const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);

        if (canPlaceWord(grid, size, word, row, col, dir)) {
            for (let i = 0; i < word.length; i++) {
                const r = row + (i * dir[1]);
                const c = col + (i * dir[0]);
                grid[r][c] = word[i];
            }
            return true;
        }
        attempts++;
    }
    return false;
}

export function useWordSearchGame() {
    const [level, setLevel] = useState(() => Number(localStorage.getItem(LEVEL_STORAGE_KEY)) || 1);
    const [stars, setStars] = useState(() => Number(localStorage.getItem(STARS_STORAGE_KEY)) || 0);
    const [status, setStatus] = useState("Loading...");
    const [levelComplete, setLevelComplete] = useState(false);

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
        const size = Math.min(12 + Math.floor(level / 2), 20);
        const count = Math.min(5 + level * 2, 25);
        setGridSize(size);

        const words: string[] = await invoke("get_puzzle_words", { count: count + 10, maxLength: size });
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
        level, stars, status, levelComplete,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, nextLevel, restart,
    };
}
