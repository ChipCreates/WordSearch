import { useCallback, useEffect, useRef, useState } from "react";
import { getPuzzleWords, validateWord, CATEGORY_NAMES, CATEGORY_NAMES_BY_TIER, type Tier } from "../backend";
import { DIRECTIONS, HIGHLIGHT_COLORS, type Cell, type FoundLine } from "../constants";
import { ACHIEVEMENTS, evaluateAchievements, type Achievement } from "../achievements";

const LEVEL_STORAGE_KEY = "wordsearch.level";
const STARS_STORAGE_KEY = "wordsearch.stars";
const ACHIEVEMENTS_STORAGE_KEY = "wordsearch.achievements";
const LEVELS_COMPLETED_STORAGE_KEY = "wordsearch.levelsCompleted";
const CATEGORIES_SEEN_STORAGE_KEY = "wordsearch.categoriesSeen";
const FOUND_DIAGONAL_STORAGE_KEY = "wordsearch.foundDiagonal";
const DIFFICULTY_MODE_STORAGE_KEY = "wordsearch.difficultyMode";

function loadStringSet(key: string): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {
        return new Set();
    }
}

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
    // Difficulty modes (and therefore this whole 44-category pool) didn't
    // exist before this feature -- every player's prior progress happened
    // under what is now the "standard" pool, so that's the default and the
    // basis for the categoriesSeen backfill just below.
    const [difficultyMode, setDifficultyMode] = useState<Tier>(
        () => (localStorage.getItem(DIFFICULTY_MODE_STORAGE_KEY) === "challenging" ? "challenging" : "standard")
    );

    const [gridSize, setGridSize] = useState(12);
    const [gridData, setGridData] = useState<string[][]>([]);
    const [wordsToFind, setWordsToFind] = useState<string[]>([]);
    const [foundWords, setFoundWords] = useState<Record<string, string>>({});
    const [foundLines, setFoundLines] = useState<FoundLine[]>([]);

    const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(() => loadStringSet(ACHIEVEMENTS_STORAGE_KEY));
    // Reaching level N always means N-1 levels were already completed --
    // that's the only way `level` ever advances -- so it's a floor for
    // levelsCompleted, and levels 1..N-1 are exactly the categories already
    // cycled through (same formula the backend uses to pick each one). Take
    // the max/union with whatever's stored so players who were already past
    // level 1 when these two counters were introduced don't have their
    // already-earned progress read as zero.
    const [levelsCompleted, setLevelsCompleted] = useState(() => {
        const stored = Number(localStorage.getItem(LEVELS_COMPLETED_STORAGE_KEY)) || 0;
        return Math.max(stored, level - 1);
    });
    const [categoriesSeen, setCategoriesSeen] = useState<Set<string>>(() => {
        const stored = loadStringSet(CATEGORIES_SEEN_STORAGE_KEY);
        const names = CATEGORY_NAMES_BY_TIER[difficultyMode];
        for (let i = 0; i < level - 1; i++) stored.add(names[i % names.length]);
        return stored;
    });
    const [foundDiagonal, setFoundDiagonal] = useState(() => localStorage.getItem(FOUND_DIAGONAL_STORAGE_KEY) === "true");
    // Queue rather than a single value: multiple thresholds (e.g. a level
    // count and a star count) can cross in the same action.
    const [justUnlocked, setJustUnlocked] = useState<Achievement[]>([]);

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
    useEffect(() => {
        localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify([...unlockedAchievements]));
    }, [unlockedAchievements]);
    useEffect(() => {
        localStorage.setItem(LEVELS_COMPLETED_STORAGE_KEY, String(levelsCompleted));
    }, [levelsCompleted]);
    useEffect(() => {
        localStorage.setItem(CATEGORIES_SEEN_STORAGE_KEY, JSON.stringify([...categoriesSeen]));
    }, [categoriesSeen]);
    useEffect(() => {
        localStorage.setItem(FOUND_DIAGONAL_STORAGE_KEY, String(foundDiagonal));
    }, [foundDiagonal]);
    useEffect(() => {
        localStorage.setItem(DIFFICULTY_MODE_STORAGE_KEY, difficultyMode);
    }, [difficultyMode]);

    // Re-evaluate against the latest stats whenever any of them change, and
    // surface anything newly satisfied -- read via a ref (not a dependency)
    // so this effect doesn't re-fire on its own setUnlockedAchievements call.
    const unlockedRef = useRef(unlockedAchievements);
    useEffect(() => { unlockedRef.current = unlockedAchievements; }, [unlockedAchievements]);
    useEffect(() => {
        const satisfied = evaluateAchievements({ levelsCompleted, stars, categoriesSeen: categoriesSeen.size, foundDiagonal, totalCategories: CATEGORY_NAMES.length });
        const newlyUnlockedIds = satisfied.filter(id => !unlockedRef.current.has(id));
        if (newlyUnlockedIds.length > 0) {
            setUnlockedAchievements(prev => new Set([...prev, ...newlyUnlockedIds]));
            setJustUnlocked(prev => [...prev, ...ACHIEVEMENTS.filter(a => newlyUnlockedIds.includes(a.id))]);
        }
    }, [levelsCompleted, stars, categoriesSeen, foundDiagonal]);

    const dismissJustUnlocked = useCallback(() => setJustUnlocked(prev => prev.slice(1)), []);

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
        // A word exactly as long as the grid can only occupy one specific
        // full row/column/diagonal -- no slack in where it can start -- so
        // requesting several such words is a common cause of placement
        // failure (and therefore fewer words shown than intended) on 5x5+
        // grids. Capping at size-1 leaves every word at least one cell of
        // slack. Skip this at size 4: several categories have almost no
        // 3-letter words (some have none at all), so size-1 there would
        // starve word selection entirely rather than help placement.
        const maxWordLength = size <= 4 ? size : size - 1;

        const puzzle = await getPuzzleWords(count + Math.min(count, 8), maxWordLength, level, difficultyMode);
        setCategory(puzzle.category);
        setCategoriesSeen(prev => prev.has(puzzle.category) ? prev : new Set(prev).add(puzzle.category));
        const words = puzzle.words;
        const mainWords = words.slice(0, count);
        const bonusWords = words.slice(count);

        const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));

        // Main words must be placed before bonus words, full stop -- bonus
        // words are pure extras, and on a large grid requesting many words
        // (e.g. 9 main + 8 bonus on a 10x10), letting them compete on length
        // alone let a long bonus word grab space ahead of a shorter main
        // word, starving the main word out entirely. Placing all of
        // mainWords first (longest-first, so the hardest-to-fit main words
        // get the emptiest grid) guarantees they get first pick; bonusWords
        // then only ever use whatever space is left over.
        const placed = new Set<string>();
        const placeAll = (list: string[]) => {
            [...list].sort((a, b) => b.length - a.length).forEach(word => {
                if (placeWord(grid, size, word)) placed.add(word);
            });
        };
        placeAll(mainWords);
        placeAll(bonusWords);

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

    useEffect(() => { initGame(); }, [level, difficultyMode]);

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
            const isDictForward = await validateWord(currentWord);
            if (isDictForward && !foundWords[currentWord]) {
                matchedWord = currentWord;
                isBonus = true;
            } else if (reversedWord !== currentWord) {
                const isDictReverse = await validateWord(reversedWord);
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
            if (dr !== 0 && dc !== 0) setFoundDiagonal(true);

            if (isBonus) {
                setStars(s => s + 1);
            } else {
                const foundMainCount = wordsToFind.filter(w => nextFoundWords[w]).length;
                if (foundMainCount === wordsToFind.length) {
                    setStatus("Triumph! Level complete.");
                    setLevelComplete(true);
                    setLevelsCompleted(n => n + 1);
                }
            }
        }
    };

    const goToLevel = (lvl: number) => setLevel(lvl);
    const reshuffle = () => {
        initGame();
    };
    const retryLevel = () => {
        setFoundWords({});
        setFoundLines([]);
        setLevelComplete(false);
    };

    const nextLevel = () => setLevel(l => l + 1);
    const restart = () => {
        setLevel(1);
        setStars(0);
    };

    const spendSeeds = useCallback((cost: number): boolean => {
        const starCost = Math.ceil(cost / 100);
        if (stars >= starCost) {
            setStars(s => Math.max(0, s - starCost));
            return true;
        }
        return false;
    }, [stars]);

    return {
        level, stars, status, levelComplete, category,
        gridSize, gridData, wordsToFind, foundWords, foundLines,
        submitSelection, nextLevel, restart, goToLevel, reshuffle, retryLevel, spendSeeds,
        unlockedAchievements, justUnlocked, dismissJustUnlocked,
        difficultyMode, setDifficultyMode,
        categoriesSeen, foundDiagonal,
    };
}
